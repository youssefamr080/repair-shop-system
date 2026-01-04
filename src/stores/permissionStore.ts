import { useState, useCallback } from 'react';
import { create } from 'zustand';
import { PERMISSIONS, DEFAULT_PERMISSIONS, type PermissionKey } from '../constants/permissions';
import { useAuthStore } from './authStore';

// ============ Permission Store ============
interface PermissionState {
    permissions: Record<PermissionKey, boolean>;
    isLoaded: boolean;

    loadPermissions: () => Promise<void>;
    isLocked: (key: PermissionKey) => boolean;
    setLock: (key: PermissionKey, locked: boolean) => Promise<void>;
    toggleLock: (key: PermissionKey) => Promise<void>;
}

const isElectron = () => typeof window !== 'undefined' && !!window.database;

export const usePermissionStore = create<PermissionState>((set, get) => ({
    permissions: { ...DEFAULT_PERMISSIONS },
    isLoaded: false,

    loadPermissions: async () => {
        if (!isElectron()) return;

        try {
            const newPermissions = { ...DEFAULT_PERMISSIONS };

            // Load each permission from settings
            for (const key of Object.keys(PERMISSIONS) as PermissionKey[]) {
                const value = await window.database?.settings?.get?.(key);
                if (value !== undefined && value !== null) {
                    newPermissions[key] = value === '1' || value === 'true';
                }
            }

            set({ permissions: newPermissions, isLoaded: true });
        } catch (error) {
            console.error('Failed to load permissions:', error);
            set({ isLoaded: true });
        }
    },

    isLocked: (key) => {
        return get().permissions[key] ?? DEFAULT_PERMISSIONS[key] ?? false;
    },

    setLock: async (key, locked) => {
        if (!isElectron()) return;

        try {
            await window.database?.settings?.set?.(key, locked ? '1' : '0');
            set((state) => ({
                permissions: {
                    ...state.permissions,
                    [key]: locked,
                },
            }));
        } catch (error) {
            console.error('Failed to set permission:', error);
            throw error;
        }
    },

    toggleLock: async (key) => {
        const current = get().permissions[key];
        await get().setLock(key, !current);
    },
}));

// ============ Permission Guard Hook ============
interface UsePermissionGuardResult {
    isModalOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
    guardAction: (key: PermissionKey, action: () => void | Promise<void>) => void;
    onPasswordSuccess: () => void;
    isAdminMode: boolean;
}

export function usePermissionGuard(): UsePermissionGuardResult {
    const { isLocked } = usePermissionStore();
    const { isAuthenticated, user } = useAuthStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setPendingAction(null);
    }, []);

    // Check if current user is admin (bypass all locks)
    const isAdminMode = isAuthenticated && user?.role_name === 'admin';

    const guardAction = useCallback((key: PermissionKey, action: () => void | Promise<void>) => {
        // ADMIN BYPASS: If admin is authenticated, execute immediately
        if (isAdminMode) {
            action();
            return;
        }

        // USER MODE: Check if action is locked
        if (isLocked(key)) {
            // Action is locked - show password modal
            setPendingAction(() => action);
            setIsModalOpen(true);
        } else {
            // Action is not locked - execute immediately
            action();
        }
    }, [isAdminMode, isLocked]);

    const onPasswordSuccess = useCallback(() => {
        if (pendingAction) {
            pendingAction();
        }
        closeModal();
    }, [pendingAction, closeModal]);

    return {
        isModalOpen,
        openModal,
        closeModal,
        guardAction,
        onPasswordSuccess,
        isAdminMode,
    };
}


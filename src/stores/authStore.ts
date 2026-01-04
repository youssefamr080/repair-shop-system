/**
 * Auth Store - Zustand State Management for Authentication
 * 
 * Handles:
 * - User session state
 * - Login/logout actions
 * - Permission checks
 * - Session persistence (localStorage)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export interface User {
    id: number;
    username: string;
    display_name: string;
    role_id: number;
    role_name: string;
    role_display_name: string;
    is_system: number; // C1 FIX: Use this for admin check, not role_name
}

export interface AuthState {
    // State
    user: User | null;
    sessionId: string | null;
    permissions: string[];
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
    logout: () => Promise<void>;
    validateSession: () => Promise<boolean>;
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    clearError: () => void;
}

// ============================================
// STORE
// ============================================

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            user: null,
            sessionId: null,
            permissions: [],
            isAuthenticated: false,
            isLoading: false,
            error: null,

            // Login action
            login: async (username: string, password: string, rememberMe: boolean = false) => {
                set({ isLoading: true, error: null });

                try {
                    const result = await window.ipcRenderer.invoke('auth:login', {
                        username,
                        password,
                        rememberMe,
                    });

                    if (result.success) {
                        set({
                            user: result.user,
                            sessionId: result.sessionId,
                            permissions: result.permissions,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                        });
                        return true;
                    } else {
                        set({
                            isLoading: false,
                            error: result.error || 'فشل تسجيل الدخول',
                        });
                        return false;
                    }
                } catch (error) {
                    set({
                        isLoading: false,
                        error: 'حدث خطأ في الاتصال',
                    });
                    return false;
                }
            },

            // Logout action
            logout: async () => {
                const sessionId = get().sessionId;
                if (sessionId) {
                    try {
                        await window.ipcRenderer.invoke('auth:logout', sessionId);
                    } catch {
                        // M3 FIX: Silent fail - logout errors shouldn't block UI
                    }
                }

                set({
                    user: null,
                    sessionId: null,
                    permissions: [],
                    isAuthenticated: false,
                    error: null,
                });
            },

            // Validate session on app startup
            validateSession: async () => {
                const sessionId = get().sessionId;
                if (!sessionId) {
                    return false;
                }

                set({ isLoading: true });

                try {
                    const result = await window.ipcRenderer.invoke('auth:validateSession', sessionId);

                    if (result.valid) {
                        set({
                            user: result.user,
                            permissions: result.permissions,
                            isAuthenticated: true,
                            isLoading: false,
                        });
                        return true;
                    } else {
                        // Session expired, clear state
                        set({
                            user: null,
                            sessionId: null,
                            permissions: [],
                            isAuthenticated: false,
                            isLoading: false,
                        });
                        return false;
                    }
                } catch (error) {
                    set({ isLoading: false });
                    return false;
                }
            },

            // Check if user has a specific permission
            hasPermission: (permission: string) => {
                const { permissions, user } = get();
                // C1 FIX: Check is_system flag instead of role_name to prevent bypass
                if (user?.is_system === 1) return true;
                return permissions.includes(permission);
            },

            // Check if user has any of the given permissions
            hasAnyPermission: (perms: string[]) => {
                const { permissions, user } = get();
                // C1 FIX: Check is_system flag instead of role_name
                if (user?.is_system === 1) return true;
                return perms.some(p => permissions.includes(p));
            },

            // Clear error
            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            // 🔒 C1 SECURITY FIX: Use sessionStorage instead of localStorage
            // Session ID is cleared when browser/app closes, preventing session theft
            // if malicious code somehow gains access to storage.
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                // Only persist sessionId for session recovery within same browser session
                sessionId: state.sessionId,
            }),
        }
    )
);

// ============================================
// HOOKS
// ============================================

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: string): boolean {
    return useAuthStore(state => state.hasPermission(permission));
}

/**
 * Hook to check if user has any of the given permissions
 */
export function useAnyPermission(permissions: string[]): boolean {
    return useAuthStore(state => state.hasAnyPermission(permissions));
}

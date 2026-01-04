/**
 * React Query Hooks for Mayo Fix Enterprise
 * 
 * Professional data fetching with caching, automatic refetching,
 * and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type {
    DBPart,
    DBSupplier,
    ListPartsParams,
    ListPartsResult,
} from '../types/electron.d';

// ============================================================
// Query Keys - Centralized key management
// ============================================================

export const queryKeys = {
    // Parts
    parts: {
        all: ['parts'] as const,
        lists: () => [...queryKeys.parts.all, 'list'] as const,
        list: (filters: Record<string, unknown>) => [...queryKeys.parts.lists(), filters] as const,
        detail: (id: number) => [...queryKeys.parts.all, 'detail', id] as const,
    },
    // Suppliers
    suppliers: {
        all: ['suppliers'] as const,
        lists: () => [...queryKeys.suppliers.all, 'list'] as const,
        active: () => [...queryKeys.suppliers.all, 'active'] as const,
    },
    // Settings
    settings: {
        all: ['settings'] as const,
        company: () => [...queryKeys.settings.all, 'company'] as const,
    },
    // Repairs
    repairs: {
        all: ['repairs'] as const,
        detail: (id: string) => [...queryKeys.repairs.all, 'detail', id] as const,
    },
    // Warehouses
    warehouses: {
        all: ['warehouses'] as const,
        active: () => [...queryKeys.warehouses.all, 'active'] as const,
    }
} as const;

// ============================================================
// Company Settings Types & Hook
// ============================================================

export interface CompanySettings {
    name: string;
    nameEn?: string;
    address?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
    logo?: string;
}

export function useCompanySettings() {
    return useQuery({
        queryKey: queryKeys.settings.company(),
        queryFn: async (): Promise<CompanySettings> => {
            if (window.database?.getAllSettings) {
                const settings = await window.database.getAllSettings();
                return {
                    name: settings.company_name || 'اسم الشركة',
                    nameEn: settings.company_name_en || '',
                    address: settings.company_address || '',
                    phone: settings.company_phone || '',
                    email: settings.company_email || '',
                    taxNumber: settings.company_tax_number || '',
                    logo: settings.company_logo || '',
                };
            }
            return { name: 'اسم الشركة' };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - settings don't change often
    });
}

// ============================================================
// Parts Hooks (Formerly Products)
// ============================================================

export function useParts(params: ListPartsParams = {}) {
    return useQuery({
        queryKey: queryKeys.parts.list(params as Record<string, unknown>),
        queryFn: async (): Promise<ListPartsResult> => {
            return window.database.parts.list(params);
        },
        placeholderData: keepPreviousData,
    });
}

export function useAllParts() {
    return useQuery({
        queryKey: queryKeys.parts.all,
        queryFn: async (): Promise<DBPart[]> => {
            return window.database.parts.getAll();
        },
        placeholderData: keepPreviousData,
    });
}

export function usePart(id: number) {
    return useQuery({
        queryKey: queryKeys.parts.detail(id),
        queryFn: async (): Promise<DBPart | undefined> => {
            return window.database.parts.getById(id);
        },
        enabled: !!id,
    });
}

export function useRepairs(filters?: import('../types/repairs').RepairFilters) {
    return useQuery({
        queryKey: ['repairs', filters],
        queryFn: async () => {
            if (!window.database?.repairs) return [];
            return window.database.repairs.list(filters);
        },
        enabled: !!window.database,
        placeholderData: (previousData) => previousData, // Keep previous data while fetching (prevents flicker)
    });
}

export function useCreatePart() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (part: Partial<DBPart>) => {
            return window.database.parts.create(part);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.parts.all });
        },
    });
}

export function useUpdatePart() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: Partial<DBPart> }) => {
            return window.database.parts.update(id, updates);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.parts.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.parts.detail(variables.id) });
        },
    });
}

export function useDeletePart() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            return window.database.parts.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.parts.all });
        },
    });
}

// ============================================================
// Suppliers Hooks
// ============================================================

export function useDeleteSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            return window.database.suppliers.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
        },
    });
}

// ============================================================
// Suppliers Hooks
// ============================================================

export function useSuppliers() {
    return useQuery({
        queryKey: queryKeys.suppliers.all,
        queryFn: async (): Promise<DBSupplier[]> => {
            return window.database.suppliers.getAll();
        },
        placeholderData: keepPreviousData,
    });
}

export function useActiveSuppliers() {
    return useQuery({
        queryKey: queryKeys.suppliers.active(),
        queryFn: async (): Promise<DBSupplier[]> => {
            return window.database.suppliers.getActive();
        },
        placeholderData: keepPreviousData,
    });
}

export function useCreateSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (supplier: Partial<DBSupplier>) => {
            return window.database.suppliers.create(supplier);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
        },
    });
}

export function useUpdateSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: Partial<DBSupplier> }) => {
            return window.database.suppliers.update(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
        },
    });
}



// ============================================================
// Warehouse Hooks
// ============================================================

export function useWarehouses() {
    return useQuery({
        queryKey: queryKeys.warehouses.all,
        queryFn: async () => {
            return window.database.warehouses.getAll();
        },
        placeholderData: keepPreviousData,
    });
}

export function useActiveWarehouses() {
    return useQuery({
        queryKey: queryKeys.warehouses.active(),
        queryFn: async () => {
            return window.database.warehouses.getActive();
        },
        placeholderData: keepPreviousData,
    });
}
// ============================================================
// Notification Hooks
// ============================================================

export function useNotifications(limit = 20) {
    return useQuery({
        queryKey: ['notifications', 'list', { limit }],
        queryFn: async () => {
            return window.database.notifications.list({ limit });
        },
        refetchInterval: 60 * 1000, // Poll every minute
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            return window.database.notifications.markRead(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            return window.database.notifications.markAllRead();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

import type { CreateNotificationInput } from '../types/notifications';

export function useCreateNotification() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateNotificationInput) => {
            return window.database.notifications.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

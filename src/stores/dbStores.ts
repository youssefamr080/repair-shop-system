/**
 * Database Stores - Mayo Fix Enterprise
 * 
 * Zustand stores for phone repair management.
 */

import { create } from 'zustand';
import type {
  DBAuditLog,
  DBSupplier,
} from '../types/electron.d';

// Helper to check if we're in Electron environment
const isElectron = () => {
  return typeof window !== 'undefined' && window.database !== undefined;
};

// ============ Supplier Store (Parts Suppliers) ============
interface SupplierState {
  suppliers: DBSupplier[];
  isLoading: boolean;
  error: string | null;

  loadSuppliers: () => Promise<void>;
  addSupplier: (data: Partial<DBSupplier>) => Promise<DBSupplier | null>;
  updateSupplier: (id: number, data: Partial<DBSupplier>) => Promise<DBSupplier | null>;
  deleteSupplier: (id: number) => Promise<void>;
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  isLoading: false,
  error: null,

  loadSuppliers: async () => {
    if (!isElectron()) return;
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const suppliers = await window.database.suppliers.getAll();
      set({ suppliers, isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addSupplier: async (data) => {
    if (!isElectron()) return null;
    try {
      const newSupplier = await window.database.suppliers.create(data);
      set((state) => ({ suppliers: [...state.suppliers, newSupplier] }));
      return newSupplier;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  updateSupplier: async (id, data) => {
    if (!isElectron()) return null;
    try {
      const updated = await window.database.suppliers.update(id, data);
      if (updated) {
        set((state) => ({
          suppliers: state.suppliers.map((s) => (s.id === id ? updated : s)),
        }));
      }
      return updated || null;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  deleteSupplier: async (id) => {
    if (!isElectron()) return;
    try {
      await window.database.suppliers.delete(id);
      set((state) => ({
        suppliers: state.suppliers.filter((s) => s.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));

// ============ UI Store ============
type Theme = 'light' | 'dark' | 'system';

interface UIState {
  sidebarExpanded: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setTheme: (theme: Theme) => void;
  loadSettings: () => Promise<void>;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarExpanded: localStorage.getItem('sidebarExpanded') !== 'false', // Default true
  theme: (localStorage.getItem('theme') as Theme) || 'light',

  toggleSidebar: () => set((state) => {
    const newState = !state.sidebarExpanded;
    localStorage.setItem('sidebarExpanded', String(newState));
    return { sidebarExpanded: newState };
  }),

  setSidebarExpanded: (expanded) => {
    localStorage.setItem('sidebarExpanded', String(expanded));
    set({ sidebarExpanded: expanded });
  },

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('theme', theme);
    // Formerly synced to DB, now strictly local for per-user preference
  },

  loadSettings: async () => {
    // Legacy support: We could fetch from DB if local is missing, but for now we trust local
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      // already set in initial state, but ensuring consistency
      set({ theme: savedTheme as Theme });
    }
  },
}));

// ============ Audit Store ============
interface AuditState {
  logs: DBAuditLog[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  loadLogs: (filter?: {
    action_type?: string;
    entity_type?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => Promise<void>;
  clearOldLogs: (olderThanDays: number) => Promise<number>;
  deleteLog: (id: number) => Promise<void>;
  deleteAllLogs: () => Promise<number>;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: [],
  totalCount: 0,
  isLoading: false,
  error: null,

  loadLogs: async (filter) => {
    if (!isElectron()) return;
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const result = await window.database.audit.getFiltered(filter || {});
      set({
        logs: result.logs,
        totalCount: result.total,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearOldLogs: async (olderThanDays) => {
    if (!isElectron()) return 0;
    try {
      const count = await window.database.audit.clearOld(olderThanDays);
      get().loadLogs();
      return count;
    } catch (error) {
      set({ error: (error as Error).message });
      return 0;
    }
  },

  deleteLog: async (id) => {
    if (!isElectron()) return;
    try {
      await window.database.audit.delete(id);
      set((state) => ({
        logs: state.logs.filter((log) => log.id !== id),
        totalCount: state.totalCount - 1,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteAllLogs: async () => {
    if (!isElectron()) return 0;
    try {
      const count = await window.database.audit.deleteAll();
      set({ logs: [], totalCount: 0 });
      return count;
    } catch (error) {
      set({ error: (error as Error).message });
      return 0;
    }
  },
}));

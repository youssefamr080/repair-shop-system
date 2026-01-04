/**
 * Frontend Type Definitions - Mayo Fix
 * 
 * Types for Electron preload APIs and database entities.
 */

import type { LicenseType as BaseLicenseType, LicenseStatus as BaseLicenseStatus } from '../../electron/license/types';
import type {
  DBRepair,
  RepairFilters,
  CreateRepairInput,
  UpdateRepairInput,
  AddRepairPartInput,
  RemoveRepairPartInput,
  CreateRepairResponse,
  UpdateRepairResponse,
  AddPartResponse
} from './repairs';
import type {
  DBNotification,
  CreateNotificationInput,
  NotificationFilters
} from './notifications';

// ============================================================
// DATABASE ENTITY TYPES
// ============================================================

// ============================================================
// DATABASE ENTITY TYPES
// ============================================================

export interface DBPart {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: number | null;
  supplier_id: number | null;
  cost_price: number;
  selling_price: number;
  min_stock_level: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string | null;
  supplier_name?: string | null;
  current_stock?: number;
}

export interface DBCategory {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  parent_name?: string | null;
  products_count?: number;
}

export interface DBUnit {
  id: number;
  name: string;
  abbreviation: string;
  is_active: number;
  created_at: string;
}

export interface DBSupplier {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  products_count?: number;
}

export interface DBCustomer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  total_repairs?: number;
  last_repair_date?: string;
}

export interface DBWarehouse {
  id: number;
  name: string;
  location: string | null;
  description: string | null;
  is_default: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  products_count?: number;
  total_stock?: number;
}

export interface DBStockLevel {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  last_updated: string;
  product_name?: string;
  product_sku?: string;
  warehouse_name?: string;
}

export type TransactionType =
  | 'stock_in'
  | 'stock_out'
  | 'adjustment'
  | 'transfer_in'
  | 'transfer_out'
  | 'return_in'
  | 'return_out';

export interface DBInventoryTransaction {
  id: number;
  transaction_type: TransactionType;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  unit_cost: number | null;
  reference_number: string | null;
  reference_type: string | null;
  notes: string | null;
  related_transaction_id: number | null;
  created_by: number | null;
  created_at: string;
  product_name?: string;
  product_sku?: string;
  warehouse_name?: string;
  created_by_name?: string;
}

export interface DBAuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  user_name: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface InventoryStats {
  total_products: number;
  total_categories: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock_value: number;
}

// ============================================================
// LIST/PAGINATION TYPES
// ============================================================

// ============================================================
// LIST/PAGINATION TYPES
// ============================================================

export interface ListPartsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  supplierId?: number;
  lowStock?: boolean;
  outOfStock?: boolean;
}

export interface ListPartsResult {
  data: DBPart[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// DATABASE API INTERFACE
// ============================================================

interface DatabaseAPI {
  parts: {
    list: (params?: ListPartsParams) => Promise<ListPartsResult>;
    getAll: () => Promise<DBPart[]>;
    getById: (id: number) => Promise<DBPart | undefined>;
    search: (query: string, limit?: number) => Promise<DBPart[]>;
    getNextSku: (prefix?: string) => Promise<string>;
    create: (part: Partial<DBPart>) => Promise<DBPart>;
    update: (id: number, updates: Partial<DBPart>) => Promise<DBPart | undefined>;
    delete: (id: number) => Promise<boolean>;
  };
  categories: {
    getAll: () => Promise<DBCategory[]>;
    getActive: () => Promise<DBCategory[]>;
    getById: (id: number) => Promise<DBCategory | undefined>;
    create: (category: Partial<DBCategory>) => Promise<DBCategory>;
    update: (id: number, updates: Partial<DBCategory>) => Promise<DBCategory | undefined>;
    delete: (id: number) => Promise<void>;
  };
  warehouses: {
    getAll: () => Promise<DBWarehouse[]>;
    getActive: () => Promise<DBWarehouse[]>;
    getById: (id: number) => Promise<DBWarehouse | undefined>;
    getDefault: () => Promise<DBWarehouse | undefined>;
    create: (warehouse: Partial<DBWarehouse>) => Promise<DBWarehouse>;
    update: (id: number, updates: Partial<DBWarehouse>) => Promise<DBWarehouse | undefined>;
    delete: (id: number) => Promise<void>;
  };
  suppliers: {
    getAll: () => Promise<DBSupplier[]>;
    getActive: () => Promise<DBSupplier[]>;
    getById: (id: number) => Promise<DBSupplier | undefined>;
    create: (supplier: Partial<DBSupplier>) => Promise<DBSupplier>;
    update: (id: number, updates: Partial<DBSupplier>) => Promise<DBSupplier | undefined>;
    delete: (id: number) => Promise<void>;
  };
  units: {
    getAll: () => Promise<DBUnit[]>;
    getActive: () => Promise<DBUnit[]>;
    getById: (id: number) => Promise<DBUnit | undefined>;
    create: (unit: Partial<DBUnit>) => Promise<DBUnit>;
    update: (id: number, updates: Partial<DBUnit>) => Promise<DBUnit | undefined>;
    delete: (id: number) => Promise<void>;
  };
  inventory: {
    getStockLevel: (productId: number, warehouseId: number) => Promise<DBStockLevel | undefined>;
    getProductStock: (productId: number) => Promise<DBStockLevel[]>;
    getWarehouseStock: (warehouseId: number) => Promise<DBStockLevel[]>;
    getLowStock: () => Promise<{ product_id: number; product_name: string; sku: string; current_stock: number; min_stock: number }[]>;
    getStats: () => Promise<InventoryStats>;
    getTransactions: (filters?: { product_id?: number; warehouse_id?: number; status?: string; transaction_type?: string; start_date?: string; end_date?: string; search?: string; limit?: number; offset?: number }) => Promise<{ data: DBInventoryTransaction[]; total: number }>;
    stockIn: (params: { product_id: number; warehouse_id: number; quantity: number; unit_cost?: number; reference_number?: string; notes?: string }) => Promise<DBInventoryTransaction>;
    stockOut: (params: { product_id: number; warehouse_id: number; quantity: number; reference_number?: string; notes?: string }) => Promise<DBInventoryTransaction>;
    adjust: (params: { product_id: number; warehouse_id: number; new_quantity: number; reason?: string }) => Promise<DBInventoryTransaction>;
    transfer: (params: { product_id: number; from_warehouse_id: number; to_warehouse_id: number; quantity: number; notes?: string }) => Promise<{ outTransaction: DBInventoryTransaction; inTransaction: DBInventoryTransaction }>;
    transfer: (params: { product_id: number; from_warehouse_id: number; to_warehouse_id: number; quantity: number; notes?: string }) => Promise<{ outTransaction: DBInventoryTransaction; inTransaction: DBInventoryTransaction }>;
  };
  reports: {
    getSales: (params: { startDate?: string; endDate?: string; technicianId?: number }) => Promise<{
      summary: {
        total_revenue: number;
        total_cost: number;
        total_profit: number;
        repair_count: number;
        avg_ticket_value: number;
        total_tax: number;
        total_discount: number;
      };
      daily: { date: string; revenue: number; cost: number; profit: number; count: number }[];
    }>;
    getInventoryValue: () => Promise<{
      total_items: number;
      total_value: number;
      by_category: { category: string; count: number; value: number }[];
    }>;
    getTechnicianStats: (params: { startDate?: string; endDate?: string }) => Promise<{
      technician_id: number;
      technician_name: string;
      total_jobs: number;
      completed_jobs: number;
      total_revenue: number;
    }[]>;
  };
  health_check: () => Promise<boolean>;
  notifications: {
    list: (params?: NotificationFilters) => Promise<DBNotification[]>;
    markRead: (id: string) => Promise<boolean>;
    markAllRead: () => Promise<boolean>;
    clear: () => Promise<boolean>;
    getUnreadCount: () => Promise<number>;
    create: (data: CreateNotificationInput) => Promise<DBNotification>;
  };
  repairs: {
    list: (filters?: RepairFilters) => Promise<DBRepair[]>;
    get: (id: string) => Promise<DBRepair>;
    create: (data: CreateRepairInput) => Promise<CreateRepairResponse>;
    update: (data: UpdateRepairInput) => Promise<UpdateRepairResponse>;
    addPart: (data: AddRepairPartInput) => Promise<AddPartResponse>;
    removePart: (data: RemoveRepairPartInput) => Promise<{ success: boolean }>;
    changeStatus: (data: { repair_id: string; new_status: string; notes?: string }) => Promise<{ success: boolean; message?: string }>;
  };
  customers: {
    getAll: () => Promise<DBCustomer[]>;
    list: (params?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) => Promise<{ data: DBCustomer[]; totalCount: number; page: number; pageSize: number; totalPages: number }>;
    getById: (id: number) => Promise<DBCustomer | undefined>;
    getByPhone: (phone: string) => Promise<DBCustomer | undefined>;
    search: (query: string, limit?: number) => Promise<DBCustomer[]>;
    create: (data: Partial<DBCustomer>) => Promise<DBCustomer>;
    update: (id: number, data: Partial<DBCustomer>) => Promise<DBCustomer | undefined>;
    delete: (id: number) => Promise<boolean>;
    addTransaction: (data: { customer_id: number; type: 'CREDIT' | 'DEBIT'; amount: number; reference_type: string; reference_id?: string; notes?: string }) => Promise<{ success: boolean; newBalance: number }>;
  };
  settings: {
    get: (key: string) => Promise<string | undefined>;
    set: (key: string, value: string) => Promise<boolean>;
  };
  getAllSettings: () => Promise<Record<string, string>>;
  audit: {
    create: (log: Partial<DBAuditLog>) => Promise<DBAuditLog>;
    getAll: (limit?: number) => Promise<DBAuditLog[]>;
    getFiltered: (filter: {
      action_type?: string;
      entity_type?: string;
      start_date?: string;
      end_date?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }) => Promise<{ logs: DBAuditLog[]; total: number }>;
    getEntityTypes: () => Promise<string[]>;
    getActionTypes: () => Promise<string[]>;
    clearOld: (olderThanDays: number) => Promise<number>;
    delete: (id: number) => Promise<boolean>;
    deleteAll: () => Promise<number>;
  };
  backup: {
    create: () => Promise<{ success: boolean; path?: string; error?: string }>;
    restore: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
    list: () => Promise<{ path: string; date: string; size: string }[]>;
  };
}

// ============================================================
// LICENSE API
// ============================================================

export type LicenseType = BaseLicenseType;

export interface LicenseStatus extends BaseLicenseStatus {
  machineId?: string;
  activationKey?: string | null;
  activatedAt?: string | null;
}

export interface LicenseAPI {
  getStatus: () => Promise<LicenseStatus>;
  getMachineId: () => Promise<{ machineId: string }>;
  getProductCode: () => Promise<{ productCode: string }>;
  getDeviceInfo: () => Promise<{
    verification: {
      valid: boolean;
      isNewDevice: boolean;
      similarityScore: number;
      matchedComponents: string[];
      unmatchedComponents: string[];
      reason?: string;
    };
    components: {
      hostname: string;
      cpuModel: string;
      cpuCores: number;
      totalMemoryGB: number;
      platform: string;
    };
  }>;
  activate: (activationKey: string) => Promise<{ success: boolean; message?: string }>;
  renew: () => Promise<{ success: boolean; message?: string }>;
  deactivate: () => Promise<{ success: boolean; message?: string }>;
  checkAndRenew: () => Promise<{ success: boolean }>;
  getConfig: () => Promise<{
    similarityThreshold: number;
    gracePeriodDays: number;
    renewalDaysBeforeExpiry: number;
    runtimeChecksumEnabled: boolean;
    licenseType: LicenseType;
    offlineGraceDays: number;
  }>;
  updateConfig: (config: Record<string, unknown>) => Promise<{ success: boolean; message?: string }>;
  applyPreset: (preset: string) => Promise<{ success: boolean; message?: string }>;
  checkTampering: () => Promise<{
    isTampered: boolean;
    reasons: string[];
    severity: 'low' | 'medium' | 'high';
  }>;
}

// ============================================================
// AUTH API
// ============================================================

export interface AuthAPI {
  verifyPassword: (password: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

// ============================================================
// GLOBAL WINDOW INTERFACE
// ============================================================

declare global {
  interface Window {
    database: DatabaseAPI;
    license?: LicenseAPI;
    auth?: AuthAPI;
    ipcRenderer: {
      on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
      off: (channel: string, listener: (...args: unknown[]) => void) => void;
      send: (channel: string, ...args: unknown[]) => void;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    };
  }
}

export { };

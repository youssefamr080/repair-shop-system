/**
 * Mayo Fix Shared Types
 * 
 * Types shared between frontend components.
 */

// =============================================================================
// AUDIT TYPES
// =============================================================================

export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  | 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT'
  | 'CREATE_CATEGORY' | 'UPDATE_CATEGORY' | 'DELETE_CATEGORY'
  | 'CREATE_WAREHOUSE' | 'UPDATE_WAREHOUSE' | 'DELETE_WAREHOUSE'
  | 'CREATE_SUPPLIER' | 'UPDATE_SUPPLIER' | 'DELETE_SUPPLIER'
  | 'CREATE_UNIT' | 'UPDATE_UNIT' | 'DELETE_UNIT'
  | 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_ADJUST' | 'STOCK_TRANSFER'
  | 'SETTINGS_UPDATE' | 'BACKUP' | 'RESTORE';

export type AuditEntity =
  | 'product' | 'category' | 'warehouse' | 'supplier' | 'unit'
  | 'stock' | 'settings' | 'user' | 'role';

// =============================================================================
// DASHBOARD STATS
// =============================================================================

export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface ProductFilter {
  search: string;
  categoryId: number | null;
  supplierId: number | null;
  lowStock: boolean;
  outOfStock: boolean;
}

export interface TransactionFilter {
  productId: number | null;
  warehouseId: number | null;
  startDate: string | null;
  endDate: string | null;
}

// =============================================================================
// REPORT TYPES
// =============================================================================

export interface InventoryReport {
  productName: string;
  sku: string;
  categoryName: string;
  currentStock: number;
  minStock: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

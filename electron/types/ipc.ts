/**
 * TypeScript Interfaces for IPC Payloads
 * 
 * Mayo Fix - Type definitions for IPC communication
 */

import type {
  DBPart,
  DBCategory,
  DBWarehouse,
  DBSupplier,
  DBUnit,
} from '../database';

// ============ PART IPC TYPES ============

export interface CreateProductPayload {
  sku: string;
  barcode?: string | null;
  name: string;
  name_en?: string | null;
  description?: string | null;
  category_id?: number | null;
  unit_id?: number | null;
  supplier_id?: number | null;
  cost_price?: number;
  selling_price?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  is_active?: number;
  image_url?: string | null;
  notes?: string | null;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;
export type ProductResponse = DBPart;

// ============ CATEGORY IPC TYPES ============

export interface CreateCategoryPayload {
  name: string;
  description?: string | null;
  parent_id?: number | null;
  is_active?: number;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;
export type CategoryResponse = DBCategory;

// ============ WAREHOUSE IPC TYPES ============

export interface CreateWarehousePayload {
  name: string;
  location?: string | null;
  description?: string | null;
  is_default?: number;
  is_active?: number;
}

export type UpdateWarehousePayload = Partial<CreateWarehousePayload>;
export type WarehouseResponse = DBWarehouse;

// ============ SUPPLIER IPC TYPES ============

export interface CreateSupplierPayload {
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: number;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;
export type SupplierResponse = DBSupplier;

// ============ UNIT IPC TYPES ============

export interface CreateUnitPayload {
  name: string;
  abbreviation: string;
  is_active?: number;
}

export type UpdateUnitPayload = Partial<CreateUnitPayload>;
export type UnitResponse = DBUnit;

// ============ INVENTORY IPC TYPES ============

export interface StockInPayload {
  product_id: number;
  warehouse_id: number;
  quantity: number;
  unit_cost?: number;
  reference_number?: string;
  notes?: string;
}

export interface StockOutPayload {
  product_id: number;
  warehouse_id: number;
  quantity: number;
  reference_number?: string;
  notes?: string;
}

export interface AdjustStockPayload {
  product_id: number;
  warehouse_id: number;
  new_quantity: number;
  reason?: string;
}

export interface TransferStockPayload {
  product_id: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  quantity: number;
  notes?: string;
}

// ============ LICENSE IPC TYPES ============

export interface ActivateLicensePayload {
  activationKey: string;
}

export interface LicenseStatusResponse {
  valid: boolean;
  machineId: string;
  activationKey: string | null;
  activatedAt: string | null;
}

// ============ SETTINGS IPC TYPES ============

export interface SetSettingPayload {
  key: string;
  value: string;
}

// ============ RESPONSE TYPES ============

export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
}

export interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
}

export type IPCResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Zod Validation Schemas for IPC Payloads - Mayo Fix
 * 
 * Runtime validation for all IPC handlers to prevent malformed data
 * from crashing the main process or corrupting the database.
 */

import { z } from 'zod';

// ============ PRODUCT SCHEMAS ============

export const createProductSchema = z.object({
  name: z.string().min(1, 'اسم المنتج مطلوب').max(200),
  name_en: z.string().max(200).nullable().optional(),
  sku: z.string().min(1, 'رمز المنتج مطلوب').max(50),
  barcode: z.string().max(50).nullable().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  unit_id: z.number().int().positive().nullable().optional(),
  supplier_id: z.number().int().positive().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  cost_price: z.number().min(0).optional().default(0),
  selling_price: z.number().min(0).optional().default(0),
  min_stock_level: z.number().int().min(0).optional().default(0),
  max_stock_level: z.number().int().min(0).optional().default(0),
  reorder_level: z.number().int().min(0).optional().default(0),
  is_active: z.number().int().min(0).max(1).optional().default(1),
  image_url: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const deleteProductSchema = z.object({
  id: z.number().int().positive(),
  mode: z.enum(['soft', 'hard']).optional(),
});

export const listProductsParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(10),
  search: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  supplierId: z.coerce.number().int().positive().optional(),
  lowStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
});

// ============ CATEGORY SCHEMAS ============

export const createCategorySchema = z.object({
  name: z.string().min(1, 'اسم التصنيف مطلوب').max(100),
  description: z.string().max(500).nullable().optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  is_active: z.number().int().min(0).max(1).optional().default(1),
});

export const updateCategorySchema = createCategorySchema.partial();

// ============ WAREHOUSE SCHEMAS ============

export const createWarehouseSchema = z.object({
  name: z.string().min(1, 'اسم المستودع مطلوب').max(100),
  location: z.string().max(200).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  is_default: z.number().int().min(0).max(1).optional().default(0),
  is_active: z.number().int().min(0).max(1).optional().default(1),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

// ============ SUPPLIER SCHEMAS ============

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'اسم المورد مطلوب').max(200),
  contact_person: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().max(100).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  is_active: z.number().int().min(0).max(1).optional().default(1),
});

export const updateSupplierSchema = createSupplierSchema.partial();

// ============ UNIT SCHEMAS ============

export const createUnitSchema = z.object({
  name: z.string().min(1, 'اسم الوحدة مطلوب').max(50),
  abbreviation: z.string().max(10).nullable().optional(),
  is_active: z.number().int().min(0).max(1).optional().default(1),
});

export const updateUnitSchema = createUnitSchema.partial();

// ============ INVENTORY TRANSACTION SCHEMAS ============

export const stockTransactionSchema = z.object({
  product_id: z.number().int().positive('معرف المنتج مطلوب'),
  warehouse_id: z.number().int().positive('معرف المستودع مطلوب'),
  quantity: z.number().positive('الكمية يجب أن تكون موجبة'),
  transaction_type: z.enum(['in', 'out', 'adjustment', 'transfer']),
  reference_number: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  unit_cost: z.number().min(0).optional(),
  // For transfers
  to_warehouse_id: z.number().int().positive().nullable().optional(),
});

export const stockAdjustmentSchema = z.object({
  product_id: z.number().int().positive('معرف المنتج مطلوب'),
  warehouse_id: z.number().int().positive('معرف المستودع مطلوب'),
  new_quantity: z.number().min(0, 'الكمية لا يمكن أن تكون سالبة'),
  reason: z.string().max(500).nullable().optional(),
});

export const stockInSchema = z.object({
  product_id: z.number().int().positive(),
  warehouse_id: z.number().int().positive(),
  quantity: z.number().positive(),
  unit_cost: z.number().min(0).optional(),
  reference_number: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const stockOutSchema = z.object({
  product_id: z.number().int().positive(),
  warehouse_id: z.number().int().positive(),
  quantity: z.number().positive(),
  reference_number: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const transferStockSchema = z.object({
  product_id: z.number().int().positive(),
  from_warehouse_id: z.number().int().positive(),
  to_warehouse_id: z.number().int().positive(),
  quantity: z.number().positive(),
  notes: z.string().max(500).optional(),
});

export const getTransactionsSchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  warehouse_id: z.coerce.number().int().positive().optional(),
  transaction_type: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ============ SETTINGS SCHEMAS ============

export const settingKeySchema = z.enum([
  'company_name',
  'company_logo',
  'tts_enabled',
  'theme',
  'currency',
  'low_stock_threshold',
]);

export const settingValueSchema = z.string().max(1_000_000); // 1MB max for base64 logo

// ============ COMMON VALIDATION SCHEMAS ============

// Date validation schema (YYYY-MM-DD format)
export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD')
  .refine((date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }, 'تاريخ غير صالح');

// ID validation schemas
export const productIdSchema = z.number()
  .int('معرف المنتج يجب أن يكون رقماً صحيحاً')
  .positive('معرف المنتج يجب أن يكون موجباً');

export const categoryIdSchema = z.number()
  .int('معرف التصنيف يجب أن يكون رقماً صحيحاً')
  .positive('معرف التصنيف يجب أن يكون موجباً');

export const warehouseIdSchema = z.number()
  .int('معرف المستودع يجب أن يكون رقماً صحيحاً')
  .positive('معرف المستودع يجب أن يكون موجباً');

export const supplierIdSchema = z.number()
  .int('معرف المورد يجب أن يكون رقماً صحيحاً')
  .positive('معرف المورد يجب أن يكون موجباً');

export const unitIdSchema = z.number()
  .int('معرف الوحدة يجب أن يكون رقماً صحيحاً')
  .positive('معرف الوحدة يجب أن يكون موجباً');

// Date range validation schema
export const dateRangeSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
}).refine((data) => {
  return new Date(data.startDate) <= new Date(data.endDate);
}, {
  message: 'تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية',
  path: ['endDate'],
});

// ============ HELPER FUNCTIONS ============

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Validate data against a Zod schema and return a clean result
 */
export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Extract first error message for user-friendly display
  const issues = result.error.issues;
  const firstError = issues[0];
  const errorMessage = firstError?.message || 'بيانات غير صالحة';

  return { success: false, error: errorMessage };
}

/**
 * Validate and throw if invalid - for use in IPC handlers
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string = ''
): T {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
  throw new Error(`[Validation Error${context ? ` - ${context}` : ''}] ${errors}`);
}

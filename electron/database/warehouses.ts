/**
 * Warehouses Database Module - Mayo Fix
 * 
 * Handles storage locations for inventory.
 */

import { getDatabase } from './core';

export interface DBWarehouse {
    id: number;
    name: string;
    location: string | null;
    description: string | null;
    is_default: number;
    is_active: number;
    created_at: string;
    updated_at: string;
    // Aggregated fields
    products_count?: number;
    total_stock?: number;
}

/**
 * Get all warehouses
 */
export function getAllWarehouses(): DBWarehouse[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      w.*,
      COUNT(DISTINCT sl.product_id) as products_count,
      COALESCE(SUM(sl.quantity), 0) as total_stock
    FROM warehouses w
    LEFT JOIN stock_levels sl ON w.id = sl.warehouse_id AND sl.quantity > 0
    GROUP BY w.id
    ORDER BY w.is_default DESC, w.name ASC
  `).all() as DBWarehouse[];
}

/**
 * Get active warehouses only
 */
export function getActiveWarehouses(): DBWarehouse[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT * FROM warehouses WHERE is_active = 1 ORDER BY is_default DESC, name ASC
  `).all() as DBWarehouse[];
}

/**
 * Get warehouse by ID
 */
export function getWarehouseById(id: number): DBWarehouse | undefined {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      w.*,
      COUNT(DISTINCT sl.product_id) as products_count,
      COALESCE(SUM(sl.quantity), 0) as total_stock
    FROM warehouses w
    LEFT JOIN stock_levels sl ON w.id = sl.warehouse_id AND sl.quantity > 0
    WHERE w.id = ?
    GROUP BY w.id
  `).get(id) as DBWarehouse | undefined;
}

/**
 * Get default warehouse
 */
export function getDefaultWarehouse(): DBWarehouse | undefined {
    const database = getDatabase();
    return database.prepare('SELECT * FROM warehouses WHERE is_default = 1 LIMIT 1').get() as DBWarehouse | undefined;
}

/**
 * Create a new warehouse
 */
export function createWarehouse(warehouse: {
    name: string;
    location?: string | null;
    description?: string | null;
    is_default?: number;
    is_active?: number;
}): DBWarehouse {
    const database = getDatabase();
    const now = new Date().toISOString();

    // If this is set as default, unset other defaults
    if (warehouse.is_default) {
        database.prepare('UPDATE warehouses SET is_default = 0').run();
    }

    const result = database.prepare(`
    INSERT INTO warehouses (name, location, description, is_default, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
        warehouse.name,
        warehouse.location || null,
        warehouse.description || null,
        warehouse.is_default || 0,
        warehouse.is_active ?? 1,
        now,
        now
    );

    return getWarehouseById(result.lastInsertRowid as number)!;
}

/**
 * Update a warehouse
 */
export function updateWarehouse(id: number, updates: Partial<DBWarehouse>): DBWarehouse | undefined {
    const database = getDatabase();
    const now = new Date().toISOString();

    // If setting as default, unset other defaults
    if (updates.is_default === 1) {
        database.prepare('UPDATE warehouses SET is_default = 0 WHERE id != ?').run(id);
    }

    const ALLOWED_FIELDS = new Set(['name', 'location', 'description', 'is_default', 'is_active']);

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
        if (ALLOWED_FIELDS.has(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) return getWarehouseById(id);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    database.prepare(`UPDATE warehouses SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return getWarehouseById(id);
}

/**
 * Delete a warehouse
 */
export function deleteWarehouse(id: number): boolean {
    const database = getDatabase();

    // Check if any stock exists in this warehouse
    const stockCount = database.prepare(
        'SELECT COUNT(*) as count FROM stock_levels WHERE warehouse_id = ? AND quantity > 0'
    ).get(id) as { count: number };

    if (stockCount.count > 0) {
        throw new Error('WAREHOUSE_HAS_STOCK: لا يمكن حذف المستودع لوجود مخزون به');
    }

    // Check if it's the default warehouse
    const warehouse = getWarehouseById(id);
    if (warehouse?.is_default) {
        throw new Error('CANNOT_DELETE_DEFAULT: لا يمكن حذف المستودع الافتراضي');
    }

    const result = database.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
    return result.changes > 0;
}

/**
 * Check if warehouse name exists
 */
export function warehouseNameExists(name: string, excludeId?: number): boolean {
    const database = getDatabase();
    const query = excludeId
        ? 'SELECT id FROM warehouses WHERE name = ? AND id != ?'
        : 'SELECT id FROM warehouses WHERE name = ?';

    const result = excludeId
        ? database.prepare(query).get(name, excludeId)
        : database.prepare(query).get(name);

    return !!result;
}

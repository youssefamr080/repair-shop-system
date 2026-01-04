/**
 * Suppliers Database Module - Mayo Fix
 * 
 * Handles vendor/supplier management.
 */

import { getDatabase } from './core';

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
    // Aggregated fields
    products_count?: number;
}

/**
 * Get all suppliers
 */
export function getAllSuppliers(): DBSupplier[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      s.*,
      COUNT(p.id) as products_count
    FROM suppliers s
    LEFT JOIN products p ON s.id = p.supplier_id AND p.deleted_at IS NULL
    GROUP BY s.id
    ORDER BY s.name ASC
  `).all() as DBSupplier[];
}

/**
 * Get active suppliers only
 */
export function getActiveSuppliers(): DBSupplier[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC
  `).all() as DBSupplier[];
}

/**
 * Get supplier by ID
 */
export function getSupplierById(id: number): DBSupplier | undefined {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      s.*,
      COUNT(p.id) as products_count
    FROM suppliers s
    LEFT JOIN products p ON s.id = p.supplier_id AND p.deleted_at IS NULL
    WHERE s.id = ?
    GROUP BY s.id
  `).get(id) as DBSupplier | undefined;
}

/**
 * Create a new supplier
 */
export function createSupplier(supplier: {
    name: string;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
    is_active?: number;
}): DBSupplier {
    const database = getDatabase();
    const now = new Date().toISOString();

    const result = database.prepare(`
    INSERT INTO suppliers (name, contact_person, phone, email, address, notes, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        supplier.name,
        supplier.contact_person || null,
        supplier.phone || null,
        supplier.email || null,
        supplier.address || null,
        supplier.notes || null,
        supplier.is_active ?? 1,
        now,
        now
    );

    return getSupplierById(result.lastInsertRowid as number)!;
}

/**
 * Update a supplier
 */
export function updateSupplier(id: number, updates: Partial<DBSupplier>): DBSupplier | undefined {
    const database = getDatabase();
    const now = new Date().toISOString();

    const ALLOWED_FIELDS = new Set(['name', 'contact_person', 'phone', 'email', 'address', 'notes', 'is_active']);

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
        if (ALLOWED_FIELDS.has(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) return getSupplierById(id);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    database.prepare(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return getSupplierById(id);
}

/**
 * Delete a supplier
 */
export function deleteSupplier(id: number): boolean {
    const database = getDatabase();

    // Check if any products are using this supplier
    const productCount = database.prepare(
        'SELECT COUNT(*) as count FROM products WHERE supplier_id = ? AND deleted_at IS NULL'
    ).get(id) as { count: number };

    if (productCount.count > 0) {
        throw new Error('SUPPLIER_IN_USE: لا يمكن حذف المورد لوجود منتجات مرتبطة به');
    }

    const result = database.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    return result.changes > 0;
}

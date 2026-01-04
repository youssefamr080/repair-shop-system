/**
 * Units Database Module - Mayo Fix
 * 
 * Handles measurement units for products.
 */

import { getDatabase } from './core';

export interface DBUnit {
    id: number;
    name: string;
    abbreviation: string;
    is_active: number;
    created_at: string;
}

/**
 * Get all units
 */
export function getAllUnits(): DBUnit[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT * FROM units ORDER BY name ASC
  `).all() as DBUnit[];
}

/**
 * Get active units only
 */
export function getActiveUnits(): DBUnit[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT * FROM units WHERE is_active = 1 ORDER BY name ASC
  `).all() as DBUnit[];
}

/**
 * Get unit by ID
 */
export function getUnitById(id: number): DBUnit | undefined {
    const database = getDatabase();
    return database.prepare('SELECT * FROM units WHERE id = ?').get(id) as DBUnit | undefined;
}

/**
 * Create a new unit
 */
export function createUnit(unit: { name: string; abbreviation: string; is_active?: number }): DBUnit {
    const database = getDatabase();
    const now = new Date().toISOString();

    const result = database.prepare(`
    INSERT INTO units (name, abbreviation, is_active, created_at)
    VALUES (?, ?, ?, ?)
  `).run(unit.name, unit.abbreviation, unit.is_active ?? 1, now);

    return getUnitById(result.lastInsertRowid as number)!;
}

/**
 * Update a unit
 */
export function updateUnit(id: number, updates: { name?: string; abbreviation?: string; is_active?: number }): DBUnit | undefined {
    const database = getDatabase();

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.abbreviation !== undefined) {
        fields.push('abbreviation = ?');
        values.push(updates.abbreviation);
    }
    if (updates.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.is_active);
    }

    if (fields.length === 0) return getUnitById(id);

    values.push(id);
    database.prepare(`UPDATE units SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return getUnitById(id);
}

/**
 * Delete a unit
 */
export function deleteUnit(id: number): boolean {
    const database = getDatabase();

    // Check if any products are using this unit
    const productCount = database.prepare(
        'SELECT COUNT(*) as count FROM products WHERE unit_id = ? AND deleted_at IS NULL'
    ).get(id) as { count: number };

    if (productCount.count > 0) {
        throw new Error('UNIT_IN_USE: لا يمكن حذف الوحدة لوجود منتجات مرتبطة بها');
    }

    const result = database.prepare('DELETE FROM units WHERE id = ?').run(id);
    return result.changes > 0;
}

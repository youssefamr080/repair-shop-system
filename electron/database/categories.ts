/**
 * Categories Database Module - Mayo Fix
 * 
 * Handles all database operations for product categories.
 * Categories support hierarchical structure with parent_id.
 */

import { getDatabase } from './core';

export interface DBCategory {
    id: number;
    name: string;
    description: string | null;
    parent_id: number | null;
    is_active: number;
    created_at: string;
    updated_at: string;
    // Joined fields
    parent_name?: string | null;
    products_count?: number;
}

/**
 * Get all categories with parent name and product count
 */
export function getAllCategories(): DBCategory[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      c.*,
      p.name as parent_name,
      (SELECT COUNT(*) FROM products WHERE category_id = c.id AND deleted_at IS NULL) as products_count
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    ORDER BY c.name ASC
  `).all() as DBCategory[];
}

/**
 * Get active categories only
 */
export function getActiveCategories(): DBCategory[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      c.*,
      p.name as parent_name
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE c.is_active = 1
    ORDER BY c.name ASC
  `).all() as DBCategory[];
}

/**
 * Get category by ID
 */
export function getCategoryById(id: number): DBCategory | undefined {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      c.*,
      p.name as parent_name,
      (SELECT COUNT(*) FROM products WHERE category_id = c.id AND deleted_at IS NULL) as products_count
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE c.id = ?
  `).get(id) as DBCategory | undefined;
}

/**
 * Create a new category
 */
export function createCategory(category: {
    name: string;
    description?: string | null;
    parent_id?: number | null;
    is_active?: number;
}): DBCategory {
    const database = getDatabase();
    const now = new Date().toISOString();

    const stmt = database.prepare(`
    INSERT INTO categories (name, description, parent_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    const result = stmt.run(
        category.name,
        category.description || null,
        category.parent_id || null,
        category.is_active ?? 1,
        now,
        now
    );

    return getCategoryById(result.lastInsertRowid as number)!;
}

/**
 * Check if setting parent_id would create a circular reference
 * V9 FIX: Prevents infinite loops in category hierarchy
 */
function wouldCreateCycle(id: number, newParentId: number): boolean {
    const database = getDatabase();
    let current: number | null = newParentId;
    const visited = new Set<number>();

    while (current) {
        if (current === id) return true;
        if (visited.has(current)) break; // Already visited, no cycle through this path
        visited.add(current);

        const parent = database.prepare('SELECT parent_id FROM categories WHERE id = ?').get(current) as { parent_id: number | null } | undefined;
        current = parent?.parent_id || null;
    }
    return false;
}

/**
 * Update a category
 */
export function updateCategory(id: number, updates: Partial<DBCategory>): DBCategory | undefined {
    const database = getDatabase();
    const now = new Date().toISOString();

    // V9 FIX: Check for circular reference before allowing parent_id change
    if (updates.parent_id !== undefined && updates.parent_id !== null) {
        if (updates.parent_id === id) {
            throw new Error('CIRCULAR_REFERENCE: لا يمكن جعل التصنيف أباً لنفسه');
        }
        if (wouldCreateCycle(id, updates.parent_id)) {
            throw new Error('CIRCULAR_REFERENCE: تغيير الأب سيؤدي إلى دورة في التصنيفات');
        }
    }

    const ALLOWED_FIELDS = new Set(['name', 'description', 'parent_id', 'is_active']);

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
        if (ALLOWED_FIELDS.has(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return getCategoryById(id);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    database.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return getCategoryById(id);
}

/**
 * Delete a category (only if no products are assigned)
 */
export function deleteCategory(id: number): boolean {
    const database = getDatabase();

    // Check if any products are using this category
    const productCount = database.prepare(
        'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND deleted_at IS NULL'
    ).get(id) as { count: number };

    if (productCount.count > 0) {
        throw new Error('CATEGORY_IN_USE: لا يمكن حذف التصنيف لوجود منتجات مرتبطة به');
    }

    const result = database.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return result.changes > 0;
}

/**
 * Check if category name exists
 */
export function categoryNameExists(name: string, excludeId?: number): boolean {
    const database = getDatabase();
    const query = excludeId
        ? 'SELECT id FROM categories WHERE name = ? AND id != ?'
        : 'SELECT id FROM categories WHERE name = ?';

    const result = excludeId
        ? database.prepare(query).get(name, excludeId)
        : database.prepare(query).get(name);

    return !!result;
}

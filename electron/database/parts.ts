/**
 * Parts Database Module - Mayo Fix Enterprise
 * 
 * Handles all database operations for repair parts (formerly products).
 * Includes stock level management and pagination.
 */

import { getDatabase } from './core';

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
    supplier_name?: string | null;
    category_name?: string | null;
    current_stock?: number;
}

export interface ListPartsParams {
    page: number;
    pageSize: number;
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

/**
 * Get all parts (no pagination)
 */
export function getAllParts(): DBPart[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      p.*,
      s.name as supplier_name,
      c.name as category_name,
      COALESCE(SUM(sl.quantity), 0) as current_stock
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN stock_levels sl ON p.id = sl.product_id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY p.name ASC
  `).all() as DBPart[];
}

/**
 * List parts with pagination and filters
 */
export function listParts(params: ListPartsParams): ListPartsResult {
    const database = getDatabase();
    const { page = 1, pageSize = 20, search, categoryId, supplierId, lowStock, outOfStock } = params;
    const offset = (page - 1) * pageSize;

    // Build WHERE clauses
    const conditions: string[] = ['p.deleted_at IS NULL'];
    const queryParams: (string | number)[] = [];

    if (search && search.trim()) {
        const searchPattern = `%${search.trim()}%`;
        conditions.push(`(
      p.name LIKE ? OR 
      p.sku LIKE ? OR 
      p.barcode LIKE ? OR
      p.description LIKE ?
    )`);
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (categoryId) {
        conditions.push('p.category_id = ?');
        queryParams.push(categoryId);
    }

    if (supplierId) {
        conditions.push('p.supplier_id = ?');
        queryParams.push(supplierId);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `
    SELECT COUNT(DISTINCT p.id) as count
    FROM products p
    WHERE ${whereClause}
  `;
    const countResult = database.prepare(countQuery).get(...queryParams) as { count: number };
    const totalCount = countResult.count;

    // Get paginated data
    let dataQuery = `
    SELECT 
      p.*,
      s.name as supplier_name,
      c.name as category_name,
      COALESCE(SUM(sl.quantity), 0) as current_stock
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN stock_levels sl ON p.id = sl.product_id
    WHERE ${whereClause}
    GROUP BY p.id
  `;

    // Add stock filters after GROUP BY (using HAVING)
    if (lowStock || outOfStock) {
        const havingConditions: string[] = [];
        if (outOfStock) {
            havingConditions.push('current_stock <= 0');
        } else if (lowStock) {
            havingConditions.push('current_stock > 0 AND current_stock <= p.min_stock_level');
        }
        if (havingConditions.length > 0) {
            dataQuery += ` HAVING ${havingConditions.join(' OR ')}`;
        }
    }

    // Sorting and Pagination
    dataQuery += ' ORDER BY p.created_at DESC';

    if (pageSize !== -1) {
        dataQuery += ' LIMIT ? OFFSET ?';
        queryParams.push(pageSize, offset);
    }

    const data = database.prepare(dataQuery).all(...queryParams) as DBPart[];
    const totalPages = pageSize === -1 ? 1 : Math.ceil(totalCount / pageSize);

    return {
        data,
        totalCount,
        page,
        pageSize: pageSize === -1 ? totalCount : pageSize,
        totalPages,
    };
}

/**
 * Get part by ID
 */
export function getPartById(id: number): DBPart | undefined {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      p.*,
      s.name as supplier_name,
      c.name as category_name,
      COALESCE(SUM(sl.quantity), 0) as current_stock
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN stock_levels sl ON p.id = sl.product_id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(id) as DBPart | undefined;
}

/**
 * Create a new part
 */
export function createPart(part: Partial<DBPart>): DBPart {
    const database = getDatabase();
    const now = new Date().toISOString();

    const stmt = database.prepare(`
    INSERT INTO products (
      sku, barcode, name, description,
      category_id, supplier_id,
      cost_price, selling_price,
      min_stock_level, is_active, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const result = stmt.run(
        part.sku,
        part.barcode || null,
        part.name,
        part.description || null,
        part.category_id || null,
        part.supplier_id || null,
        part.cost_price || 0,
        part.selling_price || 0,
        part.min_stock_level || 5,
        part.is_active ?? 1,
        now,
        now
    );

    // Initialize stock level to 0 for default warehouse (usually ID 1)
    // In a real system we might handle this differently, but zero default is safe.
    try {
        database.prepare(`
            INSERT INTO stock_levels (product_id, warehouse_id, quantity, last_updated)
            VALUES (?, 1, 0, ?)
        `).run(result.lastInsertRowid, now);
    } catch (e) {
        // Ignore unique constraint if exists
    }

    return getPartById(result.lastInsertRowid as number)!;
}

/**
 * Update a part
 */
export function updatePart(id: number, updates: Partial<DBPart>): DBPart | undefined {
    const database = getDatabase();
    const now = new Date().toISOString();

    const ALLOWED_FIELDS = new Set([
        'sku', 'barcode', 'name', 'description',
        'category_id', 'supplier_id',
        'cost_price', 'selling_price',
        'min_stock_level', 'is_active'
    ]);

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
        if (ALLOWED_FIELDS.has(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return getPartById(id);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    database.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return getPartById(id);
}

/**
 * Delete a part (soft delete)
 */
export function deletePart(id: number): boolean {
    const database = getDatabase();
    const now = new Date().toISOString();

    // Check if used in repairs
    const inRepairs = database.prepare(
        'SELECT 1 FROM repair_parts WHERE product_id = ? LIMIT 1'
    ).get(id);

    if (inRepairs) {
        // Soft delete only
        const result = database.prepare(
            'UPDATE products SET deleted_at = ?, is_active = 0 WHERE id = ?'
        ).run(now, id);
        return result.changes > 0;
    }

    // Hard delete if clean
    const transaction = database.transaction(() => {
        database.prepare('DELETE FROM stock_levels WHERE product_id = ?').run(id);
        const result = database.prepare('DELETE FROM products WHERE id = ?').run(id);
        return result.changes > 0;
    });

    return transaction();
}

/**
 * Search parts (auto-complete)
 */
export function searchParts(query: string, limit: number = 10): DBPart[] {
    const database = getDatabase();
    const searchPattern = `%${query}%`;

    return database.prepare(`
        SELECT 
            p.id, p.name, p.sku, p.selling_price, p.cost_price,
            COALESCE(SUM(sl.quantity), 0) as current_stock
        FROM products p
        LEFT JOIN stock_levels sl ON p.id = sl.product_id
        WHERE p.deleted_at IS NULL AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)
        GROUP BY p.id
        LIMIT ?
    `).all(searchPattern, searchPattern, searchPattern, limit) as DBPart[];
}

/**
 * Get Next SKU
 */
export function getNextSku(prefix: string = 'PART'): string {
    const database = getDatabase();
    const result = database.prepare(`
    SELECT sku FROM products 
    WHERE sku LIKE ? 
    ORDER BY id DESC 
    LIMIT 1
  `).get(`${prefix}%`) as { sku: string } | undefined;

    if (!result) {
        return `${prefix}001`;
    }

    // Attempt to extract number
    const match = result.sku.match(/\d+$/);
    if (match) {
        const num = parseInt(match[0], 10);
        return `${prefix}${String(num + 1).padStart(match[0].length, '0')}`;
    }

    return `${prefix}${Date.now().toString().slice(-4)}`;
}

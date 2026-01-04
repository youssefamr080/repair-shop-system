/**
 * Inventory Database Module - Mayo Fix
 * 
 * Handles stock levels and inventory transactions.
 */

import { getDatabase } from './core';

// ============================================================
// Stock Levels
// ============================================================

export interface DBStockLevel {
    id: number;
    product_id: number;
    warehouse_id: number;
    quantity: number;
    last_updated: string;
    // Joined fields
    product_name?: string;
    product_sku?: string;
    warehouse_name?: string;
}

/**
 * Get stock level for a product in a warehouse
 */
export function getStockLevel(productId: number, warehouseId: number): DBStockLevel | undefined {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      sl.*,
      p.name as product_name,
      p.sku as product_sku,
      w.name as warehouse_name
    FROM stock_levels sl
    JOIN products p ON sl.product_id = p.id
    JOIN warehouses w ON sl.warehouse_id = w.id
    WHERE sl.product_id = ? AND sl.warehouse_id = ?
  `).get(productId, warehouseId) as DBStockLevel | undefined;
}

/**
 * Get all stock levels for a product across warehouses
 */
export function getProductStockLevels(productId: number): DBStockLevel[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      sl.*,
      w.name as warehouse_name
    FROM stock_levels sl
    JOIN warehouses w ON sl.warehouse_id = w.id
    WHERE sl.product_id = ?
    ORDER BY w.is_default DESC, w.name ASC
  `).all(productId) as DBStockLevel[];
}

/**
 * Get all stock levels in a warehouse
 */
export function getWarehouseStockLevels(warehouseId: number): DBStockLevel[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      sl.*,
      p.name as product_name,
      p.sku as product_sku
    FROM stock_levels sl
    JOIN products p ON sl.product_id = p.id
    WHERE sl.warehouse_id = ? AND p.deleted_at IS NULL
    ORDER BY p.name ASC
  `).all(warehouseId) as DBStockLevel[];
}

/**
 * Update stock level (creates if doesn't exist)
 * P2-M3: Prevents negative stock
 */
export function updateStockLevel(productId: number, warehouseId: number, quantity: number): DBStockLevel {
    const database = getDatabase();
    const now = new Date().toISOString();

    // P2-M3: Prevent negative stock
    if (quantity < 0) {
        throw new Error('INVALID_QUANTITY: لا يمكن أن تكون الكمية سالبة');
    }

    database.prepare(`
    INSERT INTO stock_levels (product_id, warehouse_id, quantity, last_updated)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(product_id, warehouse_id) 
    DO UPDATE SET quantity = ?, last_updated = ?
  `).run(productId, warehouseId, quantity, now, quantity, now);

    return getStockLevel(productId, warehouseId)!;
}

/**
 * Adjust stock level by delta amount
 * P2-M3: Validates result won't go negative
 * SECURITY FIX: Uses atomic SQL update to prevent race conditions
 */
export function adjustStockLevel(productId: number, warehouseId: number, delta: number): DBStockLevel {
    const database = getDatabase();
    const now = new Date().toISOString();

    // Create if not exists with 0 quantity
    database.prepare(`
    INSERT OR IGNORE INTO stock_levels (product_id, warehouse_id, quantity, last_updated)
    VALUES (?, ?, 0, ?)
  `).run(productId, warehouseId, now);

    // SECURITY FIX: Atomic Update
    // Combine the check and update in a single SQL statement
    // This prevents race conditions where two requests pass the check simultaneously
    const result = database.prepare(`
    UPDATE stock_levels 
    SET quantity = quantity + ?, last_updated = ?
    WHERE product_id = ? AND warehouse_id = ? AND (quantity + ?) >= 0
  `).run(delta, now, productId, warehouseId, delta);

    if (result.changes === 0) {
        // If no rows were changed, it means the constraint (quantity + delta >= 0) failed
        // Or the row doesn't exist (handled by INSERT above, but safe to check)
        const current = getStockLevel(productId, warehouseId);
        const currentQty = current?.quantity ?? 0;
        throw new Error(`INSUFFICIENT_STOCK: فشل تحديث المخزون. الكمية الحالية (${currentQty}) لا تكفي لخصم (${Math.abs(delta)})`);
    }

    return getStockLevel(productId, warehouseId)!;
}

// ============================================================
// Inventory Transactions
// ============================================================

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
    // Joined fields
    product_name?: string;
    product_sku?: string;
    warehouse_name?: string;
    created_by_name?: string;
}

/**
 * Record an inventory transaction
 */
export function createTransaction(transaction: {
    transaction_type: TransactionType;
    product_id: number;
    warehouse_id: number;
    quantity: number;
    unit_cost?: number | null;
    reference_number?: string | null;
    reference_type?: string | null;
    notes?: string | null;
    related_transaction_id?: number | null;
    created_by?: number | null;
}): DBInventoryTransaction {
    const database = getDatabase();
    const now = new Date().toISOString();

    const result = database.prepare(`
    INSERT INTO inventory_transactions (
      transaction_type, product_id, warehouse_id, quantity,
      unit_cost, reference_number, reference_type, notes,
      related_transaction_id, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        transaction.transaction_type,
        transaction.product_id,
        transaction.warehouse_id,
        transaction.quantity,
        transaction.unit_cost ?? null,
        transaction.reference_number ?? null,
        transaction.reference_type ?? null,
        transaction.notes ?? null,
        transaction.related_transaction_id ?? null,
        transaction.created_by ?? null,
        now
    );

    return getTransactionById(result.lastInsertRowid as number)!;
}

/**
 * Get transaction by ID
 */
export function getTransactionById(id: number): DBInventoryTransaction | undefined {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      t.*,
      p.name as product_name,
      p.sku as product_sku,
      w.name as warehouse_name,
      u.display_name as created_by_name
    FROM inventory_transactions t
    JOIN products p ON t.product_id = p.id
    JOIN warehouses w ON t.warehouse_id = w.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.id = ?
  `).get(id) as DBInventoryTransaction | undefined;
}

/**
 * Get transactions with filters
 */
export function getTransactions(filters: {
    product_id?: number;
    warehouse_id?: number;
    transaction_type?: TransactionType;
    start_date?: string;
    end_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
}): { data: DBInventoryTransaction[], total: number } {
    const database = getDatabase();

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.product_id) {
        conditions.push('t.product_id = ?');
        params.push(filters.product_id);
    }
    if (filters.warehouse_id) {
        conditions.push('t.warehouse_id = ?');
        params.push(filters.warehouse_id);
    }
    if (filters.transaction_type) {
        conditions.push('t.transaction_type = ?');
        params.push(filters.transaction_type);
    }
    if (filters.start_date) {
        conditions.push('t.created_at >= ?');
        params.push(filters.start_date);
    }
    if (filters.end_date) {
        conditions.push('t.created_at <= ?');
        params.push(filters.end_date);
    }
    if (filters.search) {
        const searchPattern = `%${filters.search.trim()}%`;
        conditions.push(`(t.reference_number LIKE ? OR t.notes LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)`);
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get Total Count
    const countResult = database.prepare(`
        SELECT COUNT(*) as count
        FROM inventory_transactions t
        LEFT JOIN products p ON t.product_id = p.id
        LEFT JOIN warehouses w ON t.warehouse_id = w.id
        LEFT JOIN users u ON t.created_by = u.id
        ${whereClause}
    `).get(...params) as { count: number };

    const query = `
    SELECT 
      t.*,
      p.name as product_name,
      p.sku as product_sku,
      w.name as warehouse_name,
      u.username as created_by_name
    FROM inventory_transactions t
    LEFT JOIN products p ON t.product_id = p.id
    LEFT JOIN warehouses w ON t.warehouse_id = w.id
    LEFT JOIN users u ON t.created_by = u.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;

    const data = database.prepare(query).all(...params, filters.limit || 50, filters.offset || 0) as DBInventoryTransaction[];

    return {
        data,
        total: countResult.count
    };
}

// ============================================================
// Inventory Operations (High-Level)
// ============================================================

/**
 * Stock In - Add inventory (e.g., from purchase)
 */

// Note: We need to import updateProductCost from products.ts, but we can't add imports with replace_file_content easily if they are far away.
// However, looking at file imports (line 7), we might need to add it there. 
// For now, let's implement the logic assuming we'll add the import in a second step or inline require if needed.
// Actually, let's assume I can add the import at the top later or use require.
// Let's use `require` for now to avoid messing up top-level imports with a partial file view? 
// No, best practice is to add import. But for this tool I see line 1-10.
// I will just use `require` inside the function or assume access. 
// Actually I should add the import line first or use fully qualified if possible? No.

// Let's modify stockIn to use the logic.
export function stockIn(params: {
    product_id: number;
    warehouse_id: number;
    quantity: number;
    unit_cost?: number;
    reference_number?: string;
    notes?: string;
    created_by?: number;
}): DBInventoryTransaction {
    const database = getDatabase();

    const transaction = database.transaction(() => {
        // WAC Calculation Logic
        if (params.unit_cost !== undefined && params.unit_cost > 0) {
            // Get all current stock levels for this product across all warehouses
            // We need the TOTAL quantity currently held
            const allStocks = getProductStockLevels(params.product_id);
            const currentTotalQty = allStocks.reduce((sum: number, stock: { quantity: number }) => sum + stock.quantity, 0);

            // Get current product info for cost price (we need to read it)
            // We can use a simple query here to avoid circular dependency with products.ts if we imported it
            const product = database.prepare('SELECT cost_price FROM products WHERE id = ?').get(params.product_id) as { cost_price: number };
            const currentCost = product?.cost_price || 0;

            // Calculate new WAC
            // Formula: ((OldQty * OldCost) + (NewQty * NewCost)) / (OldQty + NewQty)
            // Handle edge case where negative stock might exist (though we try to prevent it)
            const functionalOldQty = Math.max(0, currentTotalQty);

            const totalValue = (functionalOldQty * currentCost) + (params.quantity * params.unit_cost);
            const totalQty = functionalOldQty + params.quantity;

            if (totalQty > 0) {
                const newWAC = totalValue / totalQty;
                // Update product cost
                // Use require to avoid circular dependency issues at top level if products.ts imports inventory.ts
                // (products.ts imports logger and core, but getAllProducts uses stock_levels table)
                // inventory.ts imports core.
                // Circular dependency is likely if I import products.ts here.
                // Safest to just run the UPDATE query directly here or use late require.
                database.prepare('UPDATE products SET cost_price = ?, updated_at = ? WHERE id = ?')
                    .run(newWAC, new Date().toISOString(), params.product_id);
            }
        }

        // Update stock level
        adjustStockLevel(params.product_id, params.warehouse_id, params.quantity);

        // Create transaction record
        return createTransaction({
            transaction_type: 'stock_in',
            product_id: params.product_id,
            warehouse_id: params.warehouse_id,
            quantity: params.quantity,
            unit_cost: params.unit_cost,
            reference_number: params.reference_number,
            reference_type: 'purchase',
            notes: params.notes,
            created_by: params.created_by,
        });
    });

    return transaction();
}

/**
 * Stock Out - Remove inventory (e.g., for sale)
 */
export function stockOut(params: {
    product_id: number;
    warehouse_id: number;
    quantity: number;
    reference_number?: string;
    notes?: string;
    created_by?: number;
}): DBInventoryTransaction {
    const database = getDatabase();

    const transaction = database.transaction(() => {
        // Check if enough stock
        const currentStock = getStockLevel(params.product_id, params.warehouse_id);
        const available = currentStock?.quantity ?? 0;

        if (available < params.quantity) {
            throw new Error(`INSUFFICIENT_STOCK: المخزون المتاح (${available}) أقل من الكمية المطلوبة (${params.quantity})`);
        }

        // Update stock level (negative delta)
        adjustStockLevel(params.product_id, params.warehouse_id, -params.quantity);

        // Create transaction record
        return createTransaction({
            transaction_type: 'stock_out',
            product_id: params.product_id,
            warehouse_id: params.warehouse_id,
            quantity: -params.quantity,
            reference_number: params.reference_number,
            reference_type: 'sale',
            notes: params.notes,
            created_by: params.created_by,
        });
    });

    return transaction();
}

/**
 * Adjust stock - Manual inventory adjustment
 */
export function adjustStock(params: {
    product_id: number;
    warehouse_id: number;
    new_quantity: number;
    reason?: string;
    created_by?: number;
}): DBInventoryTransaction {
    const database = getDatabase();

    const transaction = database.transaction(() => {
        // Get current stock
        const currentStock = getStockLevel(params.product_id, params.warehouse_id);
        const current = currentStock?.quantity ?? 0;
        const delta = params.new_quantity - current;

        // Update stock level to new quantity
        updateStockLevel(params.product_id, params.warehouse_id, params.new_quantity);

        // Create transaction record
        return createTransaction({
            transaction_type: 'adjustment',
            product_id: params.product_id,
            warehouse_id: params.warehouse_id,
            quantity: delta,
            notes: params.reason,
            created_by: params.created_by,
        });
    });

    return transaction();
}

/**
 * Transfer stock between warehouses
 */
export function transferStock(params: {
    product_id: number;
    from_warehouse_id: number;
    to_warehouse_id: number;
    quantity: number;
    notes?: string;
    created_by?: number;
}): { outTransaction: DBInventoryTransaction; inTransaction: DBInventoryTransaction } {
    const database = getDatabase();

    const transaction = database.transaction(() => {
        // Check if enough stock in source warehouse
        const sourceStock = getStockLevel(params.product_id, params.from_warehouse_id);
        const available = sourceStock?.quantity ?? 0;

        if (available < params.quantity) {
            throw new Error(`INSUFFICIENT_STOCK: المخزون المتاح (${available}) أقل من الكمية المطلوبة (${params.quantity})`);
        }

        // Remove from source warehouse
        adjustStockLevel(params.product_id, params.from_warehouse_id, -params.quantity);

        // Add to destination warehouse
        adjustStockLevel(params.product_id, params.to_warehouse_id, params.quantity);

        // Create transfer out transaction
        const outTransaction = createTransaction({
            transaction_type: 'transfer_out',
            product_id: params.product_id,
            warehouse_id: params.from_warehouse_id,
            quantity: -params.quantity,
            reference_type: 'transfer',
            notes: params.notes,
            created_by: params.created_by,
        });

        // Create transfer in transaction (linked)
        const inTransaction = createTransaction({
            transaction_type: 'transfer_in',
            product_id: params.product_id,
            warehouse_id: params.to_warehouse_id,
            quantity: params.quantity,
            reference_type: 'transfer',
            notes: params.notes,
            related_transaction_id: outTransaction.id,
            created_by: params.created_by,
        });

        return { outTransaction, inTransaction };
    });

    return transaction();
}

/**
 * Get low stock products
 */
export function getLowStockProducts(): { product_id: number; product_name: string; sku: string; current_stock: number; min_stock: number }[] {
    const database = getDatabase();
    return database.prepare(`
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.sku,
      COALESCE(SUM(sl.quantity), 0) as current_stock,
      p.min_stock_level as min_stock
    FROM products p
    LEFT JOIN stock_levels sl ON p.id = sl.product_id
    WHERE p.deleted_at IS NULL 
      AND p.is_active = 1
      AND p.min_stock_level > 0
    GROUP BY p.id
    HAVING current_stock <= p.min_stock_level
    ORDER BY current_stock ASC
  `).all() as { product_id: number; product_name: string; sku: string; current_stock: number; min_stock: number }[];
}

/**
 * Get inventory summary stats
 */
export function getInventoryStats(): {
    total_products: number;
    total_categories: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_stock_value: number;
} {
    const database = getDatabase();

    const stats = database.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) as total_products,
      (SELECT COUNT(*) FROM categories WHERE is_active = 1) as total_categories,
      (SELECT COUNT(*) FROM products p 
        LEFT JOIN (SELECT product_id, SUM(quantity) as qty FROM stock_levels GROUP BY product_id) sl ON p.id = sl.product_id
        WHERE p.deleted_at IS NULL AND p.min_stock_level > 0 AND COALESCE(sl.qty, 0) <= p.min_stock_level AND COALESCE(sl.qty, 0) > 0
      ) as low_stock_count,
      (SELECT COUNT(*) FROM products p 
        LEFT JOIN (SELECT product_id, SUM(quantity) as qty FROM stock_levels GROUP BY product_id) sl ON p.id = sl.product_id
        WHERE p.deleted_at IS NULL AND COALESCE(sl.qty, 0) <= 0
      ) as out_of_stock_count,
      (SELECT COALESCE(SUM(sl.quantity * p.cost_price), 0) FROM stock_levels sl JOIN products p ON sl.product_id = p.id WHERE p.deleted_at IS NULL) as total_stock_value
  `).get() as {
        total_products: number;
        total_categories: number;
        low_stock_count: number;
        out_of_stock_count: number;
        total_stock_value: number;
    };

    return stats;
}

/**
 * Inventory IPC Handlers - Mayo Fix Enterprise
 * 
 * Handles all inventory-related IPC operations.
 */

import { z } from 'zod';
import * as inventoryDb from '../database/inventory';
import { registerIPCHandler, getRateLimiterForHandler } from '../utils/ipcWrapper';
import { requirePermission, auditAction } from '../middleware/auth';
import { logger } from '../utils/logger';

// Schemas
const productIdSchema = z.number().int().positive();
const warehouseIdSchema = z.number().int().positive();

const stockInSchema = z.object({
    product_id: productIdSchema,
    warehouse_id: warehouseIdSchema,
    quantity: z.number().positive('Quantity must be positive'),
    unit_cost: z.number().min(0).optional(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
});

const stockOutSchema = z.object({
    product_id: productIdSchema,
    warehouse_id: warehouseIdSchema,
    quantity: z.number().positive('Quantity must be positive'),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
});

const adjustStockSchema = z.object({
    product_id: productIdSchema,
    warehouse_id: warehouseIdSchema,
    new_quantity: z.number().min(0, 'Quantity cannot be negative'),
    reason: z.string().optional(),
});

const transferStockSchema = z.object({
    product_id: productIdSchema,
    from_warehouse_id: warehouseIdSchema,
    to_warehouse_id: warehouseIdSchema,
    quantity: z.number().positive('Quantity must be positive'),
    notes: z.string().optional(),
});

const getTransactionsSchema = z.object({
    product_id: z.number().optional(),
    warehouse_id: z.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    limit: z.number().optional(),
});

/**
 * Setup Inventory IPC Handlers
 */
export function setupInventoryHandlers(): void {

    // GET STOCK LEVEL
    registerIPCHandler('db:inventory:getStockLevel',
        requirePermission('parts.view', async (_, _ctx, productId: number, warehouseId: number) => {
            return inventoryDb.getStockLevel(productIdSchema.parse(productId), warehouseIdSchema.parse(warehouseId));
        }),
        { rateLimiter: getRateLimiterForHandler('db:inventory:getStockLevel') }
    );

    // GET PRODUCT STOCK (All Warehouses)
    registerIPCHandler('db:inventory:getProductStock',
        requirePermission('parts.view', async (_, _ctx, productId: number) => {
            return inventoryDb.getProductStockLevels(productIdSchema.parse(productId));
        }),
        { rateLimiter: getRateLimiterForHandler('db:inventory:getProductStock') }
    );

    // GET WAREHOUSE STOCK
    registerIPCHandler('db:inventory:getWarehouseStock',
        requirePermission('parts.view', async (_, _ctx, warehouseId: number) => {
            return inventoryDb.getWarehouseStockLevels(warehouseIdSchema.parse(warehouseId));
        }),
        { rateLimiter: getRateLimiterForHandler('db:inventory:getWarehouseStock') }
    );

    // STOCK IN
    registerIPCHandler('db:inventory:stockIn',
        requirePermission('inventory.manage', async (_, ctx, data: unknown) => {
            const validated = stockInSchema.parse(data);
            const transaction = inventoryDb.stockIn({
                ...validated,
                created_by: ctx.user.id
            });

            auditAction(ctx, 'STOCK_IN', 'inventory', transaction.id, `Stock In: ${validated.quantity} items for Product ID ${validated.product_id}`);
            logger.info(`Stock In: ${validated.quantity} for Product ${validated.product_id}`, 'Inventory');

            return transaction;
        }),
        { rateLimiter: getRateLimiterForHandler('db:inventory:stockIn') }
    );

    // STOCK OUT
    registerIPCHandler('db:inventory:stockOut',
        requirePermission('inventory.manage', async (_, ctx, data: unknown) => {
            const validated = stockOutSchema.parse(data);
            const transaction = inventoryDb.stockOut({
                ...validated,
                created_by: ctx.user.id
            });

            auditAction(ctx, 'STOCK_OUT', 'inventory', transaction.id, `Stock Out: ${validated.quantity} items for Product ID ${validated.product_id}`);
            logger.info(`Stock Out: ${validated.quantity} for Product ${validated.product_id}`, 'Inventory');

            return transaction;
        }),
        { rateLimiter: getRateLimiterForHandler('db:inventory:stockOut') }
    );

    // ADJUST STOCK
    registerIPCHandler('db:inventory:adjust',
        requirePermission('inventory.manage', async (_, ctx, data: unknown) => {
            const validated = adjustStockSchema.parse(data);
            const transaction = inventoryDb.adjustStock({
                ...validated,
                created_by: ctx.user.id
            });

            auditAction(ctx, 'STOCK_ADJUST', 'inventory', transaction.id, `Adjusted stock for Product ID ${validated.product_id} to ${validated.new_quantity}`);
            logger.info(`Stock Adjusted: Product ${validated.product_id} to ${validated.new_quantity}`, 'Inventory');

            return transaction;
        }),
        { rateLimiter: getRateLimiterForHandler('db:inventory:adjust') }
    );

    // TRANSFER STOCK
    registerIPCHandler('db:inventory:transfer',
        requirePermission('inventory.manage', async (_, ctx, data: unknown) => {
            const validated = transferStockSchema.parse(data);
            const result = inventoryDb.transferStock({
                ...validated,
                created_by: ctx.user.id
            });

            auditAction(ctx, 'STOCK_TRANSFER', 'inventory', result.outTransaction.id, `Transferred ${validated.quantity} from WH ${validated.from_warehouse_id} to WH ${validated.to_warehouse_id}`);
            logger.info(`Stock Transfer: ${validated.quantity} items`, 'Inventory');

            return result;
        }),
        { rateLimiter: getRateLimiterForHandler('db:inventory:transfer') }
    );

    // GET TRANSACTIONS
    registerIPCHandler('db:inventory:getTransactions',
        requirePermission('parts.view', async (_, _ctx, filters: any) => {
            const validated = getTransactionsSchema.parse(filters || {});
            return inventoryDb.getTransactions(validated);
        }),
        { rateLimiter: getRateLimiterForHandler('db:inventory:getTransactions') }
    );

    // GET STATS (New for V12)
    registerIPCHandler('db:inventory:getStats',
        requirePermission('parts.view', async () => {
            return inventoryDb.getInventoryStats();
        }),
        { rateLimiter: getRateLimiterForHandler('db:inventory:getStats') }
    );

    // GET LOW STOCK
    registerIPCHandler('db:inventory:getLowStock',
        requirePermission('parts.view', async () => {
            return inventoryDb.getLowStockProducts();
        }),
        { rateLimiter: getRateLimiterForHandler('db:inventory:getLowStock') }
    );

    logger.info('Inventory handlers registered', 'Handlers');
}

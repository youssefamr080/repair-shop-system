/**
 * Parts IPC Handlers - Mayo Fix Enterprise
 * 
 * Handles all parts-related IPC operations.
 */

import { z } from 'zod';
import * as partsDb from '../database/parts';
import { registerIPCHandler, getRateLimiterForHandler } from '../utils/ipcWrapper';
import { requirePermission, auditAction } from '../middleware/auth';
import { logger } from '../utils/logger';

// Schemas
const partIdSchema = z.number().int().positive();
const searchSchema = z.string().min(1);

const createPartSchema = z.object({
    name: z.string().min(1, 'Part name is required'),
    sku: z.string().min(1, 'SKU is required'),
    barcode: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    category_id: z.number().optional().nullable(),
    supplier_id: z.number().optional().nullable(),
    cost_price: z.number().min(0).default(0),
    selling_price: z.number().min(0).default(0),
    min_stock_level: z.number().min(0).default(5),
    is_active: z.number().min(0).max(1).default(1),
});

const updatePartSchema = createPartSchema.partial();

const listPartsSchema = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    categoryId: z.number().optional(),
    supplierId: z.number().optional(),
    lowStock: z.boolean().optional(),
    outOfStock: z.boolean().optional(),
});

/**
 * Setup Parts IPC Handlers
 */
export function setupPartHandlers(): void {

    // LIST PARTS
    registerIPCHandler('db:parts:list',
        requirePermission('parts.view', async (_, _ctx, params: unknown) => {
            const validated = listPartsSchema.parse(params || {});
            return partsDb.listParts(validated);
        }),
        { rateLimiter: getRateLimiterForHandler('db:parts:list') }
    );

    // GET ALL PARTS (Raw list)
    registerIPCHandler('db:parts:getAll',
        requirePermission('parts.view', async () => {
            return partsDb.getAllParts();
        }),
        { rateLimiter: getRateLimiterForHandler('db:parts:getAll') }
    );

    // GET PART BY ID
    registerIPCHandler('db:parts:getById',
        requirePermission('parts.view', async (_, _ctx, id: number) => {
            return partsDb.getPartById(partIdSchema.parse(id));
        }),
        { rateLimiter: getRateLimiterForHandler('db:parts:getById') }
    );

    // CREATE PART
    registerIPCHandler('db:parts:create',
        requirePermission('parts.manage', async (_, ctx, data: unknown) => {
            const validated = createPartSchema.parse(data);
            const part = partsDb.createPart(validated);

            auditAction(ctx, 'CREATE_PART', 'part', part.id, `Created part: ${part.name} (${part.sku})`);
            logger.info(`Part created: ${part.name}`, 'Parts');

            return part;
        }),
        { rateLimiter: getRateLimiterForHandler('db:parts:create') }
    );

    // UPDATE PART
    registerIPCHandler('db:parts:update',
        requirePermission('parts.manage', async (_, ctx, id: number, data: unknown) => {
            const partId = partIdSchema.parse(id);
            const validated = updatePartSchema.parse(data);

            const part = partsDb.updatePart(partId, validated);

            if (part) {
                auditAction(ctx, 'UPDATE_PART', 'part', partId, `Updated part: ${part.name}`);
                logger.info(`Part updated: ${part.name}`, 'Parts');
            }

            return part;
        }),
        { rateLimiter: getRateLimiterForHandler('db:parts:update') }
    );

    // DELETE PART
    registerIPCHandler('db:parts:delete',
        requirePermission('parts.manage', async (_, ctx, id: number) => {
            const partId = partIdSchema.parse(id);
            const part = partsDb.getPartById(partId);

            if (!part) return false;

            const success = partsDb.deletePart(partId);

            if (success) {
                auditAction(ctx, 'DELETE_PART', 'part', partId, `Deleted part: ${part.name}`);
                logger.info(`Part deleted: ${part.name}`, 'Parts');
            }

            return success;
        }),
        { rateLimiter: getRateLimiterForHandler('db:parts:delete') }
    );

    // SEARCH PARTS (Autocomplete)
    registerIPCHandler('db:parts:search',
        requirePermission('parts.view', async (_, _ctx, query: string, limit?: number) => {
            const q = searchSchema.parse(query);
            return partsDb.searchParts(q, limit || 10);
        }),
        { rateLimiter: getRateLimiterForHandler('db:parts:search') }
    );

    // GET NEXT SKU
    registerIPCHandler('db:parts:getNextSku',
        requirePermission('parts.view', async (_, _ctx, prefix?: string) => {
            return partsDb.getNextSku(prefix);
        }),
        { rateLimiter: getRateLimiterForHandler('db:parts:getNextSku') }
    );

    logger.info('Parts handlers registered', 'Handlers');
}

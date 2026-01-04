/**
 * IPC Handlers for Suppliers - Mayo Fix
 */

import {
    getAllSuppliers,
    getActiveSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
} from '../database';
import { z } from 'zod';
import { registerIPCHandler, getRateLimiterForHandler } from '../utils/ipcWrapper';
import { requirePermission, auditAction } from '../middleware/auth';

const supplierIdSchema = z.number().int().positive();

const createSupplierSchema = z.object({
    name: z.string().min(1).max(200),
    contact_person: z.string().max(100).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    email: z.string().email().max(100).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    is_active: z.number().int().min(0).max(1).optional(),
});

const updateSupplierSchema = createSupplierSchema.partial();

export function setupSupplierHandlers(): void {
    // READ
    registerIPCHandler('db:suppliers:getAll',
        requirePermission('suppliers.view', () => getAllSuppliers()),
        { rateLimiter: getRateLimiterForHandler('db:suppliers:getAll') }
    );

    registerIPCHandler('db:suppliers:getActive',
        requirePermission('suppliers.view', () => getActiveSuppliers()),
        { rateLimiter: getRateLimiterForHandler('db:suppliers:getActive') }
    );

    registerIPCHandler('db:suppliers:getById',
        requirePermission('suppliers.view', (_, _ctx, id: number) => {
            return getSupplierById(supplierIdSchema.parse(id));
        }),
        { rateLimiter: getRateLimiterForHandler('db:suppliers:getById') }
    );

    // CREATE
    registerIPCHandler('db:suppliers:create',
        requirePermission('suppliers.manage', (_, ctx, supplier: unknown) => {
            const validated = createSupplierSchema.parse(supplier);

            const created = createSupplier(validated);

            auditAction(ctx, 'CREATE_SUPPLIER', 'supplier', created.id,
                `Created supplier: ${created.name}`);

            return created;
        }),
        { rateLimiter: getRateLimiterForHandler('db:suppliers:create') }
    );

    // UPDATE
    registerIPCHandler('db:suppliers:update',
        requirePermission('suppliers.manage', (_, ctx, id: number, updates: unknown) => {
            const validatedId = supplierIdSchema.parse(id);
            const validated = updateSupplierSchema.parse(updates);

            const updated = updateSupplier(validatedId, validated);

            auditAction(ctx, 'UPDATE_SUPPLIER', 'supplier', validatedId,
                `Updated supplier ID ${validatedId}`);

            return updated;
        }),
        { rateLimiter: getRateLimiterForHandler('db:suppliers:update') }
    );

    // DELETE
    registerIPCHandler('db:suppliers:delete',
        requirePermission('suppliers.manage', (_, ctx, id: number) => {
            const validatedId = supplierIdSchema.parse(id);
            const supplier = getSupplierById(validatedId);

            deleteSupplier(validatedId);

            auditAction(ctx, 'DELETE_SUPPLIER', 'supplier', validatedId,
                `Deleted supplier: ${supplier?.name || 'Unknown'}`);
        }),
        { rateLimiter: getRateLimiterForHandler('db:suppliers:delete') }
    );
}

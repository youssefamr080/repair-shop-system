/**
 * Customers IPC Handlers - Mayo Fix Enterprise
 * 
 * Handles all customer-related IPC operations from the renderer process.
 */

import { z } from 'zod';
import * as customersDb from '../database/customers';
import { registerIPCHandler, getRateLimiterForHandler } from '../utils/ipcWrapper';
import { requirePermission, auditAction } from '../middleware/auth';
import { logger } from '../utils/logger';

// Validation Schemas
const customerIdSchema = z.number().int().positive();

const createCustomerSchema = z.object({
    name: z.string().min(1, 'اسم العميل مطلوب').max(200),
    phone: z.string().max(20).nullable().optional(),
    email: z.string().email().max(100).nullable().optional(),
    address: z.string().max(500).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const listCustomersSchema = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    isActive: z.boolean().optional(),
});

/**
 * Setup all customer-related IPC handlers
 */
export function setupCustomerHandlers(): void {
    // ============ GET ALL CUSTOMERS ============
    registerIPCHandler('db:customers:getAll',
        requirePermission('suppliers.view', () => customersDb.getAllCustomers()),
        { rateLimiter: getRateLimiterForHandler('db:customers:getAll') }
    );

    // ============ LIST CUSTOMERS (PAGINATED) ============
    registerIPCHandler('db:customers:list',
        requirePermission('suppliers.view', (_, _ctx, params: unknown) => {
            const validated = listCustomersSchema.parse(params || {});
            return customersDb.listCustomers(validated);
        }),
        { rateLimiter: getRateLimiterForHandler('db:customers:list') }
    );

    // ============ GET CUSTOMER BY ID ============
    registerIPCHandler('db:customers:getById',
        requirePermission('suppliers.view', (_, _ctx, id: number) => {
            return customersDb.getCustomerById(customerIdSchema.parse(id));
        }),
        { rateLimiter: getRateLimiterForHandler('db:customers:getById') }
    );

    // ============ GET CUSTOMER BY PHONE ============
    registerIPCHandler('db:customers:getByPhone',
        requirePermission('suppliers.view', (_, _ctx, phone: string) => {
            return customersDb.getCustomerByPhone(phone);
        }),
        { rateLimiter: getRateLimiterForHandler('db:customers:getByPhone') }
    );

    // ============ SEARCH CUSTOMERS (AUTOCOMPLETE) ============
    registerIPCHandler('db:customers:search',
        requirePermission('suppliers.view', (_, _ctx, query: string, limit?: number) => {
            return customersDb.searchCustomers(query, limit);
        }),
        { rateLimiter: getRateLimiterForHandler('db:customers:search') }
    );

    // ============ CREATE CUSTOMER ============
    registerIPCHandler('db:customers:create',
        requirePermission('suppliers.manage', (_, ctx, data: unknown) => {
            const validated = createCustomerSchema.parse(data);

            try {
                const customer = customersDb.createCustomer(validated);

                auditAction(ctx, 'CREATE_CUSTOMER', 'customer', customer.id,
                    `Created customer: ${customer.name}`);

                logger.info(`Customer created: ${customer.name}`, 'Customers');
                return customer;
            } catch (error: any) {
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint failed')) {
                    throw new Error('رقم الهاتف مسجل مسبقاً لعميل آخر');
                }
                throw error;
            }
        }),
        { rateLimiter: getRateLimiterForHandler('db:customers:create') }
    );

    // ============ UPDATE CUSTOMER ============
    registerIPCHandler('db:customers:update',
        requirePermission('suppliers.manage', (_, ctx, id: number, data: unknown) => {
            const validatedId = customerIdSchema.parse(id);
            const validated = updateCustomerSchema.parse(data);

            try {
                const customer = customersDb.updateCustomer(validatedId, validated);

                if (customer) {
                    auditAction(ctx, 'UPDATE_CUSTOMER', 'customer', validatedId,
                        `Updated customer: ${customer.name}`);
                    logger.info(`Customer updated: ${customer.name}`, 'Customers');
                }

                return customer;
            } catch (error: any) {
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint failed')) {
                    throw new Error('رقم الهاتف مسجل مسبقاً لعميل آخر');
                }
                throw error;
            }
        }),
        { rateLimiter: getRateLimiterForHandler('db:customers:update') }
    );

    // ============ DELETE CUSTOMER ============
    registerIPCHandler('db:customers:delete',
        requirePermission('suppliers.manage', (_, ctx, id: number) => {
            const validatedId = customerIdSchema.parse(id);
            const customer = customersDb.getCustomerById(validatedId);
            const success = customersDb.deleteCustomer(validatedId);

            if (success && customer) {
                auditAction(ctx, 'DELETE_CUSTOMER', 'customer', validatedId,
                    `Deleted customer: ${customer.name}`);
                logger.info(`Customer deleted: ${customer.name}`, 'Customers');
            }

            return success;
        }),
        { rateLimiter: getRateLimiterForHandler('db:customers:delete') }
    );

    // ============ ADD CUSTOMER TRANSACTION (PAYMENT/DEBT) ============
    // V10: Financial Logic
    const transactionSchema = z.object({
        customer_id: z.number().int().positive(),
        type: z.enum(['DEBIT', 'CREDIT']), // DEBIT = Charge (Debt), CREDIT = Payment (Pay)
        amount: z.number().positive(),
        reference_type: z.enum(['REPAIR', 'PAYMENT', 'MANUAL_ADJUSTMENT']),
        reference_id: z.string().optional(),
        notes: z.string().optional()
    });

    registerIPCHandler('db:customers:addTransaction',
        requirePermission('suppliers.manage', async (_, ctx, data: unknown) => {
            const validated = transactionSchema.parse(data);
            const { customer_id, type, amount } = validated;

            // Check customer existence
            const customer = customersDb.getCustomerById(customer_id);
            if (!customer) throw new Error('Customer not found');

            // 1. Create Transaction Record
            const transId = require('crypto').randomUUID(); // Ensure uuid is available or use helper
            // We'll use uuidv4 if available, or just crypto

            // 2. Update Customer Balance
            // CREDIT (Payment) -> Balance increases (or debt decreases)
            // DEBIT (Charge) -> Balance decreases (Debt increases)
            // Wait, standard accounting:
            // Asset: Receivables.
            // Debit increases Receivables (They owe us more).
            // Credit decreases Receivables (They paid us).
            // So:
            // DEBIT = Add to Balance (They owe us)
            // CREDIT = Subtract from Balance (They paid us)
            // BUT wait, my previous logic in Customers.tsx was:
            // < 0 is DEBIT (They owe us). 
            // Let's stick to standard signed numbers:
            // Positive Balance = Store Credit (We owe them).
            // Negative Balance = Debt (They owe us).
            // So:
            // PAYMENT (Credit) -> Adds to balance.
            // SERVICE (Debit) -> Subtracts from balance.

            const adjustment = type === 'CREDIT' ? amount : -amount;

            // Execute in Transaction
            const result = customersDb.runTransaction((db) => {
                db.prepare(`
                    INSERT INTO customer_transactions (id, customer_id, type, amount, reference_type, reference_id, notes, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 `).run(transId, customer_id, type, amount, validated.reference_type, validated.reference_id, validated.notes, ctx.user.id);

                db.prepare(`
                    UPDATE customers 
                    SET balance = balance + ? 
                    WHERE id = ?
                 `).run(adjustment, customer_id);

                return { success: true, newBalance: (customer.balance || 0) + adjustment };
            });

            auditAction(ctx, 'ADD_TRANSACTION', 'customer', customer_id,
                `${type} ${amount} for ${customer.name}`);

            return result;
        }),
        { rateLimiter: getRateLimiterForHandler('db:customers:update') } // Share limit
    );

    logger.info('Customer handlers registered', 'Handlers');
}

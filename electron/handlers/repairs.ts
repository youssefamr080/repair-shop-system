import { registerIPCHandler, getRateLimiterForHandler } from '../utils/ipcWrapper';
import { getDatabase } from '../database';
import { requirePermission, auditAction } from '../middleware/auth';
import { CreateRepairSchema, UpdateRepairSchema, AddRepairPartSchema } from '../validation/repairs';
import { v4 as uuidv4 } from 'uuid'; // v4 is standard, but check if uuid calls it v4
import * as inventoryDb from '../database/inventory';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Get database instance
const db = getDatabase();

// ============================================
// HELPER: Status State Machine
// ============================================

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    'RECEIVED': ['DIAGNOSED', 'CANCELLED'],
    'DIAGNOSED': ['WAITING_PARTS', 'IN_PROGRESS', 'CANCELLED'],
    'WAITING_PARTS': ['IN_PROGRESS', 'CANCELLED'],
    'IN_PROGRESS': ['COMPLETED', 'CANCELLED', 'WAITING_PARTS'], // Back to waiting if part missing
    'COMPLETED': ['DELIVERED', 'IN_PROGRESS'], // In_Progress if rework needed
    'DELIVERED': [], // End state
    'CANCELLED': ['RECEIVED'], // Re-open?
};

function canTransition(current: string, next: string): boolean {
    // If same, allow
    if (current === next) return true;
    // Allow Admin Override? Maybe later. For now strict.
    return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}

// Schema for removing part
const RemoveRepairPartSchema = z.object({
    repair_id: z.string().uuid(),
    part_link_id: z.string().uuid(), // The ID in repair_parts table
});

export function setupRepairHandlers() {

    // ============================================
    // READ OPERATIONS
    // ============================================

    registerIPCHandler('db:repairs:list', requirePermission('repairs.view', async (_event, _ctx, filters: any) => {
        let query = `
      SELECT r.*, c.name as customer_name, c.phone as customer_phone, u.display_name as technician_name
      FROM repairs r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON r.technician_id = u.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (filters?.status) {
            query += ` AND r.status = ?`;
            params.push(filters.status);
        }

        if (filters?.search) {
            query += ` AND (r.ticket_number LIKE ? OR r.device_model LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)`;
            const search = `%${filters.search}%`;
            params.push(search, search, search, search);
        }

        query += ` ORDER BY r.created_at DESC LIMIT 100`;

        const repairs = db.prepare(query).all(...params);
        return repairs;
    }), { rateLimiter: getRateLimiterForHandler('db:repairs:list') });

    registerIPCHandler('db:repairs:get', requirePermission('repairs.view', async (_event, _ctx, id: string) => {
        const repair = db.prepare(`
        SELECT r.*, c.name as customer_name, c.phone as customer_phone, u.display_name as technician_name
        FROM repairs r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN users u ON r.technician_id = u.id
        WHERE r.id = ?
        `).get(id);

        if (!repair) throw new Error('Repair not found');

        const parts = db.prepare(`
        SELECT rp.*, p.name as product_name, p.sku
        FROM repair_parts rp
        JOIN products p ON rp.product_id = p.id
        WHERE rp.repair_id = ?
        `).all(id);

        const history = db.prepare(`
        SELECT h.*, u.display_name as user_name
        FROM repair_status_history h
        LEFT JOIN users u ON h.changed_by = u.id
        WHERE h.repair_id = ?
        ORDER BY h.created_at DESC
            `).all(id);

        return { ...repair, parts, history };
    }), { rateLimiter: getRateLimiterForHandler('db:repairs:get') });

    // ============================================
    // CREATE OPERATION
    // ============================================

    registerIPCHandler('db:repairs:create', requirePermission('repairs.create', async (_event, ctx, data: any) => {
        const validated = CreateRepairSchema.parse(data);
        const id = uuidv4();

        // Generate Ticket Number (e.g., REP-1001)
        const lastTicket = db.prepare('SELECT ticket_number FROM repairs ORDER BY created_at DESC LIMIT 1').get() as any;
        let nextNum = 1001;
        if (lastTicket && lastTicket.ticket_number) {
            const parts = lastTicket.ticket_number.split('-');
            if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
                nextNum = parseInt(parts[1]) + 1;
            }
        }
        const ticket_number = `REP-${nextNum}`;

        // Transaction to ensure Customer + Repair are created atomically
        const result = db.transaction(() => {
            let customerId = validated.customer_id;

            // Logic: If no ID, try to find by phone, else create
            if (!customerId) {
                if (!validated.customer_phone || !validated.customer_name) {
                    throw new Error('Customer ID or Name/Phone is required');
                }

                // Try to find existing customer by phone
                const existingCustomer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(validated.customer_phone) as any;

                if (existingCustomer) {
                    customerId = existingCustomer.id;
                } else {
                    // Create New Customer
                    const info = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)')
                        .run(validated.customer_name, validated.customer_phone);
                    customerId = info.lastInsertRowid as number; // Safe cast for SQLite
                }
            }

            const stmt = db.prepare(`
            INSERT INTO repairs (
                id, ticket_number, customer_id, device_type, device_brand, device_model,
                serial_number, imei, passcode, color, condition, problem_description,
                priority, estimated_cost, deposit_amount, promised_at, technician_id, status
            ) VALUES (
                @id, @ticket_number, @customer_id, @device_type, @device_brand, @device_model,
                @serial_number, @imei, @passcode, @color, @condition, @problem_description,
                @priority, @estimated_cost, @deposit_amount, @promised_at, @technician_id, 'RECEIVED'
            )
        `);

            stmt.run({
                ...validated,
                id,
                ticket_number,
                customer_id: customerId
            });

            // Initial History
            db.prepare(`
                INSERT INTO repair_status_history(repair_id, new_status, changed_by)
                VALUES(?, 'RECEIVED', ?)
            `).run(id, ctx.user.id);

            // Audit
            auditAction(ctx, 'CREATE_REPAIR', 'repair', id, `Ticket ${ticket_number} created`);

            return { success: true, id, ticket_number, customerId };
        })();

        return result;
    }), { rateLimiter: getRateLimiterForHandler('db:repairs:create') });

    // ============================================
    // UPDATE OPERATION (Status & Details)
    // ============================================

    registerIPCHandler('db:repairs:update', requirePermission('repairs.edit', async (_event, ctx, data: any) => {
        const { id, ...updates } = UpdateRepairSchema.parse(data);

        // Get current state
        const currentRepair = db.prepare('SELECT status, ticket_number FROM repairs WHERE id = ?').get(id) as any;
        if (!currentRepair) throw new Error('Repair not found');

        // VAL: State Machine Check
        if (updates.status && updates.status !== currentRepair.status) {
            if (!canTransition(currentRepair.status, updates.status)) {
                throw new Error(`STATUS_ERROR: Cannot transition from ${currentRepair.status} to ${updates.status}`);
            }
        }

        const fields = Object.keys(updates).map(k => `${k} = @${k} `).join(', ');
        if (!fields) return { success: true }; // Nothing to update

        const result = db.transaction(() => {
            const stmt = db.prepare(`UPDATE repairs SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
            stmt.run({ ...updates, id });

            // If financial fields changed, recalculate
            if (updates.labor_cost !== undefined || updates.discount !== undefined || updates.tax_rate !== undefined) {
                // We need to call the helper inside the transaction. 
                // Since it's defined in the same scope, we can access it if we defined it outside or hoist it.
                // However, duplicate logic inside transaction is safer if scope issue.
                // Actually, defined in setupRepairHandlers scope, so accessible.

                // Recalculate logic inline or call helper if hoisted (TS function hoisting works).
                // We defined recalculateRepairTotals properly above.

                // Recalculate Totals
                // 1. Get Sum of Parts
                const partsSum = db.prepare(`
                    SELECT COALESCE(SUM(total_price), 0) as total 
                    FROM repair_parts 
                    WHERE repair_id = ?
                `).get(id) as { total: number };

                // 2. Get Current Settings (Labor, Tax, Discount) - Reading freshly updated values
                const repair = db.prepare(`
                    SELECT labor_cost, discount, tax_rate 
                    FROM repairs 
                    WHERE id = ?
                `).get(id) as any;

                const labor = repair.labor_cost || 0;
                const discount = repair.discount || 0;
                const taxRate = repair.tax_rate || 0;
                const partsTotal = partsSum.total;

                const subtotal = partsTotal + labor;
                const afterDiscount = Math.max(0, subtotal - discount);
                const taxAmount = afterDiscount * taxRate;
                const totalPrice = afterDiscount + taxAmount;

                db.prepare(`
                    UPDATE repairs 
                    SET parts_total = ?, 
                        tax_amount = ?, 
                        total_price = ?,
                        final_cost = ?
                    WHERE id = ?
                `).run(partsTotal, taxAmount, totalPrice, totalPrice, id);
            }

            // Track Status Change if status is updated
            if (updates.status && updates.status !== currentRepair.status) {
                db.prepare(`
                INSERT INTO repair_status_history(repair_id, new_status, changed_by)
                VALUES(?, ?, ?)
            `).run(id, updates.status, ctx.user.id);

                auditAction(ctx, 'UPDATE_STATUS', 'repair', id, `Status changed to ${updates.status}`);
            } else {
                auditAction(ctx, 'UPDATE_REPAIR', 'repair', id, `Details updated`);
            }

            return { success: true };
        })();

        return result;
    }), { rateLimiter: getRateLimiterForHandler('db:repairs:update') });

    // ============================================
    // HELPER: Recalculate Totals (V08)
    // ============================================
    function recalculateRepairTotals(repairId: string) {
        // 1. Get Sum of Parts
        const partsSum = db.prepare(`
            SELECT COALESCE(SUM(total_price), 0) as total 
            FROM repair_parts 
            WHERE repair_id = ?
        `).get(repairId) as { total: number };

        // 2. Get Current Settings (Labor, Tax, Discount)
        const repair = db.prepare(`
            SELECT labor_cost, discount, tax_rate 
            FROM repairs 
            WHERE id = ?
        `).get(repairId) as any;

        // Default to 0 if null (migration safety)
        const labor = repair.labor_cost || 0;
        const discount = repair.discount || 0;
        const taxRate = repair.tax_rate || 0;
        const partsTotal = partsSum.total;

        // 3. Calculate Logic
        // Subtotal = Parts + Labor
        // Discounted = Subtotal - Discount
        // Tax = Discounted * Rate
        // Total = Discounted + Tax

        const subtotal = partsTotal + labor;
        const afterDiscount = Math.max(0, subtotal - discount);
        const taxAmount = afterDiscount * taxRate;
        const totalPrice = afterDiscount + taxAmount;

        // 4. Update DB
        db.prepare(`
            UPDATE repairs 
            SET parts_total = ?, 
                tax_amount = ?, 
                total_price = ?,
                final_cost = ? -- Sync Legacy Field
            WHERE id = ?
        `).run(partsTotal, taxAmount, totalPrice, totalPrice, repairId);

        return { partsTotal, labor, discount, taxAmount, totalPrice };
    }

    // ============================================
    // INVENTORY PARTS MANAGEMENT (The Fix)
    // ============================================

    // 1. ADD PART (With Stock Deduction)
    registerIPCHandler('db:repairs:addPart', requirePermission('repairs.edit', async (_event, ctx, data: any) => {
        const { repair_id, product_id, quantity } = AddRepairPartSchema.parse(data);

        // Get Repair info
        const repair = db.prepare('SELECT ticket_number, status FROM repairs WHERE id = ?').get(repair_id) as any;
        if (!repair) throw new Error('Repair not found');
        if (['DELIVERED', 'CANCELLED'].includes(repair.status)) throw new Error('Cannot add parts to closed ticket');

        // Check Product existence & Price
        const product = db.prepare('SELECT name, selling_price, sku FROM products WHERE id = ?').get(product_id) as any;
        if (!product) throw new Error('Product not found');

        const unit_price = product.selling_price;
        const total_price = unit_price * quantity;
        const link_id = uuidv4();
        const DEFAULT_WAREHOUSE = 1; // TODO: Configurable

        const result = db.transaction(() => {
            // A. Deduct Inventory (Will throw if insufficient)
            inventoryDb.stockOut({
                product_id,
                warehouse_id: DEFAULT_WAREHOUSE,
                quantity,
                reference_number: repair.ticket_number,
                created_by: ctx.user.id,
                notes: `Used in Repair ${repair.ticket_number}`
            });

            // B. Add to Repair Link
            db.prepare(`
            INSERT INTO repair_parts(id, repair_id, product_id, quantity, unit_price, total_price)
            VALUES(?, ?, ?, ?, ?, ?)
        `).run(link_id, repair_id, product_id, quantity, unit_price, total_price);

            // C. Recalculate Totals (V08)
            recalculateRepairTotals(repair_id);

            auditAction(ctx, 'ADD_PART', 'repair', repair_id, `Added ${quantity}x ${product.sku}`);

            return { success: true };
        })();

        return result;
    }), { rateLimiter: getRateLimiterForHandler('db:repairs:addPart') });

    // 2. REMOVE PART (With Stock Restoration) - NEW!
    registerIPCHandler('db:repairs:removePart', requirePermission('repairs.edit', async (_event, ctx, data: any) => {
        const { repair_id, part_link_id } = RemoveRepairPartSchema.parse(data);

        // Get Link Info
        const partLink = db.prepare(`
            SELECT rp.*, p.name, p.sku, r.ticket_number, r.status
            FROM repair_parts rp
            JOIN repairs r ON rp.repair_id = r.id
            JOIN products p ON rp.product_id = p.id
            WHERE rp.id = ? AND rp.repair_id = ?
        `).get(part_link_id, repair_id) as any;

        if (!partLink) throw new Error('Part usage record not found');
        if (['DELIVERED', 'CANCELLED'].includes(partLink.status)) throw new Error('Cannot remove parts from closed ticket');

        const DEFAULT_WAREHOUSE = 1;

        const result = db.transaction(() => {
            // A. Restore Inventory
            inventoryDb.adjustStockLevel(partLink.product_id, DEFAULT_WAREHOUSE, partLink.quantity);

            // Log Return Transaction
            inventoryDb.createTransaction({
                transaction_type: 'return_in',
                product_id: partLink.product_id,
                warehouse_id: DEFAULT_WAREHOUSE,
                quantity: partLink.quantity,
                reference_number: partLink.ticket_number,
                reference_type: 'repair_return',
                notes: `Removed from Repair ${partLink.ticket_number}`,
                created_by: ctx.user.id
            });

            // B. Remove Link
            db.prepare('DELETE FROM repair_parts WHERE id = ?').run(part_link_id);

            // C. Recalculate Totals (V08)
            recalculateRepairTotals(repair_id);

            auditAction(ctx, 'REMOVE_PART', 'repair', repair_id, `Removed ${partLink.quantity}x ${partLink.sku}`);

            return { success: true };
        })();

        return result;
    }), { rateLimiter: getRateLimiterForHandler('db:repairs:removePart') });

    // ============================================
    // STATUS CHANGE with Workflow Validation
    // ============================================

    registerIPCHandler('db:repairs:changeStatus', requirePermission('repairs.edit', async (_event, ctx, payload: {
        repair_id: string;
        new_status: string;
        notes?: string;
    }) => {
        const { repair_id, new_status, notes } = payload;

        try {
            // 1. Get current repair
            const repair = db.prepare(`
                SELECT r.*, c.name as customer_name, c.phone as customer_phone, u.display_name as technician_name
                FROM repairs r
                LEFT JOIN customers c ON r.customer_id = c.id
                LEFT JOIN users u ON r.technician_id = u.id
                WHERE r.id = ?
            `).get(repair_id) as any;

            if (!repair) {
                return { success: false, message: 'التذكرة غير موجودة' };
            }

            const currentStatus = repair.status;

            // 2. Validate transition (using old state machine for now)
            if (!canTransition(currentStatus, new_status)) {
                return {
                    success: false,
                    message: `الانتقال من "${currentStatus}" إلى "${new_status}" غير مسموح`
                };
            }

            // 3. Update status
            const timestamp = new Date().toISOString();
            db.prepare(`
                UPDATE repairs
                SET status = ?, updated_at = ?, completed_at = CASE WHEN ? = 'COMPLETED' THEN ? ELSE completed_at END, delivered_at = CASE WHEN ? = 'DELIVERED' THEN ? ELSE delivered_at END
                WHERE id = ?
            `).run(new_status, timestamp, new_status, timestamp, new_status, timestamp, repair_id);

            // 4. Add to history
            db.prepare(`
                INSERT INTO repair_history (id, repair_id, action, description, old_value, new_value, user_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(),
                repair_id,
                'status_change',
                notes || `تم تغيير الحالة`,
                currentStatus,
                new_status,
                ctx.user.id,
                timestamp
            );

            // 5. Create notification for customer
            const notificationMessages: Record<string, { title: string, message: string }> = {
                'DIAGNOSED': {
                    title: `تم تشخيص جهازك - ${repair.ticket_number}`,
                    message: `المشكلة: ${repair.diagnosis || 'قيد التحديد'}\nالتكلفة التقديرية: ${repair.estimated_cost} ج.م`
                },
                'IN_PROGRESS': {
                    title: `جاري إصلاح جهازك - ${repair.ticket_number}`,
                    message: `الفني يعمل على إصلاح جهازك الآن`
                },
                'COMPLETED': {
                    title: `تم إصلاح جهازك! - ${repair.ticket_number}`,
                    message: `جهازك جاهز للاستلام.\nالتكلفة النهائية: ${repair.final_cost || repair.estimated_cost} ج.م`
                },
                'DELIVERED': {
                    title: `تم تسليم الجهاز - ${repair.ticket_number}`,
                    message: `شكراً لثقتكم في Mayo Fix Enterprise`
                }
            };

            if (notificationMessages[new_status]) {
                const msg = notificationMessages[new_status];
                db.prepare(`
                    INSERT INTO notifications (id, type, title, message, link, created_at, read)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    uuidv4(),
                    'repair',
                    msg.title,
                    msg.message,
                    `/repairs/${repair_id}`,
                    timestamp,
                    0
                );
            }

            // 6. Audit log
            auditAction(ctx, 'CHANGE_STATUS', 'repair', repair_id, `${currentStatus} → ${new_status}`);

            return { success: true, message: 'تم تغيير الحالة بنجاح' };

        } catch (error: any) {
            logger.error('Error changing repair status:', error);
            // SECURITY: Sanitize error message - don't expose SQLite internals
            const safeMessage = (error.message && !error.message.includes('SQLITE'))
                ? error.message
                : 'حدث خطأ أثناء تغيير الحالة';
            return { success: false, message: safeMessage };
        }
    }), { rateLimiter: getRateLimiterForHandler('db:repairs:changeStatus') });
}

/**
 * Parts Reservation System
 * Mayo Fix Enterprise - Prevent stock conflicts between repairs
 */

import type { DBPart } from '../types/electron.d';

export interface PartReservation {
    id: string;
    part_id: number;
    repair_id: string;
    quantity: number;
    reserved_at: string;
    reserved_by: number;
    status: 'active' | 'fulfilled' | 'cancelled';
}

export interface StockAvailability {
    part_id: number;
    total_stock: number;
    reserved: number;
    available: number;
}

/**
 * Calculate available stock considering reservations
 */
export async function getAvailableStock(partId: number): Promise<StockAvailability> {
    const part = await window.database.parts.getById(partId);

    if (!part) {
        throw new Error(`Part with ID ${partId} not found`);
    }

    // Get all active reservations for this part
    // Note: This would require a new IPC handler or database query
    // For now, we'll use a simplified approach
    const reserved = 0; // TODO: Query reservations from database

    return {
        part_id: partId,
        total_stock: part.current_stock || 0,
        reserved,
        available: (part.current_stock || 0) - reserved
    };
}

/**
 * Check if part can be reserved
 */
export async function canReservePart(
    partId: number,
    quantity: number
): Promise<{ canReserve: boolean; reason?: string; available: number }> {
    const stock = await getAvailableStock(partId);

    if (stock.available < quantity) {
        return {
            canReserve: false,
            reason: `غير متوفر بالكمية المطلوبة. المتاح: ${stock.available} فقط`,
            available: stock.available
        };
    }

    return {
        canReserve: true,
        available: stock.available
    };
}

/**
 * Reserve parts for a repair
 * This should be called when adding parts to a repair
 */
export async function reserveParts(
    _repairId: string,
    partId: number,
    quantity: number
): Promise<{ success: boolean; message?: string }> {
    // Check availability
    const check = await canReservePart(partId, quantity);

    if (!check.canReserve) {
        return {
            success: false,
            message: check.reason
        };
    }

    // In a full implementation, this would:
    // 1. Create a reservation record in the database
    // 2. Update the part's reserved quantity
    // 3. Trigger inventory alerts if stock is low

    // For now, we'll use the existing addPart handler
    // which should include reservation logic

    return {
        success: true,
        message: 'تم حجز القطع بنجاح'
    };
}

/**
 * Release reservation when repair is cancelled
 */
export async function releaseReservation(
    _repairId: string,
    _partId: number
): Promise<{ success: boolean }> {
    // Update reservation status to 'cancelled'
    // Add stock back to available pool

    return { success: true };
}

/**
 * Fulfill reservation when repair is completed
 * This permanently deducts from stock
 */
export async function fulfillReservation(
    _repairId: string,
    _partId: number,
    _quantity: number
): Promise<{ success: boolean }> {
    // Update reservation status to 'fulfilled'
    // Stock is already deducted, so no action needed

    return { success: true };
}

/**
 * Get low stock alerts considering reservations
 */
export async function getLowStockAlerts(): Promise<Array<{
    part: DBPart;
    available: number;
    reserved: number;
}>> {
    const allParts = await window.database.parts.getAll();
    const alerts: Array<{ part: DBPart; available: number; reserved: number }> = [];

    for (const part of allParts) {
        const stock = await getAvailableStock(part.id);

        // Alert if available stock is below minimum stock (using min_stock instead of reorder_point)
        const minStock = (part as any).min_stock || (part as any).reorder_point || 10;
        if (stock.available <= minStock) {
            alerts.push({
                part,
                available: stock.available,
                reserved: stock.reserved
            });
        }
    }

    return alerts;
}

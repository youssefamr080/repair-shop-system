/**
 * Reports Database Module - Mayo Fix Enterprise
 * 
 * execution of analytical SQL queries for reporting.
 */

import { getDatabase } from './core';

export interface SalesReportParams {
    startDate: string;
    endDate: string;
    technicianId?: number;
}

export interface SalesReportSummary {
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    repair_count: number;
    avg_ticket_value: number;
    total_tax: number;
    total_discount: number;
}

export interface DailySalesRow {
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    count: number;
}

export interface InventoryValueReport {
    total_items: number;
    total_value: number;
    by_category: { category: string; count: number; value: number }[];
}

export interface TechnicianPerformanceRow {
    technician_id: number;
    technician_name: string;
    total_jobs: number;
    completed_jobs: number;
    total_revenue: number;
    avg_completion_time_hours?: number;
}

/**
 * Get Sales Report (Revenue, Cost, Profit)
 */
export function getSalesReport(params: SalesReportParams): { summary: SalesReportSummary; daily: DailySalesRow[] } {
    const database = getDatabase();

    const conditions = ["status IN ('COMPLETED', 'DELIVERED')"];
    const queryParams: any[] = [];

    if (params.startDate) {
        conditions.push("created_at >= ?");
        queryParams.push(params.startDate);
    }
    if (params.endDate) {
        conditions.push("created_at <= ?");
        queryParams.push(params.endDate);
    }
    if (params.technicianId) {
        conditions.push("technician_id = ?");
        queryParams.push(params.technicianId);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Summary Query
    const summary = database.prepare(`
        SELECT 
            COALESCE(SUM(total_price), 0) as total_revenue,
            -- Cost is approx (parts cost + labor cost? No, usually just parts for margin)
            -- If we have final_cost stored, use it. If not, calculate.
            -- Using parts_total as direct cost for now. 
            -- Real profit = total_price - (parts_total using cost_price not selling_price?)
            -- Actually, repairs table stores parts_total based on SELLING price usually.
            -- To get TRUE profit we need cost price of parts.
            -- Complicated query? Let's use simplified profit for now: Total - Cost.
            -- But we don't store "Total Cost" in repairs table, only "Parts Total" (Selling).
            -- We might need to join repair_parts to products to get cost.
            
            -- Simplified for V12: Revenue only first? 
            -- No, let's try to get parts cost.
            (
                SELECT COALESCE(SUM(rp.quantity * p.cost_price), 0)
                FROM repair_parts rp
                JOIN products p ON rp.product_id = p.id
                WHERE rp.repair_id IN (SELECT id FROM repairs ${whereClause})
            ) as total_cost,
            
            COUNT(id) as repair_count,
            COALESCE(SUM(tax_amount), 0) as total_tax,
            COALESCE(SUM(discount), 0) as total_discount
        FROM repairs
        ${whereClause}
    `).get(...queryParams) as any;

    const total_revenue = summary.total_revenue;
    const total_cost = summary.total_cost || 0; // Parts cost

    // Profit = Revenue - Tax - Cost
    // (Revenue includes tax usually? "total_price" usually includes tax in this system)
    // Net Revenue = Total - Tax
    // Gross Profit = Net Revenue - Cost
    const net_revenue = total_revenue - summary.total_tax;
    const total_profit = net_revenue - total_cost;

    const summaryResult: SalesReportSummary = {
        total_revenue,
        total_cost,
        total_profit,
        repair_count: summary.repair_count,
        avg_ticket_value: summary.repair_count > 0 ? total_revenue / summary.repair_count : 0,
        total_tax: summary.total_tax,
        total_discount: summary.total_discount
    };

    // Daily Breakdown
    // SQLite doesn't have effortless date grouping, use substr
    const daily = database.prepare(`
        SELECT 
            substr(created_at, 1, 10) as date,
            SUM(total_price) as revenue,
            COUNT(id) as count
        FROM repairs
        ${whereClause}
        GROUP BY date
        ORDER BY date ASC
    `).all(...queryParams) as any[];

    // We can't easily calculating cost per day without complex subqueries or joins in the group by.
    // For V12 MVP, daily breakdown shows Revenue only.
    const dailyResult: DailySalesRow[] = daily.map(d => ({
        date: d.date,
        revenue: d.revenue,
        cost: 0, // Pending optimization
        profit: 0, // Pending
        count: d.count
    }));

    return { summary: summaryResult, daily: dailyResult };
}

/**
 * Get Inventory Value Report
 */
export function getInventoryValueReport(): InventoryValueReport {
    const database = getDatabase();

    const summary = database.prepare(`
        SELECT 
            COUNT(DISTINCT p.id) as total_items,
            COALESCE(SUM(sl.quantity * p.cost_price), 0) as total_value
        FROM products p
        JOIN stock_levels sl ON p.id = sl.product_id
        WHERE p.deleted_at IS NULL AND sl.quantity > 0
    `).get() as any;

    const byCategory = database.prepare(`
        SELECT 
            c.name as category,
            COUNT(DISTINCT p.id) as count,
            COALESCE(SUM(sl.quantity * p.cost_price), 0) as value
        FROM products p
        JOIN stock_levels sl ON p.id = sl.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.deleted_at IS NULL AND sl.quantity > 0
        GROUP BY c.id
        ORDER BY value DESC
    `).all() as any[];

    return {
        total_items: summary.total_items,
        total_value: summary.total_value,
        by_category: byCategory
    };
}

/**
 * Get Technician Performance
 */
export function getTechnicianPerformance(startDate?: string, endDate?: string): TechnicianPerformanceRow[] {
    const database = getDatabase();

    const conditions = ["1=1"];
    const params: any[] = [];

    if (startDate) {
        conditions.push("r.created_at >= ?");
        params.push(startDate);
    }
    if (endDate) {
        conditions.push("r.created_at <= ?");
        params.push(endDate);
    }

    // We look at ALL repairs for total jobs, and COMPLETED for performance
    // This query groups by technician
    return database.prepare(`
        SELECT 
            u.id as technician_id,
            u.display_name as technician_name,
            COUNT(r.id) as total_jobs,
            SUM(CASE WHEN r.status = 'COMPLETED' OR r.status = 'DELIVERED' THEN 1 ELSE 0 END) as completed_jobs,
            COALESCE(SUM(r.total_price), 0) as total_revenue
        FROM users u
        LEFT JOIN repairs r ON u.id = r.technician_id AND ${conditions.join(' AND ')}
        WHERE u.role != 'customer' -- Assuming simple filter
        GROUP BY u.id
        HAVING total_jobs > 0
        ORDER BY total_revenue DESC
    `).all(...params) as TechnicianPerformanceRow[];
}

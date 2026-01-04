/**
 * Reports IPC Handlers
 */

import { z } from 'zod';
import * as reportsDb from '../database/reports';
import { registerIPCHandler, getRateLimiterForHandler } from '../utils/ipcWrapper';
import { requirePermission } from '../middleware/auth';
import { logger } from '../utils/logger';

const reportDateSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    technicianId: z.number().optional()
});

export function setupReportHandlers(): void {

    // SALES REPORT
    registerIPCHandler('db:reports:getSales',
        requirePermission('reports.view', async (_, _ctx, params: unknown) => {
            const validated = reportDateSchema.parse(params || {});
            // Default to current month if not specified? 
            // For now let logic handle empty as "All Time" or frontend sends dates.
            // But usually infinite query is bad.
            // Let's enforce startDate defaults in frontend, or backend.
            // Validation passes optional, database handles it.
            return reportsDb.getSalesReport({
                startDate: validated.startDate || '',
                endDate: validated.endDate || '',
                technicianId: validated.technicianId
            });
        }),
        { rateLimiter: getRateLimiterForHandler('db:reports:getSales') }
    );

    // INVENTORY VALUE REPORT
    registerIPCHandler('db:reports:getInventoryValue',
        requirePermission('reports.view', async () => {
            return reportsDb.getInventoryValueReport();
        }),
        { rateLimiter: getRateLimiterForHandler('db:reports:getInventoryValue') }
    );

    // TECHNICIAN PERFORMANCE
    registerIPCHandler('db:reports:getTechnicianStats',
        requirePermission('reports.view', async (_, _ctx, params: unknown) => {
            const validated = reportDateSchema.parse(params || {});
            return reportsDb.getTechnicianPerformance(validated.startDate, validated.endDate);
        }),
        { rateLimiter: getRateLimiterForHandler('db:reports:getTechnicianStats') }
    );

    logger.info('Reports handlers registered', 'Handlers');
}

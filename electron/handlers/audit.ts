/**
 * IPC Handlers for Audit Logs
 * 
 * Track V2.7: System Audit Logs (The Black Box)
 * 
 * SECURED: All handlers use requirePermission middleware
 * NOTE: Audit log viewing is restricted to admin users
 */

import {
  createAuditLog,
  getAllAuditLogs,
  getFilteredAuditLogs,
  getAuditEntityTypes,
  getAuditActionTypes,
  clearOldAuditLogs,
  deleteAuditLog,
  type AuditLogFilter,
} from '../database';
import { registerIPCHandler, getRateLimiterForHandler } from '../utils/ipcWrapper';
import { requirePermission } from '../middleware/auth';
import { logAudit } from '../database/audit';

export function setupAuditHandlers(): void {
  // NOTE: Direct audit creation from frontend is restricted
  // Audit logs should be created via auditAction() in handlers
  // This uses audit.clear as it's a dangerous write operation
  registerIPCHandler('db:audit:create',
    requirePermission('audit.clear', (_, _ctx, log) => {
      return createAuditLog(log);
    }),
    { rateLimiter: getRateLimiterForHandler('db:audit:create') }
  );

  // Viewing audit logs requires dedicated audit.view permission
  registerIPCHandler('db:audit:getAll',
    requirePermission('audit.view', (_, _ctx, limit?: number) => {
      return getAllAuditLogs(limit);
    }),
    { rateLimiter: getRateLimiterForHandler('db:audit:getAll') }
  );

  // Get filtered audit logs with pagination
  // NOTE: We do NOT log VIEW actions for audit logs (would be noisy)
  registerIPCHandler('db:audit:getFiltered',
    requirePermission('audit.view', (_, _ctx, filter: AuditLogFilter) => {
      return getFilteredAuditLogs(filter);
    }),
    { rateLimiter: getRateLimiterForHandler('db:audit:getFiltered') }
  );

  // Get available entity types for filter dropdown
  registerIPCHandler('db:audit:getEntityTypes',
    requirePermission('audit.view', () => {
      return getAuditEntityTypes();
    }),
    { rateLimiter: getRateLimiterForHandler('db:audit:getEntityTypes') }
  );

  // Get available action types for filter dropdown
  registerIPCHandler('db:audit:getActionTypes',
    requirePermission('audit.view', () => {
      return getAuditActionTypes();
    }),
    { rateLimiter: getRateLimiterForHandler('db:audit:getActionTypes') }
  );

  // Clear old audit logs (DANGEROUS - admin only)
  registerIPCHandler('db:audit:clearOld',
    requirePermission('audit.clear', (_, ctx, olderThanDays: number) => {
      // This is a dangerous operation, log it
      logAudit({
        action: 'DELETE',
        entity_type: 'AuditLogs',
        user_id: ctx?.user?.id,
        user_name: ctx?.user?.username,
        details: `مسح سجلات قديمة أقدم من ${olderThanDays} يوم`,
      });
      return clearOldAuditLogs(olderThanDays);
    }),
    { rateLimiter: getRateLimiterForHandler('db:audit:clearOld') }
  );

  // Delete single audit log (DANGEROUS - admin only)
  // H1 FIX: Now logs BEFORE deletion to prevent audit evasion
  registerIPCHandler('db:audit:delete',
    requirePermission('audit.clear', (_, ctx, id: number) => {
      // Log the deletion BEFORE it happens (prevents audit evasion)
      logAudit({
        action: 'AUDIT_LOG_DELETED',
        entity_type: 'AuditLogs',
        entity_id: id,
        user_id: ctx?.user?.id,
        user_name: ctx?.user?.username,
        details: `حذف سجل تدقيق رقم ${id}`,
      });
      return deleteAuditLog(id);
    }),
    { rateLimiter: getRateLimiterForHandler('db:audit:delete') }
  );

  // Delete ALL audit logs (VERY DANGEROUS - DISABLED)
  // SECURITY FIX: This operation is blocked. Use clearOldAuditLogs instead.
  registerIPCHandler('db:audit:deleteAll',
    requirePermission('audit.clear', () => {
      // SECURITY: Block complete audit deletion to preserve forensic trail
      throw new Error('SECURITY_BLOCKED: Complete audit log deletion is disabled. Use clearOldAuditLogs with minimum 7-day retention instead.');
    }),
    { rateLimiter: getRateLimiterForHandler('db:audit:deleteAll') }
  );
}

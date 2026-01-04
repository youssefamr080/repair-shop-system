/**
 * Audit Logs Database Module
 * 
 * Track V2.7: System Audit Logs (The Black Box)
 * 
 * Features:
 * - Full audit trail for CREATE, UPDATE, DELETE actions
 * - User tracking for RBAC compliance
 * - Filtering by action type, entity, and date range
 */

import { getDatabase } from './core';

// =============================================================================
// TYPES
// =============================================================================

export interface DBAuditLog {
  id: number;
  action: string;            // CREATE, UPDATE, DELETE, LOGIN, etc.
  entity_type: string;       // Product, Category, Warehouse, Supplier, etc.
  entity_id: string | null;
  user_id: string | null;    // User ID who performed action
  user_name: string | null;  // Username for display
  details: string | null;    // Human-readable description
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogInput {
  action: string;
  entity_type: string;
  entity_id?: string | number;
  user_id?: number;
  user_name?: string;
  details?: string;
  ip_address?: string;
}

export interface AuditLogFilter {
  action_type?: string;      // CREATE, UPDATE, DELETE
  entity_type?: string;      // Employee, Shift, etc.
  start_date?: string;       // YYYY-MM-DD
  end_date?: string;         // YYYY-MM-DD
  search?: string;           // Search in details
  limit?: number;            // Default: 100
  offset?: number;           // For pagination
}

export interface AuditLogResult {
  logs: DBAuditLog[];
  total: number;
}

// =============================================================================
// QUERIES
// =============================================================================

const MAX_AUDIT_EXPORT_LIMIT = 10000; // P2-L5: Prevent memory exhaustion

/**
 * Get all audit logs with optional limit (simple version)
 * P2-L5: Hard limit to prevent memory exhaustion
 */
export function getAllAuditLogs(limit = 100): DBAuditLog[] {
  const database = getDatabase();
  const safeLimit = Math.min(limit, MAX_AUDIT_EXPORT_LIMIT);
  return database.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(safeLimit) as DBAuditLog[];
}

/**
 * Get audit logs with filtering and pagination
 */
export function getFilteredAuditLogs(filter: AuditLogFilter): AuditLogResult {
  const database = getDatabase();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Filter by action type
  if (filter.action_type) {
    conditions.push('action = ?');
    params.push(filter.action_type);
  }

  // Filter by entity type
  if (filter.entity_type) {
    conditions.push('entity_type = ?');
    params.push(filter.entity_type);
  }

  // Filter by date range
  if (filter.start_date) {
    conditions.push("date(created_at) >= ?");
    params.push(filter.start_date);
  }
  if (filter.end_date) {
    conditions.push("date(created_at) <= ?");
    params.push(filter.end_date);
  }

  // Search in details
  if (filter.search) {
    conditions.push('(details LIKE ? OR user_name LIKE ? OR entity_type LIKE ?)');
    const searchTerm = `%${filter.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`;
  const total = (database.prepare(countQuery).get(...params) as { count: number }).count;

  // Get paginated results
  const limit = filter.limit || 100;
  const offset = filter.offset || 0;

  const dataQuery = `
    SELECT * FROM audit_logs 
    ${whereClause} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `;

  const logs = database.prepare(dataQuery).all(...params, limit, offset) as DBAuditLog[];

  return { logs, total };
}

/**
 * Get distinct entity types for filter dropdown
 */
export function getAuditEntityTypes(): string[] {
  const database = getDatabase();
  const result = database.prepare('SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type').all() as { entity_type: string }[];
  return result.map(r => r.entity_type);
}

/**
 * Get distinct action types for filter dropdown
 */
export function getAuditActionTypes(): string[] {
  const database = getDatabase();
  const result = database.prepare('SELECT DISTINCT action FROM audit_logs ORDER BY action').all() as { action: string }[];
  return result.map(r => r.action);
}

// =============================================================================
// CREATE
// =============================================================================

/**
 * Create a new audit log entry
 */
export function createAuditLog(log: Omit<DBAuditLog, 'id' | 'created_at'>): DBAuditLog {
  const database = getDatabase();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO audit_logs (
      action, entity_type, entity_id, user_id, user_name, details, ip_address, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    log.action,
    log.entity_type,
    log.entity_id,
    log.user_id,
    log.user_name,
    log.details,
    log.ip_address,
    now
  );

  return database.prepare('SELECT * FROM audit_logs WHERE id = ?').get(result.lastInsertRowid) as DBAuditLog;
}

/**
 * Helper function to log an action with user context
 */
export function logAudit(input: AuditLogInput): DBAuditLog {
  return createAuditLog({
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id?.toString() || null,
    user_id: input.user_id?.toString() || null,
    user_name: input.user_name || null,
    details: input.details || null,
    ip_address: input.ip_address || null,
  });
}

// =============================================================================
// CLEAR (DANGEROUS)
// =============================================================================

/**
 * Clear audit logs older than specified days (DANGEROUS - requires special permission)
 */
export function clearOldAuditLogs(olderThanDays: number): number {
  const database = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffStr = cutoffDate.toISOString();

  const result = database.prepare('DELETE FROM audit_logs WHERE created_at < ?').run(cutoffStr);
  return result.changes;
}

/**
 * Delete a single audit log by ID (DANGEROUS - requires special permission)
 */
export function deleteAuditLog(id: number): boolean {
  const database = getDatabase();
  const result = database.prepare('DELETE FROM audit_logs WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Delete all audit logs (DANGEROUS - requires special permission)
 */
export function deleteAllAuditLogs(): number {
  const database = getDatabase();
  const result = database.prepare('DELETE FROM audit_logs').run();
  return result.changes;
}

/**
 * Authorization Middleware for IPC Handlers
 * 
 * This module provides secure wrappers for IPC handlers that:
 * 1. Validate user sessions before executing handlers
 * 2. Check user permissions against required permission codes
 * 3. Inject authenticated user context for audit logging
 * 
 * CRITICAL: All sensitive IPC handlers MUST use these wrappers
 */

import { IpcMainInvokeEvent } from 'electron';
import os from 'os';
import { validateSession as dbValidateSession } from '../database/sessions';
import { userHasPermission } from '../database/roles';
import { logAudit } from '../database/audit';
import { logger } from '../utils/logger';

// ============================================
// TYPES
// ============================================

export interface AuthenticatedUser {
    id: number;
    username: string;
    display_name: string;
    role_id: number;
    role_name: string;
    role_display_name: string;
}

export interface AuthContext {
    user: AuthenticatedUser;
    sessionId: string;
    ipAddress: string | null;
}

// Session storage - maps webContents ID to session ID
// This is set when user logs in via auth:login
const sessionStore = new Map<number, string>();

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Store session for a webContents (called after login)
 */
export function setSessionForSender(webContentsId: number, sessionId: string): void {
    sessionStore.set(webContentsId, sessionId);
    logger.info(`Session stored for webContents ${webContentsId}. Store now has ${sessionStore.size} entries. SessionId: ${sessionId.substring(0, 8)}...`, 'Auth');
}

/**
 * Clear session for a webContents (called after logout)
 */
export function clearSessionForSender(webContentsId: number): void {
    sessionStore.delete(webContentsId);
    logger.info(`Session cleared for webContents ${webContentsId}`, 'Auth');
}

/**
 * Get session ID from IPC event sender
 * Falls back to looking up via stored session if needed
 */
function getSessionFromEvent(event: IpcMainInvokeEvent): string | null {
    const webContentsId = event.sender.id;
    const sessionId = sessionStore.get(webContentsId) || null;

    // Debug logging
    if (!sessionId) {
        logger.warn(`No session in store for webContentsId ${webContentsId}. Store size: ${sessionStore.size}`, 'Auth');
    }

    return sessionId;
}

// ============================================
// AUTHORIZATION WRAPPERS
// ============================================

type HandlerFunction<TArgs extends unknown[], TResult> =
    (event: IpcMainInvokeEvent, ...args: TArgs) => TResult | Promise<TResult>;

type AuthenticatedHandlerFunction<TArgs extends unknown[], TResult> =
    (event: IpcMainInvokeEvent, ctx: AuthContext, ...args: TArgs) => TResult | Promise<TResult>;

export function requireAuth<TArgs extends unknown[], TResult>(
    handler: AuthenticatedHandlerFunction<TArgs, TResult>
): HandlerFunction<TArgs, TResult> {
    return async (event: IpcMainInvokeEvent, ...args: TArgs): Promise<TResult> => {
        const sessionId = getSessionFromEvent(event);

        if (!sessionId) {
            logger.warn('No session found for request', 'Auth');
            throw new Error('غير مصرح - يرجى تسجيل الدخول');
        }

        const session = dbValidateSession(sessionId);

        if (!session) {
            logger.warn(`Invalid session: ${sessionId}`, 'Auth');
            throw new Error('انتهت صلاحية الجلسة - يرجى تسجيل الدخول مجددًا');
        }

        const ctx: AuthContext = {
            user: {
                id: session.user_id,
                username: session.username,
                display_name: session.display_name,
                role_id: session.role_id,
                role_name: session.role_name,
                role_display_name: session.role_display_name,
            },
            sessionId,
            // 🔒 M2 FIX: Use actual hostname for better audit trails
            ipAddress: os.hostname() || 'LOCAL',
        };

        return handler(event, ctx, ...args);
    };
}

export function requirePermission<TArgs extends unknown[], TResult>(
    permissionCode: string,
    handler: AuthenticatedHandlerFunction<TArgs, TResult>
): HandlerFunction<TArgs, TResult> {
    return async (event: IpcMainInvokeEvent, ...args: TArgs): Promise<TResult> => {
        const sessionId = getSessionFromEvent(event);

        if (!sessionId) {
            logger.warn(`Permission check failed: no session (required: ${permissionCode})`, 'Auth');
            throw new Error('غير مصرح - يرجى تسجيل الدخول');
        }

        const session = dbValidateSession(sessionId);

        if (!session) {
            logger.warn(`Permission check failed: invalid session (required: ${permissionCode})`, 'Auth');
            throw new Error('انتهت صلاحية الجلسة - يرجى تسجيل الدخول مجددًا');
        }

        const isAdmin = session.is_system === 1;

        if (!isAdmin && !userHasPermission(session.user_id, permissionCode)) {
            // M1 FIX: Log details internally but don't expose to user
            logger.warn(
                `Permission denied: user ${session.username} (ID:${session.user_id}) lacks ${permissionCode}`,
                'Auth'
            );
            // Generic message for user (and potential attackers)
            throw new Error('عفواً، لا تملك الصلاحية لتنفيذ هذا الإجراء');
        }

        const ctx: AuthContext = {
            user: {
                id: session.user_id,
                username: session.username,
                display_name: session.display_name,
                role_id: session.role_id,
                role_name: session.role_name,
                role_display_name: session.role_display_name,
            },
            sessionId,
            // 🔒 M2 FIX: Use actual hostname for better audit trails
            ipAddress: os.hostname() || 'LOCAL',
        };

        return handler(event, ctx, ...args);
    };
}

// ============================================
// AUDIT HELPER
// ============================================

/**
 * Log an action with user context
 * Should be called after every successful CRUD operation
 */
export function auditAction(
    ctx: AuthContext,
    action: string,
    entityType: string,
    entityId?: string | number,
    details?: string
): void {
    try {
        logAudit({
            action,
            entity_type: entityType,
            entity_id: entityId,
            user_id: ctx.user.id,
            user_name: ctx.user.username,
            details,
            ip_address: ctx.ipAddress || undefined,
        });
    } catch (error) {
        // Log but don't fail the operation if audit fails
        logger.error('Failed to create audit log', 'Audit', error);
    }
}

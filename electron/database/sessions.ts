/**
 * Sessions Database Module
 * 
 * Handles user session management:
 * - 12 hour default duration
 * - 7 day "Remember Me" option
 * - Session validation and cleanup
 */

import { getDatabase } from './core';
import { randomUUID } from 'crypto';

// ============================================
// CONSTANTS
// ============================================

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;        // 12 hours
const REMEMBER_ME_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days (reduced from 7 for security)
const MAX_SESSIONS_PER_USER = 5;                         // P2-H3: Limit concurrent sessions

// ============================================
// TYPES
// ============================================

export interface Session {
    id: string;
    user_id: number;
    remember_me: number;
    created_at: string;
    expires_at: string;
    ip_address: string | null;
    user_agent: string | null;
}

export interface SessionWithUser extends Session {
    username: string;
    display_name: string;
    role_id: number;
    role_name: string;
    role_display_name: string;
    is_system: number; // P2-L1: For robust admin detection
}

// ============================================
// FUNCTIONS
// ============================================

/**
 * Create a new session
 * P2-H3: Enforces MAX_SESSIONS_PER_USER limit
 */
export function createSession(
    userId: number,
    rememberMe: boolean = false,
    ipAddress?: string,
    userAgent?: string
): Session {
    const db = getDatabase();

    // P2-H3: Enforce max sessions per user
    const existingSessions = getUserSessions(userId);
    if (existingSessions.length >= MAX_SESSIONS_PER_USER) {
        // Delete oldest sessions to make room
        const sessionsToDelete = existingSessions
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .slice(0, existingSessions.length - MAX_SESSIONS_PER_USER + 1);

        for (const session of sessionsToDelete) {
            deleteSession(session.id);
        }
    }

    const sessionId = randomUUID();
    const duration = rememberMe ? REMEMBER_ME_DURATION_MS : SESSION_DURATION_MS;
    const expiresAt = new Date(Date.now() + duration).toISOString();

    db.prepare(`
        INSERT INTO user_sessions (id, user_id, remember_me, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, userId, rememberMe ? 1 : 0, expiresAt, ipAddress || null, userAgent || null);

    return getSessionById(sessionId)!;
}

/**
 * Get session by ID
 */
export function getSessionById(id: string): Session | null {
    const db = getDatabase();
    return db.prepare('SELECT * FROM user_sessions WHERE id = ?').get(id) as Session | null;
}

/**
 * Validate session and get user info
 */
export function validateSession(sessionId: string): SessionWithUser | null {
    const db = getDatabase();

    const result = db.prepare(`
        SELECT 
            s.*,
            u.username,
            u.display_name,
            u.role_id,
            r.name as role_name,
            r.display_name_ar as role_display_name,
            r.is_system
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        JOIN roles r ON u.role_id = r.id
        WHERE s.id = ? 
        AND s.expires_at > datetime('now')
        AND u.is_active = 1
    `).get(sessionId) as SessionWithUser | null;

    return result;
}

/**
 * Extend session (on activity)
 */
export function extendSession(sessionId: string): boolean {
    const db = getDatabase();

    const session = getSessionById(sessionId);
    if (!session) return false;

    const duration = session.remember_me ? REMEMBER_ME_DURATION_MS : SESSION_DURATION_MS;
    const newExpiresAt = new Date(Date.now() + duration).toISOString();

    const result = db.prepare(`
        UPDATE user_sessions SET expires_at = ? WHERE id = ?
    `).run(newExpiresAt, sessionId);

    return result.changes > 0;
}

/**
 * Delete session (logout)
 */
export function deleteSession(sessionId: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM user_sessions WHERE id = ?').run(sessionId);
    return result.changes > 0;
}

/**
 * Delete all sessions for user (logout everywhere)
 */
export function deleteUserSessions(userId: number): number {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
    return result.changes;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): number {
    const db = getDatabase();
    const result = db.prepare(`
        DELETE FROM user_sessions WHERE expires_at < datetime('now')
    `).run();
    return result.changes;
}

/**
 * Get active sessions for user
 */
export function getUserSessions(userId: number): Session[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT * FROM user_sessions 
        WHERE user_id = ? AND expires_at > datetime('now')
        ORDER BY created_at DESC
    `).all(userId) as Session[];
}

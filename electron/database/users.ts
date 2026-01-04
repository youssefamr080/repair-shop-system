/**
 * Users Database Module
 * 
 * Handles CRUD operations for users with:
 * - Soft delete (is_active = 0)
 * - Password hashing (scrypt)
 * - Role assignment
 */

import { getDatabase } from './core';
import { generateSecureHash } from '../handlers/auth';
import { deleteUserSessions } from './sessions';

// ============================================
// TYPES
// ============================================

export interface User {
    id: number;
    username: string;
    display_name: string;
    role_id: number;
    role_name?: string;
    role_display_name?: string;
    is_active: number;
    last_login: string | null;
    failed_attempts: number;
    locked_until: string | null;
    created_by: number | null;
    created_at: string;
    updated_at: string;
}

export interface CreateUserDTO {
    username: string;
    password: string;
    display_name: string;
    role_id: number;
    created_by?: number;
}

export interface UpdateUserDTO {
    display_name?: string;
    role_id?: number;
    is_active?: number;
}

// ============================================
// FUNCTIONS
// ============================================

/**
 * Create a new user
 */
export function createUser(data: CreateUserDTO): User {
    const db = getDatabase();

    // Hash password (sync)
    const password_hash = generateSecureHash(data.password);

    const stmt = db.prepare(`
        INSERT INTO users (username, password_hash, display_name, role_id, created_by)
        VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        data.username.toLowerCase().trim(),
        password_hash,
        data.display_name.trim(),
        data.role_id,
        data.created_by || null
    );

    return getUserById(result.lastInsertRowid as number)!;
}

/**
 * Update user (excluding password)
 */
export function updateUser(id: number, data: UpdateUserDTO): User | null {
    const db = getDatabase();

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.display_name !== undefined) {
        updates.push('display_name = ?');
        values.push(data.display_name.trim());
    }
    if (data.role_id !== undefined) {
        updates.push('role_id = ?');
        values.push(data.role_id);
    }
    if (data.is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(data.is_active);
    }

    if (updates.length === 0) return getUserById(id);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    return getUserById(id);
}

/**
 * Change user password
 */
export function changeUserPassword(id: number, newPassword: string): boolean {
    const db = getDatabase();
    const password_hash = generateSecureHash(newPassword);

    const result = db.prepare(`
        UPDATE users 
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `).run(password_hash, id);

    // SECURITY: Invalidate all existing sessions for this user
    // Forces re-login after password change (prevents session hijacking)
    if (result.changes > 0) {
        deleteUserSessions(id);
    }

    return result.changes > 0;
}

/**
 * Soft delete user (is_active = 0)
 */
export function softDeleteUser(id: number): boolean {
    const db = getDatabase();

    // Cannot delete the last admin
    const adminCount = db.prepare(`
        SELECT COUNT(*) as count FROM users 
        WHERE role_id = (SELECT id FROM roles WHERE name = 'admin')
        AND is_active = 1
    `).get() as { count: number };

    const userRole = db.prepare(`
        SELECT r.name FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
    `).get(id) as { name: string } | undefined;

    if (userRole?.name === 'admin' && adminCount.count <= 1) {
        throw new Error('لا يمكن حذف آخر مدير نظام');
    }

    const result = db.prepare(`
        UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);

    // M2 FIX: Invalidate all sessions for deleted user (security)
    if (result.changes > 0) {
        deleteUserSessions(id);
    }

    return result.changes > 0;
}

/**
 * List all users (with role info)
 */
export function listUsers(includeInactive = false): User[] {
    const db = getDatabase();

    const whereClause = includeInactive ? '' : 'WHERE u.is_active = 1';

    return db.prepare(`
        SELECT 
            u.*,
            r.name as role_name,
            r.display_name_ar as role_display_name,
            r.is_system
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ${whereClause}
        ORDER BY u.created_at DESC
    `).all() as User[];
}

/**
 * Get user by ID
 */
export function getUserById(id: number): User | null {
    const db = getDatabase();

    return db.prepare(`
        SELECT 
            u.*,
            r.name as role_name,
            r.display_name_ar as role_display_name,
            r.is_system
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
    `).get(id) as User | null;
}

/**
 * Get user by username (for login)
 */
export function getUserByUsername(username: string): (User & { password_hash: string }) | null {
    const db = getDatabase();

    return db.prepare(`
        SELECT 
            u.*,
            r.name as role_name,
            r.display_name_ar as role_display_name,
            r.is_system
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.username = ? AND u.is_active = 1
    `).get(username.toLowerCase().trim()) as (User & { password_hash: string }) | null;
}

/**
 * Update last login timestamp
 */
export function updateLastLogin(id: number): void {
    const db = getDatabase();
    db.prepare(`
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);
}

/**
 * Record failed login attempt
 */
export function recordFailedAttempt(id: number): number {
    const db = getDatabase();

    db.prepare(`
        UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?
    `).run(id);

    const user = getUserById(id);
    const attempts = user?.failed_attempts || 0;

    // Lock account after 5 failed attempts (30 minutes)
    if (attempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        db.prepare(`
            UPDATE users SET locked_until = ? WHERE id = ?
        `).run(lockUntil, id);
    }

    return attempts;
}

/**
 * Reset failed attempts on successful login
 */
export function resetFailedAttempts(id: number): void {
    const db = getDatabase();
    db.prepare(`
        UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?
    `).run(id);
}

/**
 * Check if user count is zero (for bootstrapping)
 */
export function isFirstRun(): boolean {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return result.count === 0;
}

/**
 * Check username availability
 */
export function isUsernameAvailable(username: string, excludeId?: number): boolean {
    const db = getDatabase();

    const query = excludeId
        ? 'SELECT id FROM users WHERE username = ? AND id != ?'
        : 'SELECT id FROM users WHERE username = ?';

    const params = excludeId ? [username.toLowerCase().trim(), excludeId] : [username.toLowerCase().trim()];

    return db.prepare(query).get(...params) === undefined;
}

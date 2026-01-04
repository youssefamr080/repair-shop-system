/**
 * Roles & Permissions Database Module
 * 
 * Handles:
 * - CRUD for custom roles
 * - Permission management
 * - Admin role protection (is_system = 1)
 */

import { getDatabase } from './core';

// ============================================
// TYPES
// ============================================

export interface Role {
    id: number;
    name: string;
    display_name_ar: string;
    description: string | null;
    is_system: number;
    created_at: string;
    updated_at: string;
}

export interface Permission {
    id: number;
    code: string;
    display_name_ar: string;
    module: string;
    description: string | null;
}

export interface CreateRoleDTO {
    name: string;
    display_name_ar: string;
    description?: string;
    permission_ids: number[];
}

export interface UpdateRoleDTO {
    display_name_ar?: string;
    description?: string;
    permission_ids?: number[];
}

// ============================================
// ROLES FUNCTIONS
// ============================================

/**
 * Create a new role with permissions
 */
export function createRole(data: CreateRoleDTO): Role {
    const db = getDatabase();

    const stmt = db.prepare(`
        INSERT INTO roles (name, display_name_ar, description)
        VALUES (?, ?, ?)
    `);

    const result = stmt.run(
        data.name.toLowerCase().trim().replace(/\s+/g, '_'),
        data.display_name_ar.trim(),
        data.description || null
    );

    const roleId = result.lastInsertRowid as number;

    // Assign permissions
    if (data.permission_ids.length > 0) {
        setRolePermissions(roleId, data.permission_ids);
    }

    return getRoleById(roleId)!;
}

/**
 * Update role (PROTECTED: cannot modify admin role)
 */
export function updateRole(id: number, data: UpdateRoleDTO): Role | null {
    const db = getDatabase();

    // Check if it's system role (admin)
    const role = getRoleById(id);
    if (!role) return null;

    // Allow updating display name and description for admin
    // But NOT permissions
    if (role.is_system === 1 && data.permission_ids !== undefined) {
        throw new Error('لا يمكن تعديل صلاحيات مدير النظام');
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.display_name_ar !== undefined) {
        updates.push('display_name_ar = ?');
        values.push(data.display_name_ar.trim());
    }
    if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description);
    }

    if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        db.prepare(`
            UPDATE roles SET ${updates.join(', ')} WHERE id = ?
        `).run(...values);
    }

    // Update permissions (if not admin)
    if (data.permission_ids !== undefined && role.is_system !== 1) {
        setRolePermissions(id, data.permission_ids);
    }

    return getRoleById(id);
}

/**
 * Delete role (PROTECTED: cannot delete system roles)
 */
export function deleteRole(id: number): boolean {
    const db = getDatabase();

    // Check if it's system role
    const role = getRoleById(id);
    if (!role) return false;

    if (role.is_system === 1) {
        throw new Error('لا يمكن حذف دور النظام');
    }

    // Check if role is in use
    const usersWithRole = db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE role_id = ? AND is_active = 1'
    ).get(id) as { count: number };

    if (usersWithRole.count > 0) {
        throw new Error(`لا يمكن حذف الدور - يوجد ${usersWithRole.count} مستخدم مرتبط به`);
    }

    const result = db.prepare('DELETE FROM roles WHERE id = ?').run(id);
    return result.changes > 0;
}

/**
 * List all roles
 */
export function listRoles(): Role[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT * FROM roles ORDER BY is_system DESC, created_at ASC
    `).all() as Role[];
}

/**
 * Get role by ID
 */
export function getRoleById(id: number): Role | null {
    const db = getDatabase();
    return db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Role | null;
}

/**
 * Get admin role
 */
export function getAdminRole(): Role | null {
    const db = getDatabase();
    return db.prepare("SELECT * FROM roles WHERE name = 'admin'").get() as Role | null;
}

// ============================================
// PERMISSIONS FUNCTIONS
// ============================================

/**
 * Get all available permissions
 */
export function getAllPermissions(): Permission[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT * FROM permissions ORDER BY module, id
    `).all() as Permission[];
}

/**
 * Get permissions grouped by module
 */
export function getPermissionsGrouped(): Record<string, Permission[]> {
    const permissions = getAllPermissions();
    return permissions.reduce((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [];
        acc[perm.module].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);
}

/**
 * Get role's permissions
 */
export function getRolePermissions(roleId: number): Permission[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT p.* FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
        ORDER BY p.module, p.id
    `).all(roleId) as Permission[];
}

/**
 * Get role's permission codes (for quick lookup)
 */
export function getRolePermissionCodes(roleId: number): string[] {
    const db = getDatabase();
    const result = db.prepare(`
        SELECT p.code FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
    `).all(roleId) as { code: string }[];

    return result.map(r => r.code);
}

/**
 * Set role permissions (replace all)
 */
export function setRolePermissions(roleId: number, permissionIds: number[]): void {
    const db = getDatabase();

    // Check if admin role
    const role = getRoleById(roleId);
    if (role?.is_system === 1) {
        throw new Error('لا يمكن تعديل صلاحيات مدير النظام');
    }

    // Remove all existing
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);

    // Add new
    const insert = db.prepare(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
    );

    for (const permId of permissionIds) {
        insert.run(roleId, permId);
    }
}

/**
 * Check if user has specific permission
 */
export function userHasPermission(userId: number, permissionCode: string): boolean {
    const db = getDatabase();

    const result = db.prepare(`
        SELECT 1 FROM users u
        JOIN role_permissions rp ON u.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = ? AND p.code = ? AND u.is_active = 1
    `).get(userId, permissionCode);

    return result !== undefined;
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(userId: number): string[] {
    const db = getDatabase();

    const result = db.prepare(`
        SELECT p.code FROM users u
        JOIN role_permissions rp ON u.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = ? AND u.is_active = 1
    `).all(userId) as { code: string }[];

    return result.map(r => r.code);
}

/**
 * Check role name availability
 */
export function isRoleNameAvailable(name: string, excludeId?: number): boolean {
    const db = getDatabase();

    const normalizedName = name.toLowerCase().trim().replace(/\s+/g, '_');

    const query = excludeId
        ? 'SELECT id FROM roles WHERE name = ? AND id != ?'
        : 'SELECT id FROM roles WHERE name = ?';

    const params = excludeId ? [normalizedName, excludeId] : [normalizedName];

    return db.prepare(query).get(...params) === undefined;
}

/**
 * Users IPC Handlers
 * 
 * Handles all user management IPC calls
 */

import { ipcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { z } from 'zod';
import { logger } from '../utils/logger';
import * as usersDb from '../database/users';
import * as rolesDb from '../database/roles';
import * as sessionsDb from '../database/sessions';
import { getUserPermissions } from '../database/roles';
import { verifyScryptPassword, generateSecureHash } from './auth';
import { setSessionForSender, clearSessionForSender, auditAction, requirePermission } from '../middleware/auth';
import { logAudit } from '../database/audit';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createUserSchema = z.object({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'اسم المستخدم يجب أن يحتوي على أحرف وأرقام و _ فقط'),
    // P2-H2 FIX: Enforce stronger password policy (Min 8, Letter + Number)
    // M5 FIX: Unified max length to 1000 (consistent with auth.ts)
    password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
        .regex(/[a-zA-Z]/, 'يجب أن تحتوي كلمة المرور على حرف واحد على الأقل')
        .regex(/[0-9]/, 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل')
        .max(1000),
    display_name: z.string().min(2).max(100),
    role_id: z.number().int().positive(),
});

const updateUserSchema = z.object({
    display_name: z.string().min(2).max(100).optional(),
    role_id: z.number().int().positive().optional(),
    is_active: z.number().int().min(0).max(1).optional(),
});

const loginSchema = z.object({
    username: z.string().min(1).max(50),
    password: z.string().min(1).max(100),
    rememberMe: z.boolean().optional().default(false),
});

const createRoleSchema = z.object({
    name: z.string().min(2).max(50),
    display_name_ar: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    permission_ids: z.array(z.number().int().positive()),
});

const updateRoleSchema = z.object({
    display_name_ar: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    permission_ids: z.array(z.number().int().positive()).optional(),
});

// ============================================
// SETUP HANDLERS
// ============================================

export function setupUserHandlers(): void {
    // ==================
    // AUTH: Login/Logout
    // ==================

    // 🔒 H1 SECURITY FIX: In-memory rate limiting for login attempts
    const loginAttempts = new Map<string, { count: number; resetAt: number }>();
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOGIN_WINDOW_MS = 60 * 1000; // 1 minute window

    // 🔒 M2 FIX: Cleanup stale entries every 5 minutes to prevent memory leak
    setInterval(() => {
        const now = Date.now();
        for (const [key, val] of loginAttempts) {
            if (val.resetAt < now) loginAttempts.delete(key);
        }
    }, 5 * 60 * 1000);

    ipcMain.handle('auth:login', async (event, data: unknown) => {
        try {
            const validated = loginSchema.parse(data);
            const attemptKey = validated.username.toLowerCase();
            const now = Date.now();

            // Check rate limit
            const attempt = loginAttempts.get(attemptKey);
            if (attempt && attempt.resetAt > now && attempt.count >= MAX_LOGIN_ATTEMPTS) {
                const secondsRemaining = Math.ceil((attempt.resetAt - now) / 1000);
                logger.warn(`[Auth] Rate limit exceeded for user: ${attemptKey}`, 'Auth');
                return {
                    success: false,
                    error: `محاولات كثيرة. انتظر ${secondsRemaining} ثانية.`
                };
            }

            // Find user
            const user = usersDb.getUserByUsername(validated.username);
            if (!user) {
                // SECURITY: Run fake scrypt to prevent timing-based user enumeration
                generateSecureHash('dummy-password-for-timing');
                return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
            }

            // Check if locked
            if (user.locked_until) {
                const lockTime = new Date(user.locked_until);
                if (lockTime > new Date()) {
                    const minutes = Math.ceil((lockTime.getTime() - Date.now()) / 60000);
                    // V10 FIX: Log locked account access attempt
                    logAudit({
                        action: 'LOGIN_BLOCKED',
                        entity_type: 'auth',
                        user_id: user.id,
                        user_name: user.username,
                        details: `Account locked, ${minutes} minutes remaining`,
                    });
                    return { success: false, error: `الحساب مقفل. حاول مرة أخرى بعد ${minutes} دقيقة` };
                }
            }

            // Verify password (sync now)
            const isValid = verifyScryptPassword(validated.password, user.password_hash);
            if (!isValid) {
                // 🔒 H1 FIX: Record failed attempt in rate limiter
                const currentAttempt = loginAttempts.get(attemptKey);
                loginAttempts.set(attemptKey, {
                    count: (currentAttempt?.count || 0) + 1,
                    resetAt: now + LOGIN_WINDOW_MS
                });

                usersDb.recordFailedAttempt(user.id);
                // V10 FIX: Log failed login attempt
                logAudit({
                    action: 'LOGIN_FAILURE',
                    entity_type: 'auth',
                    user_id: user.id,
                    user_name: user.username,
                    details: 'Invalid password',
                });
                return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
            }

            // Reset failed attempts
            usersDb.resetFailedAttempts(user.id);
            usersDb.updateLastLogin(user.id);
            // 🔒 H1 FIX: Clear rate limiter on successful login
            loginAttempts.delete(attemptKey);

            // Create session
            const session = sessionsDb.createSession(user.id, validated.rememberMe);

            // Get permissions
            const permissions = getUserPermissions(user.id);

            // Remove password_hash from response
            const { password_hash, ...safeUser } = user;

            logger.info(`User logged in: ${user.username}`, 'Auth');

            // V10 FIX: Log successful login
            logAudit({
                action: 'LOGIN_SUCCESS',
                entity_type: 'auth',
                user_id: user.id,
                user_name: user.username,
                details: `Session created: ${session.id.substring(0, 8)}...`,
            });

            // Store session for this sender (for middleware authorization)
            setSessionForSender(event.sender.id, session.id);

            // 🔒 M1 FIX: Auto-delete first-run credentials file after successful login
            try {
                const credentialsPath = path.join(app.getPath('userData'), 'FIRST_RUN_CREDENTIALS.txt');
                if (fs.existsSync(credentialsPath)) {
                    fs.unlinkSync(credentialsPath);
                    logger.info('🔒 Security: First-run credentials file deleted', 'Auth');
                }
            } catch (credError) {
                // Ignore errors - file may not exist or already deleted
            }

            return {
                success: true,
                user: safeUser,
                sessionId: session.id,
                permissions,
                expiresAt: session.expires_at,
            };
        } catch (error) {
            logger.error('Login failed', 'Auth', error);
            return { success: false, error: error instanceof z.ZodError ? 'بيانات غير صالحة' : 'حدث خطأ' };
        }
    });

    ipcMain.handle('auth:logout', async (event, sessionId: string) => {
        try {
            // V10 FIX: Get session info before deletion for audit
            const session = sessionsDb.validateSession(sessionId);

            sessionsDb.deleteSession(sessionId);
            clearSessionForSender(event.sender.id);

            // V10 FIX: Log logout
            if (session) {
                logAudit({
                    action: 'LOGOUT',
                    entity_type: 'auth',
                    user_id: session.user_id,
                    user_name: session.username,
                    details: 'User logged out',
                });
            }

            return { success: true };
        } catch (error) {
            logger.error('Logout failed', 'Auth', error);
            return { success: false };
        }
    });

    ipcMain.handle('auth:validateSession', async (event, sessionId: string) => {
        try {
            const session = sessionsDb.validateSession(sessionId);
            if (!session) {
                return { valid: false };
            }

            // CRITICAL: Store session in middleware Map so subsequent IPC calls work
            // This is needed after page refresh/HMR when the in-memory Map is empty
            setSessionForSender(event.sender.id, sessionId);

            // Extend session
            sessionsDb.extendSession(sessionId);

            const permissions = getUserPermissions(session.user_id);

            return {
                valid: true,
                user: {
                    id: session.user_id,
                    username: session.username,
                    display_name: session.display_name,
                    role_id: session.role_id,
                    role_name: session.role_name,
                    role_display_name: session.role_display_name,
                },
                permissions,
            };
        } catch (error) {
            return { valid: false };
        }
    });

    // ==================
    // USERS: CRUD (Protected with users.manage)
    // ==================

    ipcMain.handle('db:users:list',
        requirePermission('users.manage', async (_event, _ctx) => {
            try {
                return usersDb.listUsers();
            } catch (error) {
                logger.error('Failed to list users', 'Users', error);
                return [];
            }
        })
    );

    ipcMain.handle('db:users:getById',
        requirePermission('users.manage', async (_event, _ctx, id: number) => {
            try {
                return usersDb.getUserById(id);
            } catch (error) {
                return null;
            }
        })
    );

    ipcMain.handle('db:users:create',
        requirePermission('users.manage', async (_event, ctx, data: unknown) => {
            try {
                const validated = createUserSchema.parse(data);

                // Check username availability
                if (!usersDb.isUsernameAvailable(validated.username)) {
                    throw new Error('اسم المستخدم مستخدم بالفعل');
                }

                const user = usersDb.createUser(validated);
                logger.info(`User created: ${user.username}`, 'Users');

                // ✅ AUDIT LOG
                auditAction(ctx, 'CREATE_USER', 'user', user.id,
                    `Created user: ${user.username} with role ${validated.role_id}`);

                return { success: true, user };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'فشل في إنشاء المستخدم';
                return { success: false, error: message };
            }
        })
    );

    ipcMain.handle('db:users:update',
        requirePermission('users.manage', async (_event, ctx, id: number, data: unknown) => {
            try {
                const validated = updateUserSchema.parse(data);
                const user = usersDb.updateUser(id, validated);

                // ✅ AUDIT LOG
                auditAction(ctx, 'UPDATE_USER', 'user', id,
                    `Updated user ID ${id}: ${JSON.stringify(Object.keys(validated))}`);

                return { success: true, user };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'فشل في تحديث المستخدم';
                return { success: false, error: message };
            }
        })
    );

    ipcMain.handle('db:users:delete',
        requirePermission('users.manage', async (_event, ctx, id: number) => {
            try {
                const user = usersDb.getUserById(id);
                usersDb.softDeleteUser(id);
                logger.info(`User soft deleted: ${id}`, 'Users');

                // ✅ AUDIT LOG
                auditAction(ctx, 'DELETE_USER', 'user', id,
                    `Deleted user: ${user?.username || 'Unknown'}`);

                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'فشل في حذف المستخدم';
                return { success: false, error: message };
            }
        })
    );

    ipcMain.handle('db:users:changePassword',
        requirePermission('users.manage', async (_event, ctx, id: number, newPassword: string) => {
            try {
                if (!newPassword || newPassword.length < 8) {
                    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
                }
                if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
                    throw new Error('كلمة المرور يجب أن تحتوي على أحرف وأرقام');
                }
                usersDb.changeUserPassword(id, newPassword);
                // 🔒 H3 FIX: Invalidate all sessions for this user after password change
                sessionsDb.deleteUserSessions(id);
                logger.info(`Password changed and sessions invalidated for user: ${id}`, 'Users');

                // ✅ AUDIT LOG
                auditAction(ctx, 'CHANGE_PASSWORD', 'user', id,
                    `Password changed for user ID ${id}`);

                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'فشل في تغيير كلمة المرور';
                return { success: false, error: message };
            }
        })
    );

    // ==================
    // ROLES: CRUD (Protected with roles.manage)
    // ==================

    ipcMain.handle('db:roles:list',
        requirePermission('roles.manage', async (_event, _ctx) => {
            try {
                return rolesDb.listRoles();
            } catch (error) {
                return [];
            }
        })
    );

    ipcMain.handle('db:roles:getById',
        requirePermission('roles.manage', async (_event, _ctx, id: number) => {
            try {
                return rolesDb.getRoleById(id);
            } catch (error) {
                return null;
            }
        })
    );

    ipcMain.handle('db:roles:create',
        requirePermission('roles.manage', async (_event, ctx, data: unknown) => {
            try {
                const validated = createRoleSchema.parse(data);

                // Check name availability
                if (!rolesDb.isRoleNameAvailable(validated.name)) {
                    throw new Error('اسم الدور مستخدم بالفعل');
                }

                const role = rolesDb.createRole(validated);
                logger.info(`Role created: ${role.name}`, 'Roles');

                // ✅ AUDIT LOG
                auditAction(ctx, 'CREATE_ROLE', 'role', role.id,
                    `Created role: ${role.name} with ${validated.permission_ids.length} permissions`);

                return { success: true, role };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'فشل في إنشاء الدور';
                return { success: false, error: message };
            }
        })
    );

    ipcMain.handle('db:roles:update',
        requirePermission('roles.manage', async (_event, ctx, id: number, data: unknown) => {
            try {
                const validated = updateRoleSchema.parse(data);
                const role = rolesDb.updateRole(id, validated);

                // ✅ AUDIT LOG
                auditAction(ctx, 'UPDATE_ROLE', 'role', id,
                    `Updated role ID ${id}: ${JSON.stringify(Object.keys(validated))}`);

                return { success: true, role };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'فشل في تحديث الدور';
                return { success: false, error: message };
            }
        })
    );

    ipcMain.handle('db:roles:delete',
        requirePermission('roles.manage', async (_event, ctx, id: number) => {
            try {
                const role = rolesDb.getRoleById(id);
                rolesDb.deleteRole(id);
                logger.info(`Role deleted: ${id}`, 'Roles');

                // ✅ AUDIT LOG
                auditAction(ctx, 'DELETE_ROLE', 'role', id,
                    `Deleted role: ${role?.name || 'Unknown'}`);

                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'فشل في حذف الدور';
                return { success: false, error: message };
            }
        })
    );

    // ==================
    // PERMISSIONS (Protected with roles.manage)
    // ==================

    ipcMain.handle('db:permissions:getAll',
        requirePermission('roles.manage', async (_event, _ctx) => {
            try {
                return rolesDb.getAllPermissions();
            } catch (error) {
                return [];
            }
        })
    );

    ipcMain.handle('db:permissions:getGrouped',
        requirePermission('roles.manage', async (_event, _ctx) => {
            try {
                return rolesDb.getPermissionsGrouped();
            } catch (error) {
                return {};
            }
        })
    );

    ipcMain.handle('db:roles:getPermissions',
        requirePermission('roles.manage', async (_event, _ctx, roleId: number) => {
            try {
                return rolesDb.getRolePermissions(roleId);
            } catch (error) {
                return [];
            }
        })
    );

    ipcMain.handle('db:roles:setPermissions',
        requirePermission('roles.manage', async (_event, ctx, roleId: number, permissionIds: number[]) => {
            try {
                rolesDb.setRolePermissions(roleId, permissionIds);

                // ✅ AUDIT LOG
                auditAction(ctx, 'SET_PERMISSIONS', 'role', roleId,
                    `Set ${permissionIds.length} permissions for role ID ${roleId}`);

                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'فشل في تحديث الصلاحيات';
                return { success: false, error: message };
            }
        })
    );

    // ==================
    // BOOTSTRAP CHECK (Public - needed before login)
    // ==================

    ipcMain.handle('auth:isFirstRun', async () => {
        return usersDb.isFirstRun();
    });

    logger.info('User handlers registered', 'Users');
}

/**
 * Initialize the default admin user if no users exist (Bootstrapping)
 * This should be called after database initialization
 */
export function initializeDefaultAdminUser(): void {
    try {
        // Check if this is the first run (no users exist)
        if (!usersDb.isFirstRun()) {
            return; // Users already exist, no need to bootstrap
        }

        // Get the admin role
        const adminRole = rolesDb.getAdminRole();
        if (!adminRole) {
            logger.error('Admin role not found. RBAC migration may not have run.', 'Bootstrap');
            return;
        }

        // Generate a cryptographically secure random password
        const randomPassword = crypto.randomBytes(6).toString('hex'); // 12 chars, hex = letters + numbers

        // Create default admin user with secure random password
        const defaultAdmin = usersDb.createUser({
            username: 'admin',
            password: randomPassword,
            display_name: 'مدير النظام',
            role_id: adminRole.id,
        });

        logger.info(`Default admin user created: ${defaultAdmin.username}`, 'Bootstrap');
        logger.warn(`╔════════════════════════════════════════════════════════╗`, 'Bootstrap');
        logger.warn(`║  🔐 كلمة مرور المدير الافتراضية تم حفظها في ملف مؤقت   ║`, 'Bootstrap');
        logger.warn(`║  📁 راجع: FIRST_RUN_CREDENTIALS.txt                    ║`, 'Bootstrap');
        logger.warn(`║  ⚠️  يرجى تغييرها فوراً بعد تسجيل الدخول!             ║`, 'Bootstrap');
        logger.warn(`╚════════════════════════════════════════════════════════╝`, 'Bootstrap');

        // Write credentials to a one-time file that gets deleted after first login
        const credentialsPath = path.join(app.getPath('userData'), 'FIRST_RUN_CREDENTIALS.txt');

        fs.writeFileSync(credentialsPath,
            `نظام إدارة المخزون INV-PRO - بيانات الدخول الأولية\n` +
            `=======================================\n\n` +
            `اسم المستخدم: admin\n` +
            `كلمة المرور: ${randomPassword}\n\n` +
            `⚠️ يرجى تغيير كلمة المرور فوراً بعد تسجيل الدخول!\n` +
            `سيتم حذف هذا الملف تلقائياً.\n`,
            'utf8'
        );
        logger.info(`Credentials written to: ${credentialsPath}`, 'Bootstrap');
    } catch (error: unknown) {
        // Properly extract error message for logging
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        logger.error(`Failed to initialize default admin user: ${errorMessage}`, 'Bootstrap');
        if (errorStack) {
            logger.error(`Stack trace: ${errorStack}`, 'Bootstrap');
        }
    }
}


/**
 * Auth Handlers - Secure Password Management
 *
 * Security Goals:
 * - Preserve business behaviour:
 *   - Default admin password is "1234" on first installation
 *   - No automatic session timeout (admin logs out manually)
 * - Raise security bar:
 *   - Use strong KDF (scrypt) with per-password salt instead of plain SHA-256
 *   - Support seamless migration from legacy SHA-256 hashes
 *   - Basic brute-force mitigation on IPC handler
 */

import crypto from 'crypto';
import { ipcMain } from 'electron';
import { getSetting, setSetting } from '../database/settings';
import { logger } from '../utils/logger';

// Constants
const ADMIN_PASSWORD_KEY = 'admin_password_hash';

// Password hashing configuration
// We use Node's built-in scrypt (KDF) with a reasonable work factor for desktop.
const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384; // CPU/memory cost
const SCRYPT_R = 8;
const SCRYPT_P = 1;

// Stored format examples:
// - New (scrypt): "scrypt:<saltBase64>:<hashBase64>"
// - Legacy SHA-256 (hex string, length 64)

function createSalt(bytes: number = 16): string {
    return crypto.randomBytes(bytes).toString('base64');
}

function hashPasswordScrypt(password: string, salt: string): string {
    const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
    });
    return derivedKey.toString('base64');
}

/**
 * Generate a new secure password hash string using scrypt.
 * Returns value in the canonical stored format.
 * Exported for use by users module.
 */
export function generateSecureHash(password: string): string {
    const salt = createSalt();
    const hash = hashPasswordScrypt(password, salt);
    return `scrypt:${salt}:${hash}`;
}

/**
 * Check if stored hash is using new scrypt format.
 */
function isScryptHash(stored: string | null): stored is string {
    return !!stored && stored.startsWith('scrypt:');
}

/**
 * Check if stored hash looks like legacy SHA-256 hex (64 chars).
 */
function isLegacySha256(stored: string | null): stored is string {
    return !!stored && /^[a-f0-9]{64}$/i.test(stored);
}

/**
 * Verify password against a scrypt-based stored hash.
 * Exported for use by users module.
 */
export function verifyScryptPassword(password: string, stored: string): boolean {
    const [, salt, hash] = stored.split(':');
    if (!salt || !hash) {
        logger.warn('[Auth] Invalid scrypt hash format detected', 'Auth');
        return false;
    }

    try {
        const inputHash = hashPasswordScrypt(password, salt);
        return crypto.timingSafeEqual(
            Buffer.from(inputHash, 'base64'),
            Buffer.from(hash, 'base64')
        );
    } catch (error) {
        logger.error('[Auth] Failed to verify scrypt password', 'Auth', error);
        return false;
    }
}

/**
 * Legacy SHA-256 hashing (kept only for migration support).
 */
function hashPasswordLegacySha256(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Initialize default password if not exists
 * ⚠️ DEPRECATED: This is only for legacy admin password settings.
 * New user system uses RBAC with random passwords.
 */
export function initializeDefaultPassword(): void {
    try {
        const existingHash = getSetting(ADMIN_PASSWORD_KEY);
        if (!existingHash) {
            // Generate a secure random password for legacy system
            const randomPassword = crypto.randomBytes(6).toString('hex');
            const defaultHash = generateSecureHash(randomPassword);
            setSetting(ADMIN_PASSWORD_KEY, defaultHash);
            logger.info('[Auth] Legacy admin password initialized (check FIRST_RUN_CREDENTIALS.txt)', 'Auth');
        }
    } catch (error) {
        logger.error('[Auth] Failed to initialize default password', 'Auth', error);
    }
}

/**
 * Verify a password against the stored hash
 */
export function verifyPassword(password: string): boolean {
    try {
        // Input validation - ensure password is a valid string
        if (typeof password !== 'string' || password.length === 0 || password.length > 1000) {
            logger.warn('[Auth] Invalid password input type or length', 'Auth');
            return false;
        }

        const storedHash = getSetting(ADMIN_PASSWORD_KEY);

        // If no password set, initialize and then verify against the newly created hash
        // Note: This is legacy admin system. New RBAC users use random passwords.
        if (!storedHash) {
            initializeDefaultPassword();
            // After initialization, get the newly stored hash and verify
            const newStoredHash = getSetting(ADMIN_PASSWORD_KEY);
            if (newStoredHash && isScryptHash(newStoredHash)) {
                return verifyScryptPassword(password, newStoredHash);
            }
            return false;
        }

        // New format: scrypt-based hash
        if (isScryptHash(storedHash)) {
            return verifyScryptPassword(password, storedHash);
        }

        // Legacy format: plain SHA-256 hex (for backward compatibility)
        if (isLegacySha256(storedHash)) {
            const inputLegacyHash = hashPasswordLegacySha256(password);
            const matches = crypto.timingSafeEqual(
                Buffer.from(inputLegacyHash, 'hex'),
                Buffer.from(storedHash, 'hex')
            );

            // On successful validation of legacy hash, transparently upgrade to scrypt
            if (matches) {
                try {
                    const upgraded = generateSecureHash(password);
                    setSetting(ADMIN_PASSWORD_KEY, upgraded);
                    logger.info('[Auth] Upgraded legacy admin password hash to scrypt', 'Auth');
                } catch (upgradeError) {
                    logger.error('[Auth] Failed to upgrade legacy password hash', 'Auth', upgradeError);
                }
            }

            return matches;
        }

        // Unknown format – treat as invalid and log for investigation
        logger.warn('[Auth] Unknown admin password hash format', 'Auth', { storedHashPreview: String(storedHash).slice(0, 16) });
        return false;
    } catch (error) {
        logger.error('[Auth] Password verification failed', 'Auth', error);
        return false;
    }
}

/**
 * Change the admin password
 * Returns success status and message
 */
export function changePassword(currentPassword: string, newPassword: string): { success: boolean; message: string } {
    try {
        // Input validation
        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
            return { success: false, message: 'بيانات غير صالحة' };
        }

        // Verify current password
        if (!verifyPassword(currentPassword)) {
            return { success: false, message: 'كلمة المرور الحالية غير صحيحة' };
        }

        // 🔒 H2 FIX: Enforce consistent password policy (8 chars + letter + number)
        if (!newPassword || newPassword.length < 8) {
            return { success: false, message: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' };
        }

        if (!/[a-zA-Z]/.test(newPassword)) {
            return { success: false, message: 'كلمة المرور يجب أن تحتوي على حرف واحد على الأقل' };
        }

        if (!/[0-9]/.test(newPassword)) {
            return { success: false, message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل' };
        }

        if (newPassword.length > 1000) {
            return { success: false, message: 'كلمة المرور طويلة جداً' };
        }

        // Hash and store new password using scrypt (secure)
        const newHash = generateSecureHash(newPassword);
        setSetting(ADMIN_PASSWORD_KEY, newHash);

        logger.info('[Auth] Admin password changed successfully', 'Auth');
        return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
    } catch (error) {
        logger.error('[Auth] Password change failed', 'Auth', error);
        return { success: false, message: 'فشل تغيير كلمة المرور' };
    }
}

/**
 * Register IPC handlers for auth operations
 */
export function registerAuthHandlers(): void {
    // 🔒 C1 FIX: Brute-force protection for legacy admin password
    const lockoutStore = new Map<string, { attempts: number; lockedUntil: number }>();
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    // 🔒 M2 FIX: Cleanup stale lockout entries every 5 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [key, val] of lockoutStore) {
            if (val.lockedUntil > 0 && val.lockedUntil < now) {
                lockoutStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);

    // Verify password (for legacy admin password lock screen)
    ipcMain.handle('auth:verifyPassword', (_event, password: string) => {
        const key = 'admin_legacy_verify';
        const now = Date.now();
        const lockout = lockoutStore.get(key);

        // Check if currently locked out
        if (lockout && lockout.lockedUntil > now) {
            const remainingMinutes = Math.ceil((lockout.lockedUntil - now) / 60000);
            logger.warn(`[Auth] Brute-force lockout active. ${remainingMinutes} minutes remaining`, 'Auth');
            return {
                success: false,
                error: `تم حظر المحاولات مؤقتاً. يرجى الانتظار ${remainingMinutes} دقيقة.`
            };
        }

        // Verify the password
        const isValid = verifyPassword(password);

        if (!isValid) {
            // Record failed attempt
            const attempts = (lockout?.attempts || 0) + 1;

            if (attempts >= MAX_ATTEMPTS) {
                lockoutStore.set(key, { attempts, lockedUntil: now + LOCKOUT_DURATION_MS });
                logger.warn(`[Auth] Max attempts reached. Locking out for 5 minutes`, 'Auth');
                return {
                    success: false,
                    error: `محاولات خاطئة كثيرة. تم الحظر لمدة 5 دقائق.`
                };
            } else {
                lockoutStore.set(key, { attempts, lockedUntil: 0 });
                return {
                    success: false,
                    error: `كلمة المرور غير صحيحة. متبقي ${MAX_ATTEMPTS - attempts} محاولات.`
                };
            }
        } else {
            // Success - clear lockout
            lockoutStore.delete(key);
        }

        return { success: true };
    });

    // Change password
    ipcMain.handle('auth:changePassword', (_, currentPassword: string, newPassword: string) => {
        return changePassword(currentPassword, newPassword);
    });

    logger.info('[Auth] Auth IPC handlers registered with brute-force protection', 'Auth');
}

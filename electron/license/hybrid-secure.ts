/**
 * 🔐 Hybrid Secure License System
 * 
 * Main license system with:
 * - Online activation (one-time)
 * - Offline operation after activation
 * - Auto-renewal when online
 * - Time manipulation protection (FIXED: 30-day tolerance)
 * - RSA signature verification
 * - Secure storage via keytar
 */

import * as crypto from 'crypto';
import keytar from 'keytar';
import { getStableDeviceId, verifyDeviceWithTolerance, getCurrentHardwareComponents } from './deviceStability';
import { checkInternetConnection, licenseServerRequest, setLicenseServerUrl } from '../utils/network';
import { detectTampering } from '../utils/antiTamper';
import { SecretGuard } from '../utils/secret-guard';
import { logger } from '../utils/logger';
import { getLicenseConfig, PRODUCT_CODE } from './config';
import type {
    SignedLicense,
    LicenseStatus,
    ActivationRequest,
    ActivationResponse,
    RenewalResponse,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const SERVICE_NAME = 'mayo-fix-system';
const ACCOUNT_LICENSE = 'license-token';
const ACCOUNT_ACTIVATION_KEY = 'activation-key';  // NEW: Store activation key for renewal/deactivation
const ACCOUNT_LAST_RUN = 'last-run-time';
const ACCOUNT_LAST_ONLINE = 'last-online-check';

// FIXED: 30-day time jump tolerance instead of 1 day
const MAX_TIME_JUMP_DAYS = 30;
const MAX_TIME_JUMP_MS = MAX_TIME_JUMP_DAYS * 24 * 60 * 60 * 1000;

// =============================================================================
// INITIALIZATION
// =============================================================================

let isInitialized = false;

/**
 * Initialize the license system
 * Call this early in app startup
 */
export function initializeLicenseSystem(): void {
    if (isInitialized) return;

    try {
        // Verify no private keys in SecretGuard
        SecretGuard.verifyNoPrivateKeys();

        // Set license server URL from SecretGuard
        try {
            const serverUrl = SecretGuard.retrieve('LICENSE_SERVER_URL');
            setLicenseServerUrl(serverUrl);
        } catch {
            logger.warn('License server URL not configured', 'License');
        }

        isInitialized = true;
        logger.info('License system initialized', 'License', {
            productCode: PRODUCT_CODE,
        });
    } catch (error) {
        logger.error('Failed to initialize license system', 'License', error);
    }
}

// =============================================================================
// ENCRYPTION / DECRYPTION
// =============================================================================

/**
 * Get encryption key for license storage
 */
function getEncryptionKey(): Buffer {
    const dbKey = SecretGuard.retrieve('DB_KEY');
    return crypto.scryptSync(dbKey, 'license-encryption-v2', 32);
}

/**
 * Encrypt license before storing in keytar
 */
function encryptLicense(data: string): string {
    const algorithm = 'aes-256-gcm';
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt license from keytar
 */
function decryptLicense(encrypted: string): string {
    const algorithm = 'aes-256-gcm';
    const key = getEncryptionKey();

    // Validate format before parsing
    if (!encrypted || typeof encrypted !== 'string') {
        throw new Error('Invalid encrypted data: empty or not a string');
    }

    const parts = encrypted.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format: expected iv:authTag:data');
    }

    const [ivHex, authTagHex, encryptedData] = parts;

    // Validate hex strings
    if (!ivHex || !authTagHex || !encryptedData) {
        throw new Error('Invalid encrypted data: missing components');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

// =============================================================================
// SECURE STORAGE (keytar)
// =============================================================================

/**
 * Get stored license from keytar
 */
async function getStoredLicense(): Promise<SignedLicense | null> {
    try {
        const encrypted = await keytar.getPassword(SERVICE_NAME, ACCOUNT_LICENSE);
        if (!encrypted) return null;

        const decrypted = decryptLicense(encrypted);
        return JSON.parse(decrypted) as SignedLicense;
    } catch (error) {
        logger.error('Failed to read license from keytar', 'License', error);
        return null;
    }
}

/**
 * Store license in keytar
 */
async function storeLicense(license: SignedLicense): Promise<void> {
    try {
        const encrypted = encryptLicense(JSON.stringify(license));
        await keytar.setPassword(SERVICE_NAME, ACCOUNT_LICENSE, encrypted);
        logger.info('License stored securely', 'License');
    } catch (error) {
        logger.error('Failed to store license', 'License', error);
        throw error;
    }
}

/**
 * Delete stored license
 */
async function deleteLicense(): Promise<void> {
    try {
        await keytar.deletePassword(SERVICE_NAME, ACCOUNT_LICENSE);
        await keytar.deletePassword(SERVICE_NAME, ACCOUNT_ACTIVATION_KEY);
        logger.info('License and activation key deleted', 'License');
    } catch (error) {
        logger.error('Failed to delete license', 'License', error);
    }
}

/**
 * Store activation key for renewal/deactivation
 */
async function storeActivationKey(key: string): Promise<void> {
    try {
        const encrypted = encryptLicense(key);
        await keytar.setPassword(SERVICE_NAME, ACCOUNT_ACTIVATION_KEY, encrypted);
    } catch (error) {
        logger.error('Failed to store activation key', 'License', error);
    }
}

/**
 * Get stored activation key
 */
async function getStoredActivationKey(): Promise<string | null> {
    try {
        const encrypted = await keytar.getPassword(SERVICE_NAME, ACCOUNT_ACTIVATION_KEY);
        if (!encrypted) return null;
        return decryptLicense(encrypted);
    } catch (error) {
        logger.error('Failed to read activation key', 'License', error);
        return null;
    }
}

// =============================================================================
// SIGNATURE VERIFICATION
// =============================================================================

/**
 * Verify license signature using RSA public key
 */
function verifyLicenseSignature(license: SignedLicense): boolean {
    try {
        const publicKey = SecretGuard.retrieve('LICENSE_SERVER_PUBLIC_KEY');

        // SERVER COMPATIBILITY: Use standard JSON.stringify as per server spec
        const payloadString = JSON.stringify(license.payload);
        const signature = Buffer.from(license.signature, 'base64');

        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(payloadString);
        verify.end();

        return verify.verify(publicKey, signature);
    } catch (error) {
        logger.error('Signature verification failed', 'License', error);
        return false;
    }
}

// =============================================================================
// TIME MANIPULATION PROTECTION
// =============================================================================

/**
 * Check for time manipulation
 * FIXED: Uses 30-day tolerance for forward jumps
 */
async function checkTimeManipulation(): Promise<{ manipulated: boolean; reason?: string }> {
    try {
        const now = Date.now();
        const lastRunStr = await keytar.getPassword(SERVICE_NAME, ACCOUNT_LAST_RUN);

        if (lastRunStr) {
            const lastRun = parseInt(lastRunStr, 10);

            // Check if time went backwards (definite manipulation)
            if (now < lastRun) {
                const diff = lastRun - now;
                logger.error('Time manipulation detected - clock went backwards', 'License', {
                    now,
                    lastRun,
                    differenceMs: diff,
                });
                return { manipulated: true, reason: 'System clock moved backwards' };
            }

            // FIXED: Check for large forward jumps (30 days tolerance)
            if (now - lastRun > MAX_TIME_JUMP_MS) {
                logger.warn('Large time jump detected', 'License', {
                    now,
                    lastRun,
                    jumpDays: Math.floor((now - lastRun) / (24 * 60 * 60 * 1000)),
                });
                // Log but don't block - user may not have used app for a while
            }
        }

        // Update last run time
        await keytar.setPassword(SERVICE_NAME, ACCOUNT_LAST_RUN, now.toString());
        return { manipulated: false };
    } catch (error) {
        logger.error('Time check failed - blocking access for security', 'License', error);
        return { manipulated: true }; // Fail SECURE - block access on error
    }
}

/**
 * Track last successful online check for offline grace period
 */
async function updateLastOnlineCheck(): Promise<void> {
    try {
        await keytar.setPassword(SERVICE_NAME, ACCOUNT_LAST_ONLINE, Date.now().toString());
    } catch {
        // Non-critical
    }
}

/**
 * Get days since last online check
 */
async function getDaysSinceLastOnlineCheck(): Promise<number> {
    try {
        const lastOnlineStr = await keytar.getPassword(SERVICE_NAME, ACCOUNT_LAST_ONLINE);
        if (!lastOnlineStr) return Infinity;

        const lastOnline = parseInt(lastOnlineStr, 10);
        const now = Date.now();
        return Math.floor((now - lastOnline) / (24 * 60 * 60 * 1000));
    } catch {
        return Infinity;
    }
}

// =============================================================================
// LICENSE STATUS
// =============================================================================

/**
 * Get current license status
 */
export async function getLicenseStatus(): Promise<LicenseStatus> {
    const deviceId = getStableDeviceId();
    const config = getLicenseConfig();

    // Check time manipulation
    const timeCheck = await checkTimeManipulation();
    if (timeCheck.manipulated) {
        return {
            valid: false,
            deviceId,
            expiresAt: null,
            daysRemaining: 0,
            inGracePeriod: false,
            needsRenewal: true,
            licenseType: null,
            tampered: true,
            productCode: PRODUCT_CODE,
        };
    }

    // Get stored license
    const stored = await getStoredLicense();

    if (!stored) {
        return {
            valid: false,
            deviceId,
            expiresAt: null,
            daysRemaining: 0,
            inGracePeriod: false,
            needsRenewal: true,
            licenseType: null,
            tampered: false,
            productCode: PRODUCT_CODE,
        };
    }

    // Verify product code matches
    if (stored.payload.productCode !== PRODUCT_CODE) {
        logger.error('Product code mismatch', 'License', {
            expected: PRODUCT_CODE,
            actual: stored.payload.productCode,
        });
        return {
            valid: false,
            deviceId,
            expiresAt: null,
            daysRemaining: 0,
            inGracePeriod: false,
            needsRenewal: true,
            licenseType: null,
            tampered: true,
            productCode: PRODUCT_CODE,
        };
    }

    // Verify device
    const deviceVerification = verifyDeviceWithTolerance();
    if (!deviceVerification.valid) {
        logger.error('Device verification failed', 'License', {
            reason: deviceVerification.reason,
            similarity: deviceVerification.similarityScore,
        });
        return {
            valid: false,
            deviceId,
            expiresAt: null,
            daysRemaining: 0,
            inGracePeriod: false,
            needsRenewal: true,
            licenseType: stored.payload.licenseType,
            tampered: true,
            productCode: PRODUCT_CODE,
        };
    }

    // Verify signature
    if (!verifyLicenseSignature(stored)) {
        logger.error('License signature invalid', 'License');
        return {
            valid: false,
            deviceId,
            expiresAt: null,
            daysRemaining: 0,
            inGracePeriod: false,
            needsRenewal: true,
            licenseType: stored.payload.licenseType,
            tampered: true,
            productCode: PRODUCT_CODE,
        };
    }

    // Check expiry
    // LIFETIME LICENSE CHECK: If validTo is null, it means lifetime license
    let expiresAt: Date | null = null;
    let daysRemaining = Infinity;

    if (stored.payload.validTo) {
        expiresAt = new Date(stored.payload.validTo);
        const now = new Date();
        daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else {
        // Lifetime license
        expiresAt = null; // Stays null
        daysRemaining = 36500; // 100 years
    }

    // Check offline grace period
    // DYNAMIC: Offline grace = days remaining in license (no fixed limit)
    // Users can work offline for the entire validity of their license
    // They only need internet when it's time to renew
    const daysSinceOnline = await getDaysSinceLastOnlineCheck();

    // For lifetime licenses (>365 days remaining), allow 365 days offline max
    // Otherwise, allow offline for the remaining license period
    const maxOfflineDays = daysRemaining > 365 ? 365 : Math.max(daysRemaining, 0);

    const offlineGraceExceeded = daysSinceOnline > maxOfflineDays;

    if (offlineGraceExceeded) {
        logger.warn('Offline grace period exceeded - must connect to renew', 'License', {
            daysSinceOnline,
            maxOfflineDays,
            daysRemaining,
        });
    }

    // Grace period for expiry (7 days after license expires)
    const inGracePeriod = daysRemaining < 0 && daysRemaining >= -config.gracePeriodDays;
    const valid = (daysRemaining > 0 || inGracePeriod) && !offlineGraceExceeded;
    const needsRenewal = daysRemaining <= config.renewalDaysBeforeExpiry;

    return {
        valid,
        deviceId,
        expiresAt: expiresAt ? expiresAt.toISOString() : null, // Handle null for lifetime
        daysRemaining: Math.max(daysRemaining, 0),
        inGracePeriod,
        needsRenewal,
        licenseType: stored.payload.licenseType,
        tampered: false,
        productCode: PRODUCT_CODE,
    };
}

// =============================================================================
// ACTIVATION
// =============================================================================

/**
 * Activate license with activation key
 */
export async function activateLicense(activationKey: string): Promise<{
    success: boolean;
    message?: string;
}> {
    const deviceId = getStableDeviceId();
    const components = getCurrentHardwareComponents();

    // Check internet
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
        return { success: false, message: 'يجب الاتصال بالإنترنت للتفعيل' };
    }

    try {
        const request: ActivationRequest = {
            deviceId,
            activationKey,
            productCode: PRODUCT_CODE,
            hardwareComponents: components,
        };

        const response = await licenseServerRequest<ActivationResponse>(
            '/api/license/activate',
            request
        );

        if (!response.success || !response.license) {
            // Map server errors to Arabic - LOG ORIGINAL FOR DEBUGGING
            const serverError = response.message || 'فشل التفعيل';
            logger.warn('License activation failed - Server response', 'License', {
                originalServerMessage: serverError,
                fullResponse: JSON.stringify(response),
                productCodeSent: PRODUCT_CODE,
            });

            let arabicMessage = serverError;

            if (serverError.includes('Invalid activation key')) arabicMessage = 'مفتاح التفعيل غير صحيح';
            else if (serverError.includes('already bound')) arabicMessage = 'المفتاح مستخدم مسبقاً على جهاز آخر';
            else if (serverError.includes('expired')) arabicMessage = 'انتهت صلاحية مفتاح التفعيل';
            else if (serverError.includes('suspended')) arabicMessage = 'تم إيقاف مفتاح التفعيل';
            else if (serverError.includes('Invalid product')) arabicMessage = 'مفتاح التفعيل لمنتج مختلف';

            return { success: false, message: arabicMessage };
        }

        // Verify signature
        const signatureValid = verifyLicenseSignature(response.license);
        if (!signatureValid) {
            return { success: false, message: 'توقيع الترخيص غير صالح' };
        }

        // Verify product code
        if (response.license.payload.productCode !== PRODUCT_CODE) {
            return { success: false, message: 'مفتاح التفعيل لمنتج مختلف' };
        }

        // Store license and activation key
        await storeLicense(response.license);
        await storeActivationKey(activationKey);  // NEW: Store for renewal/deactivation
        await updateLastOnlineCheck();

        logger.info('License activated successfully', 'License', {
            expiresAt: response.license.payload.validTo,
            licenseType: response.license.payload.licenseType,
        });

        return { success: true };
    } catch (error) {
        logger.error('License activation failed', 'License', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'فشل التفعيل',
        };
    }
}

// =============================================================================
// RENEWAL
// =============================================================================

/**
 * Renew existing license
 */
export async function renewLicense(): Promise<{
    success: boolean;
    message?: string;
}> {
    const deviceId = getStableDeviceId();
    const stored = await getStoredLicense();

    if (!stored) {
        return { success: false, message: 'لا يوجد ترخيص للتجديد' };
    }

    // Get stored activation key
    const activationKey = await getStoredActivationKey();
    if (!activationKey) {
        return { success: false, message: 'مفتاح التفعيل غير موجود. يرجى إعادة التفعيل.' };
    }

    // Check internet
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
        return { success: false, message: 'يجب الاتصال بالإنترنت للتجديد' };
    }

    try {
        // Server expects activationKey, not currentToken
        const request = {
            deviceId,
            activationKey,
            productCode: PRODUCT_CODE,
        };

        const response = await licenseServerRequest<RenewalResponse>(
            '/api/license/renew',
            request
        );

        if (!response.success || !response.license) {
            if (response.paymentStatus === 'pending') {
                return { success: false, message: 'في انتظار تأكيد الدفع' };
            }
            // Map server errors to Arabic
            const serverError = response.message || 'فشل التجديد';
            let arabicMessage = serverError;

            if (serverError.includes('expired/suspended')) arabicMessage = 'الرخصة منتهية أو موقوفة';
            else if (serverError.includes('Lifetime licenses')) arabicMessage = 'الرخص الدائمة لا تحتاج لتجديد';

            return { success: false, message: arabicMessage };
        }

        // Verify signature
        if (!verifyLicenseSignature(response.license)) {
            return { success: false, message: 'توقيع الترخيص غير صالح' };
        }

        // Store new license
        await storeLicense(response.license);
        await updateLastOnlineCheck();

        logger.info('License renewed successfully', 'License', {
            expiresAt: response.license.payload.validTo,
        });

        return { success: true };
    } catch (error) {
        logger.error('License renewal failed', 'License', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'فشل التجديد',
        };
    }
}

/**
 * Check and auto-renew if needed (called on app start)
 */
export async function checkAndRenewLicense(): Promise<void> {
    const status = await getLicenseStatus();

    if (status.valid && !status.needsRenewal) {
        return; // License is fine
    }

    if (status.needsRenewal || status.inGracePeriod) {
        const result = await renewLicense();
        if (!result.success) {
            logger.warn('Auto-renewal failed', 'License', { message: result.message });
        }
    }
}

// =============================================================================
// DEACTIVATION
// =============================================================================

/**
 * Deactivate license (for device transfer)
 */
export async function deactivateLicense(): Promise<{
    success: boolean;
    message?: string;
}> {
    const deviceId = getStableDeviceId();
    const stored = await getStoredLicense();

    if (!stored) {
        return { success: false, message: 'لا يوجد ترخيص لإلغائه' };
    }

    // Check internet for server deactivation
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
        return { success: false, message: 'يجب الاتصال بالإنترنت لإلغاء التفعيل' };
    }

    // Get stored activation key
    const activationKey = await getStoredActivationKey();
    if (!activationKey) {
        return { success: false, message: 'مفتاح التفعيل غير موجود' };
    }

    try {
        // Call deactivate endpoint
        const response = await licenseServerRequest<{ success: boolean; message?: string }>(
            '/api/license/deactivate',
            {
                deviceId,
                productCode: PRODUCT_CODE,
                activationKey, // Server requires activationKey
            }
        );

        if (!response.success) {
            // Map server errors to Arabic
            const serverError = response.message || 'فشل إلغاء التفعيل';
            let arabicMessage = serverError;

            if (serverError.includes('not bound')) arabicMessage = 'الرخصة غير مفعلة على هذا الجهاز';
            else if (serverError.includes('expired')) arabicMessage = 'الرخصة منتهية الصلاحية';

            return { success: false, message: arabicMessage };
        }

        // Delete local license
        await deleteLicense();

        logger.info('License deactivated', 'License');
        return { success: true };
    } catch (error) {
        logger.error('License deactivation failed', 'License', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'فشل إلغاء التفعيل',
        };
    }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get machine ID for display to user
 */
export function getMachineId(): string {
    return getStableDeviceId();
}

/**
 * Check tampering status
 */
export function checkTampering(window?: Electron.BrowserWindow | null): ReturnType<typeof detectTampering> {
    return detectTampering(window);
}

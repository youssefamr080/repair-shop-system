/**
 * 📡 License IPC Handlers
 * 
 * Exposes license system functionality to the renderer process via IPC.
 */

import {
    getLicenseStatus,
    activateLicense,
    renewLicense,
    deactivateLicense,
    getMachineId,
    checkAndRenewLicense,
    initializeLicenseSystem,
    checkTampering,
} from '../license/hybrid-secure';
import {
    getLicenseConfig,
    updateLicenseConfig,
    applyLicensePreset,
    getProductCode,
} from '../license/config';
import { verifyDeviceWithTolerance, getCurrentHardwareComponents } from '../license/deviceStability';
import { logger } from '../utils/logger';
import { registerIPCHandler } from '../utils/ipcWrapper';
import { requirePermission } from '../middleware/auth';

/**
 * Setup all license-related IPC handlers
 */
export function setupLicenseHandlers(): void {
    // Initialize license system
    initializeLicenseSystem();

    // =========================================================================
    // STATUS & INFO
    // =========================================================================

    /**
     * Get current license status
     */
    registerIPCHandler('license:getStatus', async () => {
        return await getLicenseStatus();
    });

    /**
     * Get machine ID (for display to user during activation)
     */
    registerIPCHandler('license:getMachineId', async () => {
        return { machineId: getMachineId() };
    });

    /**
     * Get product code
     */
    registerIPCHandler('license:getProductCode', async () => {
        return { productCode: getProductCode() };
    });

    /**
     * Get device verification details
     */
    registerIPCHandler('license:getDeviceInfo', async () => {
        const verification = verifyDeviceWithTolerance();
        const components = getCurrentHardwareComponents();
        return {
            verification,
            components: {
                hostname: components.hostname,
                cpuModel: components.cpuModel,
                cpuCores: components.cpuCores,
                totalMemoryGB: components.totalMemoryGB,
                platform: components.platform,
            },
        };
    });

    // =========================================================================
    // ACTIVATION & RENEWAL
    // =========================================================================

    /**
     * Activate license with key
     */
    registerIPCHandler('license:activate', async (_event, activationKey: string) => {
        if (!activationKey || typeof activationKey !== 'string') {
            return { success: false, message: 'مفتاح التفعيل مطلوب' };
        }

        const trimmedKey = activationKey.trim();

        // Validate length (min 10, max 64 characters)
        if (trimmedKey.length < 10 || trimmedKey.length > 64) {
            return { success: false, message: 'مفتاح التفعيل غير صالح' };
        }

        // Validate format (alphanumeric and hyphens only)
        if (!/^[A-Z0-9-]+$/i.test(trimmedKey)) {
            return { success: false, message: 'صيغة مفتاح التفعيل غير صحيحة' };
        }

        return await activateLicense(trimmedKey);
    });

    /**
     * Renew existing license
     */
    registerIPCHandler('license:renew', async () => {
        return await renewLicense();
    });

    /**
     * Deactivate license (for device transfer)
     */
    registerIPCHandler('license:deactivate', async () => {
        return await deactivateLicense();
    });

    /**
     * Check and auto-renew if needed
     */
    registerIPCHandler('license:checkAndRenew', async () => {
        await checkAndRenewLicense();
        return { success: true };
    });

    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    /**
     * Get license configuration
     */
    registerIPCHandler('license:getConfig', async () => {
        return getLicenseConfig();
    });

    /**
     * Update license configuration
     * ⚠️ SECURITY NOTE: This handler modifies security-sensitive settings.
     * M2 FIX: Now requires admin/settings.edit permission
     */
    registerIPCHandler('license:updateConfig',
        requirePermission('settings.edit', async (_event, _ctx, config: Partial<ReturnType<typeof getLicenseConfig>>) => {
            try {
                // Validate input is an object
                if (!config || typeof config !== 'object' || Array.isArray(config)) {
                    return { success: false, message: 'بيانات الإعدادات غير صالحة' };
                }

                // Validate specific fields if provided
                if (config.similarityThreshold !== undefined) {
                    if (typeof config.similarityThreshold !== 'number' ||
                        config.similarityThreshold < 0.5 || config.similarityThreshold > 1) {
                        return { success: false, message: 'قيمة similarityThreshold غير صالحة' };
                    }
                }

                updateLicenseConfig(config);
                return { success: true };
            } catch (error) {
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'فشل تحديث الإعدادات',
                };
            }
        })
    );

    /**
     * Apply preset configuration
     * 🔒 H1 FIX: Now requires settings.edit permission
     */
    registerIPCHandler('license:applyPreset',
        requirePermission('settings.edit', async (_event, _ctx, preset: string) => {
            try {
                // Runtime validation - TypeScript types don't enforce at runtime
                const validPresets = ['standard', 'enterprise', 'enterprise-plus'];
                if (!preset || typeof preset !== 'string' || !validPresets.includes(preset)) {
                    return { success: false, message: 'الإعداد المسبق غير صالح' };
                }

                applyLicensePreset(preset as 'standard' | 'enterprise' | 'enterprise-plus');
                return { success: true };
            } catch (error) {
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'فشل تطبيق الإعدادات',
                };
            }
        })
    );

    // =========================================================================
    // SECURITY
    // =========================================================================

    /**
     * Check for tampering
     */
    registerIPCHandler('license:checkTampering', async () => {
        return checkTampering();
    });

    logger.info('License IPC handlers registered', 'License');
}

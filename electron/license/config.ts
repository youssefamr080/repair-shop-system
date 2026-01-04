/**
 * 🛡️ License Configuration Module
 * 
 * Manages configurable license settings for different products/clients.
 * Settings are stored in the database and can be updated at runtime.
 */

import { getSetting, setSetting } from '../database/settings';
import { logger } from '../utils/logger';
import type { LicenseConfig, LicensePreset, LicenseType } from './types';

// =============================================================================
// PRODUCT IDENTIFICATION
// =============================================================================

/**
 * 🆔 PRODUCT CODE - Change this for each of your products!
 * This is sent to the server during activation to validate the license key.
 */
export const PRODUCT_CODE = 'MAYO_FIX_ENTERPRISE_V1';

// =============================================================================
// CONFIGURATION KEYS (stored in database)
// =============================================================================

const CONFIG_KEYS = {
    SIMILARITY_THRESHOLD: 'license_device_similarity_threshold',
    GRACE_PERIOD_DAYS: 'license_grace_period_days',
    RENEWAL_DAYS_BEFORE_EXPIRY: 'license_renewal_days_before_expiry',
    RUNTIME_CHECKSUM_ENABLED: 'license_runtime_checksum_enabled',
    LICENSE_TYPE: 'license_type',
    OFFLINE_GRACE_DAYS: 'license_offline_grace_days',
} as const;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULTS: LicenseConfig = {
    similarityThreshold: 0.8, // 80% of components must match
    gracePeriodDays: 7,       // STRICT: Only 1 week grace after expiry
    renewalDaysBeforeExpiry: 3,
    runtimeChecksumEnabled: false,
    licenseType: 'monthly',
    offlineGraceDays: 7,      // STRICT: Max 1 week offline (or until license expires)
};

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

export const LICENSE_PRESETS: Record<LicensePreset, LicenseConfig> = {
    standard: {
        similarityThreshold: 0.8,
        gracePeriodDays: 7,       // 1 week grace after expiry
        renewalDaysBeforeExpiry: 3,
        runtimeChecksumEnabled: false,
        licenseType: 'monthly',
        offlineGraceDays: 7,      // 1 week max offline
    },
    enterprise: {
        similarityThreshold: 0.85, // Stricter
        gracePeriodDays: 3,        // Shorter grace period
        renewalDaysBeforeExpiry: 5,
        runtimeChecksumEnabled: true, // Enable checksum
        licenseType: 'enterprise',
        offlineGraceDays: 14, // Shorter offline grace
    },
    'enterprise-plus': {
        similarityThreshold: 0.9,    // Very strict
        gracePeriodDays: 1,          // Minimal grace period
        renewalDaysBeforeExpiry: 7,  // Renew much earlier
        runtimeChecksumEnabled: true,
        licenseType: 'enterprise-plus',
        offlineGraceDays: 7, // Very short offline grace
    },
};

// =============================================================================
// CONFIGURATION GETTERS
// =============================================================================

/**
 * Get current license configuration
 */
export function getLicenseConfig(): LicenseConfig {
    return {
        similarityThreshold: parseFloat(
            getSetting(CONFIG_KEYS.SIMILARITY_THRESHOLD) || String(DEFAULTS.similarityThreshold)
        ),
        gracePeriodDays: parseInt(
            getSetting(CONFIG_KEYS.GRACE_PERIOD_DAYS) || String(DEFAULTS.gracePeriodDays),
            10
        ),
        renewalDaysBeforeExpiry: parseInt(
            getSetting(CONFIG_KEYS.RENEWAL_DAYS_BEFORE_EXPIRY) || String(DEFAULTS.renewalDaysBeforeExpiry),
            10
        ),
        runtimeChecksumEnabled: getSetting(CONFIG_KEYS.RUNTIME_CHECKSUM_ENABLED) === 'true',
        licenseType: (getSetting(CONFIG_KEYS.LICENSE_TYPE) || DEFAULTS.licenseType) as LicenseType,
        offlineGraceDays: parseInt(
            getSetting(CONFIG_KEYS.OFFLINE_GRACE_DAYS) || String(DEFAULTS.offlineGraceDays),
            10
        ),
    };
}

/**
 * Get product code (read-only)
 */
export function getProductCode(): string {
    return PRODUCT_CODE;
}

// =============================================================================
// CONFIGURATION SETTERS
// =============================================================================

/**
 * Update license configuration
 * Validates input and stores in database
 */
export function updateLicenseConfig(config: Partial<LicenseConfig>): void {
    if (config.similarityThreshold !== undefined) {
        if (config.similarityThreshold < 0.5 || config.similarityThreshold > 1) {
            throw new Error('Similarity threshold must be between 0.5 and 1');
        }
        setSetting(CONFIG_KEYS.SIMILARITY_THRESHOLD, config.similarityThreshold.toString());
    }

    if (config.gracePeriodDays !== undefined) {
        if (config.gracePeriodDays < 0 || config.gracePeriodDays > 30) {
            throw new Error('Grace period must be between 0 and 30 days');
        }
        setSetting(CONFIG_KEYS.GRACE_PERIOD_DAYS, config.gracePeriodDays.toString());
    }

    if (config.renewalDaysBeforeExpiry !== undefined) {
        if (config.renewalDaysBeforeExpiry < 0 || config.renewalDaysBeforeExpiry > 30) {
            throw new Error('Renewal days must be between 0 and 30');
        }
        setSetting(CONFIG_KEYS.RENEWAL_DAYS_BEFORE_EXPIRY, config.renewalDaysBeforeExpiry.toString());
    }

    if (config.runtimeChecksumEnabled !== undefined) {
        setSetting(CONFIG_KEYS.RUNTIME_CHECKSUM_ENABLED, config.runtimeChecksumEnabled.toString());
    }

    if (config.licenseType !== undefined) {
        setSetting(CONFIG_KEYS.LICENSE_TYPE, config.licenseType);
    }

    if (config.offlineGraceDays !== undefined) {
        if (config.offlineGraceDays < 0 || config.offlineGraceDays > 90) {
            throw new Error('Offline grace days must be between 0 and 90');
        }
        setSetting(CONFIG_KEYS.OFFLINE_GRACE_DAYS, config.offlineGraceDays.toString());
    }

    logger.info('License configuration updated', 'LicenseConfig', config);
}

/**
 * Apply a preset configuration
 */
export function applyLicensePreset(preset: LicensePreset): void {
    const config = LICENSE_PRESETS[preset];
    if (!config) {
        throw new Error(`Unknown license preset: ${preset}`);
    }
    updateLicenseConfig(config);
    logger.info('License preset applied', 'LicenseConfig', { preset });
}

/**
 * Reset to default configuration
 */
export function resetLicenseConfigToDefaults(): void {
    updateLicenseConfig(DEFAULTS);
    logger.info('License configuration reset to defaults', 'LicenseConfig');
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if enterprise features are enabled
 */
export function isEnterpriseLicense(): boolean {
    const config = getLicenseConfig();
    return config.licenseType === 'enterprise' || config.licenseType === 'enterprise-plus';
}

/**
 * Check if runtime checksum should be verified
 */
export function shouldVerifyRuntimeChecksum(): boolean {
    const config = getLicenseConfig();
    return config.runtimeChecksumEnabled && isEnterpriseLicense();
}

/**
 * 🔒 Device ID Stability Module
 * 
 * Manages device history with tolerance for hardware changes.
 * 
 * FIXED: Stores RAW COMPONENTS (not hashes) and compares them individually.
 * This allows proper similarity detection even when hardware changes slightly.
 * 
 * Features:
 * - Raw component storage (encrypted)
 * - Component-by-component comparison
 * - Configurable similarity threshold
 * - Integrity hash for tamper detection
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app } from 'electron';
import {
    getHardwareComponents,
    generateDeviceId,
    compareHardwareComponents
} from '../utils/hardwareFingerprint';
import { logger } from '../utils/logger';
import { SecretGuard } from '../utils/secret-guard';
import type {
    HardwareComponents,
    DeviceHistory,
    DeviceVerificationResult
} from './types';
import { getLicenseConfig } from './config';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEVICE_HISTORY_FILE = 'device-history.enc';
const MAX_PREVIOUS_COMPONENTS = 3; // Keep last 3 hardware states

// =============================================================================
// ENCRYPTION HELPERS
// =============================================================================

/**
 * Get encryption key derived from DB_KEY
 */
function getEncryptionKey(): Buffer {
    const dbKey = SecretGuard.retrieve('DB_KEY');
    return crypto.scryptSync(dbKey, 'device-history-salt-v2', 32);
}

/**
 * Encrypt device history data
 */
function encryptDeviceHistory(data: string): string {
    const algorithm = 'aes-256-gcm';
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt device history data
 */
function decryptDeviceHistory(encrypted: string): string {
    const algorithm = 'aes-256-gcm';
    const key = getEncryptionKey();

    const parts = encrypted.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encryptedData] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Calculate integrity hash for tamper detection
 */
function calculateIntegrityHash(data: Omit<DeviceHistory, 'integrityHash'>): string {
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
}

// =============================================================================
// FILE OPERATIONS
// =============================================================================

/**
 * Get device history file path
 */
function getDeviceHistoryPath(): string {
    return path.join(app.getPath('userData'), DEVICE_HISTORY_FILE);
}

/**
 * Load device history from encrypted file
 */
function loadDeviceHistory(): DeviceHistory | null {
    try {
        const historyPath = getDeviceHistoryPath();
        if (!fs.existsSync(historyPath)) {
            return null;
        }

        const encrypted = fs.readFileSync(historyPath, 'utf-8');
        const decrypted = decryptDeviceHistory(encrypted);
        const history = JSON.parse(decrypted) as DeviceHistory;

        // Verify integrity hash
        const dataWithoutHash: Omit<DeviceHistory, 'integrityHash'> = {
            currentComponents: history.currentComponents,
            previousComponents: history.previousComponents,
            lastUpdated: history.lastUpdated,
        };
        const expectedHash = calculateIntegrityHash(dataWithoutHash);

        if (history.integrityHash !== expectedHash) {
            logger.error('Device history integrity check failed - possible tampering', 'DeviceStability', {
                expected: expectedHash.substring(0, 8),
                actual: history.integrityHash?.substring(0, 8),
            });
            return null; // Fail secure
        }

        return history;
    } catch (error) {
        logger.error('Failed to load device history', 'DeviceStability', error);
        return null;
    }
}

/**
 * Save device history to encrypted file
 */
function saveDeviceHistory(data: Omit<DeviceHistory, 'integrityHash'>): void {
    try {
        const integrityHash = calculateIntegrityHash(data);
        const historyWithHash: DeviceHistory = { ...data, integrityHash };

        const encrypted = encryptDeviceHistory(JSON.stringify(historyWithHash));
        const historyPath = getDeviceHistoryPath();

        // Ensure directory exists
        const dir = path.dirname(historyPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(historyPath, encrypted, 'utf-8');
        logger.debug('Device history saved with integrity hash', 'DeviceStability');
    } catch (error) {
        logger.error('Failed to save device history', 'DeviceStability', error);
    }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Verify current device against stored history
 * 
 * FIXED: Uses component-by-component comparison instead of hash comparison!
 * 
 * @returns Verification result with similarity score and details
 */
export function verifyDeviceWithTolerance(): DeviceVerificationResult {
    const config = getLicenseConfig();
    const threshold = config.similarityThreshold;
    const currentComponents = getHardwareComponents();
    const history = loadDeviceHistory();

    // First time - save and accept
    if (!history) {
        saveDeviceHistory({
            currentComponents,
            previousComponents: [],
            lastUpdated: new Date().toISOString(),
        });

        logger.info('First device registration', 'DeviceStability', {
            hostname: currentComponents.hostname,
        });

        return {
            valid: true,
            isNewDevice: true,
            similarityScore: 1.0,
            matchedComponents: Object.keys(currentComponents),
            unmatchedComponents: [],
            reason: 'First device registration',
        };
    }

    // Compare with current stored components
    const comparison = compareHardwareComponents(currentComponents, history.currentComponents);

    // Check if similarity meets threshold
    if (comparison.similarityScore >= threshold) {
        // Similar enough - update if components changed
        if (comparison.similarityScore < 1.0) {
            // Some components changed, update history
            const updatedHistory: Omit<DeviceHistory, 'integrityHash'> = {
                currentComponents,
                previousComponents: [
                    history.currentComponents,
                    ...history.previousComponents.slice(0, MAX_PREVIOUS_COMPONENTS - 1),
                ],
                lastUpdated: new Date().toISOString(),
            };
            saveDeviceHistory(updatedHistory);

            logger.info('Device components updated (within tolerance)', 'DeviceStability', {
                similarity: comparison.similarityScore.toFixed(2),
                threshold: threshold.toFixed(2),
                changed: comparison.unmatchedComponents,
            });
        }

        return {
            valid: true,
            isNewDevice: false,
            similarityScore: comparison.similarityScore,
            matchedComponents: comparison.matchedComponents,
            unmatchedComponents: comparison.unmatchedComponents,
            reason: `Device verified (${(comparison.similarityScore * 100).toFixed(0)}% match)`,
        };
    }

    // Check against previous components (in case of rollback)
    for (let i = 0; i < history.previousComponents.length; i++) {
        const prevComparison = compareHardwareComponents(
            currentComponents,
            history.previousComponents[i]
        );

        if (prevComparison.similarityScore >= threshold) {
            // Matches a previous state - update to current
            const updatedHistory: Omit<DeviceHistory, 'integrityHash'> = {
                currentComponents,
                previousComponents: [
                    history.currentComponents,
                    ...history.previousComponents.slice(0, MAX_PREVIOUS_COMPONENTS - 1),
                ],
                lastUpdated: new Date().toISOString(),
            };
            saveDeviceHistory(updatedHistory);

            logger.info('Device matches previous state', 'DeviceStability', {
                similarity: prevComparison.similarityScore.toFixed(2),
                previousIndex: i,
            });

            return {
                valid: true,
                isNewDevice: false,
                similarityScore: prevComparison.similarityScore,
                matchedComponents: prevComparison.matchedComponents,
                unmatchedComponents: prevComparison.unmatchedComponents,
                reason: `Matches previous device state (#${i + 1})`,
            };
        }
    }

    // Completely different device
    logger.warn('Device verification failed - different device', 'DeviceStability', {
        similarity: comparison.similarityScore.toFixed(2),
        threshold: threshold.toFixed(2),
        unmatched: comparison.unmatchedComponents,
    });

    return {
        valid: false,
        isNewDevice: true,
        similarityScore: comparison.similarityScore,
        matchedComponents: comparison.matchedComponents,
        unmatchedComponents: comparison.unmatchedComponents,
        reason: `Device mismatch (${(comparison.similarityScore * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}% threshold)`,
    };
}

/**
 * Get stable device ID (with verification)
 */
export function getStableDeviceId(): string {
    // Verify device first
    const verification = verifyDeviceWithTolerance();

    if (!verification.valid) {
        logger.warn('Device verification failed during ID generation', 'DeviceStability', {
            reason: verification.reason,
        });
    }

    return generateDeviceId();
}

/**
 * Get current hardware components
 */
export function getCurrentHardwareComponents(): HardwareComponents {
    return getHardwareComponents();
}

/**
 * Force reset device history (for development/testing)
 */
export function resetDeviceHistory(): void {
    try {
        const historyPath = getDeviceHistoryPath();
        if (fs.existsSync(historyPath)) {
            fs.unlinkSync(historyPath);
            logger.info('Device history reset', 'DeviceStability');
        }
    } catch (error) {
        logger.error('Failed to reset device history', 'DeviceStability', error);
    }
}

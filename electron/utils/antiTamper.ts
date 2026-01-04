/**
 * 🛡️ Anti-Debug / Anti-Tamper Detection
 * 
 * Optional security measures for enterprise licenses.
 * Follows "fail-open" strategy - doesn't break users if checks fail.
 * 
 * Features:
 * - Debug mode detection
 * - DevTools detection
 * - Runtime checksum verification (enterprise only)
 */

import { logger } from './logger';
import { getSetting } from '../database/settings';
import type { TamperDetectionResult } from '../license/types';

// =============================================================================
// CONSTANTS
// =============================================================================

const LICENSE_TYPE_KEY = 'license_type';


// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if running an enterprise license
 */
function isEnterpriseLicense(): boolean {
    const licenseType = getSetting(LICENSE_TYPE_KEY);
    return licenseType === 'enterprise' || licenseType === 'enterprise-plus';
}

/**
 * Check if runtime checksum is enabled
 */
function isRuntimeChecksumEnabled(): boolean {
    if (!isEnterpriseLicense()) {
        return false;
    }
    // SECURITY FIX: Hardcode to true for enterprise licenses. 
    // Do NOT read from DB, as DB key is recoverable.
    return true;
}

// =============================================================================
// DETECTION METHODS
// =============================================================================

/**
 * Detect if app is running with debugging flags
 * ⚠️ Only logs warning, doesn't block
 */
export function detectDebugMode(): boolean {
    // Check for --inspect and --inspect-brk flags
    const hasInspect = process.execArgv.some(arg =>
        arg.includes('--inspect') || arg.includes('--inspect-brk')
    );

    if (hasInspect) {
        logger.warn('Debug mode detected (--inspect flag)', 'AntiTamper');
        return true;
    }

    // Check for ELECTRON_DEBUG_NOTIFICATIONS
    if (process.env.ELECTRON_DEBUG_NOTIFICATIONS) {
        logger.debug('Debug notifications enabled', 'AntiTamper');
        return true;
    }

    // More robust development mode check:
    // Don't just rely on NODE_ENV (can be spoofed)
    // Also check if running from packaged app (app.isPackaged in main process)
    const isDevEnvironment =
        process.env.NODE_ENV === 'development' ||
        process.env['VITE_DEV_SERVER_URL'] ||
        // Check if running from source (not packaged)
        (process.defaultApp === true);

    if (isDevEnvironment) {
        return false; // Don't flag dev mode as debug
    }

    return false;
}

/**
 * Detect if DevTools are open in a window
 * Call from main process with the window reference
 */
export function detectDevTools(window: Electron.BrowserWindow | null): boolean {
    if (!window) return false;

    try {
        const isOpen = window.webContents.isDevToolsOpened();

        if (isOpen && process.env.NODE_ENV !== 'development') {
            logger.warn('DevTools detected in production', 'AntiTamper');
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Verify runtime checksum of main.js
 * ⚠️ Only runs for enterprise licenses
 * ⚠️ Expensive operation - use sparingly
 */
export function verifyRuntimeChecksum(): boolean {
    if (!isRuntimeChecksumEnabled()) {
        return true; // Skip for non-enterprise
    }

    try {
        const fs = require('fs');
        const path = require('path');
        const crypto = require('crypto');

        // Try to find main.js in various locations
        const possiblePaths = [
            path.join(process.resourcesPath || '', 'app', 'dist-electron', 'main.js'),
            path.join(process.cwd(), 'dist-electron', 'main.js'),
            path.join(__dirname, '..', 'main.js'),
        ];

        let mainJsPath: string | null = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                mainJsPath = p;
                break;
            }
        }

        if (!mainJsPath) {
            // In development or unpacked mode - allow
            if (process.env.NODE_ENV === 'development') {
                logger.debug('Main.js not found (dev mode) - skipping checksum', 'AntiTamper');
                return true;
            }
            // In production but file not found - suspicious for enterprise
            logger.warn('Main.js not found in production - potential tampering', 'AntiTamper');
            return false; // Fail secure for enterprise
        }

        // Calculate checksum
        const content = fs.readFileSync(mainJsPath);
        const checksum = crypto.createHash('sha256').update(content).digest('hex');

        // For now, just log the checksum
        // In production, compare against stored checksum
        logger.debug('Runtime checksum calculated', 'AntiTamper', {
            checksum: checksum.substring(0, 16),
        });

        // TODO: Compare against SecretGuard.retrieve('MAIN_JS_CHECKSUM_ENTERPRISE')
        // For now, always pass since checksum storage is not implemented
        return true;
    } catch (error) {
        logger.error('Checksum check failed - blocking access for enterprise', 'AntiTamper', error);
        return false; // Fail SECURE for enterprise licenses
    }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Run all tamper detection checks
 * Returns aggregated result with severity
 */
export function detectTampering(window?: Electron.BrowserWindow | null): TamperDetectionResult {
    const reasons: string[] = [];
    let severity: TamperDetectionResult['severity'] = 'low';

    // Check debug mode (low severity)
    if (detectDebugMode()) {
        reasons.push('Debug mode detected');
        severity = 'low';
    }

    // Check DevTools (low severity in dev, medium in prod)
    if (window && detectDevTools(window)) {
        reasons.push('DevTools open in production');
        if (process.env.NODE_ENV !== 'development') {
            severity = 'medium';
        }
    }

    // Check runtime checksum (high severity if fails - enterprise only)
    if (isRuntimeChecksumEnabled() && !verifyRuntimeChecksum()) {
        reasons.push('Runtime checksum mismatch');
        severity = 'high';
    }

    return {
        isTampered: reasons.length > 0,
        reasons,
        severity,
    };
}

/**
 * Setup continuous DevTools monitoring for a window
 * Optionally close DevTools when detected in production
 */
export function setupDevToolsMonitor(
    window: Electron.BrowserWindow,
    options: { closeOnDetect?: boolean; interval?: number } = {}
): () => void {
    const { closeOnDetect = false, interval = 5000 } = options;

    const checkDevTools = () => {
        if (process.env.NODE_ENV === 'development') return;

        try {
            if (window.webContents.isDevToolsOpened()) {
                logger.warn('DevTools detected during monitoring', 'AntiTamper');

                if (closeOnDetect) {
                    window.webContents.closeDevTools();
                    logger.info('DevTools closed automatically', 'AntiTamper');
                }
            }
        } catch {
            // Window may be destroyed
        }
    };

    const intervalId = setInterval(checkDevTools, interval);

    // Return cleanup function
    return () => clearInterval(intervalId);
}

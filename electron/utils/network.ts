/**
 * 🌐 Network Connectivity Utilities
 * 
 * Multi-strategy internet connectivity checking.
 * Used by license system to determine if online activation/renewal is possible.
 */

import * as dns from 'dns';
import * as https from 'https';
import { logger } from './logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONNECTIVITY_TIMEOUT = 3000; // 3 seconds
const HEALTH_CHECK_PATH = '/api/health';

// License server URL (retrieved from SecretGuard in production)
let licenseServerUrl: string | null = null;

/**
 * Set the license server URL (called during initialization)
 */
export function setLicenseServerUrl(url: string): void {
    licenseServerUrl = url;
}

// =============================================================================
// CONNECTIVITY METHODS
// =============================================================================

/**
 * Method 1: Try connecting to license server health endpoint
 * This is the best test - confirms actual server connectivity
 */
async function checkViaLicenseServer(): Promise<boolean> {
    if (!licenseServerUrl) {
        return false;
    }

    return new Promise((resolve) => {
        try {
            const url = new URL(licenseServerUrl!);

            const req = https.request({
                hostname: url.hostname,
                port: url.port || 443,
                path: HEALTH_CHECK_PATH,
                method: 'HEAD',
                timeout: CONNECTIVITY_TIMEOUT,
            }, (res) => {
                resolve(res.statusCode !== undefined && res.statusCode < 500);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        } catch {
            resolve(false);
        }
    });
}

/**
 * Method 2: DNS lookup (works even if HTTP blocked)
 */
async function checkViaDNS(): Promise<boolean> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), CONNECTIVITY_TIMEOUT);

        dns.lookup('google.com', (err) => {
            clearTimeout(timeout);
            resolve(!err);
        });
    });
}

/**
 * Method 3: Google DNS HTTPS (fallback)
 */
async function checkViaGoogleDNS(): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const req = https.request({
                hostname: 'dns.google',
                port: 443,
                path: '/resolve?name=google.com&type=A',
                method: 'GET',
                timeout: CONNECTIVITY_TIMEOUT,
                headers: {
                    'Accept': 'application/dns-json',
                },
            }, (res) => {
                resolve(res.statusCode === 200);
                res.resume(); // Consume response
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        } catch {
            resolve(false);
        }
    });
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check internet connectivity using multiple methods
 * Returns true if any method succeeds
 */
export async function checkInternetConnection(): Promise<boolean> {
    const methods = [
        { name: 'License Server', fn: checkViaLicenseServer },
        { name: 'DNS Lookup', fn: checkViaDNS },
        { name: 'Google DNS', fn: checkViaGoogleDNS },
    ];

    for (const { name, fn } of methods) {
        try {
            const result = await fn();
            if (result) {
                logger.debug(`Internet check passed via ${name}`, 'Network');
                return true;
            }
        } catch (error) {
            logger.debug(`Internet check failed via ${name}`, 'Network', error);
        }
    }

    logger.warn('No internet connectivity detected', 'Network');
    return false;
}

/**
 * Check if license server is specifically reachable
 * More specific than general internet check
 */
export async function checkLicenseServerReachable(): Promise<boolean> {
    if (!licenseServerUrl) {
        logger.warn('License server URL not configured', 'Network');
        return false;
    }

    const result = await checkViaLicenseServer();
    if (!result) {
        logger.warn('License server not reachable', 'Network', { url: licenseServerUrl });
    }
    return result;
}

/**
 * Make HTTPS request to license server
 */
export async function licenseServerRequest<T>(
    endpoint: string,
    data: unknown
): Promise<T> {
    if (!licenseServerUrl) {
        throw new Error('License server URL not configured');
    }

    return new Promise((resolve, reject) => {
        try {
            const url = new URL(licenseServerUrl!);
            const postData = JSON.stringify(data);

            const req = https.request({
                hostname: url.hostname,
                port: url.port || 443,
                path: endpoint,
                method: 'POST',
                timeout: 10000, // 10 seconds for actual requests
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'Mayo-Fix-System/1.0',
                },
            }, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk.toString();
                });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData) as any;
                        // Map server 'error' field to 'message' for client consistency
                        if (parsed.error && !parsed.message) {
                            parsed.message = parsed.error;
                        }
                        resolve(parsed as T);
                    } catch {
                        reject(new Error('Invalid server response'));
                    }
                });
            });

            req.on('error', (err) => {
                logger.error('License server request failed', 'Network', err);
                reject(err);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(postData);
            req.end();
        } catch (error) {
            reject(error);
        }
    });
}

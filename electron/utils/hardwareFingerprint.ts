/**
 * 🖥️ Hardware Fingerprinting
 * 
 * Collects hardware components for device identification.
 * FIXED: Stores raw components separately for component-by-component comparison
 * (instead of hashing everything into one string)
 * 
 * Features:
 * - Core components (always available)
 * - Optional Windows components (WMIC - may not work on Windows 11+)
 * - MAC address extraction (excludes virtual NICs)
 * - Memory rounded to nearest GB for tolerance
 */

import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { machineIdSync } from 'node-machine-id';
import { logger } from './logger';
import type { HardwareComponents, ComponentMatchResult } from '../license/types';

// =============================================================================
// CORE COMPONENT EXTRACTION
// =============================================================================

/**
 * Get the primary (non-virtual) MAC address
 * Excludes virtual adapters (Hyper-V, VMware, VirtualBox, Docker)
 */
function getPrimaryMacAddress(): string {
    const VIRTUAL_MAC_PREFIXES = [
        '00:15:5d', // Hyper-V
        '00:15:5e', // WSL2
        '00:50:56', // VMware
        '08:00:27', // VirtualBox
        '02:42',    // Docker
        '00:0c:29', // VMware
        '00:1c:42', // Parallels
        '52:54:00', // QEMU/KVM
        '00:16:3e', // Xen
        '00:1a:4a', // Paragon
        '00:03:ff', // Microsoft Virtual PC
        '00:0f:4b', // Virtual Iron
        '00:21:f6', // Virtual Iron 4
    ];

    const networkInterfaces = os.networkInterfaces();
    const macs: string[] = [];

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        if (!interfaces) continue;

        for (const iface of interfaces) {
            // Skip internal, invalid, or loopback
            if (iface.internal || !iface.mac || iface.mac === '00:00:00:00:00:00') {
                continue;
            }

            // Skip virtual adapters
            const isVirtual = VIRTUAL_MAC_PREFIXES.some(prefix =>
                iface.mac.toLowerCase().startsWith(prefix)
            );
            if (isVirtual) continue;

            macs.push(iface.mac);
        }
    }

    // Sort for consistency and return first (or fallback)
    macs.sort();
    return macs[0] || 'unknown';
}

/**
 * Round memory to nearest GB for tolerance
 * (Minor RAM changes shouldn't invalidate the device)
 */
function roundMemoryToGB(bytes: number): number {
    return Math.round(bytes / (1024 * 1024 * 1024));
}

// =============================================================================
// WINDOWS OPTIONAL COMPONENTS
// =============================================================================

interface WindowsOptionalComponents {
    windowsProductId?: string;
    biosSerial?: string;
    diskSerial?: string;
}

/**
 * Get Windows-specific hardware info via WMIC
 * ⚠️ WMIC is deprecated in Windows 11 - all values are OPTIONAL
 * Non-blocking - doesn't fail if WMIC unavailable
 */
function getWindowsOptionalComponents(): WindowsOptionalComponents {
    const result: WindowsOptionalComponents = {};

    if (process.platform !== 'win32') {
        return result;
    }

    const wmicCommands = [
        { key: 'windowsProductId', command: 'wmic os get serialnumber /value', field: 'SerialNumber' },
        { key: 'biosSerial', command: 'wmic bios get serialnumber /value', field: 'SerialNumber' },
        { key: 'diskSerial', command: 'wmic diskdrive get serialnumber /value', field: 'SerialNumber' },
    ] as const;

    for (const { key, command, field } of wmicCommands) {
        try {
            const output = execSync(command, {
                encoding: 'utf-8',
                timeout: 5000, // Increased for slower machines
                windowsHide: true,
            });

            const line = output.split('\n').find(l => l.startsWith(`${field}=`));
            const value = line?.split('=')[1]?.trim();

            if (value && value !== '' && value !== 'None' && value !== 'To be filled by O.E.M.') {
                result[key] = value;
            }
        } catch {
            // WMIC not available - that's OK, it's optional
            logger.debug(`WMIC ${key} not available (optional)`, 'HardwareFingerprint');
        }
    }

    return result;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get raw hardware components for fingerprinting
 * FIXED: Returns components separately for comparison, not as a hash!
 */
export function getHardwareComponents(): HardwareComponents {
    const cpus = os.cpus();
    const windowsOptional = getWindowsOptionalComponents();

    const components: HardwareComponents = {
        // Core components (always available)
        hostname: os.hostname(),
        cpuModel: cpus[0]?.model || 'unknown',
        cpuCores: cpus.length,
        totalMemoryGB: roundMemoryToGB(os.totalmem()),
        platform: os.platform(),
        arch: os.arch(),
        primaryMac: getPrimaryMacAddress(),
        // Optional Windows components
        ...windowsOptional,
    };

    logger.debug('Hardware components collected', 'HardwareFingerprint', {
        hostname: components.hostname,
        cpuModel: components.cpuModel.substring(0, 30),
        cpuCores: components.cpuCores,
        totalMemoryGB: components.totalMemoryGB,
        primaryMac: components.primaryMac,
        hasWindowsSerial: !!components.windowsProductId,
    });

    return components;
}

/**
 * Generate Device ID hash from hardware components
 * This is used for server-side storage (not for local comparison!)
 */
export function generateDeviceId(): string {
    const components = getHardwareComponents();

    // Include machine ID for uniqueness
    let machineId = '';
    try {
        machineId = machineIdSync();
    } catch {
        // Fallback: generate ID from hostname + MAC when machineIdSync fails
        machineId = crypto.createHash('md5')
            .update(components.hostname + components.primaryMac)
            .digest('hex');
        logger.warn('Using fallback machine ID (hostname+MAC hash)', 'HardwareFingerprint');
    }

    // Create hash from core components + machine ID
    const coreString = [
        components.hostname,
        components.cpuModel,
        components.cpuCores,
        components.totalMemoryGB,
        components.platform,
        components.arch,
        components.primaryMac,
        machineId,
    ].join('|');

    return crypto.createHash('sha256').update(coreString).digest('hex');
}

/**
 * Compare two hardware component sets
 * FIXED: Compares component-by-component, returns match details
 * 
 * @returns Object with similarity score (0-1) and match details
 */
export function compareHardwareComponents(
    current: HardwareComponents,
    stored: HardwareComponents
): {
    similarityScore: number;
    matchResults: ComponentMatchResult[];
    matchedComponents: string[];
    unmatchedComponents: string[];
} {
    // Define which components to compare and their weights
    const comparisons: Array<{
        key: keyof HardwareComponents;
        weight: number; // Higher = more important
        compareFn?: (a: any, b: any) => boolean;
    }> = [
            { key: 'cpuModel', weight: 2 }, // CPU rarely changes
            { key: 'cpuCores', weight: 1 },
            { key: 'totalMemoryGB', weight: 1, compareFn: (a, b) => Math.abs(a - b) <= 2 }, // Allow ±2GB tolerance
            { key: 'platform', weight: 2 }, // Platform never changes
            { key: 'arch', weight: 2 }, // Architecture rarely changes
            { key: 'primaryMac', weight: 1.5 }, // MAC can change (new NIC)
            { key: 'hostname', weight: 0.5 }, // Hostname can be changed easily
            // Optional components (only compare if both have them)
            { key: 'biosSerial', weight: 2 },
            { key: 'diskSerial', weight: 1.5 },
            { key: 'windowsProductId', weight: 2 },
        ];

    const matchResults: ComponentMatchResult[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;
    const matchedComponents: string[] = [];
    const unmatchedComponents: string[] = [];

    for (const { key, weight, compareFn } of comparisons) {
        const currentValue = current[key];
        const storedValue = stored[key];

        // Skip if both are undefined/null
        if (currentValue === undefined && storedValue === undefined) {
            continue;
        }

        totalWeight += weight;

        const matches = compareFn
            ? compareFn(currentValue, storedValue)
            : currentValue === storedValue;

        matchResults.push({
            component: key,
            matches,
            current: currentValue,
            stored: storedValue,
        });

        if (matches) {
            matchedWeight += weight;
            matchedComponents.push(key);
        } else {
            unmatchedComponents.push(key);
        }
    }

    const similarityScore = totalWeight > 0 ? matchedWeight / totalWeight : 0;

    logger.debug('Hardware comparison result', 'HardwareFingerprint', {
        similarityScore: similarityScore.toFixed(2),
        matched: matchedComponents.length,
        unmatched: unmatchedComponents.length,
    });

    return {
        similarityScore,
        matchResults,
        matchedComponents,
        unmatchedComponents,
    };
}

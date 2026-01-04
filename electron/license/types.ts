/**
 * 🔐 License System Types
 * 
 * TypeScript interfaces for the hybrid license system.
 */

// =============================================================================
// HARDWARE FINGERPRINT TYPES
// =============================================================================

/**
 * Raw hardware components for fingerprinting
 * These are stored SEPARATELY for component-by-component comparison
 */
export interface HardwareComponents {
    hostname: string;
    cpuModel: string;
    cpuCores: number;
    totalMemoryGB: number; // Rounded to nearest GB for tolerance
    platform: string;
    arch: string;
    primaryMac: string; // First non-virtual MAC address
    // Optional Windows-specific (WMIC deprecated in Win11)
    windowsProductId?: string;
    biosSerial?: string;
    diskSerial?: string;
}

/**
 * Component match result for similarity calculation
 */
export interface ComponentMatchResult {
    component: keyof HardwareComponents;
    matches: boolean;
    current: string | number | undefined;
    stored: string | number | undefined;
}

// =============================================================================
// DEVICE STABILITY TYPES
// =============================================================================

/**
 * Device history stored encrypted on disk
 * FIXED: Stores raw components, not hash!
 */
export interface DeviceHistory {
    currentComponents: HardwareComponents;
    previousComponents: HardwareComponents[];
    lastUpdated: string;
    integrityHash: string;
}

/**
 * Device verification result
 */
export interface DeviceVerificationResult {
    valid: boolean;
    isNewDevice: boolean;
    similarityScore: number;
    matchedComponents: string[];
    unmatchedComponents: string[];
    reason?: string;
}

// =============================================================================
// LICENSE TYPES
// =============================================================================

/**
 * License payload signed by the server
 */
export interface LicensePayload {
    deviceId: string; // Hash of hardware components for server storage
    productCode: string; // Product identifier (MY_APP_CODE)
    validFrom: string; // ISO date
    validTo: string;   // ISO date
    licenseType: LicenseType;
    issuedAt: string;  // ISO date
    customerId?: string; // NEW: Optional customer ID from server
    customerEmail?: string; // NEW: Optional customer email for display
}

export type LicenseType =
    | 'trial'
    | 'monthly'
    | 'yearly'
    | 'lifetime'
    | 'enterprise'
    | 'enterprise-plus';

/**
 * Signed license with RSA signature
 */
export interface SignedLicense {
    payload: LicensePayload;
    signature: string; // RSA-SHA256 signature (base64)
}

/**
 * License status returned to UI
 */
export interface LicenseStatus {
    valid: boolean;
    deviceId: string;
    expiresAt: string | null;
    daysRemaining: number;
    inGracePeriod: boolean;
    needsRenewal: boolean;
    licenseType: LicenseType | null;
    tampered: boolean;
    productCode: string;
}

// =============================================================================
// LICENSE CONFIG TYPES
// =============================================================================

/**
 * License configuration (stored in database)
 */
export interface LicenseConfig {
    similarityThreshold: number; // 0.0 - 1.0 (default: 0.8 = 80%)
    gracePeriodDays: number;
    renewalDaysBeforeExpiry: number;
    runtimeChecksumEnabled: boolean;
    licenseType: LicenseType;
    offlineGraceDays: number; // NEW: Days allowed offline
}

export type LicensePreset = 'standard' | 'enterprise' | 'enterprise-plus';

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Activation request to server
 */
export interface ActivationRequest {
    deviceId: string;
    activationKey: string;
    productCode: string;
    hardwareComponents: HardwareComponents;
}

/**
 * Activation response from server
 */
export interface ActivationResponse {
    success: boolean;
    license?: SignedLicense;
    message?: string;
    expiresAt?: string;
}

/**
 * Renewal request to server
 */
export interface RenewalRequest {
    deviceId: string;
    productCode: string;
    currentToken: string;
}

/**
 * Renewal response from server
 */
export interface RenewalResponse {
    success: boolean;
    license?: SignedLicense;
    message?: string;
    paymentStatus?: 'active' | 'pending' | 'expired';
}

// =============================================================================
// ANTI-TAMPER TYPES
// =============================================================================

export interface TamperDetectionResult {
    isTampered: boolean;
    reasons: string[];
    severity: 'low' | 'medium' | 'high';
}

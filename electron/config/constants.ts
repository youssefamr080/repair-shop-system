/**
 * Centralized Configuration Constants - Mayo Fix
 * 
 * All configuration values for the inventory system.
 */

// ============ INVENTORY MANAGEMENT CONSTANTS ============

/**
 * Low stock threshold percentage (default)
 * Items below this % of reorder level are flagged
 */
export const LOW_STOCK_THRESHOLD_PERCENT = 20;

/**
 * Default reorder quantity multiplier
 */
export const DEFAULT_REORDER_MULTIPLIER = 2;

// ============ DATABASE CONSTANTS ============

/**
 * Busy timeout for SQLite database (milliseconds)
 * Prevents SQLITE_BUSY errors
 */
export const DATABASE_BUSY_TIMEOUT_MS = 5000;

/**
 * Maximum number of audit logs to retrieve by default
 */
export const DEFAULT_AUDIT_LOG_LIMIT = 100;

// ============ NOTIFICATION MANAGEMENT CONSTANTS ============

/**
 * Maximum number of notification keys to keep in memory
 * Prevents unbounded memory growth
 */
export const MAX_NOTIFICATION_KEYS = 10000;

/**
 * Time to keep notification keys before cleanup (milliseconds)
 * Prevents duplicate notifications within this window
 */
export const NOTIFICATION_RETENTION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Interval for cleaning up old notification keys (milliseconds)
 */
export const NOTIFICATION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ============ EXPORT CONSTANTS ============

/**
 * Maximum file size for company logo (bytes)
 * 1MB = 1,000,000 bytes
 */
export const MAX_LOGO_SIZE_BYTES = 1_000_000;

/**
 * Default items per page for paginated queries
 */
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Maximum items per page (safety limit)
 */
export const MAX_PAGE_SIZE = 100;

// ============ CACHE CONSTANTS ============

/**
 * Default cache TTL (time to live) in milliseconds
 */
export const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Settings cache TTL
 */
export const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

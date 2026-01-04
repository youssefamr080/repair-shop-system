/**
 * Rate Limiting Utility for IPC Handlers
 * 
 * Prevents abuse by limiting the number of requests per time window
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every minute
    this.cleanupIntervalId = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Stop the cleanup interval (call on app shutdown)
   */
  destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.requests.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Check if a request should be allowed
   * @param identifier - Unique identifier (e.g., IP address, user ID, handler name)
   * @returns true if request is allowed, false if rate limited
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemaining(identifier: string): number {
    const entry = this.requests.get(identifier);
    if (!entry || entry.resetTime < Date.now()) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Reset rate limit for an identifier (useful for testing or manual reset)
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Create rate limiters for different handler types
// NOTE: These are limits for a local Electron app where rate limiting
// between renderer and main process is primarily for preventing accidental loops
// and basic protection against brute force.

// P2-L2: More restrictive limits for sensitive endpoints
export const ipcRateLimiter = new RateLimiter(60000, 500);       // 500 requests per minute (general)
export const authRateLimiter = new RateLimiter(60000, 30);       // 30 auth attempts per minute (P2-L2: stricter)
export const sensitiveRateLimiter = new RateLimiter(60000, 100); // 100 for sensitive operations (P2-L2)
export const syncRateLimiter = new RateLimiter(60000, 60);       // 60 syncs per minute
export const exportRateLimiter = new RateLimiter(60000, 30);     // 30 exports per minute

/**
 * Rate limit middleware for IPC handlers
 */
export function withRateLimit(
  limiter: RateLimiter,
  handler: string,
  fn: (...args: unknown[]) => Promise<unknown> | unknown
) {
  return async (...args: unknown[]) => {
    // Use handler name as identifier (in production, could use IP or user ID)
    const identifier = handler;

    if (!limiter.isAllowed(identifier)) {
      const remaining = limiter.getRemaining(identifier);
      throw new Error(`Rate limit exceeded. Please try again later. (${remaining} requests remaining)`);
    }

    return fn(...args);
  };
}

// Export RateLimiter type for use in other modules
export type { RateLimiter };


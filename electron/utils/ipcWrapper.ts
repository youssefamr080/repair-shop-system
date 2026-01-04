/**
 * IPC Handler Wrapper
 * 
 * Provides consistent error handling, rate limiting, validation, and logging for IPC handlers
 */

import { ipcMain } from 'electron';
import { ipcRateLimiter, syncRateLimiter, exportRateLimiter, RateLimiter } from './rateLimiter';
import { handleError, logError } from './errorHandler';
import { logger } from './logger';
import { z, ZodSchema, ZodError } from 'zod';

type IPCHandler = (...args: any[]) => Promise<any> | any;

interface IPCWrapperOptions {
  rateLimiter?: RateLimiter;
  logRequests?: boolean;
  logErrors?: boolean;
  /** Zod schema to validate the first argument (after event) */
  schema?: ZodSchema;
}

/**
 * Format Zod validation errors into user-friendly message
 */
function formatZodError(error: ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return `Validation error: ${issues.join(', ')}`;
}

/**
 * Wrap an IPC handler with error handling, rate limiting, validation, and logging
 */
function wrapIPCHandler(
  handler: IPCHandler,
  handlerName: string,
  options: IPCWrapperOptions = {}
): IPCHandler {
  const {
    rateLimiter,
    logRequests = false,
    logErrors = true,
    schema,
  } = options;

  return async (...args: any[]) => {
    const startTime = Date.now();

    // Apply rate limiting if provided
    if (rateLimiter) {
      const identifier = handlerName;
      if (!rateLimiter.isAllowed(identifier)) {
        const remaining = rateLimiter.getRemaining(identifier);
        throw new Error(`Rate limit exceeded. Please try again later. (${remaining} requests remaining)`);
      }
    }

    // Apply schema validation if provided
    // The first arg is typically the Electron event, second arg is the payload
    if (schema && args.length > 1) {
      try {
        const payload = args[1];
        const validated = schema.parse(payload);
        args[1] = validated; // Replace with validated/sanitized data
      } catch (error) {
        if (error instanceof ZodError) {
          const message = formatZodError(error);
          logger.warn(`IPC validation failed for ${handlerName}: ${message}`, 'IPC');
          throw new Error(message);
        }
        throw error;
      }
    }

    if (logRequests) {
      logger.debug(`IPC Handler called: ${handlerName}`, 'IPC', { args: args.length });
    }

    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;

      if (logRequests && duration > 1000) {
        logger.warn(`Slow IPC handler: ${handlerName} took ${duration}ms`, 'IPC');
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (logErrors) {
        logError(error, `IPC:${handlerName}`, {
          duration,
          argsCount: args.length,
        });
      }

      // Return user-friendly error message
      const handled = handleError(error);
      throw new Error(handled.message);
    }
  };
}

/**
 * Register an IPC handler with automatic error handling, rate limiting, and validation
 */
export function registerIPCHandler(
  channel: string,
  handler: IPCHandler,
  options: IPCWrapperOptions = {}
): void {
  const wrappedHandler = wrapIPCHandler(handler, channel, options);
  ipcMain.handle(channel, wrappedHandler);
}

/**
 * Register multiple IPC handlers at once
 */
export function registerIPCHandlers(
  handlers: Record<string, { handler: IPCHandler; options?: IPCWrapperOptions }>
): void {
  for (const [channel, { handler, options }] of Object.entries(handlers)) {
    registerIPCHandler(channel, handler, options);
  }
}

/**
 * Get appropriate rate limiter for a handler type
 */
export function getRateLimiterForHandler(handlerName: string): RateLimiter {
  if (handlerName.includes('sync') || handlerName.includes('Sync')) {
    return syncRateLimiter;
  }
  if (handlerName.includes('export') || handlerName.includes('Export')) {
    return exportRateLimiter;
  }
  return ipcRateLimiter;
}

// ========== COMMON VALIDATION SCHEMAS ==========
// Re-export zod for use in handlers
export { z };

/**
 * Common validation schemas for IPC handlers
 */
export const commonSchemas = {
  /** ID parameter (positive integer) */
  id: z.number().int().positive(),

  /** Date string in YYYY-MM-DD format */
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  /** Time string in HH:MM format */
  timeString: z.string().regex(/^\d{2}:\d{2}$/),

  /** Date range for reports */
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),

  /** Money amount in cents (positive integer) */
  moneyCents: z.number().int().min(0),

  /** Product/Item code (string format used in the system) */
  productCode: z.string().min(1).max(50),

  /** Pagination parameters */
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(1000).default(50),
  }),
};


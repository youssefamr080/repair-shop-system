/**
 * Centralized Error Handling Utility
 * 
 * Provides consistent error handling patterns across the application
 */

import { logger } from './logger';

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  DEVICE = 'DEVICE',
  NETWORK = 'NETWORK',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError extends Error {
  category: ErrorCategory;
  code?: string;
  userMessage?: string;
  details?: unknown;
}

/**
 * Create a standardized application error
 */
export function createAppError(
  message: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  code?: string,
  userMessage?: string,
  details?: unknown
): AppError {
  const error = new Error(message) as AppError;
  error.category = category;
  error.code = code;
  error.userMessage = userMessage || message;
  error.details = details;
  return error;
}

/**
 * Handle errors consistently and return user-friendly messages
 */
export function handleError(error: unknown): {
  success: false;
  message: string;
  code?: string;
  category?: ErrorCategory;
} {
  // If it's already an AppError, use it directly
  if (error && typeof error === 'object' && 'category' in error) {
    const appError = error as AppError;
    return {
      success: false,
      message: appError.userMessage || appError.message,
      code: appError.code,
      category: appError.category,
    };
  }

  // If it's a standard Error, extract message
  if (error instanceof Error) {
    // Check for validation errors (from Zod)
    if (error.message.includes('Validation Error') || error.message.includes('ZodError')) {
      return {
        success: false,
        message: error.message.replace(/\[Validation Error[^\]]*\]\s*/, ''),
        code: 'VALIDATION_ERROR',
        category: ErrorCategory.VALIDATION,
      };
    }

    // Check for duplicate errors
    if (error.message.includes('DUPLICATE')) {
      return {
        success: false,
        message: error.message.split(':')[1]?.trim() || error.message,
        code: error.message.split(':')[0],
        category: ErrorCategory.VALIDATION,
      };
    }

    // Database errors
    if (error.message.includes('SQLITE') || error.message.includes('database')) {
      return {
        success: false,
        message: 'حدث خطأ في قاعدة البيانات',
        code: 'DATABASE_ERROR',
        category: ErrorCategory.DATABASE,
      };
    }

    // Device/Hardware errors
    if (error.message.includes('device') || error.message.includes('hardware')) {
      return {
        success: false,
        message: error.message,
        code: 'DEVICE_ERROR',
        category: ErrorCategory.DEVICE,
      };
    }

    // Generic error
    return {
      success: false,
      message: error.message,
      category: ErrorCategory.UNKNOWN,
    };
  }

  // Unknown error type
  return {
    success: false,
    message: 'حدث خطأ غير متوقع',
    code: 'UNKNOWN_ERROR',
    category: ErrorCategory.UNKNOWN,
  };
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const handled = handleError(error);
      logger.error(handled.message, context || 'ErrorHandler', error);
      throw new Error(handled.message);
    }
  }) as T;
}

/**
 * Log error with context
 */
export function logError(error: unknown, context: string, additionalInfo?: Record<string, unknown>): void {
  const handled = handleError(error);
  logger.error(handled.message, context, error, {
    code: handled.code,
    category: handled.category,
    ...additionalInfo,
  });
}


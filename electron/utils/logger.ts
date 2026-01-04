/**
 * Centralized Logging Utility
 * 
 * Provides consistent logging with support for:
 * - Production/Development mode detection
 * - File logging
 * - Error tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const IS_DEV = process.env['VITE_DEV_SERVER_URL'] !== undefined || process.env.NODE_ENV === 'development';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  context?: string;
  message: string;
  data?: unknown;
}

class Logger {
  private logFile: string | null = null;
  private maxLogFileSize = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 5;

  constructor() {
    if (!IS_DEV) {
      // In production, set up file logging
      try {
        const userDataPath = app.getPath('userData');
        const logsDir = path.join(userDataPath, 'logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        this.logFile = path.join(logsDir, 'app.log');
        this.rotateLogsIfNeeded();
      } catch (error) {
        // If file logging fails, continue without it
        console.error('[Logger] Failed to initialize file logging:', error);
      }
    }
  }

  private rotateLogsIfNeeded(): void {
    if (!this.logFile || !fs.existsSync(this.logFile)) return;

    try {
      const stats = fs.statSync(this.logFile);
      if (stats.size > this.maxLogFileSize) {
        // Rotate logs
        const logDir = path.dirname(this.logFile);
        const logBase = path.basename(this.logFile, '.log');

        // Delete oldest log
        const oldestLog = path.join(logDir, `${logBase}.${this.maxLogFiles}.log`);
        if (fs.existsSync(oldestLog)) {
          fs.unlinkSync(oldestLog);
        }

        // Shift existing logs
        for (let i = this.maxLogFiles - 1; i >= 1; i--) {
          const oldLog = path.join(logDir, `${logBase}.${i}.log`);
          const newLog = path.join(logDir, `${logBase}.${i + 1}.log`);
          if (fs.existsSync(oldLog)) {
            fs.renameSync(oldLog, newLog);
          }
        }

        // Rename current log
        const firstRotated = path.join(logDir, `${logBase}.1.log`);
        fs.renameSync(this.logFile, firstRotated);
      }
    } catch (error) {
      // Ignore rotation errors
      console.error('[Logger] Log rotation failed:', error);
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.logFile) return;

    try {
      this.rotateLogsIfNeeded();
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, line, 'utf-8');
    } catch (error) {
      // Silently fail if file writing fails
      console.error('[Logger] Failed to write to log file:', error);
    }
  }

  private formatMessage(_level: string, context: string | undefined, message: string, data?: unknown): string {
    const contextStr = context ? `[${context}]` : '';
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `${contextStr} ${message}${dataStr}`;
  }

  /**
   * 🛡️ Sanitize sensitive data from logs
   * Recursively masks fields like 'password', 'token', etc.
   */
  private sanitize(data: unknown): unknown {
    if (!data) return data;

    if (typeof data === 'string') {
      // Basic JSON string detection
      if (data.startsWith('{') && data.includes('"password"')) {
        try {
          const parsed = JSON.parse(data);
          return JSON.stringify(this.sanitize(parsed));
        } catch {
          return data;
        }
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sensitiveKeys = [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'cookie',
        'access_token',
        'refresh_token'
      ];

      const sanitized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          sanitized[key] = '*** MASKED ***';
        } else {
          sanitized[key] = this.sanitize(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  info(message: string, context?: string, data?: unknown): void {
    const sanitizedData = this.sanitize(data);
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      context,
      message,
      data: sanitizedData,
    };

    if (IS_DEV) {
      console.log(this.formatMessage('INFO', context, message, sanitizedData));
    } else {
      this.writeToFile(entry);
    }
  }

  warn(message: string, context?: string, data?: unknown): void {
    const sanitizedData = this.sanitize(data);
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      context,
      message,
      data: sanitizedData,
    };

    console.warn(this.formatMessage('WARN', context, message, sanitizedData));
    if (!IS_DEV) {
      this.writeToFile(entry);
    }
  }

  error(message: string, context?: string, error?: unknown, data?: unknown): void {
    const sanitizedData = this.sanitize(data);
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      context,
      message,
      data: {
        ...(sanitizedData as Record<string, unknown>),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      },
    };

    console.error(this.formatMessage('ERROR', context, message, { error, ...(sanitizedData as Record<string, unknown>) }));
    if (!IS_DEV) {
      this.writeToFile(entry);
    }
  }

  debug(message: string, context?: string, data?: unknown): void {
    if (!IS_DEV) return; // Only log debug in development
    const sanitizedData = this.sanitize(data);
    console.log(this.formatMessage('DEBUG', context, message, sanitizedData));
  }
}

// Export singleton instance
export const logger = new Logger();


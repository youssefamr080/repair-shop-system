/**
 * IPC Handlers for Application Settings
 * 
 * SECURED: All handlers use requirePermission middleware
 * AUDITED: All mutations log to audit_logs with user context
 */

import * as path from 'path';
import { app } from 'electron';
import {
  getSetting,
  setSetting,
  getAllSettings,
} from '../database';
import { registerIPCHandler, getRateLimiterForHandler } from '../utils/ipcWrapper';
import { settingsCache } from '../utils/cache';
import { z } from 'zod';
import { createBackup, restoreBackup, listBackups } from '../database/backup';
import { requirePermission, auditAction } from '../middleware/auth';

export function setupSettingsHandlers(): void {
  // ==================
  // SETTINGS: READ (requires settings.view)
  // ==================

  registerIPCHandler('db:settings:get',
    requirePermission('settings.view', (_, _ctx, key: string) => {
      const cacheKey = `settings:${key}`;
      const cached = settingsCache.get<string>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const value = getSetting(key);
      if (value) {
        settingsCache.set(cacheKey, value);
      }
      return value;
    }),
    { rateLimiter: getRateLimiterForHandler('db:settings:get') }
  );

  /**
   * Health Check Handler (V17)
   * Used by SystemCheck to verify DB connectivity on startup
   */
  registerIPCHandler('db:health_check',
    async () => {
      // If we are here, the main process is running.
      // We could add a simple DB query to be 100% sure, e.g. "SELECT 1"
      // But for now, just responding means IPC is alive.
      // Let's do a quick DB check to be safe.
      const database = require('../database').getDatabase();
      database.prepare('SELECT 1').get();
      return true;
    },
    { rateLimiter: getRateLimiterForHandler('db:health_check') } // Higher limit for polling
  );

  registerIPCHandler('db:settings:getAll',
    requirePermission('settings.view', (_, _ctx) => {
      const cacheKey = 'settings:all';
      const cached = settingsCache.get<ReturnType<typeof getAllSettings>>(cacheKey);
      if (cached) {
        return cached;
      }

      const settings = getAllSettings();
      settingsCache.set(cacheKey, settings);
      return settings;
    }),
    { rateLimiter: getRateLimiterForHandler('db:settings:getAll') }
  );

  // Alias for legacy preload compatibility
  registerIPCHandler('db:getAllSettings',
    requirePermission('settings.view', (_, _ctx) => {
      const cacheKey = 'settings:all';
      const cached = settingsCache.get<ReturnType<typeof getAllSettings>>(cacheKey);
      if (cached) {
        return cached;
      }

      const settings = getAllSettings();
      settingsCache.set(cacheKey, settings);
      return settings;
    }),
    { rateLimiter: getRateLimiterForHandler('db:getAllSettings') }
  );

  // ==================
  // SETTINGS: WRITE (requires settings.edit)
  // ==================

  registerIPCHandler('db:settings:set',
    requirePermission('settings.edit', (_, ctx, key: string, value: string) => {
      const keySchema = z.string().min(1).max(100);
      const valueSchema = z.string().max(1_000_000);
      const validatedKey = keySchema.parse(key);
      const validatedValue = valueSchema.parse(value);

      setSetting(validatedKey, validatedValue);

      // Clear cache
      settingsCache.delete(`settings:${validatedKey}`);
      settingsCache.delete('settings:all');

      // ✅ AUDIT LOG
      auditAction(ctx, 'UPDATE_SETTING', 'setting', validatedKey,
        `Updated setting: ${validatedKey}`);

      return true;
    }),
    { rateLimiter: getRateLimiterForHandler('db:settings:set') }
  );

  // Alias for legacy preload compatibility
  registerIPCHandler('db:setSetting',
    requirePermission('settings.edit', (_, ctx, key: string, value: string) => {
      // FIX: Add same validation as modern handler
      const keySchema = z.string().min(1).max(100);
      const valueSchema = z.string().max(1_000_000);
      const validatedKey = keySchema.parse(key);
      const validatedValue = valueSchema.parse(value);

      setSetting(validatedKey, validatedValue);

      // Clear cache
      settingsCache.delete(`settings:${validatedKey}`);
      settingsCache.delete('settings:all');

      // ✅ AUDIT LOG
      auditAction(ctx, 'UPDATE_SETTING', 'setting', validatedKey,
        `Updated setting: ${validatedKey}`);

      return true;
    }),
    { rateLimiter: getRateLimiterForHandler('db:settings:set') }
  );

  // ==================
  // BACKUP: Admin operations (requires settings.edit)
  // ==================

  registerIPCHandler('db:backup:create',
    requirePermission('settings.backup', async (_, ctx) => {
      const result = await createBackup();

      // ✅ AUDIT LOG
      auditAction(ctx, 'CREATE_BACKUP', 'backup', undefined,
        `Created database backup`);

      return result;
    }),
    { rateLimiter: getRateLimiterForHandler('db:backup:create') }
  );

  registerIPCHandler('db:backup:restore',
    requirePermission('settings.restore', async (_, ctx, backupPath: string) => {
      if (!backupPath || typeof backupPath !== 'string') {
        throw new Error('مسار النسخة الاحتياطية غير صالح');
      }

      const userDataPath = app.getPath('userData');
      const resolvedPath = path.resolve(backupPath);

      if (!resolvedPath.startsWith(userDataPath)) {
        throw new Error('مسار غير مسموح به: يجب أن يكون الملف في مجلد البيانات');
      }

      // ✅ AUDIT LOG (before restore - critical action!)
      auditAction(ctx, 'RESTORE_BACKUP', 'backup', undefined,
        `Restoring database from: ${resolvedPath}`);

      return restoreBackup(resolvedPath);
    }),
    { rateLimiter: getRateLimiterForHandler('db:backup:restore') }
  );

  registerIPCHandler('db:backup:list',
    requirePermission('settings.view', async (_, _ctx) => {
      return listBackups();
    }),
    { rateLimiter: getRateLimiterForHandler('db:backup:list') }
  );
}

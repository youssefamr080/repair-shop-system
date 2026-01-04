/**
 * Settings Database Module
 * 
 * Handles all database operations related to app settings
 */

import { getDatabase } from './core';

export function getSetting(key: string): string | null {
  const database = getDatabase();
  const result = database.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return result?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const database = getDatabase();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
  `);

  stmt.run(key, value, now, value, now);
}

export function getAllSettings(): Record<string, string> {
  const database = getDatabase();
  const rows = database.prepare('SELECT key, value FROM app_settings').all() as Array<{ key: string; value: string }>;

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}


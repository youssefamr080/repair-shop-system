/**
 * Database Backup Utility - Mayo Fix
 * 
 * Provides automated and manual database backup functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import Database from 'better-sqlite3-multiple-ciphers';
import { getDatabase } from './core';
import { logger } from '../utils/logger';
import { SecretGuard } from '../utils/secret-guard';

const BACKUP_DIR = 'backups';
const MAX_BACKUPS = 10; // Keep last 10 backups
const BACKUP_PREFIX = 'mayofix_backup_';

/**
 * Get backup directory path
 */
function getBackupDirectory(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, BACKUP_DIR);
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDirectory(): void {
  const backupDir = getBackupDirectory();
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${BACKUP_PREFIX}${timestamp}.db`;
}

/**
 * Check if a file is a backup file
 */
function isBackupFile(filename: string): boolean {
  return filename.startsWith(BACKUP_PREFIX) && filename.endsWith('.db');
}

/**
 * Clean old backups, keeping only the most recent MAX_BACKUPS
 */
function cleanOldBackups(): void {
  try {
    const backupDir = getBackupDirectory();
    if (!fs.existsSync(backupDir)) return;

    const files = fs.readdirSync(backupDir)
      .filter(file => isBackupFile(file))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

    // Delete old backups
    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        logger.info(`Deleted old backup: ${file.name}`, 'Backup');
      }
    }
  } catch (error) {
    logger.error('Failed to clean old backups', 'Backup', error);
  }
}

/**
 * Create a backup of the database
 * @returns Path to the backup file, or null if backup failed
 */
export async function createBackup(): Promise<string | null> {
  try {
    ensureBackupDirectory();
    const db = getDatabase();
    const backupDir = getBackupDirectory();
    const backupFilename = generateBackupFilename();
    const backupPath = path.join(backupDir, backupFilename);

    // 🔒 SECURITY: Use SQLite's backup API with encryption key
    // The backup file will be encrypted with the same key as the source
    const dbKey = SecretGuard.retrieve('DB_KEY');
    await db.backup(backupPath);
    
    // Apply encryption to the backup file
    const backupDb = new Database(backupPath);
    backupDb.pragma(`key='${dbKey}'`);
    backupDb.pragma(`rekey='${dbKey}'`); // Ensure backup is encrypted
    backupDb.close();
    
    logger.info(`Database backup created (encrypted): ${backupFilename}`, 'Backup');
    cleanOldBackups();

    return backupPath;
  } catch (error) {
    logger.error('Failed to create database backup', 'Backup', error);
    return null;
  }
}

/**
 * Restore database from a backup file
 * @param backupPath - Path to the backup file
 */
export function restoreBackup(backupPath: string): void {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error('ملف النسخة الاحتياطية غير موجود. يرجى التحقق من المسار.');
    }

    // CRITICAL: Check file size to prevent empty/corrupt file restore
    const stats = fs.statSync(backupPath);
    if (stats.size < 4096) { // SQLite files are at least 4KB
      throw new Error('ملف النسخة الاحتياطية فارغ أو تالف. يرجى اختيار ملف آخر.');
    }

    // CRITICAL: Verify SQLite integrity before restore
    let testDb: Database.Database | null = null;
    try {
      testDb = new Database(backupPath, { readonly: true });

      // 🛡️ SECURITY: Apply encryption key to read the backup
      const dbKey = SecretGuard.retrieve('DB_KEY');
      if (dbKey) {
        testDb.pragma(`key='${dbKey}'`);
      }

      const integrityCheck = testDb.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
      if (integrityCheck.integrity_check !== 'ok') {
        throw new Error('ملف النسخة الاحتياطية تالف. فشل فحص سلامة قاعدة البيانات.');
      }

      // Verify it has expected inventory tables
      const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      const tableNames = tables.map(t => t.name);

      // Check for required inventory tables
      const hasInventoryTables = ['users', 'products', 'stock_levels'].every(t => tableNames.includes(t));

      if (!hasInventoryTables) {
        throw new Error('ملف النسخة الاحتياطية غير صالح. الجداول المطلوبة مفقودة.');
      }
    } finally {
      if (testDb) testDb.close();
    }

    const db = getDatabase();
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'mayofix.db');

    // Create a temporary backup of current database before restore
    const tempBackupPath = `${dbPath}.pre_restore`;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, tempBackupPath);
    }

    // Close current database connection
    db.close();

    // Copy backup file to current database location
    fs.copyFileSync(backupPath, dbPath);

    logger.info(`Database restored from backup: ${path.basename(backupPath)}`, 'Backup');
  } catch (error) {
    logger.error('Failed to restore database backup', 'Backup', error);
    throw error;
  }
}

/**
 * Get list of available backups (both legacy and new)
 */
export function listBackups(): Array<{ filename: string; path: string; size: number; created: Date }> {
  try {
    const backupDir = getBackupDirectory();
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    return fs.readdirSync(backupDir)
      .filter(file => isBackupFile(file))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  } catch (error) {
    logger.error('Failed to list backups', 'Backup', error);
    return [];
  }
}

/**
 * Schedule automatic backups (daily)
 */
export function scheduleAutoBackup(): void {
  // Create backup at midnight every day
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    createBackup();
    // Schedule next backup (24 hours)
    setInterval(() => {
      createBackup();
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  logger.info('Automatic backup scheduled', 'Backup');
}

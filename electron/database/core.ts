/**
 * Database Core Module
 * 
 * Handles database initialization, connection management, and migrations
 */

import Database from 'better-sqlite3-multiple-ciphers';
import { app } from 'electron';
import * as path from 'path';
import schema from './schema.sql?raw';
import { applyMigrations } from './migrations';
import { migrations } from './migrations/migrations';
import { logger } from '../utils/logger';

import { SecretGuard } from '../utils/secret-guard';

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  if (db) return db;

  // Get the user data path for storing the database
  const userDataPath = app.getPath('userData');

  // Database path (Mayo Fix uses mayofix.db)
  const dbPath = path.join(userDataPath, 'mayofix.db');

  // Create database connection
  db = new Database(dbPath, { verbose: (msg) => logger.debug(String(msg), "DB") });

  // 🛡️ SECURITY: Activate Encryption
  try {
    const dbKey = SecretGuard.retrieve('DB_KEY');

    // SECURITY FIX: Only check for SQL injection risk (single quotes)
    // The key can be any format (hex, base64, etc.) as long as it doesn't contain quotes
    if (!dbKey || typeof dbKey !== 'string' || dbKey.length < 16) {
      throw new Error('Invalid DB key: must be at least 16 characters');
    }
    // Prevent SQL injection - reject if key contains single quotes
    if (dbKey.includes("'")) {
      throw new Error('Invalid DB key format: contains invalid characters');
    }

    db.pragma(`key='${dbKey}'`);
    logger.info('🔒 [Security] Database encryption enabled', 'Database');
  } catch (error) {
    logger.error('❌ [Security] Failed to set database key', 'Database', error as any);
    throw error;
  }

  // Enable WAL mode for better concurrency and prevent SQLITE_BUSY errors
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Execute schema (split by semicolons and execute each statement)
  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        db.exec(statement);
      } catch (err) {
        logger.error('Schema execution error', 'Database', err);
      }
    }
  }

  // Apply migrations using the new migration system
  applyMigrations(db, migrations);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}



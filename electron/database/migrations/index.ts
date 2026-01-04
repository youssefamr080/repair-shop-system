/**
 * Database Migration System
 * 
 * Manages database schema migrations in a structured way
 * Mayo Fix: Inventory Management System
 */

import Database from 'better-sqlite3';
import { logger } from '../../utils/logger';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  down?: (db: Database.Database) => void;
}

const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Initialize migrations table
 */
function initMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Get applied migrations
 */
function getAppliedMigrations(db: Database.Database): number[] {
  try {
    const rows = db.prepare(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`).all() as Array<{ version: number }>;
    return rows.map(row => row.version);
  } catch {
    return [];
  }
}

/**
 * Mark migration as applied
 */
function markMigrationApplied(db: Database.Database, migration: Migration): void {
  db.prepare(`
    INSERT INTO ${MIGRATIONS_TABLE} (version, name) 
    VALUES (?, ?)
  `).run(migration.version, migration.name);
}

/**
 * Apply all pending migrations
 */
export function applyMigrations(db: Database.Database, migrations: Migration[]): void {
  initMigrationsTable(db);
  const applied = getAppliedMigrations(db);

  // Sort migrations by version
  const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);

  for (const migration of sortedMigrations) {
    if (applied.includes(migration.version)) {
      logger.debug(`Migration ${migration.version} (${migration.name}) already applied`, 'Migrations');
      continue;
    }

    try {
      logger.info(`Applying migration ${migration.version}: ${migration.name}`, 'Migrations');
      migration.up(db);
      markMigrationApplied(db, migration);
      logger.info(`Migration ${migration.version} applied successfully`, 'Migrations');
    } catch (error) {
      logger.error(`Failed to apply migration ${migration.version}: ${migration.name}`, 'Migrations', error);
      throw error;
    }
  }
}


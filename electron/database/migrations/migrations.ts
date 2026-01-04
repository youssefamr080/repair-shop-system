/**
 * Database Migrations for Mayo Fix
 * 
 * CLEAN VERSION - Inventory Management Only
 * All legacy HR/Attendance migrations removed
 */

import type { Migration } from './index';

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'Initial Mayo Fix Setup - RBAC + Audit',
    up: (db) => {
      // Check if app_settings table exists
      const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='app_settings'"
      ).get();

      if (!tableExists) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          );
        `);
      }

      // Add default settings
      db.exec("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('company_logo', '');");
      db.exec("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('company_name', 'شركتي');");
      db.exec("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('app_initialized', '1');");
    },
  },
  {
    version: 2,
    name: 'Add user_name column to audit_logs',
    up: (db) => {
      // Check if audit_logs table exists
      const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'"
      ).get();

      if (tableExists) {
        const columns = db.prepare('PRAGMA table_info(audit_logs)').all() as Array<{ name: string }>;
        const hasUserName = columns.some(c => c.name === 'user_name');
        if (!hasUserName) {
          db.exec('ALTER TABLE audit_logs ADD COLUMN user_name TEXT DEFAULT NULL;');
        }
      }
    },
  },
  {
    version: 3,
    name: 'Financial Split (Labor, Parts, Tax)',
    up: (db) => {
      // Add columns to repairs table
      const columns = db.prepare('PRAGMA table_info(repairs)').all() as Array<{ name: string }>;
      const existing = new Set(columns.map(c => c.name));

      if (!existing.has('labor_cost')) db.exec('ALTER TABLE repairs ADD COLUMN labor_cost REAL DEFAULT 0;');
      if (!existing.has('parts_total')) db.exec('ALTER TABLE repairs ADD COLUMN parts_total REAL DEFAULT 0;');
      if (!existing.has('discount')) db.exec('ALTER TABLE repairs ADD COLUMN discount REAL DEFAULT 0;');
      if (!existing.has('tax_rate')) db.exec('ALTER TABLE repairs ADD COLUMN tax_rate REAL DEFAULT 0;');
      if (!existing.has('tax_amount')) db.exec('ALTER TABLE repairs ADD COLUMN tax_amount REAL DEFAULT 0;');
      if (!existing.has('total_price')) db.exec('ALTER TABLE repairs ADD COLUMN total_price REAL DEFAULT 0;');
    }
  },
  {
    version: 4,
    name: 'Customer Finance & Constraints (V10)',
    up: (db) => {
      // 1. Add Filter/Stats Columns to Customers
      const columns = db.prepare('PRAGMA table_info(customers)').all() as Array<{ name: string }>;
      const existing = new Set(columns.map(c => c.name));

      if (!existing.has('balance')) db.exec('ALTER TABLE customers ADD COLUMN balance REAL DEFAULT 0;');
      if (!existing.has('total_repairs')) db.exec('ALTER TABLE customers ADD COLUMN total_repairs INTEGER DEFAULT 0;');
      if (!existing.has('last_repair_date')) db.exec('ALTER TABLE customers ADD COLUMN last_repair_date TEXT;');

      // 2. Enforce Unique Phone (Softly)
      // We can't easily add UNIQUE constraint to existing table without recreation in SQLite efficiently if there are dupes.
      // For now, we'll create a UNIQUE INDEX which will fail if dupes exist.
      // If dupes exist, we skip validation enforcement to avoid migration crash, but logging it.
      try {
        db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique ON customers(phone) WHERE phone IS NOT NULL AND phone != "";');
      } catch (e) {
        console.warn("Could not enforce unique phone due to existing duplicates. Manual cleanup required.");
      }

      // 3. Create Customer Transactions Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS customer_transactions (
          id TEXT PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES customers(id),
          type TEXT NOT NULL, -- DEBIT (Owe us), CREDIT (Paid us)
          amount REAL NOT NULL,
          reference_type TEXT, -- REPAIR, PAYMENT, MANUAL_ADJUSTMENT
          reference_id TEXT,
          notes TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      db.exec('CREATE INDEX IF NOT EXISTS idx_cust_trans_customer ON customer_transactions(customer_id);');
    }
  }
];

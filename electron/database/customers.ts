/**
 * Customers Database Module - Mayo Fix Enterprise
 * 
 * Handles all database operations for customers (phone repair clients).
 */

import { getDatabase } from './core';

export interface DBCustomer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  // Virtual fields from joins
  total_repairs?: number;
  last_repair_date?: string;
  // V10 Finance
  balance?: number;
}

export interface ListCustomersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export interface ListCustomersResult {
  data: DBCustomer[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get all customers
 */
export function getAllCustomers(): DBCustomer[] {
  const database = getDatabase();
  return database.prepare(`
    SELECT 
      c.*,
      COUNT(r.id) as total_repairs,
      MAX(r.created_at) as last_repair_date
    FROM customers c
    LEFT JOIN repairs r ON c.id = r.customer_id
    WHERE c.is_active = 1
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all() as DBCustomer[];
}

/**
 * List customers with pagination and search
 */
export function listCustomers(params: ListCustomersParams): ListCustomersResult {
  const database = getDatabase();
  const { page = 1, pageSize = 20, search, isActive = true } = params;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const queryParams: (string | number)[] = [];

  if (isActive !== undefined) {
    conditions.push('c.is_active = ?');
    queryParams.push(isActive ? 1 : 0);
  }

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    conditions.push('(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)');
    queryParams.push(searchPattern, searchPattern, searchPattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count
  const countResult = database.prepare(`
    SELECT COUNT(*) as count FROM customers c ${whereClause}
  `).get(...queryParams) as { count: number };
  const totalCount = countResult.count;

  // Data with repair stats
  const data = database.prepare(`
    SELECT 
      c.*,
      COUNT(r.id) as total_repairs,
      MAX(r.created_at) as last_repair_date
    FROM customers c
    LEFT JOIN repairs r ON c.id = r.customer_id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...queryParams, pageSize, offset) as DBCustomer[];

  return {
    data,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Get customer by ID
 */
export function getCustomerById(id: number): DBCustomer | undefined {
  const database = getDatabase();
  return database.prepare(`
    SELECT 
      c.*,
      COUNT(r.id) as total_repairs,
      MAX(r.created_at) as last_repair_date
    FROM customers c
    LEFT JOIN repairs r ON c.id = r.customer_id
    WHERE c.id = ?
    GROUP BY c.id
  `).get(id) as DBCustomer | undefined;
}

/**
 * Get customer by phone
 */
export function getCustomerByPhone(phone: string): DBCustomer | undefined {
  const database = getDatabase();
  return database.prepare(`
    SELECT * FROM customers WHERE phone = ? AND is_active = 1
  `).get(phone) as DBCustomer | undefined;
}

/**
 * Create a new customer
 */
export function createCustomer(customer: Partial<DBCustomer>): DBCustomer {
  const database = getDatabase();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO customers (name, phone, email, address, notes, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const result = stmt.run(
    customer.name,
    customer.phone || null,
    customer.email || null,
    customer.address || null,
    customer.notes || null,
    now,
    now
  );

  return getCustomerById(result.lastInsertRowid as number)!;
}

/**
 * Update a customer
 */
export function updateCustomer(id: number, updates: Partial<DBCustomer>): DBCustomer | undefined {
  const database = getDatabase();
  const now = new Date().toISOString();

  const ALLOWED_FIELDS = new Set(['name', 'phone', 'email', 'address', 'notes', 'is_active']);

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_FIELDS.has(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return getCustomerById(id);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  database.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return getCustomerById(id);
}

/**
 * Delete a customer (soft delete)
 */
export function deleteCustomer(id: number): boolean {
  const database = getDatabase();

  // Check if customer has repairs
  const hasRepairs = database.prepare(
    'SELECT 1 FROM repairs WHERE customer_id = ? LIMIT 1'
  ).get(id);

  if (hasRepairs) {
    // Soft delete
    const now = new Date().toISOString();
    const result = database.prepare(
      'UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?'
    ).run(now, id);
    return result.changes > 0;
  }

  // Hard delete if no repairs
  const result = database.prepare('DELETE FROM customers WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Search customers by name or phone (autocomplete)
 */
export function searchCustomers(query: string, limit: number = 10): DBCustomer[] {
  const database = getDatabase();
  const searchPattern = `%${query}%`;

  return database.prepare(`
    SELECT * FROM customers 
    WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ?)
    ORDER BY name ASC
    LIMIT ?
  `).all(searchPattern, searchPattern, limit) as DBCustomer[];
}

/**
 * Run a transaction
 */
export function runTransaction<T>(callback: (db: any) => T): T {
  const database = getDatabase();
  return database.transaction(callback)(database);
}

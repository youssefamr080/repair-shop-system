/**
 * Database Module - Unified Exports
 * 
 * Mayo Fix - Inventory Management System
 */

// Core database functions
export { initDatabase, getDatabase, closeDatabase } from './core';

// ============================================================
// INVENTORY MODULES
// ============================================================

// Products
// Products (Legacy - Removed)
// export * from './products';

// Categories
export * from './categories';

// Units
export * from './units';

// Suppliers
export * from './suppliers';

// Warehouses
export * from './warehouses';

// Inventory (Stock Levels & Transactions)
export * from './inventory';

// Parts
export * from './parts';

// ============================================================
// CORE MODULES
// ============================================================

// Settings
export * from './settings';

// Audit Logs
export * from './audit';

// RBAC
export * from './roles';
export * from './users';
export * from './sessions';

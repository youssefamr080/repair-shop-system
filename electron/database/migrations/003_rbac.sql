-- ============================================
-- RBAC Migration: Role-Based Access Control
-- Version: 003
-- ============================================

-- ============================================
-- 1. ROLES TABLE (Dynamic - Admin Creates)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name_ar TEXT NOT NULL,
    description TEXT,
    is_system INTEGER DEFAULT 0,  -- Admin role: 1 (cannot delete/modify)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. PERMISSIONS TABLE (System-Defined)
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    display_name_ar TEXT NOT NULL,
    module TEXT NOT NULL,
    description TEXT
);

-- ============================================
-- 3. ROLE ↔ PERMISSION (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ============================================
-- 4. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,          -- Soft delete (0 = inactive)
    last_login TEXT,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TEXT,                     -- Account lockout
    created_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- 5. USER SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,                   -- UUID token
    user_id INTEGER NOT NULL,
    remember_me INTEGER DEFAULT 0,         -- 0 = 12h, 1 = 7 days
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- ============================================
-- SEED DATA: Default Admin Role (PROTECTED)
-- ============================================
INSERT OR IGNORE INTO roles (name, display_name_ar, description, is_system) 
VALUES ('admin', 'مدير النظام', 'صلاحيات كاملة - لا يمكن تعديله', 1);

-- ============================================
-- SEED DATA: All Available Permissions
-- INV-PRO: Inventory Management System Permissions
-- ============================================

-- Products Module
INSERT OR IGNORE INTO permissions (code, display_name_ar, module) VALUES
('products.view', 'عرض المنتجات', 'products'),
('products.create', 'إضافة منتج', 'products'),
('products.edit', 'تعديل منتج', 'products'),
('products.delete', 'حذف منتج', 'products');

-- Categories Module
INSERT OR IGNORE INTO permissions (code, display_name_ar, module) VALUES
('categories.view', 'عرض التصنيفات', 'categories'),
('categories.create', 'إضافة تصنيف', 'categories'),
('categories.edit', 'تعديل تصنيف', 'categories'),
('categories.delete', 'حذف تصنيف', 'categories');

-- Warehouses Module
INSERT OR IGNORE INTO permissions (code, display_name_ar, module) VALUES
('warehouses.view', 'عرض المستودعات', 'warehouses'),
('warehouses.create', 'إضافة مستودع', 'warehouses'),
('warehouses.edit', 'تعديل مستودع', 'warehouses'),
('warehouses.delete', 'حذف مستودع', 'warehouses');

-- Suppliers Module
INSERT OR IGNORE INTO permissions (code, display_name_ar, module) VALUES
('suppliers.view', 'عرض الموردين', 'suppliers'),
('suppliers.create', 'إضافة مورد', 'suppliers'),
('suppliers.edit', 'تعديل مورد', 'suppliers'),
('suppliers.delete', 'حذف مورد', 'suppliers');

-- Inventory Operations Module
INSERT OR IGNORE INTO permissions (code, display_name_ar, module) VALUES
('inventory.view', 'عرض حركات المخزون', 'inventory'),
('inventory.stock_in', 'إدخال مخزون', 'inventory'),
('inventory.stock_out', 'إخراج مخزون', 'inventory'),
('inventory.adjust', 'تعديل رصيد', 'inventory'),
('inventory.transfer', 'تحويل مخزون', 'inventory');

-- Reports Module
INSERT OR IGNORE INTO permissions (code, display_name_ar, module) VALUES
('reports.view', 'عرض التقارير', 'reports'),
('reports.export', 'تصدير التقارير (PDF/Excel)', 'reports');

-- Settings Module
INSERT OR IGNORE INTO permissions (code, display_name_ar, module) VALUES
('settings.view', 'عرض الإعدادات', 'settings'),
('settings.edit', 'تعديل الإعدادات', 'settings'),
('settings.backup', 'إنشاء نسخة احتياطية', 'settings'),
('settings.restore', 'استعادة نسخة احتياطية', 'settings');

-- Users & Roles Module (Admin Only)
INSERT OR IGNORE INTO permissions (code, display_name_ar, module) VALUES
('users.view', 'عرض المستخدمين', 'users'),
('users.manage', 'إدارة المستخدمين', 'users'),
('roles.view', 'عرض الأدوار', 'roles'),
('roles.manage', 'إدارة الأدوار والصلاحيات', 'roles');

-- Audit Module (High Security)
INSERT OR IGNORE INTO permissions (code, display_name_ar, module) VALUES
('audit.view', 'عرض سجل التدقيق', 'audit'),
('audit.export', 'تصدير سجل التدقيق', 'audit'),
('audit.clear', 'مسح سجل التدقيق (خطير)', 'audit');

-- System Module (Super Admin Only)
INSERT OR IGNORE INTO permissions (code, display_name_ar, module) VALUES
('system.dangerous', 'العمليات الخطرة (إعادة ضبط)', 'system'),
('system.view_logs', 'عرض سجلات النظام', 'system'),
('system.clear_logs', 'مسح سجلات النظام', 'system');

-- ============================================
-- GIVE ADMIN ALL PERMISSIONS (Auto-Link)
-- ============================================
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'admin'),
    id
FROM permissions;

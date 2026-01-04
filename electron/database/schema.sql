-- ============================================================
-- MAYO FIX ENTERPRISE - REPAIR & MAINTENANCE SYSTEM
-- DATABASE SCHEMA v1.0.0
-- 
-- Complete repair shop management schema including:
-- - Repairs, Customers, Parts, Suppliers
-- - Stock Levels and Inventory Transactions
-- - RBAC, Audit Logs, and Settings infrastructure
-- ============================================================

-- ============================================================
-- 1. CATEGORIES TABLE (replaces job_roles)
-- Product categories for organization
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- ============================================================
-- 2. UNITS OF MEASURE
-- Standard measurement units for products
-- ============================================================
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,           -- e.g., "قطعة", "كيلو", "متر"
    abbreviation TEXT NOT NULL,          -- e.g., "pcs", "kg", "m"
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. SUPPLIERS TABLE
-- Vendor/Supplier information
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

-- ============================================================
-- 4. WAREHOUSES TABLE (replaces device_settings)
-- Storage locations
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    location TEXT,
    description TEXT,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);

-- ============================================================
-- 5. PRODUCTS TABLE (replaces employees)
-- Core product information
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,              -- Stock Keeping Unit (product code)
    barcode TEXT UNIQUE,                   -- Optional barcode
    name TEXT NOT NULL,
    name_en TEXT,                          -- English name (optional)
    description TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    
    -- Pricing
    cost_price REAL DEFAULT 0,             -- Purchase price per unit
    selling_price REAL DEFAULT 0,          -- Selling price per unit
    
    -- Stock Management
    min_stock_level INTEGER DEFAULT 0,     -- Reorder point
    max_stock_level INTEGER DEFAULT 0,     -- Maximum stock level
    
    -- Status
    is_active INTEGER DEFAULT 1,
    deleted_at TEXT DEFAULT NULL,          -- Soft delete support
    
    -- Metadata
    image_url TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at);

-- ============================================================
-- 6. STOCK LEVELS
-- Current stock quantity per product per warehouse
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity REAL DEFAULT 0,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON stock_levels(warehouse_id);

-- ============================================================
-- 7. INVENTORY TRANSACTIONS
-- All stock movements (in/out/transfer/adjustment)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN (
        'stock_in',       -- Purchase/receiving
        'stock_out',      -- Sales/consumption
        'adjustment',     -- Manual adjustment
        'transfer_in',    -- Transfer from another warehouse
        'transfer_out',   -- Transfer to another warehouse
        'return_in',      -- Customer return
        'return_out'      -- Return to supplier
    )),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity REAL NOT NULL,                -- Positive for in, negative for out
    unit_cost REAL,                        -- Cost at time of transaction
    reference_number TEXT,                 -- Invoice/PO number
    reference_type TEXT,                   -- 'purchase', 'sale', 'adjustment', etc.
    notes TEXT,
    
    -- For transfers
    related_transaction_id INTEGER REFERENCES inventory_transactions(id),
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trans_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_trans_warehouse ON inventory_transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_trans_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_trans_date ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_trans_reference ON inventory_transactions(reference_number);

-- ============================================================
-- 8. STOCK ADJUSTMENTS (Detailed)
-- For batch adjustments with reason tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_number TEXT UNIQUE NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    adjustment_type TEXT CHECK(adjustment_type IN ('increase', 'decrease', 'count')),
    reason TEXT,
    notes TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'approved', 'cancelled')),
    approved_by INTEGER REFERENCES users(id),
    approved_at TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_id INTEGER NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    expected_quantity REAL,                -- System quantity before adjustment
    actual_quantity REAL NOT NULL,         -- Counted quantity
    difference REAL,                       -- actual - expected
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_adj_items_adjustment ON stock_adjustment_items(adjustment_id);
CREATE INDEX IF NOT EXISTS idx_adj_items_product ON stock_adjustment_items(product_id);

-- ============================================================
-- CORE TABLES (Preserved from FP-PRO)
-- ============================================================

-- 9. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    user_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- RBAC TABLES (Role-Based Access Control)
-- ============================================================

-- 11. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name_ar TEXT NOT NULL,
    description TEXT,
    is_system INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 12. PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    display_name_ar TEXT NOT NULL,
    module TEXT NOT NULL,
    description TEXT
);

-- 13. ROLE PERMISSIONS (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 14. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE RESTRICT,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- 15. USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remember_me INTEGER DEFAULT 0,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_id ON user_sessions(id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

-- ============================================================
-- 15.1. CUSTOMERS TABLE (Added for Repair Module)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    
    -- V10 Finance & Stats
    balance REAL DEFAULT 0,
    total_repairs INTEGER DEFAULT 0,
    last_repair_date TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique ON customers(phone) WHERE phone IS NOT NULL AND phone != "";
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE TABLE IF NOT EXISTS customer_transactions (
    id TEXT PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    type TEXT NOT NULL, -- DEBIT, CREDIT
    amount REAL NOT NULL,
    reference_type TEXT, -- REPAIR, PAYMENT
    reference_id TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 16. REPAIRS TABLE (Ticket System)
-- Core entity for Mayo Fix Enterprise
-- ============================================================
CREATE TABLE IF NOT EXISTS repairs (
    id TEXT PRIMARY KEY,                   -- UUID for compatibility
    ticket_number TEXT UNIQUE NOT NULL,    -- e.g., REP-1001
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- Device Info
    device_type TEXT NOT NULL,             -- e.g., "Smartphone", "Laptop"
    device_brand TEXT NOT NULL,            -- e.g., "Apple", "Samsung"
    device_model TEXT NOT NULL,            -- e.g., "iPhone 13 Pro"
    serial_number TEXT,
    imei TEXT,
    passcode TEXT,                         -- Device lock code/pattern
    color TEXT,
    condition TEXT,                        -- Physical condition notes

    -- Diagnostics
    problem_description TEXT NOT NULL,
    diagnosis TEXT,
    technician_notes TEXT,

    -- Status & Workflow
    status TEXT DEFAULT 'RECEIVED',        -- RECEIVED, DIAGNOSED, WAITING_PARTS, IN_PROGRESS, COMPLETED, DELIVERED, CANCELLED
    priority TEXT DEFAULT 'NORMAL',        -- LOW, NORMAL, HIGH, URGENT
    technician_id INTEGER REFERENCES users(id),
    
    -- Financials (Granular - V08)
    labor_cost REAL DEFAULT 0,             -- Manual service charge
    parts_total REAL DEFAULT 0,            -- Read-only sum of parts
    discount REAL DEFAULT 0,               -- Manual discount
    tax_rate REAL DEFAULT 0,               -- Tax rate (0.0 - 1.0)
    tax_amount REAL DEFAULT 0,             -- Calculated tax
    total_price REAL DEFAULT 0,            -- Final Amount (Parts + Labor - Discount + Tax)

    -- Legacy/Deprecated
    estimated_cost REAL DEFAULT 0,
    final_cost REAL DEFAULT 0,             -- DEPRECATED: Use total_price

    deposit_amount REAL DEFAULT 0,
    is_paid INTEGER DEFAULT 0,

    -- Timestamps
    promised_at TEXT,
    completed_at TEXT,
    delivered_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repairs_ticket ON repairs(ticket_number);
CREATE INDEX IF NOT EXISTS idx_repairs_customer ON repairs(customer_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
CREATE INDEX IF NOT EXISTS idx_repairs_technician ON repairs(technician_id);

-- ============================================================
-- 17. REPAIR PARTS (Spare Parts Used)
-- Link between Repair Ticket and Inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS repair_parts (
    id TEXT PRIMARY KEY,
    repair_id TEXT NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    quantity REAL DEFAULT 1,
    unit_price REAL NOT NULL,              -- Price at moment of repair (snapshot)
    total_price REAL NOT NULL,             -- quantity * unit_price
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repair_parts_repair ON repair_parts(repair_id);

-- ============================================================
-- 18. REPAIR STATUS HISTORY
-- Audit trail for ticket status changes
-- ============================================================
CREATE TABLE IF NOT EXISTS repair_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_id TEXT NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    notes TEXT,
    changed_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repair_history_repair ON repair_status_history(repair_id);

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Default Admin Role
INSERT OR IGNORE INTO roles (name, display_name_ar, description, is_system) 
VALUES ('admin', 'مدير النظام', 'صلاحيات كاملة على النظام', 1);

-- Default Warehouse
INSERT OR IGNORE INTO warehouses (name, location, is_default, is_active)
VALUES ('المستودع الرئيسي', 'الموقع الرئيسي', 1, 1);

-- Default Units
INSERT OR IGNORE INTO units (name, abbreviation) VALUES 
    ('قطعة', 'pcs'),
    ('كيلوجرام', 'kg'),
    ('متر', 'm'),
    ('لتر', 'L'),
    ('علبة', 'box'),
    ('كرتونة', 'carton'),
    ('طن', 't');

-- ============================================================
-- DEFAULT PERMISSIONS (Inventory-Specific)
-- ============================================================
INSERT OR IGNORE INTO permissions (code, display_name_ar, module, description) VALUES 
    -- Products
    ('products.view', 'عرض المنتجات', 'products', 'عرض قائمة المنتجات'),
    ('products.create', 'إضافة منتج', 'products', 'إضافة منتجات جديدة'),
    ('products.edit', 'تعديل منتج', 'products', 'تعديل بيانات المنتجات'),
    ('products.delete', 'حذف منتج', 'products', 'حذف المنتجات'),
    
    -- Categories
    ('categories.view', 'عرض التصنيفات', 'categories', 'عرض قائمة التصنيفات'),
    ('categories.manage', 'إدارة التصنيفات', 'categories', 'إضافة/تعديل/حذف التصنيفات'),
    
    -- Inventory
    ('inventory.view', 'عرض المخزون', 'inventory', 'عرض مستويات المخزون'),
    ('inventory.stock_in', 'إدخال مخزون', 'inventory', 'إضافة مخزون جديد'),
    ('inventory.stock_out', 'إخراج مخزون', 'inventory', 'إخراج مخزون'),
    ('inventory.adjust', 'تعديل المخزون', 'inventory', 'إجراء تعديلات على المخزون'),
    ('inventory.transfer', 'نقل بين المستودعات', 'inventory', 'نقل المخزون بين المستودعات'),
    
    -- Warehouses
    ('warehouses.view', 'عرض المستودعات', 'warehouses', 'عرض قائمة المستودعات'),
    ('warehouses.manage', 'إدارة المستودعات', 'warehouses', 'إضافة/تعديل/حذف المستودعات'),
    
    -- Suppliers
    ('suppliers.view', 'عرض الموردين', 'suppliers', 'عرض قائمة الموردين'),
    ('suppliers.manage', 'إدارة الموردين', 'suppliers', 'إضافة/تعديل/حذف الموردين'),
    
    -- Reports
    ('reports.view', 'عرض التقارير', 'reports', 'عرض تقارير المخزون'),
    ('reports.export', 'تصدير التقارير', 'reports', 'تصدير التقارير'),
    
    -- Settings
    ('settings.view', 'عرض الإعدادات', 'settings', 'عرض إعدادات النظام'),
    ('settings.edit', 'تعديل الإعدادات', 'settings', 'تعديل إعدادات النظام'),
    
    -- Audit
    ('audit.view', 'عرض سجل التدقيق', 'audit', 'عرض سجلات النظام'),
    ('audit.manage', 'إدارة سجل التدقيق', 'audit', 'حذف/تصدير سجلات التدقيق'),
    
    -- Users
    ('users.view', 'عرض المستخدمين', 'users', 'عرض قائمة المستخدمين'),
    ('users.manage', 'إدارة المستخدمين', 'users', 'إضافة/تعديل/حذف المستخدمين'),
    
    -- Repairs (Mayo Fix Enterprise)
    ('repairs.view', 'عرض الصيانة', 'repairs', 'عرض تذاكر الصيانة'),
    ('repairs.create', 'استلام جهاز', 'repairs', 'إنشاء تذكرة صيانة جديدة'),
    ('repairs.edit', 'تحديث تذكرة', 'repairs', 'تحديث حالة أو تفاصيل التذكرة'),
    ('repairs.technician', 'فني صيانة', 'repairs', 'صلاحية العمل على التذاكر'),
    ('repairs.manager', 'مدير صيانة', 'repairs', 'إدارة قسم الصيانة بالكامل'),

    ('roles.manage', 'إدارة الأدوار', 'users', 'إدارة الأدوار والصلاحيات');

-- Give admin role all permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'admin'),
    id
FROM permissions;

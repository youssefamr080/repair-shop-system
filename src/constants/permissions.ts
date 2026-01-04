/**
 * Mayo Fix Enterprise - Permissions System
 * 
 * Role-based access control for phone repair management.
 * 
 * IMPORTANT: These permission codes MUST match the database schema (schema.sql)
 * Format: module.action (e.g., repairs.view, suppliers.manage)
 */

// =============================================================================
// PERMISSION CODES (Synced with Database)
// =============================================================================

export const PERMISSIONS = {
    // Products
    PRODUCTS_VIEW: 'products.view',
    PRODUCTS_CREATE: 'products.create',
    PRODUCTS_EDIT: 'products.edit',
    PRODUCTS_DELETE: 'products.delete',

    // Categories
    CATEGORIES_VIEW: 'categories.view',
    CATEGORIES_MANAGE: 'categories.manage',

    // Inventory
    INVENTORY_VIEW: 'inventory.view',
    INVENTORY_STOCK_IN: 'inventory.stock_in',
    INVENTORY_STOCK_OUT: 'inventory.stock_out',
    INVENTORY_ADJUST: 'inventory.adjust',
    INVENTORY_TRANSFER: 'inventory.transfer',

    // Warehouses
    WAREHOUSES_VIEW: 'warehouses.view',
    WAREHOUSES_MANAGE: 'warehouses.manage',

    // Suppliers
    SUPPLIERS_VIEW: 'suppliers.view',
    SUPPLIERS_MANAGE: 'suppliers.manage',

    // Parts
    PARTS_VIEW: 'parts.view',
    PARTS_MANAGE: 'parts.manage',

    // Reports
    REPORTS_VIEW: 'reports.view',
    REPORTS_EXPORT: 'reports.export',

    // Settings
    SETTINGS_VIEW: 'settings.view',
    SETTINGS_EDIT: 'settings.edit',

    // Audit
    AUDIT_VIEW: 'audit.view',
    AUDIT_MANAGE: 'audit.manage',

    // Users & Roles
    USERS_VIEW: 'users.view',
    USERS_MANAGE: 'users.manage',
    ROLES_MANAGE: 'roles.manage',

    // Repairs (Mayo Fix Enterprise)
    REPAIRS_VIEW: 'repairs.view',
    REPAIRS_CREATE: 'repairs.create',
    REPAIRS_EDIT: 'repairs.edit',
    REPAIRS_TECHNICIAN: 'repairs.technician',
    REPAIRS_MANAGER: 'repairs.manager',
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// =============================================================================
// PERMISSION METADATA (For UI display)
// =============================================================================

interface PermissionMeta {
    label: string;
    description: string;
    module: string;
}

export const PERMISSION_METADATA: Record<PermissionCode, PermissionMeta> = {
    // Products
    [PERMISSIONS.PRODUCTS_VIEW]: {
        label: 'عرض المنتجات',
        description: 'عرض قائمة المنتجات وتفاصيلها',
        module: 'products',
    },
    [PERMISSIONS.PRODUCTS_CREATE]: {
        label: 'إضافة منتج',
        description: 'إضافة منتجات جديدة للنظام',
        module: 'products',
    },
    [PERMISSIONS.PRODUCTS_EDIT]: {
        label: 'تعديل منتج',
        description: 'تعديل بيانات المنتجات',
        module: 'products',
    },
    [PERMISSIONS.PRODUCTS_DELETE]: {
        label: 'حذف منتج',
        description: 'حذف المنتجات من النظام',
        module: 'products',
    },

    // Categories
    [PERMISSIONS.CATEGORIES_VIEW]: {
        label: 'عرض التصنيفات',
        description: 'عرض قائمة التصنيفات',
        module: 'categories',
    },
    [PERMISSIONS.CATEGORIES_MANAGE]: {
        label: 'إدارة التصنيفات',
        description: 'إضافة/تعديل/حذف التصنيفات',
        module: 'categories',
    },

    // Inventory
    [PERMISSIONS.INVENTORY_VIEW]: {
        label: 'عرض المخزون',
        description: 'عرض مستويات المخزون',
        module: 'inventory',
    },
    [PERMISSIONS.INVENTORY_STOCK_IN]: {
        label: 'إدخال مخزون',
        description: 'إضافة كميات للمخزون',
        module: 'inventory',
    },
    [PERMISSIONS.INVENTORY_STOCK_OUT]: {
        label: 'إخراج مخزون',
        description: 'سحب كميات من المخزون',
        module: 'inventory',
    },
    [PERMISSIONS.INVENTORY_ADJUST]: {
        label: 'تعديل المخزون',
        description: 'إجراء تعديلات على المخزون',
        module: 'inventory',
    },
    [PERMISSIONS.INVENTORY_TRANSFER]: {
        label: 'نقل بين المستودعات',
        description: 'نقل المخزون بين المستودعات',
        module: 'inventory',
    },

    // Warehouses
    [PERMISSIONS.WAREHOUSES_VIEW]: {
        label: 'عرض المستودعات',
        description: 'عرض قائمة المستودعات',
        module: 'warehouses',
    },
    [PERMISSIONS.WAREHOUSES_MANAGE]: {
        label: 'إدارة المستودعات',
        description: 'إضافة/تعديل/حذف المستودعات',
        module: 'warehouses',
    },

    // Suppliers (Parts Suppliers)
    [PERMISSIONS.SUPPLIERS_VIEW]: {
        label: 'عرض الموردين',
        description: 'عرض قائمة موردي قطع الغيار',
        module: 'suppliers',
    },
    [PERMISSIONS.SUPPLIERS_MANAGE]: {
        label: 'إدارة الموردين',
        description: 'إضافة/تعديل/حذف موردي قطع الغيار',
        module: 'suppliers',
    },

    // Parts (Parts Inventory)
    [PERMISSIONS.PARTS_VIEW]: {
        label: 'عرض قطع الغيار',
        description: 'عرض مخزون قطع الغيار',
        module: 'parts',
    },
    [PERMISSIONS.PARTS_MANAGE]: {
        label: 'إدارة قطع الغيار',
        description: 'إضافة وتعديل وحذف قطع الغيار',
        module: 'parts',
    },

    // Reports
    [PERMISSIONS.REPORTS_VIEW]: {
        label: 'عرض التقارير',
        description: 'عرض تقارير المخزون',
        module: 'reports',
    },
    [PERMISSIONS.REPORTS_EXPORT]: {
        label: 'تصدير التقارير',
        description: 'تصدير التقارير لملفات خارجية',
        module: 'reports',
    },

    // Settings
    [PERMISSIONS.SETTINGS_VIEW]: {
        label: 'عرض الإعدادات',
        description: 'عرض إعدادات النظام',
        module: 'settings',
    },
    [PERMISSIONS.SETTINGS_EDIT]: {
        label: 'تعديل الإعدادات',
        description: 'تعديل إعدادات النظام العامة',
        module: 'settings',
    },

    // Audit
    [PERMISSIONS.AUDIT_VIEW]: {
        label: 'عرض سجل التدقيق',
        description: 'عرض سجلات النظام',
        module: 'audit',
    },
    [PERMISSIONS.AUDIT_MANAGE]: {
        label: 'إدارة سجل التدقيق',
        description: 'حذف/تصدير سجلات التدقيق',
        module: 'audit',
    },

    // Users & Roles
    [PERMISSIONS.USERS_VIEW]: {
        label: 'عرض المستخدمين',
        description: 'عرض قائمة المستخدمين',
        module: 'users',
    },
    [PERMISSIONS.USERS_MANAGE]: {
        label: 'إدارة المستخدمين',
        description: 'إضافة/تعديل/حذف المستخدمين',
        module: 'users',
    },
    [PERMISSIONS.ROLES_MANAGE]: {
        label: 'إدارة الأدوار',
        description: 'إنشاء وتعديل أدوار المستخدمين',
        module: 'users',
    },

    // Repairs
    [PERMISSIONS.REPAIRS_VIEW]: {
        label: 'عرض الصيانة',
        description: 'عرض تذاكر الصيانة',
        module: 'repairs',
    },
    [PERMISSIONS.REPAIRS_CREATE]: {
        label: 'استلام جهاز',
        description: 'إنشاء تذكرة صيانة جديدة',
        module: 'repairs',
    },
    [PERMISSIONS.REPAIRS_EDIT]: {
        label: 'تحديث تذكرة',
        description: 'تحديث حالة وتفاصيل التذاكر',
        module: 'repairs',
    },
    [PERMISSIONS.REPAIRS_TECHNICIAN]: {
        label: 'فني صيانة',
        description: 'صلاحيات العمل على التذاكر',
        module: 'repairs',
    },
    [PERMISSIONS.REPAIRS_MANAGER]: {
        label: 'مدير صيانة',
        description: 'إدارة قسم الصيانة بالكامل',
        module: 'repairs',
    },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all permission codes in a specific module
 */
export function getModulePermissions(module: string): PermissionCode[] {
    return Object.values(PERMISSIONS).filter(
        code => PERMISSION_METADATA[code]?.module === module
    );
}

/**
 * Get all unique modules
 */
export function getAllModules(): string[] {
    const modules = new Set(
        Object.values(PERMISSION_METADATA).map(meta => meta.module)
    );
    return Array.from(modules);
}

// =============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// =============================================================================

/**
 * PermissionKey - Alias for the keys of PERMISSIONS object
 * Used by permissionStore and other legacy code
 */
export type PermissionKey = keyof typeof PERMISSIONS;

/**
 * Get permission metadata by PermissionKey
 * Bridges the gap between PermissionKey and PermissionCode
 */
export function getPermissionMeta(key: PermissionKey): { label: string; description: string; module: string; category?: string } | undefined {
    const code = PERMISSIONS[key];
    const meta = PERMISSION_METADATA[code];
    if (!meta) return undefined;
    return {
        ...meta,
        category: meta.module === 'products' || meta.module === 'inventory' ? 'actions' : 'pages',
    };
}

/**
 * PERMISSION_KEY_METADATA - Metadata indexed by PermissionKey for backward compatibility
 */
export const PERMISSION_KEY_METADATA = Object.fromEntries(
    (Object.keys(PERMISSIONS) as PermissionKey[]).map(key => {
        const code = PERMISSIONS[key];
        const meta = PERMISSION_METADATA[code];
        return [key, { ...meta, category: meta?.module === 'products' || meta?.module === 'inventory' ? 'actions' : 'pages' }];
    })
) as Record<PermissionKey, { label: string; description: string; module: string; category: string }>;

/**
 * DEFAULT_PERMISSIONS - Default lock state for each permission
 * Used by permissionStore for initial state
 */
export const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
    PRODUCTS_VIEW: false,
    PRODUCTS_CREATE: false,
    PRODUCTS_EDIT: false,
    PRODUCTS_DELETE: false,
    CATEGORIES_VIEW: false,
    CATEGORIES_MANAGE: false,
    INVENTORY_VIEW: false,
    INVENTORY_STOCK_IN: false,
    INVENTORY_STOCK_OUT: false,
    INVENTORY_ADJUST: false,
    INVENTORY_TRANSFER: false,
    WAREHOUSES_VIEW: false,
    WAREHOUSES_MANAGE: false,
    SUPPLIERS_VIEW: false,
    SUPPLIERS_MANAGE: false,
    PARTS_VIEW: false,
    PARTS_MANAGE: false,
    REPORTS_VIEW: false,
    REPORTS_EXPORT: false,
    SETTINGS_VIEW: false,
    SETTINGS_EDIT: false,
    AUDIT_VIEW: false,
    AUDIT_MANAGE: false,
    USERS_VIEW: false,
    USERS_MANAGE: false,
    ROLES_MANAGE: false,
    REPAIRS_VIEW: false,
    REPAIRS_CREATE: false,
    REPAIRS_EDIT: false,
    REPAIRS_TECHNICIAN: false,
    REPAIRS_MANAGER: false,
};



/**
 * Audit Logs Page - The Black Box
 * 
 * REFACTORED: Uses AuditLogTable component for premium design
 * 
 * Features:
 * - View all CREATE, UPDATE, DELETE actions
 * - Filter by action type, entity type, date range
 * - Search in details
 * - Color-coded action badges (via AuditLogTable)
 * - Premium Navy & Gold theme
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { PageTransition } from '../components/layout';
import {
    Search,
    SlidersHorizontal,
    RefreshCw,
    Shield,
    Trash2,
    Printer,
    FileText,
    X,
} from 'lucide-react';
import {
    Button,
    Input,
    Select,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '../components/ui';
import { AuditLogTable, PrintableAuditLogs } from '../components/audit';
import { cn } from '../utils/helpers';

// Theme constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
};

// Action labels for filter dropdown
const ACTION_LABELS: Record<string, string> = {
    CREATE: 'إنشاء',
    UPDATE: 'تعديل',
    DELETE: 'حذف',
    VIEW: 'عرض',
    LOGIN: 'دخول',
    LOGOUT: 'خروج',
    // Product Actions
    CREATE_PRODUCT: 'إضافة منتج',
    UPDATE_PRODUCT: 'تعديل منتج',
    DELETE_PRODUCT: 'حذف منتج',
    // Category Actions
    CREATE_CATEGORY: 'إضافة تصنيف',
    UPDATE_CATEGORY: 'تعديل تصنيف',
    DELETE_CATEGORY: 'حذف تصنيف',
    // Warehouse Actions
    CREATE_WAREHOUSE: 'إضافة مستودع',
    UPDATE_WAREHOUSE: 'تعديل مستودع',
    DELETE_WAREHOUSE: 'حذف مستودع',
    // Supplier Actions
    CREATE_SUPPLIER: 'إضافة مورد',
    UPDATE_SUPPLIER: 'تعديل مورد',
    DELETE_SUPPLIER: 'حذف مورد',
    // Unit Actions
    CREATE_UNIT: 'إضافة وحدة',
    UPDATE_UNIT: 'تعديل وحدة',
    DELETE_UNIT: 'حذف وحدة',
    // Stock Actions
    STOCK_IN: 'إدخال مخزون',
    STOCK_OUT: 'إخراج مخزون',
    STOCK_ADJUST: 'تعديل رصيد',
    STOCK_TRANSFER: 'تحويل مخزون',
    // Settings
    CREATE_SETTING: 'إضافة إعداد',
    UPDATE_SETTING: 'تحديث إعداد',
    DELETE_SETTING: 'حذف إعداد',
    BACKUP_DATABASE: 'نسخ احتياطي',
    RESTORE_DATABASE: 'استعادة قاعدة البيانات',
};

// Entity type translations
const ENTITY_LABELS: Record<string, string> = {
    product: 'منتج',
    products: 'المنتجات',
    category: 'تصنيف',
    categories: 'التصنيفات',
    warehouse: 'مستودع',
    warehouses: 'المستودعات',
    supplier: 'مورد',
    suppliers: 'الموردين',
    unit: 'وحدة',
    units: 'الوحدات',
    stock: 'المخزون',
    inventory: 'المخزون',
    transaction: 'حركة',
    transactions: 'الحركات',
    setting: 'إعداد',
    settings: 'الإعدادات',
    user: 'مستخدم',
    users: 'المستخدمين',
    role: 'صلاحية',
    roles: 'الصلاحيات',
    system: 'النظام',
    database: 'قاعدة البيانات',
    audit: 'سجل التدقيق',
    audit_log: 'سجل التدقيق',
    company: 'الشركة',
    license: 'الترخيص',
};

// Common words/phrases translation for details field
const DETAILS_TRANSLATIONS: Record<string, string> = {
    // Actions
    'Updated': 'تم تحديث',
    'Created': 'تم إنشاء',
    'Deleted': 'تم حذف',
    'Added': 'تم إضافة',
    'Removed': 'تم إزالة',
    'Changed': 'تم تغيير',
    'Modified': 'تم تعديل',
    'Saved': 'تم حفظ',
    'Loaded': 'تم تحميل',
    'Imported': 'تم استيراد',
    'Exported': 'تم تصدير',
    'Backup': 'نسخ احتياطي',
    'Restore': 'استعادة',
    'Login': 'تسجيل دخول',
    'Logout': 'تسجيل خروج',
    // Inventory terms
    'setting': 'إعداد',
    'settings': 'الإعدادات',
    'product': 'منتج',
    'products': 'المنتجات',
    'category': 'تصنيف',
    'categories': 'التصنيفات',
    'warehouse': 'مستودع',
    'warehouses': 'المستودعات',
    'supplier': 'مورد',
    'suppliers': 'الموردين',
    'unit': 'وحدة',
    'units': 'الوحدات',
    'stock': 'المخزون',
    'quantity': 'الكمية',
    'price': 'السعر',
    'sku': 'رمز المنتج',
    'barcode': 'الباركود',
    'user': 'المستخدم',
    'role': 'الصلاحية',
    'permission': 'الإذن',
    'password': 'كلمة المرور',
    'name': 'الاسم',
    'date': 'التاريخ',
    'time': 'الوقت',
    'status': 'الحالة',
    'amount': 'المبلغ',
    'value': 'القيمة',
    'type': 'النوع',
    'id': 'الرقم',
    'from': 'من',
    'to': 'إلى',
    'by': 'بواسطة',
    'for': 'لـ',
    'with': 'مع',
    'at': 'في',
    'on': 'في',
    'is': 'هو',
    'was': 'كان',
    'has': 'لديه',
    'have': 'لديهم',
    'true': 'نعم',
    'false': 'لا',
    'null': 'فارغ',
    'undefined': 'غير محدد',
    'enabled': 'مفعّل',
    'disabled': 'معطّل',
    'active': 'نشط',
    'inactive': 'غير نشط',
    'pending': 'قيد الانتظار',
    'approved': 'موافق عليه',
    'rejected': 'مرفوض',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
    'new': 'جديد',
    'old': 'قديم',
    'company_name': 'اسم الشركة',
    'company_logo': 'شعار الشركة',
    'company_address': 'عنوان الشركة',
    'dark': 'داكن',
    'light': 'فاتح',
    'stock_in': 'إدخال مخزون',
    'stock_out': 'إخراج مخزون',
    'adjustment': 'تعديل رصيد',
    'transfer': 'تحويل',
};

// Helper function to translate details text
const translateDetails = (details: string | null | undefined): string => {
    if (!details) return '-';

    let translated = details;

    // Sort by length (longest first) to avoid partial replacements
    const sortedKeys = Object.keys(DETAILS_TRANSLATIONS).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        // Case-insensitive replacement with word boundary awareness
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        translated = translated.replace(regex, DETAILS_TRANSLATIONS[key]);
    }

    return translated;
};

interface AuditFilter {
    action_type?: string;
    entity_type?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
}

const PAGE_SIZE = 20;

export function AuditLogs() {
    // State
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [viewLog, setViewLog] = useState<any | null>(null);

    // Filter state
    const [filter, setFilter] = useState<AuditFilter>({});
    const [searchInput, setSearchInput] = useState('');

    // Filter options
    const [entityTypes, setEntityTypes] = useState<string[]>([]);
    const [actionTypes, setActionTypes] = useState<string[]>([]);

    // Company branding for print
    const [companyName, setCompanyName] = useState('');
    const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined);

    // Print Ref
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: 'سجل-التدقيق',
    });

    // Load filter options on mount
    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [entities, actions] = await Promise.all([
                    window.database.audit.getEntityTypes(),
                    window.database.audit.getActionTypes(),
                ]);
                setEntityTypes(entities);
                setActionTypes(actions);
            } catch (error) {
                console.error('Failed to load filter options:', error);
            }
        };
        loadFilterOptions();

        // Load company settings for print branding
        const loadSettings = async () => {
            try {
                if (window.database?.getAllSettings) {
                    const settings = await window.database.getAllSettings();
                    if (settings.company_name) setCompanyName(settings.company_name);
                    if (settings.company_logo) setCompanyLogo(settings.company_logo);
                }
            } catch (error) {
                console.error('Failed to load company settings:', error);
            }
        };
        loadSettings();
    }, []);

    // Load audit logs
    const loadLogs = useCallback(async () => {
        try {
            setIsRefreshing(true);
            const result = await window.database.audit.getFiltered({
                ...filter,
                search: filter.search || undefined,
                limit: PAGE_SIZE,
                offset: (page - 1) * PAGE_SIZE,
            });
            setLogs(result.logs);
            setTotal(result.total);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
            toast.error('فشل تحميل سجل التدقيق');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [filter, page]);

    // Reload on filter or page change
    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Handle search
    const handleSearch = () => {
        setFilter(prev => ({ ...prev, search: searchInput }));
        setPage(1);
    };

    // Handle filter change
    const handleFilterChange = (key: keyof AuditFilter, value: string) => {
        setFilter(prev => ({ ...prev, [key]: value || undefined }));
        setPage(1);
    };

    // Clear filters
    const clearFilters = () => {
        setFilter({});
        setSearchInput('');
        setPage(1);
    };

    // Delete single log
    const handleDelete = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
        try {
            await window.database.audit.delete(id);
            toast.success('تم حذف السجل');
            loadLogs();
        } catch (error) {
            console.error('Failed to delete log:', error);
            toast.error('فشل حذف السجل');
        }
    };

    // Delete all logs
    const handleDeleteAll = async () => {
        const confirmed = confirm('تحذير: سيتم حذف جميع سجلات التدقيق نهائياً. هل أنت متأكد؟');
        if (!confirmed) return;
        try {
            const count = await window.database.audit.deleteAll();
            toast.success(`تم حذف ${count} سجل`);
            loadLogs();
        } catch (error) {
            console.error('Failed to delete all logs:', error);
            toast.error('فشل حذف السجلات');
        }
    };

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                            style={{
                                background: `linear-gradient(135deg, ${THEME.navy} 0%, ${THEME.navy}dd 100%)`,
                            }}
                        >
                            <Shield className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1
                                className="text-3xl font-bold"
                                style={{ color: THEME.navy, fontFamily: "'Amiri', serif" }}
                            >
                                سجل التدقيق
                            </h1>
                            <p className="text-muted-foreground">
                                جميع العمليات الحساسة في النظام
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className="gap-2"
                            style={{ borderColor: THEME.gold, color: THEME.navy }}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            الفلاتر
                        </Button>
                        <Button
                            onClick={loadLogs}
                            disabled={isRefreshing}
                            className="gap-2"
                            style={{ backgroundColor: THEME.navy }}
                        >
                            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                            تحديث
                        </Button>
                        {total > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAll}
                                className="gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                مسح الكل
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => handlePrint()}
                            className="gap-2"
                            style={{ borderColor: THEME.gold }}
                            disabled={logs.length === 0}
                        >
                            <Printer className="h-4 w-4" style={{ color: THEME.gold }} />
                            طباعة
                        </Button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <Card style={{ borderTop: `3px solid ${THEME.gold}` }}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg" style={{ color: THEME.navy }}>
                                فلترة السجلات
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                {/* Action Type */}
                                <Select
                                    value={filter.action_type || ''}
                                    onChange={(e) => handleFilterChange('action_type', e.target.value)}
                                    options={[
                                        { value: '', label: 'كل الإجراءات' },
                                        ...actionTypes.map(a => ({ value: a, label: ACTION_LABELS[a] || a })),
                                    ]}
                                />

                                {/* Entity Type */}
                                <Select
                                    value={filter.entity_type || ''}
                                    onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                                    options={[
                                        { value: '', label: 'كل الكيانات' },
                                        ...entityTypes.map(e => ({ value: e, label: e })),
                                    ]}
                                />

                                {/* Start Date */}
                                <Input
                                    type="date"
                                    value={filter.start_date || ''}
                                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                    placeholder="من تاريخ"
                                />

                                {/* End Date */}
                                <Input
                                    type="date"
                                    value={filter.end_date || ''}
                                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                    placeholder="إلى تاريخ"
                                />

                                {/* Clear */}
                                <Button
                                    variant="outline"
                                    onClick={clearFilters}
                                    className="gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    مسح الفلاتر
                                </Button>
                            </div>

                            {/* Search */}
                            <div className="mt-4 flex gap-2">
                                <Input
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="البحث في التفاصيل..."
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="flex-1"
                                />
                                <Button onClick={handleSearch} style={{ backgroundColor: THEME.navy }}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Audit Log Table - Premium Component */}
                {loading ? (
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <AuditLogTable
                        logs={logs}
                        totalRecords={total}
                        currentPage={page}
                        itemsPerPage={PAGE_SIZE}
                        onPageChange={setPage}
                        onView={setViewLog}
                        onDelete={handleDelete}
                    />
                )}

                {/* View Details Dialog */}
                {viewLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setViewLog(null)}
                                className="absolute left-4 top-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>

                            <CardHeader className="border-b bg-slate-50/50">
                                <CardTitle className="text-xl flex items-center gap-3">
                                    <Shield className="h-6 w-6 text-primary" />
                                    تفاصيل السجل #{viewLog.id}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-6 space-y-6">
                                {/* Meta Info Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">الإجراء</label>
                                        <div className="font-medium text-gray-900">{ACTION_LABELS[viewLog.action] || viewLog.action}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">الكيان</label>
                                        <div className="font-medium text-gray-900">
                                            {ENTITY_LABELS[viewLog.entity_type?.toLowerCase()] || viewLog.entity_type}
                                            {viewLog.entity_id && ` (#${viewLog.entity_id})`}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">المستخدم</label>
                                        <div className="font-medium text-gray-900">{viewLog.user_name || 'النظام'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">التوقيت</label>
                                        <div className="font-medium text-gray-900">{new Date(viewLog.created_at).toLocaleString('ar-EG')}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">المصدر</label>
                                        <div className="font-medium text-gray-900" dir="ltr">{viewLog.ip_address || 'LOCAL'}</div>
                                    </div>
                                </div>

                                {/* Details JSON Viewer */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        التفاصيل الكاملة
                                    </label>
                                    <div className="bg-slate-900 text-slate-50 rounded-lg p-4 font-mono text-sm overflow-x-auto shadow-inner" dir="rtl">
                                        <pre className="whitespace-pre-wrap text-right">
                                            {(() => {
                                                try {
                                                    // Try to parse if it looks like JSON/Object
                                                    if (typeof viewLog.details === 'string' && (viewLog.details.startsWith('{') || viewLog.details.startsWith('['))) {
                                                        const parsed = JSON.parse(viewLog.details);
                                                        // Translate JSON keys and values
                                                        const translatedJson = JSON.stringify(parsed, null, 2);
                                                        return translateDetails(translatedJson);
                                                    }
                                                    // Plain text - translate directly
                                                    return translateDetails(viewLog.details);
                                                } catch {
                                                    return translateDetails(viewLog.details);
                                                }
                                            })()}
                                        </pre>
                                    </div>
                                </div>
                            </CardContent>

                            <div className="p-4 border-t bg-slate-50 flex justify-end">
                                <Button onClick={() => setViewLog(null)}>
                                    إغلاق
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Hidden Printable Audit Logs */}
                <div style={{ display: 'none' }}>
                    <PrintableAuditLogs
                        ref={printRef}
                        logs={logs.map(log => ({
                            ...log,
                            timestamp: log.created_at, // Map created_at to timestamp
                        }))}
                        companyName={companyName}
                        companyLogo={companyLogo}
                    />
                </div>
            </div>
        </PageTransition >
    );
}

export default AuditLogs;

/**
 * AuditLogTable - Ultra Premium Design with TanStack Table
 * 
 * Features:
 * - TanStack Table for sorting
 * - Glassmorphism header with gradient
 * - Color-coded action badges
 * - Premium hover animations
 * - Delete actions
 * - Navy Blue & Gold theme
 */

import { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    ColumnDef,
    flexRender,
    SortingState,
} from '@tanstack/react-table';
import {
    Shield,
    Trash2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Clock,
    User,
    FileText,
    Plus,
    Edit3,
    X,
    LogIn,
    LogOut,
    Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, Pagination, EmptyState, Button } from '../ui';
import { cn } from '../../utils/helpers';

// Premium Theme
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
    gradientPrimary: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
    gradientGold: 'linear-gradient(135deg, #c5a153 0%, #d4b66a 100%)',
};

// Action badge colors
const ACTION_STYLES: Record<string, { bg: string; text: string; label: string; icon: typeof Plus }> = {
    CREATE: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'إنشاء', icon: Plus },
    UPDATE: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تعديل', icon: Edit3 },
    DELETE: { bg: 'bg-red-100', text: 'text-red-700', label: 'حذف', icon: Trash2 },
    VIEW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'عرض', icon: Eye },
    LOGIN: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'دخول', icon: LogIn },
    LOGOUT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'خروج', icon: LogOut },
    // Product actions
    CREATE_PRODUCT: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'إضافة منتج', icon: Plus },
    UPDATE_PRODUCT: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تعديل منتج', icon: Edit3 },
    DELETE_PRODUCT: { bg: 'bg-red-100', text: 'text-red-700', label: 'حذف منتج', icon: Trash2 },
    // Category actions
    CREATE_CATEGORY: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'إضافة تصنيف', icon: Plus },
    UPDATE_CATEGORY: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تعديل تصنيف', icon: Edit3 },
    DELETE_CATEGORY: { bg: 'bg-red-100', text: 'text-red-700', label: 'حذف تصنيف', icon: Trash2 },
    // Warehouse actions
    CREATE_WAREHOUSE: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'إضافة مستودع', icon: Plus },
    UPDATE_WAREHOUSE: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تعديل مستودع', icon: Edit3 },
    DELETE_WAREHOUSE: { bg: 'bg-red-100', text: 'text-red-700', label: 'حذف مستودع', icon: Trash2 },
    // Supplier actions
    CREATE_SUPPLIER: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'إضافة مورد', icon: Plus },
    UPDATE_SUPPLIER: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تعديل مورد', icon: Edit3 },
    DELETE_SUPPLIER: { bg: 'bg-red-100', text: 'text-red-700', label: 'حذف مورد', icon: Trash2 },
    // Unit actions
    CREATE_UNIT: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'إضافة وحدة', icon: Plus },
    UPDATE_UNIT: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تعديل وحدة', icon: Edit3 },
    DELETE_UNIT: { bg: 'bg-red-100', text: 'text-red-700', label: 'حذف وحدة', icon: Trash2 },
    // Stock actions
    STOCK_IN: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'إدخال مخزون', icon: Plus },
    STOCK_OUT: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'إخراج مخزون', icon: Trash2 },
    STOCK_ADJUST: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تعديل رصيد', icon: Edit3 },
    STOCK_TRANSFER: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'تحويل مخزون', icon: FileText },
    // Settings
    CREATE_SETTING: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'إضافة إعداد', icon: Plus },
    UPDATE_SETTING: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تحديث إعداد', icon: Edit3 },
    DELETE_SETTING: { bg: 'bg-red-100', text: 'text-red-700', label: 'حذف إعداد', icon: Trash2 },
    BACKUP_DATABASE: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'نسخ احتياطي', icon: FileText },
    RESTORE_DATABASE: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'استعادة قاعدة البيانات', icon: FileText },
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
    'Updated': 'تم تحديث',
    'Created': 'تم إنشاء',
    'Deleted': 'تم حذف',
    'Added': 'تم إضافة',
    'Removed': 'تم إزالة',
    'Changed': 'تم تغيير',
    'Modified': 'تم تعديل',
    'setting': 'إعداد',
    'settings': 'الإعدادات',
    'product': 'منتج',
    'products': 'المنتجات',
    'category': 'تصنيف',
    'warehouse': 'مستودع',
    'supplier': 'مورد',
    'unit': 'وحدة',
    'stock': 'المخزون',
    'quantity': 'الكمية',
    'price': 'السعر',
    'user': 'المستخدم',
    'name': 'الاسم',
    'date': 'التاريخ',
    'time': 'الوقت',
    'status': 'الحالة',
    'dark': 'داكن',
    'light': 'فاتح',
    'company_name': 'اسم الشركة',
    'company_logo': 'شعار الشركة',
};

// Helper function to translate details text
const translateDetails = (details: string | null | undefined): string => {
    if (!details) return '-';
    let translated = details;
    const sortedKeys = Object.keys(DETAILS_TRANSLATIONS).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        translated = translated.replace(regex, DETAILS_TRANSLATIONS[key]);
    }
    return translated;
};

export interface AuditLog {
    id: number;
    action: string;
    entity_type: string;
    entity_id: string | null;
    user_id: string | null;
    user_name: string | null;
    details: string | null;
    ip_address: string | null;
    created_at: string;
}

interface AuditLogTableProps {
    logs: AuditLog[];
    totalRecords: number;
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onView: (log: AuditLog) => void;
    onDelete: (id: number) => void;
}

export function AuditLogTable({
    logs,
    totalRecords,
    currentPage,
    itemsPerPage,
    onPageChange,
    onView,
    onDelete,
}: AuditLogTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalRecords);

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // TanStack Table Columns
    const columns: ColumnDef<AuditLog>[] = useMemo(() => [
        {
            id: 'index',
            header: '#',
            cell: ({ row }) => (
                <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm mx-auto"
                    style={{ background: THEME.gradientPrimary }}
                >
                    {startIndex + row.index + 1}
                </span>
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'action',
            header: () => (
                <span className="flex items-center gap-2 font-bold text-white">
                    <Shield className="h-4 w-4" />
                    الإجراء
                </span>
            ),
            cell: ({ row }) => {
                const style = ACTION_STYLES[row.original.action] || {
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    label: row.original.action,
                    icon: FileText
                };
                const Icon = style.icon;
                return (
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold",
                        style.bg, style.text
                    )}>
                        <Icon className="h-3.5 w-3.5" />
                        {style.label}
                    </span>
                );
            },
        },
        {
            accessorKey: 'entity_type',
            header: ({ column }) => (
                <button
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="flex items-center gap-2 font-bold text-white hover:text-white/80 transition-colors"
                >
                    <FileText className="h-4 w-4" />
                    الكيان
                    {column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="h-4 w-4" />
                    ) : column.getIsSorted() === 'asc' ? (
                        <ArrowUp className="h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                    )}
                </button>
            ),
            cell: ({ row }) => {
                const entityType = row.original.entity_type?.toLowerCase() || '';
                const translatedEntity = ENTITY_LABELS[entityType] || row.original.entity_type;
                return (
                    <div className="flex items-center gap-2">
                        <span
                            className="px-2.5 py-1 rounded-lg text-xs font-medium"
                            style={{ backgroundColor: `${THEME.navy}15`, color: THEME.navy }}
                        >
                            {translatedEntity}
                        </span>
                        {row.original.entity_id && (
                            <span className="text-xs text-gray-400 font-mono">
                                #{row.original.entity_id}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'details',
            header: () => (
                <span className="font-bold text-white">التفاصيل</span>
            ),
            cell: ({ row }) => {
                const translatedDetails = translateDetails(row.original.details);
                return (
                    <div
                        className="max-w-[200px] overflow-hidden"
                        title={translatedDetails}
                    >
                        <span className="text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis block">
                            {translatedDetails}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'user_name',
            header: () => (
                <span className="flex items-center gap-2 font-bold text-white">
                    <User className="h-4 w-4" />
                    المستخدم
                </span>
            ),
            cell: ({ row }) => (
                <span className="text-sm font-medium text-gray-800">
                    {row.original.user_name || 'النظام'}
                </span>
            ),
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <button
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="flex items-center gap-2 font-bold text-white hover:text-white/80 transition-colors"
                >
                    <Clock className="h-4 w-4" />
                    الوقت
                    {column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="h-4 w-4" />
                    ) : column.getIsSorted() === 'asc' ? (
                        <ArrowUp className="h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                    )}
                </button>
            ),
            cell: ({ row }) => (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(row.original.created_at)}
                </span>
            ),
        },
        {
            id: 'actions',
            header: () => <span className="font-bold text-white">الإجراءات</span>,
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(row.original)}
                        className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 hover:scale-110 transition-all"
                        title="عرض التفاصيل"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(row.original.id)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 hover:scale-110 transition-all"
                        title="حذف"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ),
            enableSorting: false,
        },
    ], [startIndex, onDelete, onView]);

    // TanStack Table instance
    const table = useReactTable({
        data: logs,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="space-y-6">
            {/* Ultra Premium Header */}
            <div
                className="rounded-2xl p-5 shadow-2xl relative overflow-hidden"
                style={{ background: THEME.gradientPrimary }}
            >
                <div
                    className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-10"
                    style={{ background: `radial-gradient(circle, ${THEME.gold} 0%, transparent 70%)` }}
                />

                <div className="relative z-10 flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ background: THEME.gradientGold }}
                    >
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Amiri', serif" }}>
                            سجل التدقيق
                        </h2>
                        <p className="text-white/60 text-sm">
                            {totalRecords} سجل | عرض {startIndex + 1} - {endIndex}
                        </p>
                    </div>
                </div>
            </div>

            {/* Premium Table Card */}
            <Card className="shadow-xl border-0 overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                    {logs.length === 0 ? (
                        <div className="py-20">
                            <EmptyState
                                icon={FileText}
                                title="لا توجد سجلات"
                                description="حاول تغيير الفلاتر أو مسحها"
                            />
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full" dir="rtl">
                                    <thead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <tr
                                                key={headerGroup.id}
                                                style={{ background: THEME.gradientPrimary }}
                                            >
                                                {headerGroup.headers.map((header) => (
                                                    <th
                                                        key={header.id}
                                                        className="py-4 px-3 text-right first:text-center whitespace-nowrap"
                                                    >
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody>
                                        {table.getRowModel().rows.map((row, index) => (
                                            <motion.tr
                                                key={row.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                                className={cn(
                                                    "transition-colors duration-200 border-b border-gray-100",
                                                    "hover:bg-gradient-to-l hover:from-blue-50/80 hover:to-transparent",
                                                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
                                                )}
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <td
                                                        key={cell.id}
                                                        className="py-2 px-3 first:text-center"
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Premium Pagination */}
                            {totalPages > 1 && (
                                <div
                                    className="border-t p-4 flex items-center justify-between"
                                    style={{ background: `linear-gradient(180deg, white 0%, ${THEME.navy}05 100%)` }}
                                >
                                    <p className="text-sm text-gray-500">
                                        عرض {startIndex + 1} - {endIndex} من {totalRecords}
                                    </p>
                                    <Pagination
                                        page={currentPage}
                                        pageSize={itemsPerPage}
                                        total={totalRecords}
                                        onPageChange={onPageChange}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default AuditLogTable;

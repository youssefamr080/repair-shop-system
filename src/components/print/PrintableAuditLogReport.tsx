/**
 * PrintableAuditLogReport - Audit log report for printing
 * 
 * Features:
 * - Summary statistics by action type
 * - Gregorian dates only
 * - Arabic translations for actions and entities
 */

import { PrintableTable, Column } from './PrintableTable';
import { THEME } from '../../constants/theme';

// Arabic translations for action types
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    'create': { label: 'إنشاء', color: '#10b981' },
    'update': { label: 'تحديث', color: '#f59e0b' },
    'delete': { label: 'حذف', color: '#ef4444' },
    'login': { label: 'تسجيل دخول', color: '#8b5cf6' },
    'logout': { label: 'تسجيل خروج', color: '#6366f1' },
    'export': { label: 'تصدير', color: '#06b6d4' },
    'import': { label: 'استيراد', color: '#0ea5e9' },
    'backup': { label: 'نسخ احتياطي', color: '#14b8a6' },
    'restore': { label: 'استعادة', color: '#22c55e' },
    'transfer': { label: 'نقل', color: '#f97316' },
    'adjustment': { label: 'تسوية', color: '#eab308' },
};

// Arabic translations for entity types
const ENTITY_LABELS: Record<string, string> = {
    'product': 'منتج',
    'category': 'تصنيف',
    'supplier': 'مورد',
    'warehouse': 'مستودع',
    'inventory': 'مخزون',
    'user': 'مستخدم',
    'role': 'دور',
    'settings': 'إعدادات',
    'transaction': 'حركة',
};

interface AuditLog {
    id: number;
    action: string;
    entity_type: string;
    entity_id?: number;
    details?: string;
    user_name?: string;
    created_at: string;
}

interface PrintableAuditLogReportProps {
    logs: AuditLog[];
}

// Format date as Gregorian (no Hijri)
function formatGregorianDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-EG-u-ca-gregory', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '-';
    }
}

export function PrintableAuditLogReport({ logs }: PrintableAuditLogReportProps) {
    // Calculate statistics
    const stats = {
        total: logs.length,
        creates: logs.filter(l => l.action === 'create').length,
        updates: logs.filter(l => l.action === 'update').length,
        deletes: logs.filter(l => l.action === 'delete').length,
        logins: logs.filter(l => l.action === 'login' || l.action === 'logout').length,
    };

    const columns: Column<AuditLog>[] = [
        {
            key: 'created_at',
            header: 'التاريخ',
            width: '15%',
            render: (item) => (
                <span style={{ fontSize: '9pt' }}>
                    {formatGregorianDate(item.created_at)}
                </span>
            )
        },
        {
            key: 'action',
            header: 'الإجراء',
            width: '12%',
            align: 'center',
            render: (item) => {
                const actionInfo = ACTION_LABELS[item.action] || { label: item.action, color: '#6b7280' };
                return (
                    <span style={{
                        color: actionInfo.color,
                        backgroundColor: `${actionInfo.color}15`,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '600',
                        fontSize: '9pt'
                    }}>
                        {actionInfo.label}
                    </span>
                );
            }
        },
        {
            key: 'entity_type',
            header: 'النوع',
            width: '12%',
            render: (item) => ENTITY_LABELS[item.entity_type] || item.entity_type
        },
        {
            key: 'details',
            header: 'التفاصيل',
            width: '36%',
            render: (item) => (
                <span style={{ fontSize: '9pt', color: '#4b5563' }}>
                    {item.details || '-'}
                </span>
            )
        },
        {
            key: 'user_name',
            header: 'المستخدم',
            width: '15%',
            render: (item) => (
                <span style={{ fontWeight: '500' }}>
                    {item.user_name || '-'}
                </span>
            )
        },
    ];

    return (
        <div>
            {/* Summary Statistics */}
            <div
                className="grid grid-cols-5 gap-2 mb-6 p-3 rounded-lg"
                style={{ backgroundColor: '#f8fafc' }}
            >
                <StatCard label="إجمالي السجلات" value={stats.total} color={THEME.navy} />
                <StatCard label="إنشاء" value={stats.creates} color="#10b981" />
                <StatCard label="تحديث" value={stats.updates} color="#f59e0b" />
                <StatCard label="حذف" value={stats.deletes} color="#ef4444" />
                <StatCard label="تسجيل دخول/خروج" value={stats.logins} color="#8b5cf6" />
            </div>

            {/* Audit Logs Table */}
            <PrintableTable
                data={logs}
                columns={columns}
                showRowNumbers={true}
                emptyMessage="لا توجد سجلات لعرضها"
            />
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="text-center p-2 rounded-lg bg-white border" style={{ borderColor: '#e2e8f0' }}>
            <div className="text-base font-bold" style={{ color }}>{value.toLocaleString('ar-EG')}</div>
            <div className="text-xs text-gray-500">{label}</div>
        </div>
    );
}

export default PrintableAuditLogReport;

/**
 * PrintableSuppliersReport - Suppliers report for printing
 * 
 * Features:
 * - Summary statistics
 * - Supplier contact details
 * - Status indicators
 */

import { PrintableTable, Column } from './PrintableTable';
import { THEME } from '../../constants/theme';

interface Supplier {
    id: number;
    name: string;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
    is_active: number;
}

interface PrintableSuppliersReportProps {
    suppliers: Supplier[];
}

export function PrintableSuppliersReport({ suppliers }: PrintableSuppliersReportProps) {
    // Calculate statistics
    const stats = {
        total: suppliers.length,
        active: suppliers.filter(s => s.is_active === 1).length,
        inactive: suppliers.filter(s => s.is_active !== 1).length,
    };

    const columns: Column<Supplier>[] = [
        {
            key: 'name',
            header: 'اسم المورد',
            width: '25%',
            render: (item) => (
                <span style={{ fontWeight: '600', color: THEME.navy }}>
                    {item.name}
                </span>
            )
        },
        {
            key: 'contact_person',
            header: 'جهة الاتصال',
            width: '20%',
            render: (item) => item.contact_person || '-'
        },
        {
            key: 'phone',
            header: 'الهاتف',
            width: '18%',
            render: (item) => (
                <span style={{ fontFamily: 'monospace', fontSize: '9pt' }}>
                    {item.phone || '-'}
                </span>
            )
        },
        {
            key: 'email',
            header: 'البريد الإلكتروني',
            width: '22%',
            render: (item) => (
                <span style={{ fontSize: '9pt', color: '#4b5563' }}>
                    {item.email || '-'}
                </span>
            )
        },
        {
            key: 'is_active',
            header: 'الحالة',
            width: '15%',
            align: 'center',
            render: (item) => (
                <span style={{
                    color: item.is_active ? '#10b981' : '#ef4444',
                    backgroundColor: item.is_active ? '#ecfdf5' : '#fef2f2',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '9pt'
                }}>
                    {item.is_active ? 'فعال' : 'غير فعال'}
                </span>
            )
        },
    ];

    return (
        <div>
            {/* Summary Statistics */}
            <div
                className="grid grid-cols-3 gap-3 mb-6 p-3 rounded-lg"
                style={{ backgroundColor: '#f8fafc' }}
            >
                <StatCard label="إجمالي الموردين" value={stats.total} color={THEME.navy} />
                <StatCard label="موردين فعالين" value={stats.active} color="#10b981" />
                <StatCard label="غير فعالين" value={stats.inactive} color="#ef4444" />
            </div>

            {/* Suppliers Table */}
            <PrintableTable
                data={suppliers}
                columns={columns}
                showRowNumbers={true}
                emptyMessage="لا يوجد موردين لعرضهم"
            />
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="text-center p-2 rounded-lg bg-white border" style={{ borderColor: '#e2e8f0' }}>
            <div className="text-lg font-bold" style={{ color }}>{value.toLocaleString('ar-EG')}</div>
            <div className="text-xs text-gray-500">{label}</div>
        </div>
    );
}

export default PrintableSuppliersReport;

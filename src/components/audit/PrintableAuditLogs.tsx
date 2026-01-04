/**
 * PrintableAuditLogs - Print-Ready Audit Logs Component
 * 
 * Features:
 * - Clean print layout for audit trail
 * - Arabic RTL support
 * - Company branding
 * - Professional A4 landscape styling
 */

import React from 'react';

const PRINT_THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
    border: '#e5e7eb',
    header: '#f3f4f6',
};

interface AuditLog {
    id: number;
    action: string;
    entity_type: string;
    entity_id?: number;
    user_name?: string;
    details?: string;
    timestamp: string;
}

interface PrintableAuditLogsProps {
    logs: AuditLog[];
    startDate?: string;
    endDate?: string;
    companyName?: string;
    companyLogo?: string;
}

export const PrintableAuditLogs = React.forwardRef<HTMLDivElement, PrintableAuditLogsProps>(
    ({ logs, startDate, endDate, companyName, companyLogo }, ref) => {
        const formatDateTime = (dateStr: string) => {
            return new Date(dateStr).toLocaleString('ar-EG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        };

        const actionLabels: Record<string, string> = {
            'CREATE': 'إنشاء',
            'UPDATE': 'تحديث',
            'DELETE': 'حذف',
            'VIEW': 'عرض',
            'LOGIN': 'تسجيل دخول',
            'LOGOUT': 'تسجيل خروج',
            'EXPORT': 'تصدير',
        };

        const getActionColor = (action: string) => {
            switch (action) {
                case 'CREATE': return '#10b981';
                case 'UPDATE': return '#3b82f6';
                case 'DELETE': return '#ef4444';
                case 'LOGIN': return '#8b5cf6';
                case 'LOGOUT': return '#6b7280';
                default: return '#6b7280';
            }
        };

        return (
            <div ref={ref} className="print-audit-logs" dir="rtl">
                <style>{`
                    @media print {
                        .print-audit-logs {
                            font-family: 'Cairo', 'Amiri', Arial, sans-serif;
                            padding: 20px;
                            background: white;
                            color: black;
                        }
                        .print-audit-logs table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 10px;
                        }
                        .print-audit-logs th, .print-audit-logs td {
                            border: 1px solid #e5e7eb;
                            padding: 6px;
                            text-align: right;
                        }
                        .print-audit-logs th {
                            background-color: #f3f4f6 !important;
                            font-weight: 700;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        @page {
                            size: A4 landscape;
                            margin: 10mm;
                        }
                    }
                    
                    .print-audit-logs {
                        font-family: 'Cairo', 'Amiri', Arial, sans-serif;
                        padding: 20px;
                        background: white;
                    }
                    .print-audit-logs table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
                    }
                    .print-audit-logs th, .print-audit-logs td {
                        border: 1px solid ${PRINT_THEME.border};
                        padding: 6px;
                        text-align: right;
                    }
                    .print-audit-logs th {
                        background-color: ${PRINT_THEME.header};
                        font-weight: 700;
                    }
                    .print-audit-logs .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid ${PRINT_THEME.gold};
                        padding-bottom: 15px;
                    }
                    .print-audit-logs .company-name {
                        font-size: 24px;
                        font-weight: 700;
                        color: ${PRINT_THEME.navy};
                    }
                    .print-audit-logs .report-title {
                        font-size: 18px;
                        font-weight: 600;
                        text-align: center;
                        margin: 15px 0;
                        color: ${PRINT_THEME.navy};
                    }
                `}</style>

                {/* Header */}
                <div className="header">
                    <div>
                        <div className="company-name">{companyName || 'اسم الشركة'}</div>
                    </div>
                    {companyLogo && (
                        <img src={companyLogo} alt="Company Logo" style={{ height: '60px', objectFit: 'contain' }} />
                    )}
                </div>

                {/* Title */}
                <div className="report-title">سجل التدقيق (Audit Logs)</div>
                {startDate && endDate && (
                    <div style={{ textAlign: 'center', color: '#6b7280', marginBottom: '15px', fontSize: '12px' }}>
                        الفترة: {new Date(startDate).toLocaleDateString('ar-EG')} - {new Date(endDate).toLocaleDateString('ar-EG')}
                    </div>
                )}

                {/* Table */}
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th style={{ width: '120px' }}>التاريخ والوقت</th>
                            <th style={{ width: '80px' }}>العملية</th>
                            <th style={{ width: '100px' }}>النوع</th>
                            <th style={{ width: '100px' }}>المستخدم</th>
                            <th>التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log, index) => (
                            <tr key={log.id}>
                                <td>{index + 1}</td>
                                <td style={{ fontSize: '9px' }}>{formatDateTime(log.timestamp)}</td>
                                <td>
                                    <span style={{
                                        fontSize: '9px',
                                        padding: '2px 4px',
                                        borderRadius: '3px',
                                        backgroundColor: `${getActionColor(log.action)}20`,
                                        color: getActionColor(log.action),
                                        fontWeight: 600
                                    }}>
                                        {actionLabels[log.action] || log.action}
                                    </span>
                                </td>
                                <td>{log.entity_type}</td>
                                <td>{log.user_name || '-'}</td>
                                <td style={{ fontSize: '9px', maxWidth: '300px', wordWrap: 'break-word' }}>
                                    {log.details || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer */}
                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '10px', color: '#9ca3af' }}>
                    تم إنشاء هذا السجل بواسطة نظام إدارة المخزون | {new Date().toLocaleDateString('ar-EG')} | إجمالي السجلات: {logs.length}
                </div>
            </div>
        );
    }
);

PrintableAuditLogs.displayName = 'PrintableAuditLogs';

/**
 * PrintableTable - Professional Print-Ready Table Component
 * 
 * Features:
 * - RTL Arabic support
 * - Zebra striping for readability
 * - Proper headers that repeat on page breaks
 * - Borders and professional styling
 * - Responsive column widths
 */

import React from 'react';
import { THEME } from '../../constants/theme';

export interface Column<T> {
    key: keyof T | string;
    header: string;
    width?: string;
    align?: 'right' | 'left' | 'center';
    render?: (item: T, index: number) => React.ReactNode;
}

export interface PrintableTableProps<T> {
    data: T[];
    columns: Column<T>[];
    showRowNumbers?: boolean;
    emptyMessage?: string;
}

export function PrintableTable<T extends object>({
    data,
    columns,
    showRowNumbers = true,
    emptyMessage = 'لا توجد بيانات'
}: PrintableTableProps<T>) {
    if (!data || data.length === 0) {
        return (
            <div
                className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg"
                style={{ borderColor: '#e2e8f0' }}
            >
                <p className="text-lg">{emptyMessage}</p>
            </div>
        );
    }

    const getCellValue = (item: T, column: Column<T>, index: number): React.ReactNode => {
        if (column.render) {
            return column.render(item, index);
        }
        const value = (item as Record<string, unknown>)[column.key as string];
        if (value === null || value === undefined) return '-';
        if (typeof value === 'number') return value.toLocaleString('ar-EG');
        return String(value);
    };

    return (
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '10pt'
                }}
            >
                {/* Table Header */}
                <thead>
                    <tr
                        style={{
                            backgroundColor: THEME.navy,
                            color: 'white',
                            fontWeight: 'bold'
                        }}
                    >
                        {showRowNumbers && (
                            <th
                                style={{
                                    padding: '12px 8px',
                                    textAlign: 'center',
                                    width: '50px',
                                    borderLeft: '1px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                #
                            </th>
                        )}
                        {columns.map((column, idx) => (
                            <th
                                key={String(column.key)}
                                style={{
                                    padding: '12px 10px',
                                    textAlign: column.align || 'right',
                                    width: column.width || 'auto',
                                    borderLeft: idx < columns.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                                }}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                    {data.map((item, rowIndex) => (
                        <tr
                            key={rowIndex}
                            style={{
                                backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                                borderBottom: '1px solid #e2e8f0'
                            }}
                        >
                            {showRowNumbers && (
                                <td
                                    style={{
                                        padding: '10px 8px',
                                        textAlign: 'center',
                                        color: THEME.navy,
                                        fontWeight: '600',
                                        borderLeft: '1px solid #e2e8f0'
                                    }}
                                >
                                    {rowIndex + 1}
                                </td>
                            )}
                            {columns.map((column, colIndex) => (
                                <td
                                    key={String(column.key)}
                                    style={{
                                        padding: '10px',
                                        textAlign: column.align || 'right',
                                        borderLeft: colIndex < columns.length - 1 ? '1px solid #e2e8f0' : 'none',
                                        color: '#374151'
                                    }}
                                >
                                    {getCellValue(item, column, rowIndex)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>

                {/* Table Footer with summary - no background to avoid print issues */}
                <tfoot>
                    <tr
                        style={{
                            borderTop: '2px solid #e2e8f0'
                        }}
                    >
                        <td
                            colSpan={columns.length + (showRowNumbers ? 1 : 0)}
                            style={{
                                padding: '8px',
                                textAlign: 'center',
                                color: '#64748b',
                                fontSize: '9pt',
                                backgroundColor: 'white'
                            }}
                        >
                            إجمالي السجلات: <strong style={{ color: THEME.navy }}>{data.length.toLocaleString('ar-EG')}</strong>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

export default PrintableTable;

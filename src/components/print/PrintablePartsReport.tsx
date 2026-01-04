import React from 'react';
import { PrintableReport } from './PrintableReport';
import { DBPart } from '../../types/electron';

interface PrintablePartsReportProps {
    parts: DBPart[];
    companyName?: string;
    generatedBy?: string;
    filters?: string;
}

export const PrintablePartsReport = React.forwardRef<HTMLDivElement, PrintablePartsReportProps>(
    ({ parts, companyName, generatedBy, filters }, ref) => {

        // Calculate totals
        const totalItems = parts.length;
        const totalStock = parts.reduce((sum, p) => sum + (p.current_stock || 0), 0);
        const totalValue = parts.reduce((sum, p) => sum + ((p.current_stock || 0) * p.cost_price), 0);

        return (
            <PrintableReport
                ref={ref}
                title="تقرير مخزون قطع الغيار"
                subtitle={filters ? `تصفية: ${filters}` : 'جميع القطع'}
                companyName={companyName}
                generatedBy={generatedBy}
            >
                {/* Summary Cards (Print Friendly) */}
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                    <div className="border border-slate-300 p-2 rounded">
                        <div className="text-xs text-slate-500">عدد الأصناف</div>
                        <div className="font-bold text-lg">{totalItems}</div>
                    </div>
                    <div className="border border-slate-300 p-2 rounded">
                        <div className="text-xs text-slate-500">إجمالي القطع</div>
                        <div className="font-bold text-lg">{totalStock}</div>
                    </div>
                    <div className="border border-slate-300 p-2 rounded">
                        <div className="text-xs text-slate-500">قيمة المخزون (تكلفة)</div>
                        <div className="font-bold text-lg">{totalValue.toLocaleString()} د.أ</div>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full text-sm text-right border-collapse">
                    <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-300">
                            <th className="p-2 border border-slate-200">SKU</th>
                            <th className="p-2 border border-slate-200">القطعة</th>
                            <th className="p-2 border border-slate-200">المورد</th>
                            <th className="p-2 border border-slate-200 w-20 text-center">الكمية</th>
                            <th className="p-2 border border-slate-200 w-24">البيع</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parts.map((part, index) => (
                            <tr key={part.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="p-2 border border-slate-200 font-mono text-xs">{part.sku}</td>
                                <td className="p-2 border border-slate-200 font-bold">{part.name}</td>
                                <td className="p-2 border border-slate-200 text-xs">{part.supplier_name || '-'}</td>
                                <td className="p-2 border border-slate-200 text-center font-bold">
                                    {part.current_stock || 0}
                                </td>
                                <td className="p-2 border border-slate-200 text-green-700">
                                    {part.selling_price.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </PrintableReport>
        );
    }
);

PrintablePartsReport.displayName = 'PrintablePartsReport';

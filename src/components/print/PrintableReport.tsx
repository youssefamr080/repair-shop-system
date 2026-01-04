/**
 * PrintableReport - Base component for printable reports
 * 
 * Wraps report content with:
 * - Company header
 * - Report title and date
 * - RTL support for Arabic
 * - Print-optimized styling
 */

import React from 'react';

export interface PrintableReportProps {
    title: string;
    subtitle?: string;
    companyName?: string;
    generatedBy?: string;
    children: React.ReactNode;
}

export const PrintableReport = React.forwardRef<HTMLDivElement, PrintableReportProps>(
    ({ title, subtitle, companyName = 'نظام إدارة المخزون', generatedBy, children }, ref) => {
        const currentDate = new Date().toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        return (
            <div ref={ref} className="print-report" dir="rtl">
                {/* Print-only styles */}
                <style type="text/css" media="print">{`
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                `}</style>

                {/* Header */}
                <div className="print-header text-center mb-8 border-b-2 border-primary pb-4">
                    <h1 className="text-2xl font-bold text-primary mb-2">
                        {companyName}
                    </h1>
                    <h2 className="text-xl font-semibold text-amber-600 mb-2">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-gray-600 text-sm">{subtitle}</p>
                    )}
                    <p className="text-gray-500 text-sm mt-2">
                        تاريخ التقرير: {currentDate}
                    </p>
                </div>

                {/* Content */}
                <div className="print-content">
                    {children}
                </div>

                {/* Footer */}
                <div className="print-footer mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
                    {generatedBy && (
                        <p>أُنشئ بواسطة: {generatedBy}</p>
                    )}
                    <p className="mt-1">
                        {companyName} - جميع الحقوق محفوظة © {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        );
    }
);

PrintableReport.displayName = 'PrintableReport';

export default PrintableReport;

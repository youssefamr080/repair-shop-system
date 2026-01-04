/**
 * PrintPreviewModal - Professional Print Preview Modal with Company Branding
 * 
 * Features:
 * - Logo on RIGHT side, Title on LEFT side (for RTL)
 * - No shadows in print
 * - Gregorian dates only
 * - Compact footer
 */

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, X } from 'lucide-react';
import { Button } from '../ui';
import { THEME } from '../../constants/theme';
import { useCompanySettings } from '../../hooks';

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

// Print styles - NO shadows, NO dark elements
const printStyles = `
    @media print {
        @page {
            size: A4;
            margin: 10mm;
        }
        
        body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        
        .print-container {
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
        }
        
        .no-print {
            display: none !important;
        }
        
        /* Remove all shadows in print */
        * {
            box-shadow: none !important;
        }
        
        table {
            page-break-inside: auto;
        }
        
        tr {
            page-break-inside: avoid;
        }
        
        thead {
            display: table-header-group;
        }
        
        .print-footer {
            page-break-before: avoid;
        }
    }
`;

// Format date as Gregorian (no Hijri)
function formatGregorianDate(): string {
    const now = new Date();
    return now.toLocaleDateString('ar-EG-u-ca-gregory', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function PrintPreviewModal({ isOpen, onClose, title, children }: PrintPreviewModalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    // Get company settings for branding
    const { data: companySettings } = useCompanySettings();
    const companyName = companySettings?.name || 'اسم الشركة';
    const companyLogo = companySettings?.logo || '';

    // Generate automatic filename with date/time
    const generateFilename = () => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // 2026-01-01
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '-'); // 23-55
        return `${companyName}_${title}_${dateStr}_${timeStr}`;
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: generateFilename(),
        onAfterPrint: onClose,
        pageStyle: printStyles,
    });

    if (!isOpen) return null;

    const currentDate = formatGregorianDate();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b"
                    style={{
                        background: `linear-gradient(135deg, ${THEME.navy} 0%, #1a365d 100%)`,
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                        >
                            <Printer className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => handlePrint()}
                            className="gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
                            style={{
                                backgroundColor: THEME.gold,
                                color: THEME.navy
                            }}
                        >
                            <Printer className="h-4 w-4" />
                            طباعة / حفظ PDF
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="text-white hover:bg-white/10"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Preview Area */}
                <div
                    className="flex-1 overflow-auto p-6"
                    style={{ backgroundColor: '#f0f4f8' }}
                >
                    {/* Paper Preview - NO shadow class to avoid print issues */}
                    <div
                        ref={printRef}
                        dir="rtl"
                        className="bg-white mx-auto print-container"
                        style={{
                            width: '210mm',
                            padding: '15mm',
                            fontFamily: "'Cairo', 'Segoe UI', 'Tahoma', sans-serif",
                            fontSize: '10pt',
                            lineHeight: '1.5',
                            color: '#1a202c',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)' // Only for screen preview
                        }}
                    >
                        {/* Header - Logo on RIGHT, Title on LEFT (RTL) */}
                        <div
                            className="print-header border-b-2 pb-4 mb-6"
                            style={{ borderColor: THEME.gold }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                {/* RIGHT SIDE (in RTL) = Company Logo */}
                                <div>
                                    {companyLogo ? (
                                        <img
                                            src={companyLogo}
                                            alt={companyName}
                                            style={{ height: '50px', width: 'auto', objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                padding: '8px 16px',
                                                background: `linear-gradient(135deg, ${THEME.navy} 0%, #2d3748 100%)`,
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '14pt'
                                            }}
                                        >
                                            {companyName}
                                        </div>
                                    )}
                                </div>

                                {/* LEFT SIDE (in RTL) = Report Title */}
                                <div style={{ textAlign: 'left' }}>
                                    <h1
                                        style={{
                                            fontSize: '18pt',
                                            fontWeight: 'bold',
                                            color: THEME.navy,
                                            marginBottom: '4px'
                                        }}
                                    >
                                        {title}
                                    </h1>
                                    <p style={{ color: '#6b7280', fontSize: '9pt' }}>
                                        {currentDate}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="report-content">
                            {children}
                        </div>

                        {/* Footer - Minimal */}
                        <div
                            className="print-footer"
                            style={{
                                marginTop: '24px',
                                paddingTop: '12px',
                                borderTop: '1px solid #e2e8f0',
                                textAlign: 'center',
                                fontSize: '8pt',
                                color: '#9ca3af'
                            }}
                        >
                            {companyName} - نظام إدارة المخزون © {new Date().getFullYear()}
                        </div>
                    </div>
                </div>

                {/* Bottom info bar - no-print */}
                <div className="px-6 py-2 border-t bg-gray-50 text-center text-xs text-gray-500 no-print">
                    💡 اضغط "طباعة / حفظ PDF" ثم اختر "حفظ كـ PDF" لحفظ التقرير
                </div>
            </div>
        </div>
    );
}

export default PrintPreviewModal;

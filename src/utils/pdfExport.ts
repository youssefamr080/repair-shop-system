/**
 * PDF Export Utilities - Mayo Fix
 * 
 * Professional PDF generation for:
 * - Inventory Reports
 * - Transaction History
 * - Low Stock Alerts
 * - Invoices
 * - Audit Logs
 * 
 * Features:
 * - RTL Arabic support with Cairo font + arabic-reshaper
 * - Company branding
 * - Auto-pagination
 * - Professional styling with Navy & Gold theme
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-expect-error - arabic-reshaper doesn't have types
import { ArabicReshaper } from 'arabic-reshaper';
import { DBPart, DBInventoryTransaction } from '../types/electron';
import { formatCurrency, formatDate } from './helpers';
import { registerArabicFont, getArabicFontName } from './arabicFontLoader';

// Import type extensions
import '../types/jspdf.d';

// ============================================================
// Arabic Text Reshaping Helper
// ============================================================

/**
 * Reshape Arabic text for proper PDF rendering
 * This fixes the broken/disconnected Arabic letters issue
 */
function reshapeArabic(text: string): string {
    if (!text) return text;
    try {
        const reshaper = new ArabicReshaper();
        return reshaper.reshape(text);
    } catch {
        // If reshaping fails, return original text
        return text;
    }
}

/**
 * Reshape an array of strings (for table data)
 * @param data Array of arrays of strings
 */
function reshapeTableData(data: string[][]): string[][] {
    return data.map(row => row.map(cell => reshapeArabic(cell)));
}

/**
 * Reshape table headers
 * @param headers Array of strings
 */
function reshapeHeaders(headers: string[]): string[] {
    return headers.map(h => reshapeArabic(h));
}

// ============================================================
// Theme Constants
// ============================================================

const PDF_THEME = {
    navy: [26, 35, 126] as [number, number, number],
    gold: [197, 161, 83] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    black: [0, 0, 0] as [number, number, number],
    gray: [100, 100, 100] as [number, number, number],
    lightGray: [245, 245, 250] as [number, number, number],
};

// ============================================================
// Types
// ============================================================

export interface PDFReportConfig {
    title: string;
    subtitle?: string;
    companyName?: string;
    companyLogo?: string;
    generatedBy?: string;
    showCompanyHeader?: boolean;
}

export interface InventoryReportData {
    parts: DBPart[];
    stats: {
        total_parts?: number;
        low_stock_count?: number;
        out_of_stock_count?: number;
    };
}



export interface InvoicePDFData {
    invoiceNumber: string;
    date: string;
    warehouse: string;
    customer?: string;
    notes?: string;
    items: Array<{
        name: string;
        sku: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    createdBy?: string;
}

export interface AuditLogPDFData {
    logs: Array<{
        action: string;
        entity_type: string;
        details: string;
        user_name: string;
        created_at: string;
    }>;
    dateRange?: { from: string; to: string };
}

// ============================================================
// Helper Functions
// ============================================================

async function createPDF(landscape = false): Promise<jsPDF> {
    const doc = new jsPDF({
        orientation: landscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    // Register Arabic font for proper RTL text rendering
    await registerArabicFont(doc);

    // Try to set RTL (may not be available in all versions)
    try {
        if (typeof doc.setR2L === 'function') {
            doc.setR2L(true);
        }
    } catch {
        // Ignore if not available
    }

    return doc;
}

function getPageCount(doc: jsPDF): number {
    try {
        if (typeof doc.getNumberOfPages === 'function') {
            return doc.getNumberOfPages();
        }
        // Fallback to internal pages array
        return (doc.internal?.pages?.length || 2) - 1;
    } catch {
        return 1;
    }
}

function addHeader(doc: jsPDF, config: PDFReportConfig) {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Company name (reshaped for Arabic)
    doc.setFontSize(18);
    doc.setTextColor(...PDF_THEME.navy);
    doc.text(reshapeArabic(config.companyName || 'نظام إدارة المخزون'), pageWidth / 2, 20, { align: 'center' });

    // Report title (reshaped for Arabic)
    doc.setFontSize(14);
    doc.setTextColor(...PDF_THEME.gold);
    doc.text(reshapeArabic(config.title), pageWidth / 2, 30, { align: 'center' });

    // Subtitle / date
    if (config.subtitle) {
        doc.setFontSize(10);
        doc.setTextColor(...PDF_THEME.gray);
        doc.text(config.subtitle, pageWidth / 2, 38, { align: 'center' });
    }

    // Line separator
    doc.setDrawColor(...PDF_THEME.navy);
    doc.setLineWidth(0.5);
    doc.line(20, 45, pageWidth - 20, 45);
}

function addFooter(doc: jsPDF, pageNumber: number, totalPages: number, generatedBy?: string) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.gray);

    // Page number
    doc.text(`صفحة ${pageNumber} من ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Generated info
    const now = new Date().toLocaleString('ar-EG');
    const genText = `تم إنشاء التقرير: ${now}${generatedBy ? ` | بواسطة: ${generatedBy}` : ''}`;
    doc.text(genText, 20, pageHeight - 10);
}

function addFootersToAllPages(doc: jsPDF, generatedBy?: string) {
    const totalPages = getPageCount(doc);
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i, totalPages, generatedBy);
    }
}

// ============================================================
// Inventory Report
// ============================================================

export async function generateInventoryReport(data: InventoryReportData, config: PDFReportConfig): Promise<void> {
    const doc = await createPDF();

    addHeader(doc, {
        ...config,
        subtitle: `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`,
    });

    // Stats summary box
    doc.setFontSize(11);
    doc.setTextColor(...PDF_THEME.black);
    doc.setFillColor(...PDF_THEME.lightGray);
    doc.roundedRect(20, 50, doc.internal.pageSize.getWidth() - 40, 15, 3, 3, 'F');

    doc.text(`إجمالي القطع: ${data.stats.total_parts}`, 30, 60);
    doc.text(`منخفض المخزون: ${data.stats.low_stock_count}`, 90, 60);
    doc.text(`نفاد المخزون: ${data.stats.out_of_stock_count}`, 150, 60);

    // Products table
    const tableData = data.parts.map((p, index) => [
        (index + 1).toString(),
        p.name,
        p.sku || '-',
        (p.current_stock ?? 0).toString(),
        (p.min_stock_level ?? '-').toString(),
        formatCurrency(p.selling_price),
    ]);

    const fontName = getArabicFontName();
    autoTable(doc, {
        startY: 70,
        head: [reshapeHeaders(['#', 'اسم القطعة', 'الكود', 'المخزون', 'الحد الأدنى', 'السعر'])],
        body: reshapeTableData(tableData),
        styles: {
            font: fontName,
            fontSize: 9,
            cellPadding: 3,
            halign: 'right',
        },
        headStyles: {
            fillColor: PDF_THEME.navy,
            textColor: PDF_THEME.white,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: PDF_THEME.lightGray,
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 50 },
            2: { cellWidth: 30 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 25 },
            5: { halign: 'center', cellWidth: 30 },
        },
    });

    addFootersToAllPages(doc, config.generatedBy);
    doc.save(`inventory_report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================
// Transaction Report
// ============================================================

export interface TransactionReportData {
    transactions: DBInventoryTransaction[];
    parts: DBPart[];
    dateRange?: { from: string; to: string };
}

export async function generateTransactionReport(data: TransactionReportData, config: PDFReportConfig): Promise<void> {
    const doc = await createPDF(true); // Landscape for more columns

    let subtitle = `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`;
    if (data.dateRange) {
        subtitle = `الفترة من ${data.dateRange.from} إلى ${data.dateRange.to}`;
    }

    addHeader(doc, { ...config, subtitle });

    // Build product lookup
    const partMap = new Map(data.parts.map(p => [p.id, p]));

    // Type labels
    const typeLabels: Record<string, string> = {
        stock_in: 'إدخال',
        stock_out: 'إخراج',
        adjustment: 'تعديل',
        transfer_in: 'تحويل وارد',
        transfer_out: 'تحويل صادر',
    };

    // Table data
    const tableData = data.transactions.map((tx, index) => {
        const part = partMap.get(tx.product_id);
        return [
            (index + 1).toString(),
            formatDate(tx.created_at),
            typeLabels[tx.transaction_type] || tx.transaction_type,
            part?.name || `#${tx.product_id}`,
            tx.quantity.toString(),
            tx.unit_cost ? formatCurrency(tx.unit_cost) : '-',
            tx.reference_number || '-',
        ];
    });

    const fontName = getArabicFontName();
    autoTable(doc, {
        startY: 55,
        head: [reshapeHeaders(['#', 'التاريخ', 'النوع', 'المنتج', 'الكمية', 'التكلفة', 'رقم المرجع'])],
        body: reshapeTableData(tableData),
        styles: {
            font: fontName,
            fontSize: 9,
            cellPadding: 3,
            halign: 'right',
        },
        headStyles: {
            fillColor: PDF_THEME.navy,
            textColor: PDF_THEME.white,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: PDF_THEME.lightGray,
        },
    });

    addFootersToAllPages(doc, config.generatedBy);
    doc.save(`transactions_report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================
// Low Stock Report
// ============================================================

export async function generateLowStockReport(parts: DBPart[], config: PDFReportConfig): Promise<void> {
    const lowStockParts = parts.filter(p => {
        const stock = p.current_stock ?? 0;
        const minStock = p.min_stock_level ?? 0;
        return minStock > 0 && stock <= minStock;
    });

    const doc = await createPDF();

    addHeader(doc, {
        ...config,
        title: config.title || 'تقرير المخزون المنخفض',
        subtitle: `${lowStockParts.length} قطعة تحتاج إعادة طلب`,
    });

    // Priority indicator
    const tableData = lowStockParts.map((p, index) => {
        const stock = p.current_stock ?? 0;
        const minStock = p.min_stock_level ?? 0;
        const shortage = minStock - stock;
        let priority = 'منخفض';
        if (stock === 0) priority = 'عاجل';
        else if (shortage > minStock / 2) priority = 'متوسط';

        return [
            (index + 1).toString(),
            p.name,
            stock.toString(),
            minStock.toString(),
            shortage.toString(),
            priority,
        ];
    });

    const fontName = getArabicFontName();
    autoTable(doc, {
        startY: 55,
        head: [['#', 'القطعة', 'المخزون الحالي', 'الحد الأدنى', 'الكمية المطلوبة', 'الأولوية']],
        body: tableData,
        styles: {
            font: fontName,
            fontSize: 9,
            cellPadding: 3,
            halign: 'right',
        },
        headStyles: {
            fillColor: PDF_THEME.gold,
            textColor: PDF_THEME.black,
            fontStyle: 'bold',
        },
        columnStyles: {
            5: { halign: 'center' },
        },
        didParseCell: (data) => {
            // Color code priority column
            if (data.column.index === 5 && data.section === 'body') {
                const priority = data.cell.raw as string;
                if (priority === 'عاجل') {
                    data.cell.styles.textColor = [220, 38, 38]; // Red
                    data.cell.styles.fontStyle = 'bold';
                } else if (priority === 'متوسط') {
                    data.cell.styles.textColor = [234, 88, 12]; // Orange
                }
            }
        },
    });

    addFootersToAllPages(doc, config.generatedBy);
    doc.save(`low_stock_report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================
// Invoice PDF
// ============================================================

export async function generateInvoicePDF(invoice: InvoicePDFData, company: PDFReportConfig): Promise<void> {
    const doc = await createPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header with company info
    doc.setFontSize(20);
    doc.setTextColor(...PDF_THEME.navy);
    doc.text(company.companyName || 'اسم الشركة', pageWidth / 2, 20, { align: 'center' });

    // Invoice title
    doc.setFontSize(16);
    doc.setTextColor(...PDF_THEME.gold);
    doc.text('إذن صرف', pageWidth / 2, 32, { align: 'center' });

    // Invoice details box
    doc.setFillColor(...PDF_THEME.lightGray);
    doc.roundedRect(20, 40, pageWidth - 40, 30, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...PDF_THEME.black);
    doc.text(`رقم الإذن: ${invoice.invoiceNumber}`, pageWidth - 30, 50, { align: 'right' });
    doc.text(`التاريخ: ${invoice.date}`, pageWidth - 30, 58, { align: 'right' });
    doc.text(`المستودع: ${invoice.warehouse}`, 30, 50);
    if (invoice.customer) {
        doc.text(`العميل: ${invoice.customer}`, 30, 58);
    }

    // Items table
    const tableData = invoice.items.map((item, index) => [
        (index + 1).toString(),
        item.name,
        item.sku,
        item.quantity.toString(),
        formatCurrency(item.unitPrice),
        formatCurrency(item.total),
    ]);

    // Calculate totals
    const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);

    const fontName = getArabicFontName();
    autoTable(doc, {
        startY: 80,
        head: [['#', 'الصنف', 'الكود', 'الكمية', 'سعر الوحدة', 'الإجمالي']],
        body: tableData,
        foot: [['', '', '', '', 'الإجمالي', formatCurrency(subtotal)]],
        styles: {
            font: fontName,
            fontSize: 10,
            cellPadding: 4,
            halign: 'right',
        },
        headStyles: {
            fillColor: PDF_THEME.navy,
            textColor: PDF_THEME.white,
            fontStyle: 'bold',
        },
        footStyles: {
            fillColor: PDF_THEME.gold,
            textColor: PDF_THEME.black,
            fontStyle: 'bold',
        },
    });

    // Notes section
    if (invoice.notes) {
        const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 150;
        doc.setFontSize(10);
        doc.text('ملاحظات:', pageWidth - 30, finalY + 15, { align: 'right' });
        doc.setFontSize(9);
        doc.text(invoice.notes, pageWidth - 30, finalY + 22, { align: 'right', maxWidth: pageWidth - 60 });
    }

    // Signature area
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...PDF_THEME.gray);
    doc.line(30, pageHeight - 40, 80, pageHeight - 40);
    doc.line(pageWidth - 80, pageHeight - 40, pageWidth - 30, pageHeight - 40);

    doc.setFontSize(9);
    doc.text('توقيع المستلم', 55, pageHeight - 35, { align: 'center' });
    doc.text('توقيع المسؤول', pageWidth - 55, pageHeight - 35, { align: 'center' });

    if (invoice.createdBy) {
        doc.text(`أعده: ${invoice.createdBy}`, 30, pageHeight - 25);
    }

    addFootersToAllPages(doc, invoice.createdBy);
    doc.save(`invoice_${invoice.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================
// Audit Log Report
// ============================================================

export async function generateAuditLogReport(data: AuditLogPDFData, config: PDFReportConfig): Promise<void> {
    const doc = await createPDF(true); // Landscape

    let subtitle = `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`;
    if (data.dateRange) {
        subtitle = `الفترة من ${data.dateRange.from} إلى ${data.dateRange.to}`;
    }

    addHeader(doc, {
        ...config,
        title: config.title || 'سجل التدقيق',
        subtitle,
    });

    // Action labels
    const actionLabels: Record<string, string> = {
        CREATE: 'إنشاء',
        UPDATE: 'تعديل',
        DELETE: 'حذف',
        LOGIN: 'دخول',
        LOGOUT: 'خروج',
    };

    const tableData = data.logs.map((log, index) => [
        (index + 1).toString(),
        formatDate(log.created_at),
        actionLabels[log.action] || log.action,
        log.entity_type,
        log.details || '-',
        log.user_name || '-',
    ]);

    const fontName = getArabicFontName();
    autoTable(doc, {
        startY: 55,
        head: [reshapeHeaders(['#', 'التاريخ', 'الإجراء', 'النوع', 'التفاصيل', 'المستخدم'])],
        body: reshapeTableData(tableData),
        styles: {
            font: fontName,
            fontSize: 8,
            cellPadding: 3,
            halign: 'right',
        },
        headStyles: {
            fillColor: PDF_THEME.navy,
            textColor: PDF_THEME.white,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: PDF_THEME.lightGray,
        },
        columnStyles: {
            4: { cellWidth: 80 }, // Details column wider
        },
    });

    addFootersToAllPages(doc, config.generatedBy);
    doc.save(`audit_log_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================
// Quick Export Helpers
// ============================================================

/**
 * Quick export products to PDF
 */
export async function exportProductsToPDF(companyName?: string): Promise<void> {
    try {
        const parts = await window.database.parts.getAll();

        // Calculate stats manually to allow removing legacy inventory.getStats
        const total = parts.length;
        const lowStock = parts.filter(p => (p.current_stock || 0) <= p.min_stock_level && (p.current_stock || 0) > 0).length;
        const outStock = parts.filter(p => (p.current_stock || 0) === 0).length;

        // Map database stats to expected format
        const stats = {
            total_parts: total,
            low_stock_count: lowStock,
            out_of_stock_count: outStock,
        };

        generateInventoryReport(
            { parts, stats },
            { title: 'تقرير مخزون قطع الغيار', companyName }
        );
    } catch (error) {
        console.error('Failed to export products to PDF:', error);
        throw error;
    }
}

/**
 * Quick export transactions to PDF
 */
export async function exportTransactionsToPDF(
    dateFrom?: string,
    dateTo?: string,
    companyName?: string
): Promise<void> {
    try {
        const { data: transactions } = await window.database.inventory.getTransactions({});
        const parts = await window.database.parts.getAll();

        generateTransactionReport(
            {
                transactions,
                parts,
                dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
            },
            { title: 'تقرير الحركات', companyName }
        );
    } catch (error) {
        console.error('Failed to export transactions to PDF:', error);
        throw error;
    }
}

/**
 * Quick export low stock report
 */
export async function exportLowStockToPDF(companyName?: string): Promise<void> {
    try {
        const parts = await window.database.parts.getAll();
        generateLowStockReport(parts, { title: 'تقرير المخزون المنخفض', companyName });
    } catch (error) {
        console.error('Failed to export low stock to PDF:', error);
        throw error;
    }
}

// ============================================================
// Generic Table Report
// ============================================================

export interface TableColumn {
    header: string;
    key: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
}

export interface GenericTableReportData {
    columns: TableColumn[];
    rows: Record<string, unknown>[];
}

/**
 * Generate a generic table PDF report
 */
export async function generateTableReport(data: GenericTableReportData, config: PDFReportConfig): Promise<void> {
    const doc = await createPDF();

    addHeader(doc, {
        ...config,
        subtitle: config.subtitle || `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`,
    });

    const headers = data.columns.map(col => col.header);
    const tableData = data.rows.map(row =>
        data.columns.map(col => String(row[col.key] ?? '-'))
    );

    const fontName = getArabicFontName();
    autoTable(doc, {
        startY: 55,
        head: [headers],
        body: tableData,
        styles: {
            font: fontName,
            fontSize: 9,
            cellPadding: 3,
            halign: 'right',
        },
        headStyles: {
            fillColor: PDF_THEME.navy,
            textColor: PDF_THEME.white,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: PDF_THEME.lightGray,
        },
    });

    addFootersToAllPages(doc, config.generatedBy);

    const filename = config.title.replace(/\s+/g, '_');
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================
// Master Data Exports
// ============================================================

/**
 * Export categories to PDF
 */
export function generateCategoriesReport(
    categories: Array<{ name: string; description?: string | null; is_active: number; products_count?: number }>,
    config: PDFReportConfig
): void {
    generateTableReport(
        {
            columns: [
                { header: '#', key: 'index' },
                { header: 'اسم التصنيف', key: 'name' },
                { header: 'الوصف', key: 'description' },
                { header: 'عدد المنتجات', key: 'products_count' },
                { header: 'الحالة', key: 'status' },
            ],
            rows: categories.map((c, i) => ({
                index: i + 1,
                name: c.name,
                description: c.description || '-',
                products_count: c.products_count || 0,
                status: c.is_active ? 'فعال' : 'غير فعال',
            })),
        },
        { ...config, title: config.title || 'تقرير التصنيفات' }
    );
}

/**
 * Export warehouses to PDF
 */
export function generateWarehousesReport(
    warehouses: Array<{ name: string; location?: string | null; description?: string | null; is_active: number; is_default?: number }>,
    config: PDFReportConfig
): void {
    generateTableReport(
        {
            columns: [
                { header: '#', key: 'index' },
                { header: 'اسم المستودع', key: 'name' },
                { header: 'الموقع', key: 'location' },
                { header: 'الوصف', key: 'description' },
                { header: 'الحالة', key: 'status' },
            ],
            rows: warehouses.map((w, i) => ({
                index: i + 1,
                name: w.name + (w.is_default ? ' ★' : ''),
                location: w.location || '-',
                description: w.description || '-',
                status: w.is_active ? 'فعال' : 'غير فعال',
            })),
        },
        { ...config, title: config.title || 'تقرير المستودعات' }
    );
}

/**
 * Export suppliers to PDF
 */
export async function generateSuppliersReport(
    suppliers: Array<{ name: string; contact_person?: string | null; phone?: string | null; email?: string | null; is_active: number }>,
    config: PDFReportConfig
): Promise<void> {
    const doc = await createPDF(true); // Landscape for more columns

    addHeader(doc, {
        ...config,
        title: config.title || 'تقرير الموردين',
        subtitle: `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`,
    });

    const tableData = suppliers.map((s, i) => [
        (i + 1).toString(),
        s.name,
        s.contact_person || '-',
        s.phone || '-',
        s.email || '-',
        s.is_active ? 'فعال' : 'غير فعال',
    ]);

    const fontName = getArabicFontName();
    autoTable(doc, {
        startY: 55,
        head: [['#', 'اسم المورد', 'جهة الاتصال', 'الهاتف', 'البريد الإلكتروني', 'الحالة']],
        body: tableData,
        styles: {
            font: fontName,
            fontSize: 9,
            cellPadding: 3,
            halign: 'right',
        },
        headStyles: {
            fillColor: PDF_THEME.navy,
            textColor: PDF_THEME.white,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: PDF_THEME.lightGray,
        },
    });

    addFootersToAllPages(doc, config.generatedBy);
    doc.save(`suppliers_report_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export dashboard summary to PDF
 */
export async function generateDashboardReport(config: PDFReportConfig): Promise<void> {
    const doc = await createPDF();

    // Add header
    addHeader(doc, {
        ...config,
        title: 'ملخص لوحة التحكم',
        subtitle: `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`,
    });

    try {
        // const stats = await window.database.inventory.getStats(); // Removed
        const parts = await window.database.parts.getAll();

        const lowStock = parts.filter(p => {
            const stock = p.current_stock ?? 0;
            const minStock = p.min_stock_level ?? 0;
            return minStock > 0 && stock <= minStock;
        });

        const outOfStock = parts.filter(p => (p.current_stock ?? 0) === 0);

        // Stats cards
        doc.setFontSize(12);
        doc.setTextColor(...PDF_THEME.navy);

        const statsData = [
            ['إجمالي الأصناف', parts.length.toString()],
            ['منخفضة المخزون', lowStock.length.toString()],
            ['نافدة المخزون', outOfStock.length.toString()],
            ['إجمالي القطع', parts.reduce((sum, p) => sum + (p.current_stock ?? 0), 0).toString()],
        ];

        autoTable(doc, {
            startY: 55,
            head: [['البيان', 'القيمة']],
            body: statsData,
            styles: {
                font: 'helvetica',
                fontSize: 11,
                cellPadding: 5,
                halign: 'right',
            },
            headStyles: {
                fillColor: PDF_THEME.gold,
                textColor: PDF_THEME.black,
                fontStyle: 'bold',
            },
            columnStyles: {
                1: { halign: 'center', fontStyle: 'bold' },
            },
        });

        // Low stock products
        if (lowStock.length > 0) {
            const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;

            doc.setFontSize(12);
            doc.setTextColor(...PDF_THEME.navy);
            doc.text('قطع غيار تحتاج إعادة طلب:', doc.internal.pageSize.getWidth() - 20, finalY + 15, { align: 'right' });

            autoTable(doc, {
                startY: finalY + 20,
                head: [['#', 'القطعة', 'المخزون الحالي', 'الحد الأدنى']],
                body: lowStock.slice(0, 10).map((p, i) => [
                    (i + 1).toString(),
                    p.name,
                    (p.current_stock ?? 0).toString(),
                    (p.min_stock_level ?? 0).toString(),
                ]),
                styles: {
                    font: 'helvetica',
                    fontSize: 9,
                    cellPadding: 3,
                    halign: 'right',
                },
                headStyles: {
                    fillColor: [220, 38, 38], // Red for warning
                    textColor: PDF_THEME.white,
                    fontStyle: 'bold',
                },
            });
        }

        addFootersToAllPages(doc, config.generatedBy);
        doc.save(`dashboard_summary_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error('Failed to generate dashboard report:', error);
        throw error;
    }
}

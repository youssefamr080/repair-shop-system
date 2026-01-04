/**
 * Excel Import/Export Utilities
 * 
 * Uses xlsx (SheetJS) for reading and writing Excel files.
 * Supports importing products from Excel and exporting inventory reports.
 */

import * as XLSX from 'xlsx';

// ============================================
// TYPES
// ============================================

export interface ExcelProduct {
    sku: string;
    name: string;
    name_en?: string;
    barcode?: string;
    category?: string;
    unit?: string;
    supplier?: string;
    cost_price?: number;
    selling_price?: number;
    min_stock_level?: number;
    max_stock_level?: number;
    description?: string;
    notes?: string;
}

export interface ImportResult {
    success: boolean;
    totalRows: number;
    validRows: number;
    errors: Array<{ row: number; message: string }>;
    products: ExcelProduct[];
}

export interface ExportOptions {
    filename?: string;
    sheetName?: string;
    includeHeaders?: boolean;
    rtl?: boolean;
}

// ============================================
// COLUMN MAPPINGS (Arabic <-> English)
// ============================================

const COLUMN_MAPPINGS: Record<string, keyof ExcelProduct> = {
    // Arabic
    'كود المنتج': 'sku',
    'الاسم': 'name',
    'الاسم بالإنجليزية': 'name_en',
    'الباركود': 'barcode',
    'التصنيف': 'category',
    'الوحدة': 'unit',
    'المورد': 'supplier',
    'سعر الشراء': 'cost_price',
    'سعر البيع': 'selling_price',
    'الحد الأدنى': 'min_stock_level',
    'الحد الأقصى': 'max_stock_level',
    'الوصف': 'description',
    'ملاحظات': 'notes',
    // English
    'SKU': 'sku',
    'Name': 'name',
    'Name EN': 'name_en',
    'Barcode': 'barcode',
    'Category': 'category',
    'Unit': 'unit',
    'Supplier': 'supplier',
    'Cost Price': 'cost_price',
    'Selling Price': 'selling_price',
    'Min Stock': 'min_stock_level',
    'Max Stock': 'max_stock_level',
    'Description': 'description',
    'Notes': 'notes',
};

// Reverse mapping for export
const EXPORT_HEADERS: Record<keyof ExcelProduct, string> = {
    sku: 'كود المنتج',
    name: 'الاسم',
    name_en: 'الاسم بالإنجليزية',
    barcode: 'الباركود',
    category: 'التصنيف',
    unit: 'الوحدة',
    supplier: 'المورد',
    cost_price: 'سعر الشراء',
    selling_price: 'سعر البيع',
    min_stock_level: 'الحد الأدنى',
    max_stock_level: 'الحد الأقصى',
    description: 'الوصف',
    notes: 'ملاحظات',
};

// ============================================
// IMPORT FUNCTIONS
// ============================================

/**
 * Read Excel file and parse products
 */
export async function importProductsFromExcel(file: File): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
                    defval: '',
                });

                const products: ExcelProduct[] = [];
                const errors: Array<{ row: number; message: string }> = [];

                rawData.forEach((row, index) => {
                    const rowNumber = index + 2; // +2 for header row and 0-index
                    const product: Partial<ExcelProduct> = {};

                    // Map columns to product fields
                    Object.entries(row).forEach(([key, value]) => {
                        const normalizedKey = key.trim();
                        const mappedField = COLUMN_MAPPINGS[normalizedKey];

                        if (mappedField) {
                            // Handle numeric fields
                            if (['cost_price', 'selling_price', 'min_stock_level', 'max_stock_level'].includes(mappedField)) {
                                const numValue = parseFloat(String(value));
                                if (!isNaN(numValue)) {
                                    product[mappedField] = numValue as never;
                                }
                            } else {
                                product[mappedField] = String(value).trim() as never;
                            }
                        }
                    });

                    // Validate required fields
                    if (!product.sku || product.sku === '') {
                        errors.push({ row: rowNumber, message: 'كود المنتج مطلوب' });
                        return;
                    }
                    if (!product.name || product.name === '') {
                        errors.push({ row: rowNumber, message: 'اسم المنتج مطلوب' });
                        return;
                    }

                    products.push(product as ExcelProduct);
                });

                resolve({
                    success: products.length > 0,
                    totalRows: rawData.length,
                    validRows: products.length,
                    errors,
                    products,
                });
            } catch (error) {
                reject(new Error(`فشل في قراءة ملف Excel: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('فشل في قراءة الملف'));
        };

        reader.readAsArrayBuffer(file);
    });
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export products to Excel file
 */
export function exportProductsToExcel(
    products: Array<Record<string, unknown>>,
    options: ExportOptions = {}
): void {
    const {
        filename = 'products_export',
        sheetName = 'المنتجات',
        includeHeaders = true,
        rtl = true,
    } = options;

    // Prepare data with Arabic headers
    const data = products.map((product) => {
        const row: Record<string, unknown> = {};
        Object.entries(EXPORT_HEADERS).forEach(([key, arabicHeader]) => {
            row[arabicHeader] = product[key] ?? '';
        });
        return row;
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data, {
        header: includeHeaders ? Object.values(EXPORT_HEADERS) : undefined,
    });

    // Set RTL
    if (rtl) {
        worksheet['!dir'] = 'rtl';
    }

    // Set column widths
    worksheet['!cols'] = [
        { wch: 15 }, // SKU
        { wch: 30 }, // Name
        { wch: 25 }, // Name EN
        { wch: 15 }, // Barcode
        { wch: 15 }, // Category
        { wch: 10 }, // Unit
        { wch: 20 }, // Supplier
        { wch: 12 }, // Cost Price
        { wch: 12 }, // Selling Price
        { wch: 10 }, // Min Stock
        { wch: 10 }, // Max Stock
        { wch: 30 }, // Description
        { wch: 20 }, // Notes
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate file
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
}

/**
 * Export any data to Excel
 */
export function exportToExcel(
    data: Array<Record<string, unknown>>,
    headers: Record<string, string>,
    options: ExportOptions = {}
): void {
    const {
        filename = 'export',
        sheetName = 'البيانات',
        rtl = true,
    } = options;

    // Map data to Arabic headers
    const mappedData = data.map((row) => {
        const newRow: Record<string, unknown> = {};
        Object.entries(headers).forEach(([key, arabicHeader]) => {
            newRow[arabicHeader] = row[key] ?? '';
        });
        return newRow;
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(mappedData);

    if (rtl) {
        worksheet['!dir'] = 'rtl';
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
}

/**
 * Generate a template Excel file for product import
 */
export function downloadProductTemplate(): void {
    const sampleData = [
        {
            'كود المنتج': 'SKU001',
            'الاسم': 'منتج نموذجي',
            'الاسم بالإنجليزية': 'Sample Product',
            'الباركود': '6221234567890',
            'التصنيف': 'إلكترونيات',
            'الوحدة': 'قطعة',
            'المورد': 'مورد نموذجي',
            'سعر الشراء': 100,
            'سعر البيع': 150,
            'الحد الأدنى': 5,
            'الحد الأقصى': 100,
            'الوصف': 'وصف المنتج النموذجي',
            'ملاحظات': '',
        },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!dir'] = 'rtl';

    // Set column widths
    worksheet['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
        { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 },
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب المنتجات');
    XLSX.writeFile(workbook, 'product_import_template.xlsx');
}

export default {
    importProductsFromExcel,
    exportProductsToExcel,
    exportToExcel,
    downloadProductTemplate,
};

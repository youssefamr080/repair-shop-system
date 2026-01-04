/**
 * Invoice Generator - Mayo Fix Enterprise
 * Professional invoice generation with PDF export support
 */

import type { DBRepair } from '../types/repairs';
import type { RepairPayment } from '../utils/paymentTracking';
import { formatCurrency } from '../utils/paymentTracking';

export interface InvoiceData {
    repair: DBRepair;
    payments: RepairPayment[];
    parts: Array<{
        name: string;
        sku: string;
        quantity: number;
        unit_price: number;
        total: number;
    }>;
    company: {
        name: string;
        address: string;
        phone: string;
        tax_id?: string;
    };
}

/**
 * Generate invoice number from ticket number
 */
export function generateInvoiceNumber(ticketNumber: string): string {
    return `INV-${ticketNumber.replace('TKT-', '')}`;
}

/**
 * Calculate invoice totals
 */
export function calculateInvoiceTotals(invoice: InvoiceData) {
    const partsSubtotal = invoice.parts.reduce((sum, part) => sum + part.total, 0);
    const laborCost = (invoice.repair as any).labor_cost || 0;
    const subtotal = partsSubtotal + laborCost;
    const discount = (invoice.repair as any).discount || 0;
    const afterDiscount = subtotal - discount;
    const taxRate = (invoice.repair as any).tax_rate || 0;
    const taxAmount = afterDiscount * taxRate;
    const total = afterDiscount + taxAmount;
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = total - totalPaid;

    return {
        partsSubtotal,
        laborCost,
        subtotal,
        discount,
        afterDiscount,
        taxRate,
        taxAmount,
        total,
        totalPaid,
        balance
    };
}

/**
 * Format invoice as text (for printing/export)
 */
export function formatInvoiceText(invoice: InvoiceData): string {
    const totals = calculateInvoiceTotals(invoice);
    const invoiceNumber = generateInvoiceNumber(invoice.repair.ticket_number);

    let text = '';
    text += '='.repeat(60) + '\n';
    text += `           ${invoice.company.name}\n`;
    text += `           ${invoice.company.address}\n`;
    text += `           ${invoice.company.phone}\n`;
    if (invoice.company.tax_id) {
        text += `           Tax ID: ${invoice.company.tax_id}\n`;
    }
    text += '='.repeat(60) + '\n\n';

    text += `Invoice: ${invoiceNumber}\n`;
    text += `Ticket: ${invoice.repair.ticket_number}\n`;
    text += `Date: ${new Date(invoice.repair.created_at).toLocaleDateString('ar-EG')}\n`;
    text += `Customer: ${invoice.repair.customer_name}\n`;
    text += `Device: ${invoice.repair.device_brand} ${invoice.repair.device_model}\n`;
    text += '\n' + '-'.repeat(60) + '\n';

    text += 'PARTS:\n';
    invoice.parts.forEach(part => {
        text += `  ${part.name} (${part.sku})\n`;
        text += `    ${part.quantity} x ${formatCurrency(part.unit_price)} = ${formatCurrency(part.total)}\n`;
    });

    text += '\n';
    text += `Labor Cost: ${formatCurrency(totals.laborCost)}\n`;
    text += `Parts Total: ${formatCurrency(totals.partsSubtotal)}\n`;
    text += `Subtotal: ${formatCurrency(totals.subtotal)}\n`;

    if (totals.discount > 0) {
        text += `Discount: -${formatCurrency(totals.discount)}\n`;
    }

    if (totals.taxRate > 0) {
        text += `Tax (${(totals.taxRate * 100).toFixed(0)}%): ${formatCurrency(totals.taxAmount)}\n`;
    }

    text += '-'.repeat(60) + '\n';
    text += `TOTAL: ${formatCurrency(totals.total)}\n`;

    if (invoice.payments.length > 0) {
        text += '\nPAYMENTS:\n';
        invoice.payments.forEach(payment => {
            text += `  ${new Date(payment.payment_date).toLocaleDateString('ar-EG')} - ${formatCurrency(payment.amount)}\n`;
        });
        text += `Total Paid: ${formatCurrency(totals.totalPaid)}\n`;
    }

    text += `Balance: ${formatCurrency(totals.balance)}\n`;
    text += '='.repeat(60) + '\n';

    return text;
}

/**
 * Generate invoice HTML for printing
 */
export function generateInvoiceHTML(invoice: InvoiceData): string {
    const totals = calculateInvoiceTotals(invoice);
    const invoiceNumber = generateInvoiceNumber(invoice.repair.ticket_number);

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoiceNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            padding: 20mm;
            background: white;
            color: #1a1a1a;
        }
        .invoice { max-width: 210mm; margin: 0 auto; }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 3px solid #FF6B35;
            padding-bottom: 20px;
        }
        .header h1 { 
            color: #1a2332;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header p { color: #666; font-size: 14px; }
        .invoice-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .info-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        .info-box h3 { 
            color: #FF6B35;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .info-box p { 
            margin: 5px 0;
            font-size: 14px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background: #1a2332;
            color: white;
            padding: 12px;
            text-align: right;
            font-size: 14px;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
        }
        tr:hover { background: #f8f9fa; }
        .totals {
            margin-top: 30px;
            text-align: left;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            font-size: 14px;
        }
        .totals-row.grand-total {
            background: #1a2332;
            color: white;
            font-size: 18px;
            font-weight: bold;
            margin-top: 10px;
            border-radius: 4px;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #e0e0e0;
            padding-top: 20px;
        }
        @media print {
            body { padding: 0; }
            .invoice { max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <h1>${invoice.company.name}</h1>
            <p>${invoice.company.address}</p>
            <p>${invoice.company.phone}</p>
            ${invoice.company.tax_id ? `<p>الرقم الضريبي: ${invoice.company.tax_id}</p>` : ''}
        </div>

        <div class="invoice-info">
            <div class="info-box">
                <h3>معلومات الفاتورة</h3>
                <p><strong>رقم الفاتورة:</strong> ${invoiceNumber}</p>
                <p><strong>رقم التذكرة:</strong> ${invoice.repair.ticket_number}</p>
                <p><strong>التاريخ:</strong> ${new Date(invoice.repair.created_at).toLocaleDateString('ar-EG')}</p>
            </div>
            <div class="info-box">
                <h3>معلومات العميل</h3>
                <p><strong>الاسم:</strong> ${invoice.repair.customer_name}</p>
                <p><strong>الجهاز:</strong> ${invoice.repair.device_brand} ${invoice.repair.device_model}</p>
                <p><strong>النوع:</strong> ${invoice.repair.device_type}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>البند</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.parts.map(part => `
                    <tr>
                        <td>${part.name} <small>(${part.sku})</small></td>
                        <td>${part.quantity}</td>
                        <td>${formatCurrency(part.unit_price)}</td>
                        <td>${formatCurrency(part.total)}</td>
                    </tr>
                `).join('')}
                <tr>
                    <td colspan="3"><strong>تكلفة العمالة</strong></td>
                    <td><strong>${formatCurrency(totals.laborCost)}</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row">
                <span>المجموع الفرعي:</span>
                <span>${formatCurrency(totals.subtotal)}</span>
            </div>
            ${totals.discount > 0 ? `
                <div class="totals-row">
                    <span>الخصم:</span>
                    <span>-${formatCurrency(totals.discount)}</span>
                </div>
            ` : ''}
            ${totals.taxRate > 0 ? `
                <div class="totals-row">
                    <span>الضريبة (${(totals.taxRate * 100).toFixed(0)}%):</span>
                    <span>${formatCurrency(totals.taxAmount)}</span>
                </div>
            ` : ''}
            <div class="totals-row grand-total">
                <span>الإجمالي:</span>
                <span>${formatCurrency(totals.total)}</span>
            </div>
            ${totals.totalPaid > 0 ? `
                <div class="totals-row" style="color: #28a745;">
                    <span>المدفوع:</span>
                    <span>${formatCurrency(totals.totalPaid)}</span>
                </div>
                <div class="totals-row" style="color: ${totals.balance > 0 ? '#dc3545' : '#28a745'};">
                    <span>المتبقي:</span>
                    <span>${formatCurrency(totals.balance)}</span>
                </div>
            ` : ''}
        </div>

        <div class="footer">
            <p>شكراً لثقتكم في ${invoice.company.name}</p>
            <p>Mayo Fix Enterprise - نظام إدارة ورش الصيانة</p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

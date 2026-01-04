/**
 * Payment Tracking System - Mayo Fix Enterprise
 * Enhanced payment management with installment support
 */

import type { DBRepair } from '../types/repairs';

export interface RepairPayment {
    id: string;
    repair_id: string;
    amount: number;
    payment_method: 'cash' | 'card' | 'bank_transfer' | 'installment';
    payment_date: string;
    receipt_number: string;
    notes?: string;
    created_by: number;
}

export interface PaymentSummary {
    total_cost: number;
    total_paid: number;
    remaining: number;
    payment_status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
    payments: RepairPayment[];
}

/**
 * Calculate payment summary for a repair
 */
export function calculatePaymentSummary(
    repair: DBRepair,
    payments: RepairPayment[]
): PaymentSummary {
    const totalCost = repair.final_cost || repair.estimated_cost || 0;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalCost - totalPaid;

    let paymentStatus: PaymentSummary['payment_status'] = 'unpaid';
    if (totalPaid === 0) {
        paymentStatus = 'unpaid';
    } else if (totalPaid < totalCost) {
        paymentStatus = 'partial';
    } else if (totalPaid === totalCost) {
        paymentStatus = 'paid';
    } else {
        paymentStatus = 'overpaid';
    }

    return {
        total_cost: totalCost,
        total_paid: totalPaid,
        remaining,
        payment_status: paymentStatus,
        payments
    };
}

/**
 * Validate payment amount
 */
export function validatePayment(
    repair: DBRepair,
    currentPayments: RepairPayment[],
    newAmount: number
): { valid: boolean; reason?: string; maxAllowed?: number } {
    const summary = calculatePaymentSummary(repair, currentPayments);

    if (newAmount <= 0) {
        return {
            valid: false,
            reason: 'المبلغ يجب أن يكون أكبر من صفر'
        };
    }

    if (newAmount > summary.remaining) {
        return {
            valid: false,
            reason: `المبلغ أكبر من المتبقي. الحد الأقصى: ${summary.remaining} ج.م`,
            maxAllowed: summary.remaining
        };
    }

    return { valid: true };
}

/**
 * Get payment method display name
 */
export function getPaymentMethodLabel(method: RepairPayment['payment_method']): string {
    const labels: Record<RepairPayment['payment_method'], string> = {
        cash: 'نقدي',
        card: 'بطاقة',
        bank_transfer: 'تحويل بنكي',
        installment: 'تقسيط'
    };
    return labels[method] || method;
}

/**
 * Generate receipt number
 */
export function generateReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP-${year}${month}-${random}`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} ج.م`;
}

/**
 * Get payment status color
 */
export function getPaymentStatusColor(status: PaymentSummary['payment_status']): {
    bg: string;
    text: string;
    border: string;
} {
    const colors = {
        unpaid: {
            bg: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-200'
        },
        partial: {
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            border: 'border-orange-200'
        },
        paid: {
            bg: 'bg-green-50',
            text: 'text-green-700',
            border: 'border-green-200'
        },
        overpaid: {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200'
        }
    };
    return colors[status];
}

/**
 * Get payment status label
 */
export function getPaymentStatusLabel(status: PaymentSummary['payment_status']): string {
    const labels = {
        unpaid: 'غير مدفوع',
        partial: 'مدفوع جزئياً',
        paid: 'مدفوع بالكامل',
        overpaid: 'دفع زائد'
    };
    return labels[status];
}

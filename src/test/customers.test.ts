/**
 * MAYO FIX - Comprehensive Customer & Financial Tests
 * 
 * Tests for customer management and financial operations including:
 * - Customer validation
 * - Balance calculations
 * - Payment processing
 * - Invoice generation
 */

import { describe, it, expect } from 'vitest';

// ============================================
// CUSTOMER VALIDATION TESTS
// ============================================

describe('Customer Validation', () => {
  interface Customer {
    name: string;
    phone: string;
    phone2?: string;
    email?: string;
    address?: string;
    national_id?: string;
  }

  const validateCustomer = (customer: Customer): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!customer.name || customer.name.trim().length < 3) {
      errors.name = 'اسم العميل يجب أن يكون 3 أحرف على الأقل';
    }

    if (!customer.phone || !/^01[0-9]{9}$/.test(customer.phone)) {
      errors.phone = 'رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقم';
    }

    if (customer.phone2 && !/^01[0-9]{9}$/.test(customer.phone2)) {
      errors.phone2 = 'رقم الهاتف الثاني غير صحيح';
    }

    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (customer.national_id && !/^\d{14}$/.test(customer.national_id)) {
      errors.national_id = 'الرقم القومي يجب أن يتكون من 14 رقم';
    }

    return errors;
  };

  it('should validate required name', () => {
    const customer: Customer = { name: '', phone: '01012345678' };
    const errors = validateCustomer(customer);
    expect(errors.name).toBeDefined();
  });

  it('should validate name length', () => {
    const customer: Customer = { name: 'ab', phone: '01012345678' };
    const errors = validateCustomer(customer);
    expect(errors.name).toBeDefined();
  });

  it('should validate phone format', () => {
    const errors1 = validateCustomer({ name: 'Test', phone: '12345678901' });
    const errors2 = validateCustomer({ name: 'Test', phone: '0101234567' }); // 10 digits
    expect(errors1.phone).toBeDefined();
    expect(errors2.phone).toBeDefined();
  });

  it('should accept valid phone', () => {
    const errors = validateCustomer({ name: 'Test', phone: '01012345678' });
    expect(errors.phone).toBeUndefined();
  });

  it('should validate optional email', () => {
    const errors = validateCustomer({ name: 'Test', phone: '01012345678', email: 'invalid' });
    expect(errors.email).toBeDefined();
  });

  it('should accept valid email', () => {
    const errors = validateCustomer({ name: 'Test', phone: '01012345678', email: 'test@example.com' });
    expect(errors.email).toBeUndefined();
  });

  it('should validate national ID format', () => {
    const errors = validateCustomer({ name: 'Test', phone: '01012345678', national_id: '1234567890123' }); // 13 digits
    expect(errors.national_id).toBeDefined();
  });

  it('should accept valid national ID', () => {
    const errors = validateCustomer({ name: 'Test', phone: '01012345678', national_id: '12345678901234' });
    expect(errors.national_id).toBeUndefined();
  });

  it('should pass complete valid customer', () => {
    const customer: Customer = {
      name: 'أحمد محمد',
      phone: '01012345678',
      phone2: '01234567890',
      email: 'ahmed@example.com',
      address: 'القاهرة',
      national_id: '12345678901234',
    };
    const errors = validateCustomer(customer);
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

// ============================================
// CUSTOMER BALANCE TESTS
// ============================================

describe('Customer Balance', () => {
  interface Transaction {
    type: 'charge' | 'payment' | 'refund';
    amount: number;
    date: string;
  }

  const calculateBalance = (transactions: Transaction[]): number => {
    return transactions.reduce((balance, tx) => {
      if (tx.type === 'charge') {
        return balance + tx.amount;
      } else if (tx.type === 'payment') {
        return balance - tx.amount;
      } else if (tx.type === 'refund') {
        return balance - tx.amount;
      }
      return balance;
    }, 0);
  };

  it('should calculate balance with charges', () => {
    const transactions: Transaction[] = [
      { type: 'charge', amount: 500, date: '2024-01-01' },
      { type: 'charge', amount: 300, date: '2024-01-02' },
    ];
    expect(calculateBalance(transactions)).toBe(800);
  });

  it('should calculate balance with payments', () => {
    const transactions: Transaction[] = [
      { type: 'charge', amount: 500, date: '2024-01-01' },
      { type: 'payment', amount: 300, date: '2024-01-02' },
    ];
    expect(calculateBalance(transactions)).toBe(200);
  });

  it('should handle refunds', () => {
    const transactions: Transaction[] = [
      { type: 'charge', amount: 500, date: '2024-01-01' },
      { type: 'payment', amount: 500, date: '2024-01-02' },
      { type: 'refund', amount: 100, date: '2024-01-03' },
    ];
    expect(calculateBalance(transactions)).toBe(-100);
  });

  it('should handle empty transactions', () => {
    expect(calculateBalance([])).toBe(0);
  });

  describe('Balance status', () => {
    const getBalanceStatus = (balance: number): string => {
      if (balance > 0) return 'has_debt';
      if (balance < 0) return 'has_credit';
      return 'settled';
    };

    it('should identify debt', () => {
      expect(getBalanceStatus(500)).toBe('has_debt');
    });

    it('should identify credit', () => {
      expect(getBalanceStatus(-100)).toBe('has_credit');
    });

    it('should identify settled', () => {
      expect(getBalanceStatus(0)).toBe('settled');
    });
  });
});

// ============================================
// PAYMENT PROCESSING TESTS
// ============================================

describe('Payment Processing', () => {
  interface Payment {
    amount: number;
    method: 'cash' | 'card' | 'bank_transfer';
    reference?: string;
  }

  const validatePayment = (payment: Payment, outstanding: number): { valid: boolean; error?: string } => {
    if (payment.amount <= 0) {
      return { valid: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };
    }

    if (payment.amount > outstanding) {
      return { valid: false, error: 'المبلغ أكبر من المستحق' };
    }

    if (payment.method === 'bank_transfer' && !payment.reference) {
      return { valid: false, error: 'رقم المرجع مطلوب للتحويل البنكي' };
    }

    return { valid: true };
  };

  it('should reject zero amount', () => {
    const payment: Payment = { amount: 0, method: 'cash' };
    const result = validatePayment(payment, 500);
    expect(result.valid).toBe(false);
  });

  it('should reject negative amount', () => {
    const payment: Payment = { amount: -100, method: 'cash' };
    const result = validatePayment(payment, 500);
    expect(result.valid).toBe(false);
  });

  it('should reject overpayment', () => {
    const payment: Payment = { amount: 600, method: 'cash' };
    const result = validatePayment(payment, 500);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('أكبر من المستحق');
  });

  it('should require reference for bank transfer', () => {
    const payment: Payment = { amount: 500, method: 'bank_transfer' };
    const result = validatePayment(payment, 500);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('رقم المرجع');
  });

  it('should accept valid cash payment', () => {
    const payment: Payment = { amount: 300, method: 'cash' };
    const result = validatePayment(payment, 500);
    expect(result.valid).toBe(true);
  });

  it('should accept bank transfer with reference', () => {
    const payment: Payment = { amount: 500, method: 'bank_transfer', reference: 'TRF-123456' };
    const result = validatePayment(payment, 500);
    expect(result.valid).toBe(true);
  });

  describe('Payment allocation', () => {
    interface Invoice {
      id: number;
      amount: number;
      paid: number;
      date: string;
    }

    const allocatePayment = (payment: number, invoices: Invoice[]): Map<number, number> => {
      const allocations = new Map<number, number>();
      let remainingPayment = payment;

      // Sort by date (oldest first)
      const sorted = [...invoices].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      for (const invoice of sorted) {
        if (remainingPayment <= 0) break;
        
        const outstanding = invoice.amount - invoice.paid;
        const allocation = Math.min(remainingPayment, outstanding);
        
        if (allocation > 0) {
          allocations.set(invoice.id, allocation);
          remainingPayment -= allocation;
        }
      }

      return allocations;
    };

    it('should allocate payment to oldest invoice first', () => {
      const invoices: Invoice[] = [
        { id: 2, amount: 300, paid: 0, date: '2024-01-02' },
        { id: 1, amount: 500, paid: 0, date: '2024-01-01' },
      ];

      const allocations = allocatePayment(600, invoices);
      expect(allocations.get(1)).toBe(500); // Oldest first
      expect(allocations.get(2)).toBe(100); // Remaining
    });

    it('should handle partial payment', () => {
      const invoices: Invoice[] = [
        { id: 1, amount: 500, paid: 0, date: '2024-01-01' },
      ];

      const allocations = allocatePayment(300, invoices);
      expect(allocations.get(1)).toBe(300);
    });

    it('should skip fully paid invoices', () => {
      const invoices: Invoice[] = [
        { id: 1, amount: 500, paid: 500, date: '2024-01-01' },
        { id: 2, amount: 300, paid: 0, date: '2024-01-02' },
      ];

      const allocations = allocatePayment(200, invoices);
      expect(allocations.get(1)).toBeUndefined();
      expect(allocations.get(2)).toBe(200);
    });
  });
});

// ============================================
// INVOICE GENERATION TESTS
// ============================================

describe('Invoice Generation', () => {
  const generateInvoiceNumber = (lastNumber: number, date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequence = String(lastNumber + 1).padStart(5, '0');
    return `INV-${year}${month}-${sequence}`;
  };

  it('should generate sequential invoice numbers', () => {
    const date = new Date('2024-03-15');
    expect(generateInvoiceNumber(0, date)).toBe('INV-202403-00001');
    expect(generateInvoiceNumber(99, date)).toBe('INV-202403-00100');
    expect(generateInvoiceNumber(9999, date)).toBe('INV-202403-10000');
  });

  it('should include year and month', () => {
    const jan = new Date('2024-01-15');
    const dec = new Date('2024-12-15');
    expect(generateInvoiceNumber(0, jan)).toContain('202401');
    expect(generateInvoiceNumber(0, dec)).toContain('202412');
  });

  describe('Invoice line items', () => {
    interface LineItem {
      description: string;
      quantity: number;
      unit_price: number;
      discount_percent?: number;
    }

    const calculateLineTotal = (item: LineItem): number => {
      const subtotal = item.quantity * item.unit_price;
      const discount = subtotal * ((item.discount_percent || 0) / 100);
      return Math.round((subtotal - discount) * 100) / 100;
    };

    const calculateInvoiceTotal = (items: LineItem[], taxRate: number = 0): { subtotal: number; discount: number; tax: number; total: number } => {
      let subtotal = 0;
      let totalDiscount = 0;

      items.forEach(item => {
        const lineSubtotal = item.quantity * item.unit_price;
        const lineDiscount = lineSubtotal * ((item.discount_percent || 0) / 100);
        subtotal += lineSubtotal;
        totalDiscount += lineDiscount;
      });

      const afterDiscount = subtotal - totalDiscount;
      const tax = afterDiscount * taxRate;
      const total = afterDiscount + tax;

      return {
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(totalDiscount * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100,
      };
    };

    it('should calculate line total', () => {
      const item: LineItem = { description: 'Service', quantity: 2, unit_price: 100 };
      expect(calculateLineTotal(item)).toBe(200);
    });

    it('should apply line discount', () => {
      const item: LineItem = { description: 'Service', quantity: 2, unit_price: 100, discount_percent: 10 };
      expect(calculateLineTotal(item)).toBe(180);
    });

    it('should calculate invoice total', () => {
      const items: LineItem[] = [
        { description: 'Service 1', quantity: 1, unit_price: 500 },
        { description: 'Service 2', quantity: 2, unit_price: 100 },
      ];

      const result = calculateInvoiceTotal(items);
      expect(result.subtotal).toBe(700);
      expect(result.discount).toBe(0);
      expect(result.total).toBe(700);
    });

    it('should calculate invoice with discounts and tax', () => {
      const items: LineItem[] = [
        { description: 'Service 1', quantity: 1, unit_price: 1000, discount_percent: 10 },
      ];

      const result = calculateInvoiceTotal(items, 0.14);
      expect(result.subtotal).toBe(1000);
      expect(result.discount).toBe(100);
      expect(result.tax).toBe(126); // (1000-100) * 0.14
      expect(result.total).toBe(1026); // 900 + 126
    });
  });
});

// ============================================
// PRICING & WARRANTY TESTS
// ============================================

describe('Pricing & Warranty', () => {
  describe('Service pricing', () => {
    interface ServicePricing {
      base_price: number;
      complexity_factor: number; // 1.0, 1.5, 2.0
      urgency_factor: number; // 1.0, 1.25, 1.5
    }

    const calculateServicePrice = (pricing: ServicePricing): number => {
      return Math.round(pricing.base_price * pricing.complexity_factor * pricing.urgency_factor);
    };

    it('should calculate standard price', () => {
      const pricing: ServicePricing = { base_price: 100, complexity_factor: 1.0, urgency_factor: 1.0 };
      expect(calculateServicePrice(pricing)).toBe(100);
    });

    it('should apply complexity factor', () => {
      const pricing: ServicePricing = { base_price: 100, complexity_factor: 1.5, urgency_factor: 1.0 };
      expect(calculateServicePrice(pricing)).toBe(150);
    });

    it('should apply urgency factor', () => {
      const pricing: ServicePricing = { base_price: 100, complexity_factor: 1.0, urgency_factor: 1.25 };
      expect(calculateServicePrice(pricing)).toBe(125);
    });

    it('should apply both factors', () => {
      const pricing: ServicePricing = { base_price: 100, complexity_factor: 2.0, urgency_factor: 1.5 };
      expect(calculateServicePrice(pricing)).toBe(300);
    });
  });

  describe('Warranty calculation', () => {
    const calculateWarrantyEnd = (completionDate: string, warrantyDays: number): string => {
      const date = new Date(completionDate);
      date.setDate(date.getDate() + warrantyDays);
      return date.toISOString().split('T')[0];
    };

    const isUnderWarranty = (completionDate: string, warrantyDays: number, checkDate: Date = new Date()): boolean => {
      const warrantyEnd = new Date(calculateWarrantyEnd(completionDate, warrantyDays));
      return checkDate <= warrantyEnd;
    };

    it('should calculate warranty end date', () => {
      expect(calculateWarrantyEnd('2024-01-01', 30)).toBe('2024-01-31');
      expect(calculateWarrantyEnd('2024-01-01', 90)).toBe('2024-03-31');
    });

    it('should handle month boundaries', () => {
      expect(calculateWarrantyEnd('2024-01-15', 30)).toBe('2024-02-14');
    });

    it('should check if under warranty', () => {
      const today = new Date('2024-01-15');
      expect(isUnderWarranty('2024-01-01', 30, today)).toBe(true);
      expect(isUnderWarranty('2024-01-01', 7, today)).toBe(false);
    });
  });
});

// ============================================
// DAILY SUMMARY TESTS
// ============================================

describe('Daily Summary', () => {
  interface DaySummary {
    date: string;
    new_tickets: number;
    completed_tickets: number;
    delivered_tickets: number;
    total_revenue: number;
    cash_payments: number;
    card_payments: number;
  }

  const calculateDailySummary = (
    tickets: { status: string; created_at: string; completed_at?: string; delivered_at?: string }[],
    payments: { amount: number; method: 'cash' | 'card'; date: string }[],
    date: string
  ): DaySummary => {
    const dateOnly = date.split('T')[0];
    
    const newTickets = tickets.filter(t => t.created_at.startsWith(dateOnly)).length;
    const completedTickets = tickets.filter(t => t.completed_at?.startsWith(dateOnly)).length;
    const deliveredTickets = tickets.filter(t => t.delivered_at?.startsWith(dateOnly)).length;
    
    const dayPayments = payments.filter(p => p.date.startsWith(dateOnly));
    const cashPayments = dayPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
    const cardPayments = dayPayments.filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0);
    
    return {
      date: dateOnly,
      new_tickets: newTickets,
      completed_tickets: completedTickets,
      delivered_tickets: deliveredTickets,
      total_revenue: cashPayments + cardPayments,
      cash_payments: cashPayments,
      card_payments: cardPayments,
    };
  };

  it('should calculate daily summary', () => {
    const tickets = [
      { status: 'pending', created_at: '2024-01-15T10:00:00' },
      { status: 'pending', created_at: '2024-01-15T14:00:00' },
      { status: 'completed', created_at: '2024-01-14T10:00:00', completed_at: '2024-01-15T16:00:00' },
    ];

    const payments = [
      { amount: 500, method: 'cash' as const, date: '2024-01-15T10:00:00' },
      { amount: 300, method: 'card' as const, date: '2024-01-15T11:00:00' },
    ];

    const summary = calculateDailySummary(tickets, payments, '2024-01-15');
    expect(summary.new_tickets).toBe(2);
    expect(summary.completed_tickets).toBe(1);
    expect(summary.total_revenue).toBe(800);
    expect(summary.cash_payments).toBe(500);
    expect(summary.card_payments).toBe(300);
  });
});

// ============================================
// RECEIPT GENERATION TESTS
// ============================================

describe('Receipt Generation', () => {
  interface ReceiptData {
    ticket_number: string;
    customer_name: string;
    device_type: string;
    services: { name: string; price: number }[];
    parts: { name: string; quantity: number; price: number }[];
    discount: number;
    paid: number;
  }

  const generateReceiptLines = (data: ReceiptData): string[] => {
    const lines: string[] = [];
    
    lines.push('='.repeat(40));
    lines.push('محل مايو فيكس للصيانة');
    lines.push('='.repeat(40));
    lines.push(`رقم التذكرة: ${data.ticket_number}`);
    lines.push(`العميل: ${data.customer_name}`);
    lines.push(`الجهاز: ${data.device_type}`);
    lines.push('-'.repeat(40));
    
    lines.push('الخدمات:');
    let servicesTotal = 0;
    data.services.forEach(s => {
      lines.push(`  ${s.name}: ${s.price} ج.م.`);
      servicesTotal += s.price;
    });
    
    if (data.parts.length > 0) {
      lines.push('قطع الغيار:');
      data.parts.forEach(p => {
        const total = p.quantity * p.price;
        lines.push(`  ${p.name} x${p.quantity}: ${total} ج.م.`);
        servicesTotal += total;
      });
    }
    
    lines.push('-'.repeat(40));
    lines.push(`الإجمالي: ${servicesTotal} ج.م.`);
    
    if (data.discount > 0) {
      lines.push(`الخصم: -${data.discount} ج.م.`);
    }
    
    const finalTotal = servicesTotal - data.discount;
    lines.push(`المطلوب: ${finalTotal} ج.م.`);
    lines.push(`المدفوع: ${data.paid} ج.م.`);
    lines.push(`المتبقي: ${finalTotal - data.paid} ج.م.`);
    
    lines.push('='.repeat(40));
    lines.push('شكراً لزيارتكم');
    lines.push('='.repeat(40));
    
    return lines;
  };

  it('should generate receipt with header', () => {
    const data: ReceiptData = {
      ticket_number: 'TKT-001',
      customer_name: 'أحمد',
      device_type: 'iPhone 13',
      services: [{ name: 'تغيير شاشة', price: 500 }],
      parts: [],
      discount: 0,
      paid: 500,
    };

    const lines = generateReceiptLines(data);
    expect(lines).toContain('محل مايو فيكس للصيانة');
    expect(lines.some(l => l.includes('TKT-001'))).toBe(true);
    expect(lines.some(l => l.includes('أحمد'))).toBe(true);
  });

  it('should include services and parts', () => {
    const data: ReceiptData = {
      ticket_number: 'TKT-001',
      customer_name: 'أحمد',
      device_type: 'iPhone 13',
      services: [{ name: 'تغيير شاشة', price: 500 }],
      parts: [{ name: 'شاشة أصلية', quantity: 1, price: 300 }],
      discount: 0,
      paid: 800,
    };

    const lines = generateReceiptLines(data);
    expect(lines.some(l => l.includes('تغيير شاشة'))).toBe(true);
    expect(lines.some(l => l.includes('شاشة أصلية'))).toBe(true);
  });

  it('should calculate totals correctly', () => {
    const data: ReceiptData = {
      ticket_number: 'TKT-001',
      customer_name: 'أحمد',
      device_type: 'iPhone 13',
      services: [{ name: 'صيانة', price: 500 }],
      parts: [{ name: 'قطعة', quantity: 2, price: 100 }],
      discount: 50,
      paid: 600,
    };

    const lines = generateReceiptLines(data);
    expect(lines.some(l => l.includes('700'))).toBe(true); // Total before discount
    expect(lines.some(l => l.includes('-50'))).toBe(true); // Discount
    expect(lines.some(l => l.includes('650'))).toBe(true); // Final total
  });
});

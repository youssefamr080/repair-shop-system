import { z } from 'zod';

export const CreateRepairSchema = z.object({
    // One of these sets is required:
    // 1. customer_id (Existing customer)
    // 2. customer_name + customer_phone (New/Search customer)
    customer_id: z.string().or(z.number()).optional(),
    customer_name: z.string().optional(),
    customer_phone: z.string().optional(),

    device_type: z.string().min(1, "نوع الجهاز مطلوب"),
    device_brand: z.string().min(1, "الماركة مطلوبة"),
    device_model: z.string().min(1, "الموديل مطلوب"),
    serial_number: z.string().optional(),
    imei: z.string().optional(),
    passcode: z.string().optional(),
    color: z.string().optional(),
    condition: z.string().optional(),
    problem_description: z.string().min(3, "وصف المشكلة مطلوب"),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
    estimated_cost: z.number().min(0).default(0),
    deposit_amount: z.number().min(0).default(0),
    promised_at: z.string().optional(), // ISO Date
    technician_id: z.number().optional(),
});

export const UpdateRepairSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(['RECEIVED', 'DIAGNOSED', 'WAITING_PARTS', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED']).optional(),
    diagnosis: z.string().optional(),
    technician_notes: z.string().optional(),
    final_cost: z.number().optional(), // Deprecated but allowed for now
    // V08 Financials
    labor_cost: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
    tax_rate: z.number().min(0).max(1).optional(),

    is_paid: z.number().optional(), // 0 or 1
    completed_at: z.string().optional(),
    delivered_at: z.string().optional(),
});

export const AddRepairPartSchema = z.object({
    repair_id: z.string().uuid(),
    product_id: z.number(),
    quantity: z.number().min(1),
});

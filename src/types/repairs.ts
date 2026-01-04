/**
 * Repair System Type Definitions
 * 
 * Mayo Fix Enterprise - Comprehensive types for repair management
 */

// ============================================================
// REPAIR STATUS & PRIORITY
// ============================================================

export type RepairStatus =
    | 'pending'      // في الانتظار
    | 'diagnosed'    // تم التشخيص
    | 'approved'     // تمت الموافقة
    | 'in_progress'  // قيد الإصلاح
    | 'completed'    // مكتمل
    | 'delivered'    // تم التسليم
    | 'cancelled';   // ملغي

export type RepairPriority =
    | 'low'          // عادي
    | 'normal'       // متوسط
    | 'high'         // عاجل
    | 'urgent';      // طارئ

// ============================================================
// DATABASE ENTITIES
// ============================================================

export interface DBRepair {
    id: string;
    ticket_number: string;

    // Customer Info
    customer_id: number;
    customer_name: string;
    customer_phone: string;

    // Device Info
    device_type: string;
    device_brand: string;
    device_model: string;
    serial_number: string | null;
    imei: string | null;
    passcode: string | null;
    color: string | null;
    condition: string | null;

    // Problem & Diagnosis
    problem_description: string;
    diagnosis: string | null;

    // Financial
    estimated_cost: number;
    final_cost: number | null;
    deposit_paid: number;

    // Status & Priority
    status: RepairStatus;
    priority: RepairPriority;

    // Assignment
    technician_id: number | null;
    technician_name: string | null;

    // Timestamps
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    delivered_at: string | null;

    // Related data (from joins)
    parts?: RepairPart[];
    history?: RepairHistoryItem[];
}

export interface RepairPart {
    id: number;
    repair_id: string;
    part_id: number;
    part_name: string;
    part_sku: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    added_at: string;
    added_by: number | null;
    added_by_name: string | null;
}

export interface RepairHistoryItem {
    id: number;
    repair_id: string;
    action: string;
    description: string | null;
    old_value: string | null;
    new_value: string | null;
    user_id: number | null;
    user_name: string | null;
    created_at: string;
}

// ============================================================
// INPUT TYPES (for API calls)
// ============================================================

export interface CreateRepairInput {
    // Customer Info
    customer_phone: string;
    customer_name: string;

    // Device Info
    device_type: string;
    device_brand: string;
    device_model: string;
    serial_number?: string;
    imei?: string;
    passcode?: string;
    color?: string;
    condition?: string;

    // Diagnostics
    problem_description: string;
    estimated_cost: number;
    priority: RepairPriority;

    // Optional
    diagnosis?: string;
    technician_id?: number;
    deposit_paid?: number;
}

export interface UpdateRepairInput {
    id: string;

    // Updatable fields
    customer_name?: string;
    customer_phone?: string;
    device_type?: string;
    device_brand?: string;
    device_model?: string;
    serial_number?: string;
    imei?: string;
    passcode?: string;
    color?: string;
    condition?: string;
    problem_description?: string;
    diagnosis?: string;
    estimated_cost?: number;
    final_cost?: number;
    deposit_paid?: number;
    labor_cost?: number;
    discount?: number;
    status?: RepairStatus;
    priority?: RepairPriority;
    technician_id?: number;
}

export interface AddRepairPartInput {
    repair_id: string;
    part_id: number;
    quantity: number;
    unit_price: number;
}

export interface RemoveRepairPartInput {
    repair_id: string;
    part_link_id: string;
}

export interface RepairFilters {
    search?: string;
    status?: RepairStatus;
    priority?: RepairPriority;
    technician_id?: number;
    customer_id?: number;
    date_from?: string;
    date_to?: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface CreateRepairResponse {
    success: boolean;
    id: string;
    ticket_number: string;
}

export interface UpdateRepairResponse {
    success: boolean;
}

export interface AddPartResponse {
    success: boolean;
}

export interface RemovePartResponse {
    success: boolean;
}

/**
 * Repair Status Workflow Engine
 * Mayo Fix Enterprise - Smart status transitions with validation
 */

import type { RepairStatus, DBRepair } from '../types/repairs';

// ============================================================
// WORKFLOW CONFIGURATION
// ============================================================

export interface StatusTransitionRule {
    from: RepairStatus[];
    to: RepairStatus;
    label: string; // Arabic label for UI
    conditions?: (repair: DBRepair) => { valid: boolean; reason?: string };
    requiredFields?: (keyof DBRepair)[];
}

/**
 * Workflow Rules Matrix
 * Defines all valid status transitions and their requirements
 */
export const WORKFLOW_RULES: StatusTransitionRule[] = [
    // From PENDING → DIAGNOSED
    {
        from: ['pending'],
        to: 'diagnosed',
        label: 'تشخيص المشكلة',
        requiredFields: ['diagnosis'],
        conditions: (repair) => {
            if (!repair.diagnosis || repair.diagnosis.trim().length < 10) {
                return { valid: false, reason: 'يجب إدخال تشخيص مفصل (10 أحرف على الأقل)' };
            }
            return { valid: true };
        }
    },

    // From DIAGNOSED → APPROVED
    {
        from: ['diagnosed'],
        to: 'approved',
        label: 'موافقة العميل',
        requiredFields: ['estimated_cost'],
        conditions: (repair) => {
            if (repair.estimated_cost <= 0) {
                return { valid: false, reason: 'يجب تحديد التكلفة التقديرية' };
            }
            return { valid: true };
        }
    },

    // From APPROVED → IN_PROGRESS
    {
        from: ['approved'],
        to: 'in_progress',
        label: 'بدء الإصلاح',
        requiredFields: ['technician_id'],
        conditions: (repair) => {
            if (!repair.technician_id) {
                return { valid: false, reason: 'يجب تعيين فني للتذكرة' };
            }
            return { valid: true };
        }
    },

    // From IN_PROGRESS → COMPLETED
    {
        from: ['in_progress'],
        to: 'completed',
        label: 'إكمال الإصلاح',
        requiredFields: ['final_cost'],
        conditions: (repair) => {
            if (!repair.final_cost || repair.final_cost <= 0) {
                return { valid: false, reason: 'يجب تحديد التكلفة النهائية' };
            }
            return { valid: true };
        }
    },

    // From COMPLETED → DELIVERED
    {
        from: ['completed'],
        to: 'delivered',
        label: 'تسليم الجهاز',
        conditions: (repair) => {
            const balance = (repair.final_cost || repair.estimated_cost) - repair.deposit_paid;
            if (balance > 0) {
                return { valid: false, reason: `المبلغ المتبقي: ${balance} ج.م. يجب دفع المبلغ كاملاً قبل التسليم` };
            }
            return { valid: true };
        }
    },

    // CANCEL from any status except DELIVERED
    {
        from: ['pending', 'diagnosed', 'approved', 'in_progress', 'completed'],
        to: 'cancelled',
        label: 'إلغاء التذكرة',
        conditions: () => ({ valid: true }) // Always allowed
    },

    // BACKWARD TRANSITIONS (for corrections)
    {
        from: ['diagnosed'],
        to: 'pending',
        label: 'إعادة للانتظار',
        conditions: () => ({ valid: true })
    },
    {
        from: ['in_progress'],
        to: 'approved',
        label: 'إيقاف العمل',
        conditions: () => ({ valid: true })
    }
];

// ============================================================
// WORKFLOW ENGINE
// ============================================================

export class RepairWorkflowEngine {
    /**
     * Get all allowed transitions from current status
     */
    static getAllowedTransitions(currentStatus: RepairStatus): StatusTransitionRule[] {
        return WORKFLOW_RULES.filter(rule => rule.from.includes(currentStatus));
    }

    /**
     * Validate if transition is allowed
     */
    static canTransition(
        repair: DBRepair,
        targetStatus: RepairStatus
    ): { allowed: boolean; reason?: string; rule?: StatusTransitionRule } {
        const rule = WORKFLOW_RULES.find(
            r => r.from.includes(repair.status) && r.to === targetStatus
        );

        if (!rule) {
            return {
                allowed: false,
                reason: `الانتقال من "${repair.status}" إلى "${targetStatus}" غير مسموح`
            };
        }

        // Check required fields
        if (rule.requiredFields) {
            for (const field of rule.requiredFields) {
                if (!repair[field]) {
                    return {
                        allowed: false,
                        reason: `الحقل المطلوب "${field}" غير موجود`,
                        rule
                    };
                }
            }
        }

        // Check custom conditions
        if (rule.conditions) {
            const conditionResult = rule.conditions(repair);
            if (!conditionResult.valid) {
                return {
                    allowed: false,
                    reason: conditionResult.reason || 'الشروط غير مستوفاة',
                    rule
                };
            }
        }

        return { allowed: true, rule };
    }

    /**
     * Get notification message for status change
     */
    static getNotificationMessage(
        repair: DBRepair,
        newStatus: RepairStatus
    ): { title: string; message: string } | null {
        const messages: Record<RepairStatus, { title: string; message: string }> = {
            diagnosed: {
                title: `تم تشخيص جهازك - ${repair.ticket_number}`,
                message: `المشكلة: ${repair.diagnosis}\nالتكلفة التقديرية: ${repair.estimated_cost} ج.م`
            },
            approved: {
                title: `تمت الموافقة على الإصلاح - ${repair.ticket_number}`,
                message: `سيتم البدء في إصلاح جهازك قريباً`
            },
            in_progress: {
                title: `جاري إصلاح جهازك - ${repair.ticket_number}`,
                message: `الفني ${repair.technician_name} يعمل على إصلاح جهازك الآن`
            },
            completed: {
                title: `تم إصلاح جهازك! - ${repair.ticket_number}`,
                message: `جهازك جاهز للاستلام.\nالتكلفة النهائية: ${repair.final_cost} ج.م`
            },
            delivered: {
                title: `تم تسليم الجهاز - ${repair.ticket_number}`,
                message: `شكراً لثقتكم في Mayo Fix Enterprise`
            },
            cancelled: {
                title: `تم إلغاء التذكرة - ${repair.ticket_number}`,
                message: `تم إلغاء طلب الإصلاح`
            },
            pending: {
                title: `في الانتظار - ${repair.ticket_number}`,
                message: `تذكرتك قيد المراجعة`
            }
        };

        // Don't send notification for PENDING (initial state)
        if (newStatus === 'pending' && repair.status === 'pending') {
            return null;
        }

        return messages[newStatus] || null;
    }
}

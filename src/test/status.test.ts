/**
 * MAYO FIX - Comprehensive Repair Status Tests
 * 
 * Tests for repair ticket status machine including:
 * - Status transitions
 * - Valid/Invalid state changes
 * - Business rules
 */

import { describe, it, expect } from 'vitest';

// ============================================
// STATUS DEFINITIONS
// ============================================

type RepairStatus = 
  | 'pending'           // في الانتظار
  | 'diagnosed'         // تم التشخيص
  | 'waiting_parts'     // في انتظار القطع
  | 'in_progress'       // جاري الإصلاح
  | 'completed'         // تم الإصلاح
  | 'delivered'         // تم التسليم
  | 'cancelled';        // ملغي

interface StatusTransition {
  from: RepairStatus;
  to: RepairStatus;
  allowed: boolean;
  requiresNote?: boolean;
}

// ============================================
// STATUS TRANSITION TESTS
// ============================================

describe('Repair Status Transitions', () => {
  const allowedTransitions: StatusTransition[] = [
    // From pending
    { from: 'pending', to: 'diagnosed', allowed: true },
    { from: 'pending', to: 'cancelled', allowed: true, requiresNote: true },
    { from: 'pending', to: 'completed', allowed: false },
    { from: 'pending', to: 'delivered', allowed: false },
    
    // From diagnosed
    { from: 'diagnosed', to: 'waiting_parts', allowed: true },
    { from: 'diagnosed', to: 'in_progress', allowed: true },
    { from: 'diagnosed', to: 'cancelled', allowed: true, requiresNote: true },
    { from: 'diagnosed', to: 'pending', allowed: false },
    
    // From waiting_parts
    { from: 'waiting_parts', to: 'in_progress', allowed: true },
    { from: 'waiting_parts', to: 'cancelled', allowed: true, requiresNote: true },
    { from: 'waiting_parts', to: 'completed', allowed: false },
    
    // From in_progress
    { from: 'in_progress', to: 'completed', allowed: true },
    { from: 'in_progress', to: 'waiting_parts', allowed: true },
    { from: 'in_progress', to: 'cancelled', allowed: true, requiresNote: true },
    { from: 'in_progress', to: 'pending', allowed: false },
    
    // From completed
    { from: 'completed', to: 'delivered', allowed: true },
    { from: 'completed', to: 'in_progress', allowed: true },
    { from: 'completed', to: 'pending', allowed: false },
    { from: 'completed', to: 'cancelled', allowed: false },
    
    // From delivered (final state)
    { from: 'delivered', to: 'pending', allowed: false },
    { from: 'delivered', to: 'in_progress', allowed: false },
    { from: 'delivered', to: 'cancelled', allowed: false },
    
    // From cancelled (final state)
    { from: 'cancelled', to: 'pending', allowed: false },
    { from: 'cancelled', to: 'in_progress', allowed: false },
  ];

  const isTransitionAllowed = (from: RepairStatus, to: RepairStatus): boolean => {
    const transition = allowedTransitions.find(t => t.from === from && t.to === to);
    return transition?.allowed ?? false;
  };

  const requiresNote = (from: RepairStatus, to: RepairStatus): boolean => {
    const transition = allowedTransitions.find(t => t.from === from && t.to === to);
    return transition?.requiresNote ?? false;
  };

  describe('From pending status', () => {
    it('should allow transition to diagnosed', () => {
      expect(isTransitionAllowed('pending', 'diagnosed')).toBe(true);
    });

    it('should allow transition to cancelled', () => {
      expect(isTransitionAllowed('pending', 'cancelled')).toBe(true);
    });

    it('should not allow direct transition to completed', () => {
      expect(isTransitionAllowed('pending', 'completed')).toBe(false);
    });

    it('should not allow direct transition to delivered', () => {
      expect(isTransitionAllowed('pending', 'delivered')).toBe(false);
    });

    it('should not allow direct transition to in_progress', () => {
      expect(isTransitionAllowed('pending', 'in_progress')).toBe(false);
    });
  });

  describe('From diagnosed status', () => {
    it('should allow transition to waiting_parts', () => {
      expect(isTransitionAllowed('diagnosed', 'waiting_parts')).toBe(true);
    });

    it('should allow transition to in_progress', () => {
      expect(isTransitionAllowed('diagnosed', 'in_progress')).toBe(true);
    });

    it('should allow transition to cancelled', () => {
      expect(isTransitionAllowed('diagnosed', 'cancelled')).toBe(true);
    });

    it('should not allow transition back to pending', () => {
      expect(isTransitionAllowed('diagnosed', 'pending')).toBe(false);
    });
  });

  describe('From waiting_parts status', () => {
    it('should allow transition to in_progress', () => {
      expect(isTransitionAllowed('waiting_parts', 'in_progress')).toBe(true);
    });

    it('should allow transition to cancelled', () => {
      expect(isTransitionAllowed('waiting_parts', 'cancelled')).toBe(true);
    });

    it('should not allow direct transition to completed', () => {
      expect(isTransitionAllowed('waiting_parts', 'completed')).toBe(false);
    });
  });

  describe('From in_progress status', () => {
    it('should allow transition to completed', () => {
      expect(isTransitionAllowed('in_progress', 'completed')).toBe(true);
    });

    it('should allow transition to waiting_parts', () => {
      expect(isTransitionAllowed('in_progress', 'waiting_parts')).toBe(true);
    });

    it('should allow transition to cancelled', () => {
      expect(isTransitionAllowed('in_progress', 'cancelled')).toBe(true);
    });

    it('should not allow transition back to pending', () => {
      expect(isTransitionAllowed('in_progress', 'pending')).toBe(false);
    });
  });

  describe('From completed status', () => {
    it('should allow transition to delivered', () => {
      expect(isTransitionAllowed('completed', 'delivered')).toBe(true);
    });

    it('should allow transition back to in_progress (rework)', () => {
      expect(isTransitionAllowed('completed', 'in_progress')).toBe(true);
    });

    it('should not allow transition to cancelled', () => {
      expect(isTransitionAllowed('completed', 'cancelled')).toBe(false);
    });
  });

  describe('Final states', () => {
    it('delivered should not allow any transitions', () => {
      expect(isTransitionAllowed('delivered', 'pending')).toBe(false);
      expect(isTransitionAllowed('delivered', 'in_progress')).toBe(false);
      expect(isTransitionAllowed('delivered', 'cancelled')).toBe(false);
    });

    it('cancelled should not allow any transitions', () => {
      expect(isTransitionAllowed('cancelled', 'pending')).toBe(false);
      expect(isTransitionAllowed('cancelled', 'in_progress')).toBe(false);
    });
  });

  describe('Note requirements', () => {
    it('should require note for cancellation from pending', () => {
      expect(requiresNote('pending', 'cancelled')).toBe(true);
    });

    it('should require note for cancellation from diagnosed', () => {
      expect(requiresNote('diagnosed', 'cancelled')).toBe(true);
    });

    it('should require note for cancellation from in_progress', () => {
      expect(requiresNote('in_progress', 'cancelled')).toBe(true);
    });

    it('should not require note for normal progression', () => {
      expect(requiresNote('pending', 'diagnosed')).toBe(false);
      expect(requiresNote('diagnosed', 'in_progress')).toBe(false);
      expect(requiresNote('in_progress', 'completed')).toBe(false);
    });
  });
});

// ============================================
// STATUS DISPLAY TESTS
// ============================================

describe('Status Display', () => {
  const getStatusLabel = (status: RepairStatus): string => {
    const labels: Record<RepairStatus, string> = {
      pending: 'في الانتظار',
      diagnosed: 'تم التشخيص',
      waiting_parts: 'في انتظار القطع',
      in_progress: 'جاري الإصلاح',
      completed: 'تم الإصلاح',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
    };
    return labels[status];
  };

  const getStatusColor = (status: RepairStatus): string => {
    const colors: Record<RepairStatus, string> = {
      pending: 'yellow',
      diagnosed: 'blue',
      waiting_parts: 'orange',
      in_progress: 'purple',
      completed: 'green',
      delivered: 'gray',
      cancelled: 'red',
    };
    return colors[status];
  };

  it('should return correct Arabic labels', () => {
    expect(getStatusLabel('pending')).toBe('في الانتظار');
    expect(getStatusLabel('completed')).toBe('تم الإصلاح');
    expect(getStatusLabel('delivered')).toBe('تم التسليم');
  });

  it('should return correct colors', () => {
    expect(getStatusColor('pending')).toBe('yellow');
    expect(getStatusColor('completed')).toBe('green');
    expect(getStatusColor('cancelled')).toBe('red');
  });
});

// ============================================
// STATUS HISTORY TESTS
// ============================================

describe('Status History', () => {
  interface StatusChange {
    from_status: RepairStatus;
    to_status: RepairStatus;
    changed_at: string;
    changed_by: string;
    note?: string;
  }

  it('should track status changes', () => {
    const history: StatusChange[] = [
      { from_status: 'pending', to_status: 'diagnosed', changed_at: '2024-01-01T10:00:00', changed_by: 'tech1' },
      { from_status: 'diagnosed', to_status: 'in_progress', changed_at: '2024-01-01T11:00:00', changed_by: 'tech1' },
      { from_status: 'in_progress', to_status: 'completed', changed_at: '2024-01-01T14:00:00', changed_by: 'tech1' },
    ];

    expect(history).toHaveLength(3);
    expect(history[0].to_status).toBe('diagnosed');
    expect(history[2].to_status).toBe('completed');
  });

  it('should include notes for cancellation', () => {
    const history: StatusChange[] = [
      { from_status: 'pending', to_status: 'diagnosed', changed_at: '2024-01-01T10:00:00', changed_by: 'tech1' },
      { from_status: 'diagnosed', to_status: 'cancelled', changed_at: '2024-01-01T11:00:00', changed_by: 'tech1', note: 'العميل رفض التكلفة' },
    ];

    expect(history[1].note).toBeDefined();
    expect(history[1].note).toContain('العميل');
  });
});

// ============================================
// WORKFLOW VALIDATION TESTS
// ============================================

describe('Workflow Validation', () => {
  interface RepairTicket {
    id: number;
    status: RepairStatus;
    diagnosis?: string;
    estimated_cost?: number;
    actual_cost?: number;
    parts_used?: { part_id: number; quantity: number }[];
  }

  const validateStatusChange = (ticket: RepairTicket, newStatus: RepairStatus): { valid: boolean; error?: string } => {
    // Diagnosis required before moving from diagnosed
    if (ticket.status === 'pending' && newStatus === 'diagnosed' && !ticket.diagnosis) {
      return { valid: false, error: 'يجب إضافة التشخيص أولاً' };
    }

    // Estimated cost required for in_progress
    if ((ticket.status === 'diagnosed' || ticket.status === 'waiting_parts') && 
        newStatus === 'in_progress' && 
        (!ticket.estimated_cost || ticket.estimated_cost <= 0)) {
      return { valid: false, error: 'يجب تحديد التكلفة المتوقعة' };
    }

    // Actual cost required for completion
    if (ticket.status === 'in_progress' && newStatus === 'completed' && 
        (!ticket.actual_cost || ticket.actual_cost <= 0)) {
      return { valid: false, error: 'يجب تحديد التكلفة الفعلية' };
    }

    return { valid: true };
  };

  it('should require diagnosis before moving from pending', () => {
    const ticket: RepairTicket = { id: 1, status: 'pending' };
    const result = validateStatusChange(ticket, 'diagnosed');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('التشخيص');
  });

  it('should allow diagnosed with diagnosis present', () => {
    const ticket: RepairTicket = { id: 1, status: 'pending', diagnosis: 'شاشة مكسورة' };
    const result = validateStatusChange(ticket, 'diagnosed');
    expect(result.valid).toBe(true);
  });

  it('should require estimated cost before in_progress', () => {
    const ticket: RepairTicket = { id: 1, status: 'diagnosed', diagnosis: 'test' };
    const result = validateStatusChange(ticket, 'in_progress');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('التكلفة المتوقعة');
  });

  it('should require actual cost before completion', () => {
    const ticket: RepairTicket = { id: 1, status: 'in_progress', estimated_cost: 500 };
    const result = validateStatusChange(ticket, 'completed');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('التكلفة الفعلية');
  });

  it('should allow completion with actual cost', () => {
    const ticket: RepairTicket = { id: 1, status: 'in_progress', estimated_cost: 500, actual_cost: 450 };
    const result = validateStatusChange(ticket, 'completed');
    expect(result.valid).toBe(true);
  });
});

// ============================================
// PRIORITY TESTS
// ============================================

describe('Repair Priority', () => {
  type Priority = 'low' | 'normal' | 'high' | 'urgent';

  const getPriorityWeight = (priority: Priority): number => {
    const weights: Record<Priority, number> = {
      low: 1,
      normal: 2,
      high: 3,
      urgent: 4,
    };
    return weights[priority];
  };

  const sortByPriority = <T extends { priority: Priority; created_at: string }>(tickets: T[]): T[] => {
    return [...tickets].sort((a, b) => {
      const priorityDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  };

  it('should assign correct priority weights', () => {
    expect(getPriorityWeight('low')).toBe(1);
    expect(getPriorityWeight('normal')).toBe(2);
    expect(getPriorityWeight('high')).toBe(3);
    expect(getPriorityWeight('urgent')).toBe(4);
  });

  it('should sort tickets by priority', () => {
    const tickets = [
      { id: 1, priority: 'low' as Priority, created_at: '2024-01-01' },
      { id: 2, priority: 'urgent' as Priority, created_at: '2024-01-02' },
      { id: 3, priority: 'normal' as Priority, created_at: '2024-01-01' },
    ];

    const sorted = sortByPriority(tickets);
    expect(sorted[0].priority).toBe('urgent');
    expect(sorted[1].priority).toBe('normal');
    expect(sorted[2].priority).toBe('low');
  });

  it('should sort by date when priority is same', () => {
    const tickets = [
      { id: 1, priority: 'high' as Priority, created_at: '2024-01-03' },
      { id: 2, priority: 'high' as Priority, created_at: '2024-01-01' },
      { id: 3, priority: 'high' as Priority, created_at: '2024-01-02' },
    ];

    const sorted = sortByPriority(tickets);
    expect(sorted[0].created_at).toBe('2024-01-01');
    expect(sorted[1].created_at).toBe('2024-01-02');
    expect(sorted[2].created_at).toBe('2024-01-03');
  });
});

/**
 * MAYO FIX - Comprehensive Ticket & Technician Tests
 * 
 * Tests for ticket management and technician assignment including:
 * - Ticket number generation
 * - Technician assignment
 * - Queue management
 * - SLA tracking
 */

import { describe, it, expect } from 'vitest';

// ============================================
// TICKET NUMBER GENERATION TESTS
// ============================================

describe('Ticket Number Generation', () => {
  const generateTicketNumber = (lastNumber: number, date: Date = new Date()): string => {
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const sequence = String(lastNumber + 1).padStart(4, '0');
    return `TKT-${year}${month}${day}-${sequence}`;
  };

  it('should generate sequential ticket numbers', () => {
    const date = new Date('2024-03-15');
    expect(generateTicketNumber(0, date)).toBe('TKT-240315-0001');
    expect(generateTicketNumber(9, date)).toBe('TKT-240315-0010');
    expect(generateTicketNumber(99, date)).toBe('TKT-240315-0100');
  });

  it('should include date in ticket number', () => {
    const jan = new Date('2024-01-05');
    const dec = new Date('2024-12-25');
    expect(generateTicketNumber(0, jan)).toContain('240105');
    expect(generateTicketNumber(0, dec)).toContain('241225');
  });

  it('should handle high sequence numbers', () => {
    const date = new Date('2024-03-15');
    expect(generateTicketNumber(9999, date)).toBe('TKT-240315-10000');
  });
});

// ============================================
// TECHNICIAN ASSIGNMENT TESTS
// ============================================

describe('Technician Assignment', () => {
  interface Technician {
    id: number;
    name: string;
    specializations: string[];
    active_tickets: number;
    max_tickets: number;
    is_available: boolean;
  }

  const findAvailableTechnician = (
    technicians: Technician[],
    deviceType: string
  ): Technician | null => {
    const available = technicians
      .filter(t => t.is_available && t.active_tickets < t.max_tickets)
      .filter(t => t.specializations.length === 0 || t.specializations.includes(deviceType))
      .sort((a, b) => a.active_tickets - b.active_tickets);

    return available[0] || null;
  };

  it('should find technician with fewest tickets', () => {
    const technicians: Technician[] = [
      { id: 1, name: 'Tech 1', specializations: [], active_tickets: 5, max_tickets: 10, is_available: true },
      { id: 2, name: 'Tech 2', specializations: [], active_tickets: 2, max_tickets: 10, is_available: true },
      { id: 3, name: 'Tech 3', specializations: [], active_tickets: 8, max_tickets: 10, is_available: true },
    ];

    const tech = findAvailableTechnician(technicians, 'phone');
    expect(tech?.id).toBe(2);
  });

  it('should filter by specialization', () => {
    const technicians: Technician[] = [
      { id: 1, name: 'Phone Expert', specializations: ['phone', 'tablet'], active_tickets: 5, max_tickets: 10, is_available: true },
      { id: 2, name: 'Laptop Expert', specializations: ['laptop'], active_tickets: 2, max_tickets: 10, is_available: true },
    ];

    const phoneTech = findAvailableTechnician(technicians, 'phone');
    expect(phoneTech?.id).toBe(1);

    const laptopTech = findAvailableTechnician(technicians, 'laptop');
    expect(laptopTech?.id).toBe(2);
  });

  it('should exclude unavailable technicians', () => {
    const technicians: Technician[] = [
      { id: 1, name: 'Tech 1', specializations: [], active_tickets: 5, max_tickets: 10, is_available: false },
      { id: 2, name: 'Tech 2', specializations: [], active_tickets: 8, max_tickets: 10, is_available: true },
    ];

    const tech = findAvailableTechnician(technicians, 'phone');
    expect(tech?.id).toBe(2);
  });

  it('should exclude technicians at max capacity', () => {
    const technicians: Technician[] = [
      { id: 1, name: 'Tech 1', specializations: [], active_tickets: 10, max_tickets: 10, is_available: true },
      { id: 2, name: 'Tech 2', specializations: [], active_tickets: 5, max_tickets: 10, is_available: true },
    ];

    const tech = findAvailableTechnician(technicians, 'phone');
    expect(tech?.id).toBe(2);
  });

  it('should return null when no technician available', () => {
    const technicians: Technician[] = [
      { id: 1, name: 'Tech 1', specializations: [], active_tickets: 10, max_tickets: 10, is_available: true },
    ];

    const tech = findAvailableTechnician(technicians, 'phone');
    expect(tech).toBeNull();
  });

  it('should allow general technicians for any device', () => {
    const technicians: Technician[] = [
      { id: 1, name: 'General Tech', specializations: [], active_tickets: 0, max_tickets: 10, is_available: true },
    ];

    expect(findAvailableTechnician(technicians, 'phone')?.id).toBe(1);
    expect(findAvailableTechnician(technicians, 'laptop')?.id).toBe(1);
    expect(findAvailableTechnician(technicians, 'tablet')?.id).toBe(1);
  });
});

// ============================================
// QUEUE MANAGEMENT TESTS
// ============================================

describe('Queue Management', () => {
  interface QueuedTicket {
    id: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    created_at: string;
    estimated_time: number; // minutes
  }

  const getPriorityWeight = (priority: QueuedTicket['priority']): number => {
    const weights = { urgent: 4, high: 3, normal: 2, low: 1 };
    return weights[priority];
  };

  const sortQueue = (tickets: QueuedTicket[]): QueuedTicket[] => {
    return [...tickets].sort((a, b) => {
      const priorityDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  };

  const calculateQueuePosition = (tickets: QueuedTicket[], ticketId: number): number => {
    const sorted = sortQueue(tickets);
    const index = sorted.findIndex(t => t.id === ticketId);
    return index === -1 ? -1 : index + 1;
  };

  const estimateWaitTime = (tickets: QueuedTicket[], ticketId: number): number => {
    const sorted = sortQueue(tickets);
    const index = sorted.findIndex(t => t.id === ticketId);
    if (index === -1) return -1;

    let totalTime = 0;
    for (let i = 0; i < index; i++) {
      totalTime += sorted[i].estimated_time;
    }
    return totalTime;
  };

  it('should sort queue by priority', () => {
    const tickets: QueuedTicket[] = [
      { id: 1, priority: 'low', created_at: '2024-01-01T10:00:00', estimated_time: 30 },
      { id: 2, priority: 'urgent', created_at: '2024-01-01T11:00:00', estimated_time: 60 },
      { id: 3, priority: 'normal', created_at: '2024-01-01T09:00:00', estimated_time: 45 },
    ];

    const sorted = sortQueue(tickets);
    expect(sorted[0].priority).toBe('urgent');
    expect(sorted[1].priority).toBe('normal');
    expect(sorted[2].priority).toBe('low');
  });

  it('should sort by date when same priority', () => {
    const tickets: QueuedTicket[] = [
      { id: 1, priority: 'normal', created_at: '2024-01-01T12:00:00', estimated_time: 30 },
      { id: 2, priority: 'normal', created_at: '2024-01-01T10:00:00', estimated_time: 30 },
      { id: 3, priority: 'normal', created_at: '2024-01-01T11:00:00', estimated_time: 30 },
    ];

    const sorted = sortQueue(tickets);
    expect(sorted[0].id).toBe(2); // Earliest
    expect(sorted[1].id).toBe(3);
    expect(sorted[2].id).toBe(1); // Latest
  });

  it('should calculate queue position', () => {
    const tickets: QueuedTicket[] = [
      { id: 1, priority: 'low', created_at: '2024-01-01T10:00:00', estimated_time: 30 },
      { id: 2, priority: 'urgent', created_at: '2024-01-01T11:00:00', estimated_time: 60 },
      { id: 3, priority: 'normal', created_at: '2024-01-01T09:00:00', estimated_time: 45 },
    ];

    expect(calculateQueuePosition(tickets, 2)).toBe(1); // Urgent first
    expect(calculateQueuePosition(tickets, 3)).toBe(2); // Normal second
    expect(calculateQueuePosition(tickets, 1)).toBe(3); // Low last
  });

  it('should estimate wait time', () => {
    const tickets: QueuedTicket[] = [
      { id: 1, priority: 'high', created_at: '2024-01-01T10:00:00', estimated_time: 30 },
      { id: 2, priority: 'normal', created_at: '2024-01-01T11:00:00', estimated_time: 60 },
      { id: 3, priority: 'low', created_at: '2024-01-01T09:00:00', estimated_time: 45 },
    ];

    expect(estimateWaitTime(tickets, 1)).toBe(0); // First in queue
    expect(estimateWaitTime(tickets, 2)).toBe(30); // After ticket 1
    expect(estimateWaitTime(tickets, 3)).toBe(90); // After tickets 1 and 2
  });

  it('should return -1 for non-existent ticket', () => {
    const tickets: QueuedTicket[] = [];
    expect(calculateQueuePosition(tickets, 999)).toBe(-1);
    expect(estimateWaitTime(tickets, 999)).toBe(-1);
  });
});

// ============================================
// SLA TRACKING TESTS
// ============================================

describe('SLA Tracking', () => {
  interface SLAConfig {
    priority: 'low' | 'normal' | 'high' | 'urgent';
    response_hours: number;
    resolution_hours: number;
  }

  const slaConfigs: SLAConfig[] = [
    { priority: 'urgent', response_hours: 1, resolution_hours: 4 },
    { priority: 'high', response_hours: 4, resolution_hours: 24 },
    { priority: 'normal', response_hours: 8, resolution_hours: 48 },
    { priority: 'low', response_hours: 24, resolution_hours: 72 },
  ];

  const getSLAConfig = (priority: SLAConfig['priority']): SLAConfig | undefined => {
    return slaConfigs.find(s => s.priority === priority);
  };

  const calculateSLADeadline = (createdAt: Date, hours: number): Date => {
    return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
  };

  const isSLABreached = (deadline: Date, currentTime: Date = new Date()): boolean => {
    return currentTime > deadline;
  };

  const calculateSLARemaining = (deadline: Date, currentTime: Date = new Date()): number => {
    const remaining = deadline.getTime() - currentTime.getTime();
    return Math.max(0, Math.ceil(remaining / (60 * 60 * 1000))); // Hours
  };

  it('should get SLA config for each priority', () => {
    expect(getSLAConfig('urgent')?.response_hours).toBe(1);
    expect(getSLAConfig('high')?.response_hours).toBe(4);
    expect(getSLAConfig('normal')?.resolution_hours).toBe(48);
    expect(getSLAConfig('low')?.resolution_hours).toBe(72);
  });

  it('should calculate SLA deadline', () => {
    const created = new Date('2024-01-01T10:00:00Z');
    const deadline = calculateSLADeadline(created, 4);
    expect(deadline.toISOString()).toBe('2024-01-01T14:00:00.000Z');
  });

  it('should detect SLA breach', () => {
    const deadline = new Date('2024-01-01T14:00:00');
    const beforeDeadline = new Date('2024-01-01T13:00:00');
    const afterDeadline = new Date('2024-01-01T15:00:00');

    expect(isSLABreached(deadline, beforeDeadline)).toBe(false);
    expect(isSLABreached(deadline, afterDeadline)).toBe(true);
  });

  it('should calculate remaining time', () => {
    const deadline = new Date('2024-01-01T14:00:00');
    const current = new Date('2024-01-01T10:00:00');

    expect(calculateSLARemaining(deadline, current)).toBe(4);
  });

  it('should return 0 when SLA is breached', () => {
    const deadline = new Date('2024-01-01T14:00:00');
    const current = new Date('2024-01-01T16:00:00');

    expect(calculateSLARemaining(deadline, current)).toBe(0);
  });

  describe('SLA status', () => {
    type SLAStatus = 'on_track' | 'at_risk' | 'breached';

    const getSLAStatus = (deadline: Date, currentTime: Date = new Date()): SLAStatus => {
      const remaining = calculateSLARemaining(deadline, currentTime);
      const totalHours = (deadline.getTime() - currentTime.getTime()) / (60 * 60 * 1000);

      if (remaining === 0) return 'breached';
      if (remaining <= 2 || remaining < totalHours * 0.25) return 'at_risk';
      return 'on_track';
    };

    it('should identify on_track status', () => {
      const deadline = new Date('2024-01-01T20:00:00');
      const current = new Date('2024-01-01T10:00:00');
      expect(getSLAStatus(deadline, current)).toBe('on_track');
    });

    it('should identify at_risk status', () => {
      const deadline = new Date('2024-01-01T12:00:00');
      const current = new Date('2024-01-01T10:30:00');
      expect(getSLAStatus(deadline, current)).toBe('at_risk');
    });

    it('should identify breached status', () => {
      const deadline = new Date('2024-01-01T10:00:00');
      const current = new Date('2024-01-01T12:00:00');
      expect(getSLAStatus(deadline, current)).toBe('breached');
    });
  });
});

// ============================================
// TECHNICIAN PERFORMANCE TESTS
// ============================================

describe('Technician Performance', () => {
  interface PerformanceData {
    technician_id: number;
    tickets_completed: number;
    total_repair_time: number; // minutes
    customer_ratings: number[];
    rework_count: number;
  }

  const calculateAverageRepairTime = (data: PerformanceData): number => {
    if (data.tickets_completed === 0) return 0;
    return Math.round(data.total_repair_time / data.tickets_completed);
  };

  const calculateAverageRating = (ratings: number[]): number => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((a, b) => a + b, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  };

  const calculateReworkRate = (data: PerformanceData): number => {
    if (data.tickets_completed === 0) return 0;
    return Math.round((data.rework_count / data.tickets_completed) * 100 * 10) / 10;
  };

  const calculatePerformanceScore = (data: PerformanceData): number => {
    const avgRating = calculateAverageRating(data.customer_ratings);
    const reworkRate = calculateReworkRate(data);
    
    // Score = (Rating * 20) - (Rework Rate)
    // Max score = 100 (5 * 20 = 100, 0% rework)
    const score = (avgRating * 20) - reworkRate;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  it('should calculate average repair time', () => {
    const data: PerformanceData = {
      technician_id: 1,
      tickets_completed: 10,
      total_repair_time: 600,
      customer_ratings: [],
      rework_count: 0,
    };

    expect(calculateAverageRepairTime(data)).toBe(60);
  });

  it('should handle zero tickets', () => {
    const data: PerformanceData = {
      technician_id: 1,
      tickets_completed: 0,
      total_repair_time: 0,
      customer_ratings: [],
      rework_count: 0,
    };

    expect(calculateAverageRepairTime(data)).toBe(0);
    expect(calculateReworkRate(data)).toBe(0);
  });

  it('should calculate average rating', () => {
    expect(calculateAverageRating([5, 5, 4, 5, 4])).toBe(4.6);
    expect(calculateAverageRating([3, 4, 5])).toBe(4);
    expect(calculateAverageRating([])).toBe(0);
  });

  it('should calculate rework rate', () => {
    const data: PerformanceData = {
      technician_id: 1,
      tickets_completed: 100,
      total_repair_time: 6000,
      customer_ratings: [],
      rework_count: 5,
    };

    expect(calculateReworkRate(data)).toBe(5);
  });

  it('should calculate performance score', () => {
    const data: PerformanceData = {
      technician_id: 1,
      tickets_completed: 100,
      total_repair_time: 6000,
      customer_ratings: [5, 5, 5, 5, 5],
      rework_count: 0,
    };

    expect(calculatePerformanceScore(data)).toBe(100);
  });

  it('should penalize rework in performance score', () => {
    const data: PerformanceData = {
      technician_id: 1,
      tickets_completed: 100,
      total_repair_time: 6000,
      customer_ratings: [5, 5, 5, 5, 5],
      rework_count: 10, // 10% rework
    };

    expect(calculatePerformanceScore(data)).toBe(90);
  });
});

// ============================================
// WORK HOURS TESTS
// ============================================

describe('Work Hours', () => {
  interface WorkHours {
    day: number; // 0-6 (Sunday-Saturday)
    open: string; // HH:mm
    close: string; // HH:mm
  }

  const workSchedule: WorkHours[] = [
    { day: 0, open: '10:00', close: '22:00' }, // Sunday
    { day: 1, open: '10:00', close: '22:00' }, // Monday
    { day: 2, open: '10:00', close: '22:00' }, // Tuesday
    { day: 3, open: '10:00', close: '22:00' }, // Wednesday
    { day: 4, open: '10:00', close: '22:00' }, // Thursday
    { day: 5, open: '00:00', close: '00:00' }, // Friday (closed)
    { day: 6, open: '12:00', close: '20:00' }, // Saturday
  ];

  const isOpen = (schedule: WorkHours[], date: Date): boolean => {
    const daySchedule = schedule.find(s => s.day === date.getDay());
    if (!daySchedule || (daySchedule.open === '00:00' && daySchedule.close === '00:00')) {
      return false;
    }

    const currentTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return currentTime >= daySchedule.open && currentTime < daySchedule.close;
  };

  it('should check if open during work hours', () => {
    const monday2pm = new Date('2024-01-01T14:00:00'); // Monday
    monday2pm.setDate(monday2pm.getDate() + (1 - monday2pm.getDay() + 7) % 7); // Ensure Monday
    expect(isOpen(workSchedule, monday2pm)).toBe(true);
  });

  it('should check if closed on Friday', () => {
    const friday = new Date('2024-01-05T14:00:00'); // Friday
    while (friday.getDay() !== 5) {
      friday.setDate(friday.getDate() + 1);
    }
    expect(isOpen(workSchedule, friday)).toBe(false);
  });

  it('should check if closed outside hours', () => {
    const monday8am = new Date('2024-01-01T08:00:00');
    while (monday8am.getDay() !== 1) {
      monday8am.setDate(monday8am.getDate() + 1);
    }
    expect(isOpen(workSchedule, monday8am)).toBe(false);
  });
});

// ============================================
// TICKET SEARCH TESTS
// ============================================

describe('Ticket Search', () => {
  interface Ticket {
    id: number;
    number: string;
    customer_name: string;
    customer_phone: string;
    device_type: string;
    device_model: string;
    status: string;
  }

  const searchTickets = (tickets: Ticket[], query: string): Ticket[] => {
    const lowerQuery = query.toLowerCase();
    return tickets.filter(t =>
      t.number.toLowerCase().includes(lowerQuery) ||
      t.customer_name.toLowerCase().includes(lowerQuery) ||
      t.customer_phone.includes(query) ||
      t.device_type.toLowerCase().includes(lowerQuery) ||
      t.device_model.toLowerCase().includes(lowerQuery)
    );
  };

  const tickets: Ticket[] = [
    { id: 1, number: 'TKT-240101-0001', customer_name: 'أحمد محمد', customer_phone: '01012345678', device_type: 'phone', device_model: 'iPhone 13', status: 'pending' },
    { id: 2, number: 'TKT-240101-0002', customer_name: 'محمد علي', customer_phone: '01098765432', device_type: 'laptop', device_model: 'MacBook Pro', status: 'in_progress' },
    { id: 3, number: 'TKT-240102-0001', customer_name: 'سارة أحمد', customer_phone: '01122334455', device_type: 'phone', device_model: 'Samsung S23', status: 'completed' },
  ];

  it('should search by ticket number', () => {
    const result = searchTickets(tickets, 'TKT-240101-0001');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('should search by customer name', () => {
    const result = searchTickets(tickets, 'أحمد');
    expect(result).toHaveLength(2);
  });

  it('should search by phone number', () => {
    const result = searchTickets(tickets, '01098765432');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('should search by device model', () => {
    const result = searchTickets(tickets, 'iPhone');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('should be case insensitive', () => {
    const result = searchTickets(tickets, 'macbook');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('should return empty for no matches', () => {
    const result = searchTickets(tickets, 'nonexistent');
    expect(result).toHaveLength(0);
  });
});

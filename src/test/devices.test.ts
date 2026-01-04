/**
 * MAYO FIX - Comprehensive Device & Parts Tests
 * 
 * Tests for device management and parts inventory including:
 * - Device type validation
 * - Serial number handling
 * - Parts inventory
 * - Accessories tracking
 */

import { describe, it, expect } from 'vitest';

// ============================================
// DEVICE TYPE TESTS
// ============================================

describe('Device Types', () => {
  type DeviceType = 'phone' | 'tablet' | 'laptop' | 'desktop' | 'gaming_console' | 'other';

  interface DeviceTypeConfig {
    type: DeviceType;
    label: string;
    icon: string;
    commonBrands: string[];
    requiresSerial: boolean;
  }

  const deviceTypes: DeviceTypeConfig[] = [
    { type: 'phone', label: 'هاتف', icon: 'smartphone', commonBrands: ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'Oppo', 'Realme'], requiresSerial: true },
    { type: 'tablet', label: 'تابلت', icon: 'tablet', commonBrands: ['Apple', 'Samsung', 'Huawei', 'Lenovo'], requiresSerial: true },
    { type: 'laptop', label: 'لابتوب', icon: 'laptop', commonBrands: ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer'], requiresSerial: true },
    { type: 'desktop', label: 'كمبيوتر', icon: 'desktop', commonBrands: ['Dell', 'HP', 'Lenovo', 'Custom'], requiresSerial: false },
    { type: 'gaming_console', label: 'جهاز ألعاب', icon: 'gamepad', commonBrands: ['Sony', 'Microsoft', 'Nintendo'], requiresSerial: true },
    { type: 'other', label: 'أخرى', icon: 'device', commonBrands: [], requiresSerial: false },
  ];

  const getDeviceConfig = (type: DeviceType): DeviceTypeConfig | undefined => {
    return deviceTypes.find(d => d.type === type);
  };

  it('should have configuration for all device types', () => {
    const types: DeviceType[] = ['phone', 'tablet', 'laptop', 'desktop', 'gaming_console', 'other'];
    types.forEach(type => {
      expect(getDeviceConfig(type)).toBeDefined();
    });
  });

  it('should return correct Arabic labels', () => {
    expect(getDeviceConfig('phone')?.label).toBe('هاتف');
    expect(getDeviceConfig('laptop')?.label).toBe('لابتوب');
    expect(getDeviceConfig('gaming_console')?.label).toBe('جهاز ألعاب');
  });

  it('should have common brands for phones', () => {
    const phoneConfig = getDeviceConfig('phone');
    expect(phoneConfig?.commonBrands).toContain('Apple');
    expect(phoneConfig?.commonBrands).toContain('Samsung');
  });

  it('should require serial for portable devices', () => {
    expect(getDeviceConfig('phone')?.requiresSerial).toBe(true);
    expect(getDeviceConfig('tablet')?.requiresSerial).toBe(true);
    expect(getDeviceConfig('laptop')?.requiresSerial).toBe(true);
  });

  it('should not require serial for desktop', () => {
    expect(getDeviceConfig('desktop')?.requiresSerial).toBe(false);
  });
});

// ============================================
// DEVICE VALIDATION TESTS
// ============================================

describe('Device Validation', () => {
  interface Device {
    type: string;
    brand: string;
    model: string;
    serial_number?: string;
    imei?: string;
    color?: string;
    condition?: string;
    accessories?: string[];
    problem_description: string;
  }

  const validateDevice = (device: Device, requireSerial: boolean): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!device.type) {
      errors.type = 'نوع الجهاز مطلوب';
    }

    if (!device.brand || device.brand.trim().length < 2) {
      errors.brand = 'ماركة الجهاز مطلوبة';
    }

    if (!device.model || device.model.trim().length < 2) {
      errors.model = 'موديل الجهاز مطلوب';
    }

    if (requireSerial && (!device.serial_number || device.serial_number.trim().length < 5)) {
      errors.serial_number = 'الرقم التسلسلي مطلوب';
    }

    if (device.imei && !/^\d{15}$/.test(device.imei)) {
      errors.imei = 'رقم IMEI يجب أن يكون 15 رقم';
    }

    if (!device.problem_description || device.problem_description.trim().length < 10) {
      errors.problem_description = 'وصف المشكلة يجب أن يكون 10 أحرف على الأقل';
    }

    return errors;
  };

  it('should validate required type', () => {
    const device: Device = { type: '', brand: 'Apple', model: 'iPhone', problem_description: 'الشاشة مكسورة' };
    const errors = validateDevice(device, false);
    expect(errors.type).toBeDefined();
  });

  it('should validate required brand', () => {
    const device: Device = { type: 'phone', brand: '', model: 'iPhone', problem_description: 'الشاشة مكسورة' };
    const errors = validateDevice(device, false);
    expect(errors.brand).toBeDefined();
  });

  it('should validate required model', () => {
    const device: Device = { type: 'phone', brand: 'Apple', model: '', problem_description: 'الشاشة مكسورة' };
    const errors = validateDevice(device, false);
    expect(errors.model).toBeDefined();
  });

  it('should validate serial number when required', () => {
    const device: Device = { type: 'phone', brand: 'Apple', model: 'iPhone 13', problem_description: 'الشاشة مكسورة' };
    const errors = validateDevice(device, true);
    expect(errors.serial_number).toBeDefined();
  });

  it('should not require serial when not mandatory', () => {
    const device: Device = { type: 'phone', brand: 'Apple', model: 'iPhone 13', problem_description: 'الشاشة مكسورة' };
    const errors = validateDevice(device, false);
    expect(errors.serial_number).toBeUndefined();
  });

  it('should validate IMEI format', () => {
    const device: Device = { type: 'phone', brand: 'Apple', model: 'iPhone', imei: '12345', problem_description: 'الشاشة مكسورة' };
    const errors = validateDevice(device, false);
    expect(errors.imei).toBeDefined();
  });

  it('should accept valid IMEI', () => {
    const device: Device = { type: 'phone', brand: 'Apple', model: 'iPhone', imei: '123456789012345', problem_description: 'الشاشة مكسورة' };
    const errors = validateDevice(device, false);
    expect(errors.imei).toBeUndefined();
  });

  it('should validate problem description length', () => {
    const device: Device = { type: 'phone', brand: 'Apple', model: 'iPhone', problem_description: 'مكسور' };
    const errors = validateDevice(device, false);
    expect(errors.problem_description).toBeDefined();
  });

  it('should pass complete valid device', () => {
    const device: Device = {
      type: 'phone',
      brand: 'Apple',
      model: 'iPhone 13 Pro',
      serial_number: 'ABCD1234567890',
      imei: '123456789012345',
      color: 'أسود',
      condition: 'جيدة',
      accessories: ['شاحن', 'سماعة'],
      problem_description: 'الشاشة مكسورة ولا تعمل باللمس',
    };
    const errors = validateDevice(device, true);
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

// ============================================
// IMEI VALIDATION TESTS
// ============================================

describe('IMEI Validation', () => {
  const isValidIMEI = (imei: string): boolean => {
    if (!/^\d{15}$/.test(imei)) return false;

    // Luhn algorithm check
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let digit = parseInt(imei[i]);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  };

  it('should reject non-numeric IMEI', () => {
    expect(isValidIMEI('12345678901234A')).toBe(false);
  });

  it('should reject wrong length IMEI', () => {
    expect(isValidIMEI('1234567890123')).toBe(false);
    expect(isValidIMEI('1234567890123456')).toBe(false);
  });

  it('should validate IMEI checksum', () => {
    // Valid IMEI (passes Luhn check)
    expect(isValidIMEI('490154203237518')).toBe(true);
  });

  it('should reject invalid checksum', () => {
    expect(isValidIMEI('490154203237519')).toBe(false);
  });
});

// ============================================
// PARTS INVENTORY TESTS
// ============================================

describe('Parts Inventory', () => {
  interface Part {
    id: number;
    sku: string;
    name: string;
    category: string;
    compatible_devices: string[];
    quantity: number;
    min_quantity: number;
    cost_price: number;
    selling_price: number;
  }

  const validatePart = (part: Partial<Part>): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!part.sku || part.sku.trim().length < 3) {
      errors.sku = 'رمز القطعة مطلوب';
    }

    if (!part.name || part.name.trim().length < 3) {
      errors.name = 'اسم القطعة مطلوب';
    }

    if (!part.category) {
      errors.category = 'التصنيف مطلوب';
    }

    if (part.cost_price !== undefined && part.cost_price < 0) {
      errors.cost_price = 'سعر التكلفة لا يمكن أن يكون سالب';
    }

    if (part.selling_price !== undefined && part.selling_price < 0) {
      errors.selling_price = 'سعر البيع لا يمكن أن يكون سالب';
    }

    if (part.cost_price !== undefined && part.selling_price !== undefined && 
        part.selling_price < part.cost_price) {
      errors.selling_price = 'سعر البيع يجب أن يكون أكبر من سعر التكلفة';
    }

    return errors;
  };

  it('should validate required SKU', () => {
    const errors = validatePart({ name: 'Test', category: 'Screens' });
    expect(errors.sku).toBeDefined();
  });

  it('should validate required name', () => {
    const errors = validatePart({ sku: 'PRT-001', category: 'Screens' });
    expect(errors.name).toBeDefined();
  });

  it('should validate selling price >= cost price', () => {
    const errors = validatePart({ 
      sku: 'PRT-001', 
      name: 'Test', 
      category: 'Screens',
      cost_price: 100,
      selling_price: 80
    });
    expect(errors.selling_price).toBeDefined();
  });

  describe('Stock status', () => {
    const getPartStockStatus = (quantity: number, minQuantity: number): string => {
      if (quantity === 0) return 'out_of_stock';
      if (quantity <= minQuantity) return 'low_stock';
      return 'in_stock';
    };

    it('should identify out of stock', () => {
      expect(getPartStockStatus(0, 5)).toBe('out_of_stock');
    });

    it('should identify low stock', () => {
      expect(getPartStockStatus(3, 5)).toBe('low_stock');
      expect(getPartStockStatus(5, 5)).toBe('low_stock');
    });

    it('should identify in stock', () => {
      expect(getPartStockStatus(10, 5)).toBe('in_stock');
    });
  });

  describe('Parts compatibility', () => {
    const findCompatibleParts = (parts: Part[], device: string): Part[] => {
      return parts.filter(p => 
        p.compatible_devices.some(d => 
          d.toLowerCase().includes(device.toLowerCase())
        )
      );
    };

    it('should find compatible parts', () => {
      const parts: Part[] = [
        { id: 1, sku: 'SCR-001', name: 'شاشة iPhone 13', category: 'Screens', compatible_devices: ['iPhone 13', 'iPhone 13 Pro'], quantity: 5, min_quantity: 2, cost_price: 200, selling_price: 350 },
        { id: 2, sku: 'SCR-002', name: 'شاشة iPhone 14', category: 'Screens', compatible_devices: ['iPhone 14'], quantity: 3, min_quantity: 2, cost_price: 250, selling_price: 400 },
        { id: 3, sku: 'BAT-001', name: 'بطارية iPhone 13', category: 'Batteries', compatible_devices: ['iPhone 13', 'iPhone 13 Mini'], quantity: 10, min_quantity: 5, cost_price: 50, selling_price: 100 },
      ];

      const compatible = findCompatibleParts(parts, 'iPhone 13');
      expect(compatible).toHaveLength(2);
      expect(compatible.map(p => p.sku)).toContain('SCR-001');
      expect(compatible.map(p => p.sku)).toContain('BAT-001');
    });

    it('should handle case insensitive search', () => {
      const parts: Part[] = [
        { id: 1, sku: 'SCR-001', name: 'شاشة', category: 'Screens', compatible_devices: ['IPHONE 13'], quantity: 5, min_quantity: 2, cost_price: 200, selling_price: 350 },
      ];

      const compatible = findCompatibleParts(parts, 'iphone 13');
      expect(compatible).toHaveLength(1);
    });
  });
});

// ============================================
// PARTS USAGE TESTS
// ============================================

describe('Parts Usage', () => {
  interface PartUsage {
    part_id: number;
    ticket_id: number;
    quantity: number;
    unit_price: number;
    used_at: string;
  }

  describe('Usage tracking', () => {
    const calculatePartUsageCost = (usages: PartUsage[]): number => {
      return usages.reduce((sum, u) => sum + (u.quantity * u.unit_price), 0);
    };

    it('should calculate total usage cost', () => {
      const usages: PartUsage[] = [
        { part_id: 1, ticket_id: 1, quantity: 1, unit_price: 350, used_at: '2024-01-01' },
        { part_id: 2, ticket_id: 1, quantity: 2, unit_price: 50, used_at: '2024-01-01' },
      ];

      expect(calculatePartUsageCost(usages)).toBe(450); // 350 + (2*50)
    });
  });

  describe('Most used parts analysis', () => {
    const getMostUsedParts = (usages: PartUsage[], limit: number = 5) => {
      const partUsage = new Map<number, number>();
      
      usages.forEach(u => {
        partUsage.set(u.part_id, (partUsage.get(u.part_id) || 0) + u.quantity);
      });

      return Array.from(partUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([part_id, total_used]) => ({ part_id, total_used }));
    };

    it('should rank parts by usage', () => {
      const usages: PartUsage[] = [
        { part_id: 1, ticket_id: 1, quantity: 5, unit_price: 100, used_at: '2024-01-01' },
        { part_id: 2, ticket_id: 2, quantity: 10, unit_price: 50, used_at: '2024-01-02' },
        { part_id: 1, ticket_id: 3, quantity: 3, unit_price: 100, used_at: '2024-01-03' },
        { part_id: 3, ticket_id: 4, quantity: 2, unit_price: 200, used_at: '2024-01-04' },
      ];

      const topParts = getMostUsedParts(usages);
      expect(topParts[0].part_id).toBe(2); // 10 used
      expect(topParts[0].total_used).toBe(10);
      expect(topParts[1].part_id).toBe(1); // 5+3=8 used
      expect(topParts[1].total_used).toBe(8);
    });
  });
});

// ============================================
// ACCESSORIES TESTS
// ============================================

describe('Accessories Handling', () => {
  const parseAccessoriesInput = (input: string): string[] => {
    return input
      .split(/[,،\n]/)
      .map(a => a.trim())
      .filter(a => a.length > 0);
  };

  const formatAccessoriesList = (accessories: string[]): string => {
    if (accessories.length === 0) return 'لا توجد ملحقات';
    return accessories.join('، ');
  };

  it('should parse comma-separated accessories', () => {
    const result = parseAccessoriesInput('شاحن, سماعة, كابل');
    expect(result).toEqual(['شاحن', 'سماعة', 'كابل']);
  });

  it('should parse Arabic comma-separated accessories', () => {
    const result = parseAccessoriesInput('شاحن، سماعة، كابل');
    expect(result).toEqual(['شاحن', 'سماعة', 'كابل']);
  });

  it('should parse newline-separated accessories', () => {
    const result = parseAccessoriesInput('شاحن\nسماعة\nكابل');
    expect(result).toEqual(['شاحن', 'سماعة', 'كابل']);
  });

  it('should handle mixed separators', () => {
    const result = parseAccessoriesInput('شاحن, سماعة\nكابل، جراب');
    expect(result).toEqual(['شاحن', 'سماعة', 'كابل', 'جراب']);
  });

  it('should trim whitespace', () => {
    const result = parseAccessoriesInput('  شاحن  ,  سماعة  ');
    expect(result).toEqual(['شاحن', 'سماعة']);
  });

  it('should format accessories list', () => {
    expect(formatAccessoriesList(['شاحن', 'سماعة'])).toBe('شاحن، سماعة');
    expect(formatAccessoriesList([])).toBe('لا توجد ملحقات');
  });

  describe('Accessories verification', () => {
    const verifyAccessories = (
      received: string[], 
      returned: string[]
    ): { missing: string[]; extra: string[] } => {
      const missing = received.filter(a => !returned.includes(a));
      const extra = returned.filter(a => !received.includes(a));
      return { missing, extra };
    };

    it('should identify missing accessories', () => {
      const result = verifyAccessories(['شاحن', 'سماعة'], ['شاحن']);
      expect(result.missing).toEqual(['سماعة']);
      expect(result.extra).toHaveLength(0);
    });

    it('should identify extra accessories', () => {
      const result = verifyAccessories(['شاحن'], ['شاحن', 'سماعة']);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toEqual(['سماعة']);
    });

    it('should handle matching accessories', () => {
      const result = verifyAccessories(['شاحن', 'سماعة'], ['شاحن', 'سماعة']);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });
  });
});

// ============================================
// DEVICE CONDITION TESTS
// ============================================

describe('Device Condition', () => {
  type ConditionLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

  interface ConditionCheck {
    category: string;
    description: string;
    passed: boolean;
  }

  const calculateConditionScore = (checks: ConditionCheck[]): number => {
    if (checks.length === 0) return 0;
    const passedCount = checks.filter(c => c.passed).length;
    return Math.round((passedCount / checks.length) * 100);
  };

  const getConditionLevel = (score: number): ConditionLevel => {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 30) return 'poor';
    return 'damaged';
  };

  it('should calculate condition score', () => {
    const checks: ConditionCheck[] = [
      { category: 'Screen', description: 'No cracks', passed: true },
      { category: 'Screen', description: 'No scratches', passed: true },
      { category: 'Body', description: 'No dents', passed: false },
      { category: 'Body', description: 'No scratches', passed: true },
    ];

    expect(calculateConditionScore(checks)).toBe(75);
  });

  it('should handle empty checks', () => {
    expect(calculateConditionScore([])).toBe(0);
  });

  it('should determine condition level', () => {
    expect(getConditionLevel(95)).toBe('excellent');
    expect(getConditionLevel(80)).toBe('good');
    expect(getConditionLevel(60)).toBe('fair');
    expect(getConditionLevel(40)).toBe('poor');
    expect(getConditionLevel(20)).toBe('damaged');
  });
});

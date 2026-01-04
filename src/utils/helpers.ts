import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isWithinInterval } from 'date-fns';

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to a readable format
 */
export function formatDate(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format time string to 12-hour format
 */
export function formatTime(time: string | null): string {
  if (!time) return '-';
  try {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'hh:mm a');
  } catch {
    return time;
  }
}

/**
 * Format minutes to hours and minutes string
 */
export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === 0) return '-';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Generate a unique product SKU
 */
export function generateProductSku(prefix: string = 'PRD', lastId: number = 0): string {
  return `${prefix}${String(lastId + 1).padStart(3, '0')}`;
}

/**
 * Check if date is within a range
 */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const dateObj = parseISO(date);
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  return isWithinInterval(dateObj, { start, end });
}

/**
 * Get current time in HH:mm format
 */
export function getCurrentTime(): string {
  return format(new Date(), 'HH:mm');
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'active': 'text-success bg-success/10',
    'inactive': 'text-muted-foreground bg-muted',
    'low-stock': 'text-warning bg-warning/10',
    'out-of-stock': 'text-destructive bg-destructive/10',
    'in-stock': 'text-success bg-success/10',
    'approved': 'text-success bg-success/10',
    'pending': 'text-warning bg-warning/10',
    'rejected': 'text-destructive bg-destructive/10',
  };
  return colors[status] || 'text-muted-foreground bg-muted';
}

/**
 * Format status for display (Arabic support)
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': 'نشط',
    'inactive': 'غير نشط',
    'in-stock': 'متوفر',
    'low-stock': 'مخزون منخفض',
    'out-of-stock': 'نفاد المخزون',
    'approved': 'معتمد',
    'pending': 'قيد الانتظار',
    'rejected': 'مرفوض',
  };

  return statusMap[status] || status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert HH:mm string into total minutes
 */
export function timeStringToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Convert minutes into HH:mm string (24h)
 */
export function minutesToTimeString(minutes: number | null): string {
  if (minutes === null || Number.isNaN(minutes)) return '-';
  const normalized = Math.max(0, minutes);
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const mins = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Format currency to EGP (Egypt Pound)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Format number with Arabic digits
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ar-EG');
}

/**
 * Calculate price with markup
 */
export function calculateSellingPrice(costPrice: number, markupPercent: number): number {
  return costPrice * (1 + markupPercent / 100);
}

/**
 * Calculate profit margin
 */
export function calculateProfitMargin(costPrice: number, sellingPrice: number): number {
  if (sellingPrice === 0) return 0;
  return ((sellingPrice - costPrice) / sellingPrice) * 100;
}

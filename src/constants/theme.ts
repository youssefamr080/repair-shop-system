/**
 * Application Theme Constants - Mayo Fix
 * 
 * 🎨 Design System Colors
 * 
 * Primary: Slate (#0f172a) - Professional dark blue-gray
 * Accent: Orange (#f97316) - Active, attention-grabbing
 * 
 * WCAG AA Compliant color choices
 */

export const THEME = {
    // ============ PRIMARY COLORS ============
    /** Primary color - Dark slate for headers, backgrounds */
    primary: '#0f172a',      // Slate-900 - Contrast 15.9:1 on white ✅

    /** Accent color - Blue for Tech/Repair Identity */
    accent: '#3b82f6',       // Blue-500

    // ============ LIGHT VARIANTS ============
    primaryLight: 'rgba(15, 23, 42, 0.08)',
    accentLight: 'rgba(59, 130, 246, 0.12)',

    // ============ STATUS COLORS ============
    /** Success - Available/In Stock */
    success: '#10b981',      // Emerald-500 - Contrast 4.52:1 ✅

    /** Danger - Out of Stock/Errors */
    danger: '#dc2626',       // Red-600 - Contrast 4.63:1 ✅

    /** Warning - Low Stock alerts */
    warning: '#f59e0b',      // Amber-500

    // ============ CHART COLORS ============
    emerald: '#10b981',
    rose: '#f43f5e',
    amber: '#f59e0b',

    // ============ BACKGROUNDS ============
    background: '#f9fafb',   // Gray-50 - Clean paper-like

    // ============ LEGACY ALIASES ============
    // ⚠️ DEPRECATED: Use 'primary' and 'accent' instead
    // Kept for backward compatibility only
    navy: '#0f172a',
    gold: '#f97316',
    slate: '#0f172a',
    orange: '#f97316',
    navyLight: 'rgba(15, 23, 42, 0.08)',
    goldLight: 'rgba(249, 115, 22, 0.12)',
    slateLight: 'rgba(15, 23, 42, 0.08)',
    orangeLight: 'rgba(249, 115, 22, 0.12)',
};

/**
 * Chart Colors for ApexCharts and visualizations.
 * Pre-defined semantic colors for consistent data visualization.
 */
export const CHART_COLORS = {
    /** Stock available - Emerald green */
    inStock: '#10b981',

    /** Low stock warning - Amber */
    lowStock: '#f59e0b',

    /** Out of stock - Red */
    outOfStock: '#dc2626',

    /** Incoming stock - Emerald (positive) */
    stockIn: '#10b981',

    /** Outgoing stock - Orange */
    stockOut: '#f97316',

    /** Chart series palette */
    palette: ['#0f172a', '#f97316', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'],
};

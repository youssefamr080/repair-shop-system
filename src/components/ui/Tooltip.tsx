/**
 * Smart Tooltips Component - Mayo Fix
 * 
 * Contextual help tooltips that appear on hover:
 * - Field descriptions
 * - Tips and hints
 * - Keyboard shortcuts hints
 */

import { ReactNode, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { THEME } from '../../constants/theme';
import { cn } from '../../utils/helpers';

interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    showIcon?: boolean;
}

export function Tooltip({
    content,
    children,
    position = 'top',
    className,
    showIcon = false
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-current',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-current',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-current',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-current',
    };

    return (
        <div
            className={cn('relative inline-flex items-center gap-1', className)}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {showIcon && (
                <HelpCircle
                    className="h-4 w-4 text-muted-foreground cursor-help"
                    style={{ color: THEME.gold }}
                />
            )}

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                            'absolute z-50 px-3 py-2 text-sm rounded-lg shadow-lg max-w-xs',
                            'bg-slate-900 text-white',
                            positionClasses[position]
                        )}
                    >
                        {content}
                        <div
                            className={cn(
                                'absolute w-0 h-0 border-4 border-transparent',
                                arrowClasses[position]
                            )}
                            style={{ borderTopColor: position === 'top' ? '#1e293b' : undefined }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Field Help - Wrapper for form fields with contextual help
 */
interface FieldHelpProps {
    label: string;
    help: string;
    required?: boolean;
    children: ReactNode;
}

export function FieldHelp({ label, help, required, children }: FieldHelpProps) {
    return (
        <div className="space-y-2">
            <Tooltip content={help} position="top">
                <label className="text-sm font-medium flex items-center gap-1 cursor-help">
                    {label}
                    {required && <span className="text-destructive">*</span>}
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </label>
            </Tooltip>
            {children}
        </div>
    );
}

/**
 * Predefined help texts for common fields
 */
export const FIELD_HELP = {
    // Product fields
    productName: 'اسم المنتج كما سيظهر في الفواتير والتقارير',
    productSku: 'رمز فريد للمنتج (سيتم توليده تلقائياً إذا تُرك فارغاً)',
    productBarcode: 'الباركود الموجود على المنتج (اختياري)',
    costPrice: 'سعر شراء المنتج من المورد',
    sellingPrice: 'سعر بيع المنتج للعميل',
    minStock: 'الحد الأدنى للمخزون - سيظهر تنبيه عند الوصول إليه',

    // Category fields
    categoryName: 'اسم التصنيف الذي ستنظم فيه المنتجات',
    categoryParent: 'اختر تصنيف أعلى إذا كان هذا تصنيف فرعي',

    // Supplier fields
    supplierPhone: 'رقم الهاتف للتواصل مع المورد',
    supplierEmail: 'البريد الإلكتروني للمورد (للفواتير والمراسلات)',

    // Warehouse fields
    warehouseDefault: 'المستودع الافتراضي يتم اختياره تلقائياً عند إضافة مخزون',

    // Transaction fields
    quantity: 'الكمية التي سيتم إضافتها/إخراجها',
    referenceNumber: 'رقم مرجعي للعملية (رقم الفاتورة أو إذن الصرف)',
};

export default Tooltip;

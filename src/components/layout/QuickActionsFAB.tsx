/**
 * Quick Actions FAB - Mayo Fix
 * 
 * Floating action button with quick access to common operations:
 * - Add Product
 * - Stock In
 * - Stock Out
 * - Quick Search
 */

import { useState } from 'react';
import { Plus, Package, ArrowDownCircle, ArrowUpCircle, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { THEME } from '../../constants/theme';
import { cn } from '../../utils/helpers';

interface QuickAction {
    id: string;
    icon: typeof Plus;
    label: string;
    color: string;
    action: () => void;
}

interface QuickActionsFABProps {
    className?: string;
    onStockIn?: () => void;
    onStockOut?: () => void;
}

export function QuickActionsFAB({ className, onStockIn, onStockOut }: QuickActionsFABProps) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const actions: QuickAction[] = [
        {
            id: 'add_product',
            icon: Package,
            label: 'منتج جديد',
            color: THEME.navy,
            action: () => navigate('/products?action=new'),
        },
        {
            id: 'stock_in',
            icon: ArrowDownCircle,
            label: 'إدخال مخزون',
            color: THEME.emerald,
            action: () => {
                if (onStockIn) onStockIn();
                else navigate('/transactions?action=stock_in');
            },
        },
        {
            id: 'stock_out',
            icon: ArrowUpCircle,
            label: 'إخراج مخزون',
            color: THEME.rose,
            action: () => {
                if (onStockOut) onStockOut();
                else navigate('/transactions?action=stock_out');
            },
        },
        {
            id: 'search',
            icon: Search,
            label: 'بحث سريع',
            color: THEME.gold,
            action: () => {
                const searchInput = document.querySelector('input[type="search"], input[placeholder*="بحث"]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                } else {
                    navigate('/products?focus=search');
                }
                setIsOpen(false);
            },
        },
    ];

    const handleActionClick = (action: QuickAction) => {
        action.action();
        setIsOpen(false);
    };

    return (
        <div className={cn('fixed bottom-6 left-6 z-40', className)}>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Action Buttons */}
                        <div className="absolute bottom-16 left-0 space-y-3">
                            {actions.map((action, index) => (
                                <motion.button
                                    key={action.id}
                                    initial={{ opacity: 0, scale: 0, x: -20 }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1,
                                        x: 0,
                                        transition: { delay: index * 0.08 }
                                    }}
                                    exit={{
                                        opacity: 0,
                                        scale: 0,
                                        x: -20,
                                        transition: { delay: (actions.length - index) * 0.05 }
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleActionClick(action)}
                                    className="flex items-center gap-3 pr-4 pl-3 py-2 rounded-full shadow-lg text-white"
                                    style={{ backgroundColor: action.color }}
                                >
                                    <span className="text-sm font-medium whitespace-nowrap">
                                        {action.label}
                                    </span>
                                    <action.icon className="h-5 w-5" />
                                </motion.button>
                            ))}
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Main FAB Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white relative"
                style={{
                    background: isOpen
                        ? THEME.rose
                        : `linear-gradient(135deg, ${THEME.gold} 0%, ${THEME.gold}dd 100%)`
                }}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                </motion.div>
            </motion.button>

            {/* Tooltip when closed */}
            {!isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute bottom-4 left-16 pointer-events-none"
                >
                    <span className="text-xs bg-black/75 text-white px-2 py-1 rounded whitespace-nowrap">
                        إجراء سريع
                    </span>
                </motion.div>
            )}
        </div>
    );
}

export default QuickActionsFAB;

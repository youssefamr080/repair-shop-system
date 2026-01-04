/**
 * Smart Alerts Component - Mayo Fix
 * 
 * Intelligent notification center that shows:
 * - Low stock warnings
 * - Out of stock alerts
 * - Recent important events
 * - Actionable notifications
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Bell, AlertTriangle, Package, X, ChevronRight,
    RefreshCw, Check, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Card } from '../ui';
import { THEME } from '../../constants/theme';
import { cn } from '../../utils/helpers';
import {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
    useCreateNotification
} from '../../hooks/useQueries';
import type { DBNotification } from '../../types/notifications';

export interface SmartAlert {
    id: string;
    type: 'low_stock' | 'out_of_stock' | 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
    link?: string;
    timestamp: Date;
    read: number; // 0 or 1 from DB
    action_label?: string;
}

interface SmartAlertsProps {
    className?: string;
}

export function SmartAlerts({ className }: SmartAlertsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    // Queries & Mutations
    const { data: alerts = [], isLoading, refetch } = useNotifications();
    const markReadMutation = useMarkNotificationRead();
    const markAllReadMutation = useMarkAllNotificationsRead();
    const createNotificationMutation = useCreateNotification();

    const unreadCount = alerts.filter((a: DBNotification) => a.read === 0).length;

    // Background Check Logic (Side Effect)
    const runBackgroundChecks = useCallback(async () => {
        const lastCheck = localStorage.getItem('last_stock_check');
        const now = Date.now();

        if (!lastCheck || now - parseInt(lastCheck) > 5 * 60 * 1000) {
            try {
                const [outOfStockResult, lowStockResult] = await Promise.all([
                    window.database.parts.list({ page: 1, pageSize: 5, outOfStock: true }),
                    window.database.parts.list({ page: 1, pageSize: 5, lowStock: true })
                ]);

                // Create DB notifications for these events
                const promises = [];

                for (const p of outOfStockResult.data) {
                    const exists = alerts.find((a: DBNotification) => a.link === `/parts?search=${p.sku}` && a.read === 0);
                    if (!exists) {
                        promises.push(createNotificationMutation.mutateAsync({
                            type: 'out_of_stock',
                            title: 'نفاد المخزون',
                            message: `${p.name} - المخزون صفر`,
                            link: `/parts?search=${p.sku}`,
                            action_label: 'إضافة مخزون'
                        }));
                    }
                }

                for (const p of lowStockResult.data) {
                    const exists = alerts.find((a: DBNotification) => a.link === `/parts?search=${p.sku}` && a.read === 0);
                    if (!exists) {
                        promises.push(createNotificationMutation.mutateAsync({
                            type: 'low_stock',
                            title: 'مخزون منخفض',
                            message: `${p.name} - متبقي ${p.current_stock}`,
                            link: `/parts?search=${p.sku}`,
                            action_label: 'عرض'
                        }));
                    }
                }

                if (promises.length > 0) {
                    await Promise.all(promises);
                    refetch(); // Refresh list after creating new ones
                }

                localStorage.setItem('last_stock_check', now.toString());
            } catch (error) {
                console.error('Background check failed:', error);
            }
        }
    }, [alerts, createNotificationMutation, refetch]);

    // Run background check on mount and when alerts change
    useEffect(() => {
        if (!isLoading) {
            runBackgroundChecks();
        }
    }, [isLoading, runBackgroundChecks]);

    const handleAction = (alert: DBNotification) => {
        markReadMutation.mutate(alert.id);
        if (alert.link) {
            navigate(alert.link);
            setIsOpen(false);
        }
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'out_of_stock':
            case 'error':
                return <XCircle className="h-4 w-4" style={{ color: THEME.rose }} />;
            case 'low_stock':
            case 'warning':
                return <AlertTriangle className="h-4 w-4" style={{ color: THEME.gold }} />;
            case 'success':
                return <Check className="h-4 w-4" style={{ color: THEME.emerald }} />;
            default:
                return <Package className="h-4 w-4" style={{ color: THEME.navy }} />;
        }
    };

    const getAlertBg = (type: string) => {
        switch (type) {
            case 'out_of_stock':
            case 'error':
                return `${THEME.rose}10`;
            case 'low_stock':
            case 'warning':
                return `${THEME.gold}10`;
            case 'success': return `${THEME.emerald}10`;
            default: return `${THEME.navy}05`;
        }
    };

    return (
        <div className={cn('relative', className)}>
            {/* Trigger Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Bell className="h-5 w-5" style={{ color: THEME.navy }} />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-white rounded-full"
                            style={{ backgroundColor: THEME.rose }}
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute left-0 top-full mt-2 w-80 max-h-[70vh] z-50 overflow-hidden"
                        >
                            <Card
                                className="h-full border shadow-xl"
                                style={{ borderColor: `${THEME.navy}20` }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-3 border-b" style={{ backgroundColor: `${THEME.navy}05` }}>
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-4 w-4" style={{ color: THEME.navy }} />
                                        <span className="font-semibold" style={{ color: THEME.navy }}>التنبيهات</span>
                                        {unreadCount > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                                {unreadCount} جديد
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => refetch()}
                                            disabled={isLoading}
                                            className="h-7 w-7 p-0"
                                        >
                                            <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsOpen(false)}
                                            className="h-7 w-7 p-0"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Alerts List */}
                                <div className="max-h-[50vh] overflow-y-auto">
                                    {alerts.length === 0 ? (
                                        <div className="p-6 text-center text-muted-foreground">
                                            <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                            <p>لا توجد تنبيهات</p>
                                            <p className="text-xs">كل شيء على ما يرام! ✨</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {alerts.map((alert: DBNotification, index: number) => (
                                                <motion.div
                                                    key={alert.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className={cn(
                                                        'p-3 cursor-pointer transition-colors hover:bg-muted/50',
                                                        !alert.read && 'border-r-2'
                                                    )}
                                                    style={{
                                                        backgroundColor: getAlertBg(alert.type),
                                                        borderRightColor: !alert.read ? THEME.gold : 'transparent'
                                                    }}
                                                    onClick={() => handleAction(alert)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5">
                                                            {getAlertIcon(alert.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium" style={{ color: THEME.navy }}>
                                                                {alert.title}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {alert.message}
                                                            </p>
                                                            {alert.action_label && (
                                                                <span
                                                                    className="text-xs font-medium flex items-center gap-1 mt-1"
                                                                    style={{ color: THEME.gold }}
                                                                >
                                                                    {alert.action_label}
                                                                    <ChevronRight className="h-3 w-3" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                {alerts.length > 0 && unreadCount > 0 && (
                                    <div className="p-2 border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => markAllReadMutation.mutate()}
                                            className="w-full text-xs"
                                        >
                                            تحديد الكل كمقروء
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SmartAlerts;

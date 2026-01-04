/**
 * RecentActivity - Dashboard Recent Activity Component
 * 
 * Displays recent inventory transactions and activities.
 */

import { Clock, ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// Theme Constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
};

// Interface matching Dashboard.tsx ActivityItem
export interface ActivityItem {
    id: number;
    type: 'stock_in' | 'stock_out' | 'adjustment' | 'transfer';
    productName: string;
    quantity: number;
    date: string;
    user?: string;
}

interface RecentActivityProps {
    activities: ActivityItem[];
    loading?: boolean;
    maxItems?: number;
    onViewAll?: () => void;
}

const ACTIVITY_CONFIG = {
    stock_in: {
        label: 'إدخال',
        icon: ArrowUpCircle,
        color: '#22c55e',
        bgColor: '#22c55e15',
    },
    stock_out: {
        label: 'إخراج',
        icon: ArrowDownCircle,
        color: '#ef4444',
        bgColor: '#ef444415',
    },
    adjustment: {
        label: 'تعديل',
        icon: RefreshCw,
        color: '#f97316',
        bgColor: '#f9731615',
    },
    transfer: {
        label: 'تحويل',
        icon: ArrowLeftRight,
        color: '#3b82f6',
        bgColor: '#3b82f615',
    },
};

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;

    return date.toLocaleDateString('ar-EG');
}

export function RecentActivity({ activities, loading, maxItems = 8, onViewAll }: RecentActivityProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <Clock className="h-5 w-5" style={{ color: THEME.gold }} />
                        النشاط الأخير
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
                            <div className="h-10 w-10 rounded-full bg-muted" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 bg-muted rounded" />
                                <div className="h-3 w-1/2 bg-muted rounded" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <Clock className="h-5 w-5" style={{ color: THEME.gold }} />
                        النشاط الأخير
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">لا يوجد نشاط حديث</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const displayActivities = activities.slice(0, maxItems);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <Clock className="h-5 w-5" style={{ color: THEME.gold }} />
                        النشاط الأخير
                    </CardTitle>
                    {onViewAll && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onViewAll}
                            style={{ color: THEME.navy }}
                        >
                            عرض الكل
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <motion.div
                    className="space-y-2"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.1
                            }
                        }
                    }}
                >
                    {displayActivities.map((activity) => {
                        const config = ACTIVITY_CONFIG[activity.type];
                        const Icon = config.icon;

                        return (
                            <motion.div
                                key={activity.id}
                                variants={{
                                    hidden: { opacity: 0, x: -20 },
                                    visible: { opacity: 1, x: 0 }
                                }}
                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                            >
                                <div
                                    className="p-2 rounded-full shrink-0"
                                    style={{ backgroundColor: config.bgColor }}
                                >
                                    <Icon className="h-5 w-5" style={{ color: config.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm truncate">{activity.productName}</p>
                                        <Badge
                                            variant="outline"
                                            className="shrink-0"
                                            style={{ borderColor: config.color, color: config.color }}
                                        >
                                            {activity.type === 'stock_in' ? '+' : activity.type === 'stock_out' ? '-' : ''}
                                            {activity.quantity}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span>{config.label}</span>
                                        {activity.user && (
                                            <>
                                                <span>•</span>
                                                <span>{activity.user}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground shrink-0">
                                    {formatTimeAgo(activity.date)}
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </CardContent>
        </Card>
    );
}

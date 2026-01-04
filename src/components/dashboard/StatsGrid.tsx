/**
 * StatsGrid - Dashboard Statistics Grid Component
 * 
 * Displays key inventory statistics in a responsive grid layout.
 */

import { Package, Warehouse, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

// Theme Constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
};

export interface StatsData {
    totalProducts: number;
    totalCategories: number;
    totalWarehouses: number;
    totalSuppliers: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalStockValue: number;
    recentTransactions: number;
}

interface StatsGridProps {
    stats: StatsData;
    loading?: boolean;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: string;
    isLoading?: boolean;
}

function StatCard({ title, value, icon, trend, trendValue, color = THEME.navy, isLoading }: StatCardProps) {
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{title}</p>
                        {isLoading ? (
                            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                        ) : (
                            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                        )}
                        {trendValue && (
                            <div className="flex items-center gap-1 text-xs">
                                {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                                {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                                <span className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}>
                                    {trendValue}
                                </span>
                            </div>
                        )}
                    </div>
                    <div
                        className="p-3 rounded-full"
                        style={{ backgroundColor: `${color}15` }}
                    >
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function StatsGrid({ stats, loading }: StatsGridProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="إجمالي المنتجات"
                value={stats.totalProducts}
                icon={<Package className="h-6 w-6" style={{ color: THEME.navy }} />}
                color={THEME.navy}
                isLoading={loading}
            />
            <StatCard
                title="المستودعات"
                value={stats.totalWarehouses}
                icon={<Warehouse className="h-6 w-6" style={{ color: THEME.gold }} />}
                color={THEME.gold}
                isLoading={loading}
            />
            <StatCard
                title="نقص المخزون"
                value={stats.lowStockCount}
                icon={<AlertTriangle className="h-6 w-6" style={{ color: THEME.gold }} />}
                color={THEME.gold}
                isLoading={loading}
            />
            <StatCard
                title="قيمة المخزون"
                value={formatCurrency(stats.totalStockValue)}
                icon={<DollarSign className="h-6 w-6" style={{ color: THEME.navy }} />}
                color={THEME.navy}
                isLoading={loading}
            />
        </div>
    );
}

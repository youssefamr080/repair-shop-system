import { Link } from 'react-router-dom';
import { Package, Settings, Shield, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';

// Theme Constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
    emerald: '#10b981',
    amber: '#f59e0b',
};

interface QuickActionItem {
    to: string;
    label: string;
    description: string;
    icon: LucideIcon;
    color: string;
}

const QUICK_ACTIONS: QuickActionItem[] = [
    {
        to: '/products',
        label: 'إدارة المنتجات',
        description: 'إضافة وتعديل بيانات المنتجات',
        icon: Package,
        color: THEME.navy,
    },
    {
        to: '/settings',
        label: 'الإعدادات',
        description: 'ضبط إعدادات النظام',
        icon: Settings,
        color: THEME.emerald,
    },
    {
        to: '/audit-logs',
        label: 'سجل التدقيق',
        description: 'مراجعة سجلات النظام',
        icon: Shield,
        color: THEME.gold,
    },
];

export function QuickActions() {
    return (
        <Card className="h-full" style={{ borderTop: `3px solid ${THEME.gold}` }}>
            <CardHeader>
                <CardTitle style={{ color: THEME.navy }}>إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
                {QUICK_ACTIONS.map((action) => (
                    <Link
                        key={action.to}
                        to={action.to}
                        className="flex items-center gap-3 rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md hover:-translate-x-1 group"
                        style={{
                            borderColor: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = action.color;
                            (e.currentTarget as HTMLElement).style.backgroundColor = `${action.color}08`;
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        }}
                    >
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110"
                            style={{ backgroundColor: `${action.color}15` }}
                        >
                            <action.icon className="h-6 w-6" style={{ color: action.color }} />
                        </div>
                        <div>
                            <p className="font-semibold" style={{ color: THEME.navy }}>
                                {action.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}

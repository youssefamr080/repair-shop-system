import { Badge } from '../ui/Badge';
import {
    ClipboardList,
    Search,
    Wrench,
    Hourglass,
    CheckCircle,
    Truck,
    XCircle,
    type LucideIcon
} from 'lucide-react';

export type RepairStatus =
    | 'RECEIVED'
    | 'DIAGNOSED'
    | 'WAITING_PARTS'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'DELIVERED'
    | 'CANCELLED';

interface RepairStatusBadgeProps {
    status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon; className: string }> = {
    RECEIVED: {
        label: 'تم الاستلام',
        color: 'bg-slate-100 text-slate-800 border-slate-200',
        icon: ClipboardList,
        className: 'hover:bg-slate-200'
    },
    DIAGNOSED: {
        label: 'تم الفحص',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Search,
        className: 'hover:bg-blue-200'
    },
    WAITING_PARTS: {
        label: 'انتظار قطع',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Hourglass,
        className: 'hover:bg-amber-200'
    },
    IN_PROGRESS: {
        label: 'جاري العمل',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: Wrench,
        className: 'hover:bg-purple-200 animate-pulse'
    },
    COMPLETED: {
        label: 'تم الإصلاح',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle,
        className: 'hover:bg-emerald-200'
    },
    DELIVERED: {
        label: 'تم التسليم',
        color: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: Truck,
        className: 'hover:bg-gray-200 line-through decoration-slate-400'
    },
    CANCELLED: {
        label: 'ملغي',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        className: 'hover:bg-red-200'
    }
};

export function RepairStatusBadge({ status }: RepairStatusBadgeProps) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['RECEIVED'];
    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={`gap-1.5 py-1 px-2.5 text-xs font-semibold transition-all ${config.color} ${config.className}`}
        >
            <Icon className="h-3.5 w-3.5" />
            {config.label}
        </Badge>
    );
}

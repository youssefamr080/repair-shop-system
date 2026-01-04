/**
 * Technician Dashboard - Mayo Fix Enterprise
 * "My Jobs" view for technicians to manage their assigned repairs
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Wrench,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Package
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageGuard } from '../components/ui/PageGuard';
import { RepairStatusBadge } from '../components/repairs/RepairStatusBadge';
import type { DBRepair } from '../types/repairs';
import { THEME } from '../constants/theme';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function TechnicianDashboard() {
    const navigate = useNavigate();
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // Get current user info from auth context
    useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            // Get user ID from localStorage or auth state
            const userStr = localStorage.getItem('mayo_auth_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setCurrentUserId(user.id);
                return user;
            }
            return null;
        }
    });

    // Get my assigned repairs
    const { data: myRepairs, isLoading } = useQuery({
        queryKey: ['my-repairs', currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];
            const allRepairs = await window.database.repairs.list({});
            return allRepairs.filter(r => r.technician_id === currentUserId);
        },
        enabled: !!currentUserId
    });

    // Calculate statistics
    const stats = {
        total: myRepairs?.length || 0,
        in_progress: myRepairs?.filter(r => r.status === 'in_progress')?.length || 0,
        completed_today: myRepairs?.filter(r => {
            if (r.status !== 'completed') return false;
            const today = new Date().toDateString();
            return new Date(r.completed_at || '').toDateString() === today;
        })?.length || 0,
        pending_parts: myRepairs?.filter(r =>
            r.status === 'approved' && (!r.technician_id)
        )?.length || 0
    };

    // Group by status
    const inProgress = myRepairs?.filter(r => r.status === 'in_progress') || [];
    const approved = myRepairs?.filter(r => r.status === 'approved') || [];
    const diagnosed = myRepairs?.filter(r => r.status === 'diagnosed') || [];

    return (
        <PageGuard permission="repairs.view" pageTitle="مهامي">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: THEME.navy }}>
                            <Wrench className="h-7 w-7" style={{ color: THEME.orange }} />
                            مهامي - Technician Dashboard
                        </h1>
                        <p className="text-gray-600 mt-1">التذاكر المخصصة لي</p>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">إجمالي المهام</p>
                                <p className="text-2xl font-bold mt-1" style={{ color: THEME.navy }}>
                                    {stats.total}
                                </p>
                            </div>
                            <Wrench className="h-10 w-10 text-gray-300" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">قيد العمل</p>
                                <p className="text-2xl font-bold mt-1 text-blue-600">
                                    {stats.in_progress}
                                </p>
                            </div>
                            <Clock className="h-10 w-10 text-blue-200" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">مكتمل اليوم</p>
                                <p className="text-2xl font-bold mt-1 text-green-600">
                                    {stats.completed_today}
                                </p>
                            </div>
                            <CheckCircle2 className="h-10 w-10 text-green-200" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">بانتظار القطع</p>
                                <p className="text-2xl font-bold mt-1 text-orange-600">
                                    {stats.pending_parts}
                                </p>
                            </div>
                            <Package className="h-10 w-10 text-orange-200" />
                        </div>
                    </Card>
                </div>

                {/* In Progress Repairs */}
                {inProgress.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            قيد العمل ({inProgress.length})
                        </h2>
                        <div className="grid grid-cols-1 gap-3">
                            {inProgress.map((repair) => (
                                <RepairCard key={repair.id} repair={repair} onClick={() => navigate(`/repairs/${repair.id}`)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Approved - Ready to Start */}
                {approved.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            جاهز للبدء ({approved.length})
                        </h2>
                        <div className="grid grid-cols-1 gap-3">
                            {approved.map((repair) => (
                                <RepairCard key={repair.id} repair={repair} onClick={() => navigate(`/repairs/${repair.id}`)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Diagnosed - Needs Approval */}
                {diagnosed.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                            تم التشخيص ({diagnosed.length})
                        </h2>
                        <div className="grid grid-cols-1 gap-3">
                            {diagnosed.map((repair) => (
                                <RepairCard key={repair.id} repair={repair} onClick={() => navigate(`/repairs/${repair.id}`)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && myRepairs?.length === 0 && (
                    <Card className="p-12">
                        <div className="text-center text-gray-500">
                            <Wrench className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">لا توجد مهام مخصصة لك حالياً</p>
                            <p className="text-sm mt-2">سيتم إظهار التذاكر المخصصة لك هنا</p>
                        </div>
                    </Card>
                )}
            </div>
        </PageGuard>
    );
}

// Repair Card Component
function RepairCard({ repair, onClick }: { repair: DBRepair; onClick: () => void }) {
    return (
        <Card
            className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4"
            style={{ borderLeftColor: THEME.orange }}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-semibold text-sm" style={{ color: THEME.navy }}>
                            {repair.ticket_number}
                        </span>
                        <RepairStatusBadge status={repair.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-600">الجهاز</p>
                            <p className="font-medium">{repair.device_brand} {repair.device_model}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">العميل</p>
                            <p className="font-medium">{repair.customer_name}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">المشكلة</p>
                            <p className="font-medium line-clamp-1">{repair.problem_description}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">التاريخ</p>
                            <p className="font-medium">
                                {format(new Date(repair.created_at), 'dd MMM', { locale: ar })}
                            </p>
                        </div>
                    </div>
                </div>

                <Button variant="outline" size="sm" className="mr-4">
                    عرض التفاصيل
                </Button>
            </div>
        </Card>
    );
}

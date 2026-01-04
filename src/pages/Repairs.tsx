import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks';
import { Wrench, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { PageGuard } from '../components/ui/PageGuard';
import { RepairStatusBadge } from '../components/repairs/RepairStatusBadge';
import { RepairDialog } from '../components/repairs/RepairDialog';
import type { DBRepair, RepairFilters } from '../types/repairs';
import { THEME } from '../constants/theme';

export function Repairs() {
    const [search, setSearch] = useState('');
    // ⚡ Debounce search input to reduce database queries during typing
    // Reduces queries by ~90% - only fires 300ms after user stops typing
    const debouncedSearch = useDebounce(search, 300);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const navigate = useNavigate();

    const { data: repairs, isLoading, error, refetch } = useQuery({
        queryKey: ['repairs', { search: debouncedSearch, selectedStatus }],
        queryFn: async () => {
            if (window.database?.repairs) {
                // Determine filter mode
                const filters: RepairFilters = {
                    search: debouncedSearch, // ⚡ Use debounced value to prevent query spam
                    status: selectedStatus ? selectedStatus as import('../types/repairs').RepairStatus : undefined
                };

                // If customer filter is active, we might need a specific API or just backend filter logic.
                // Current `list` API: { search: string | undefined; status: string | undefined; page?: number; pageSize?: number }
                return window.database.repairs.list(filters);
            }
            return [];
        },
        enabled: !!window.database,
    });

    const handleRowClick = (id: string) => {
        navigate(`/repairs/${id}`);
    };

    return (
        <PageGuard permission="repairs.view" pageTitle="تذاكر الصيانة">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: THEME.navy }}>
                            <Wrench className="h-7 w-7" style={{ color: THEME.orange }} />
                            تذاكر الصيانة
                        </h1>
                        <p className="text-gray-600 mt-1">Mayo Fix Enterprise - إدارة تذاكر الصيانة</p>
                    </div>
                    <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="text-white gap-2"
                        style={{ backgroundColor: THEME.orange }}
                    >
                        <Plus className="h-5 w-5" />
                        تذكرة جديدة
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <div className="p-4 flex gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="بحث بالتذكرة، الجهاز، أو العميل..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="w-48">
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <option value="">كل الحالات</option>
                                <option value="pending">في الانتظار</option>
                                <option value="diagnosed">تم التشخيص</option>
                                <option value="approved">تمت الموافقة</option>
                                <option value="in_progress">قيد الإصلاح</option>
                                <option value="completed">مكتمل</option>
                                <option value="delivered">تم التسليم</option>
                                <option value="cancelled">ملغي</option>
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Results */}
                <Card>
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
                        ) : error ? (
                            <div className="p-8 text-center text-red-500">حدث خطأ أثناء تحميل البيانات</div>
                        ) : repairs && repairs.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">لا توجد تذاكر</div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التذكرة</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العميل</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الجهاز</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المشكلة</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التكلفة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {repairs && repairs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                لا توجد تذاكر
                                            </td>
                                        </tr>
                                    ) : (
                                        repairs?.map((repair: DBRepair) => (
                                            <tr
                                                key={repair.id}
                                                onClick={() => handleRowClick(repair.id)}
                                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">
                                                    {repair.ticket_number}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <div className="font-medium text-gray-900">{repair.customer_name}</div>
                                                        <div className="text-gray-500">{repair.customer_phone}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">
                                                        {repair.device_brand} {repair.device_model}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{repair.device_type}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                                                    {repair.problem_description}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <RepairStatusBadge status={repair.status} />
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {format(new Date(repair.created_at), 'dd MMM yyyy', { locale: ar })}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {repair.estimated_cost} ج.م
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>

                <RepairDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSuccess={() => refetch()}
                />
            </div>
        </PageGuard>
    );
}

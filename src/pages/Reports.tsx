import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { THEME } from '../constants/theme';
import {
    BarChart3,
    TrendingUp,
    Package,
    Calendar,
    DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface SalesSummary {
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    repair_count: number;
    avg_ticket_value: number;
    total_tax: number;
    total_discount: number;
}

interface DailySales {
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    count: number;
}

interface InventoryValue {
    total_items: number;
    total_value: number;
    by_category: { category: string; count: number; value: number }[];
}

interface TechnicianStats {
    technician_id: number;
    technician_name: string;
    total_jobs: number;
    completed_jobs: number;
    total_revenue: number;
}

export function Reports() {
    const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'technicians'>('sales');
    const [loading, setLoading] = useState(false);

    // Date Filters
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // First of month
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    // Data
    const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
    const [dailySales, setDailySales] = useState<DailySales[]>([]);
    const [inventoryValue, setInventoryValue] = useState<InventoryValue | null>(null);
    const [techStats, setTechStats] = useState<TechnicianStats[]>([]);

    useEffect(() => {
        fetchData();
    }, [activeTab, startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'sales') {
                if (window.database?.reports?.getSales) {
                    const result = await window.database.reports.getSales({ startDate, endDate });
                    setSalesSummary(result.summary);
                    setDailySales(result.daily);
                }
            } else if (activeTab === 'inventory') {
                if (window.database?.reports?.getInventoryValue) {
                    const result = await window.database.reports.getInventoryValue();
                    setInventoryValue(result);
                }
            } else if (activeTab === 'technicians') {
                if (window.database?.reports?.getTechnicianStats) {
                    const result = await window.database.reports.getTechnicianStats({ startDate, endDate });
                    setTechStats(result);
                }
            }
        } catch (error) {
            console.error('Failed to fetch report data', error);
            toast.error('فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    // Format Currency
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'EGP'
        }).format(amount);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: THEME.navy, fontFamily: "'Amiri', serif" }}>
                        التقارير
                    </h1>
                    <p className="text-muted-foreground">تحليل الأداء المالي والتشغيلي</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'sales' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        المبيعات
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        المخزون
                    </button>
                    <button
                        onClick={() => setActiveTab('technicians')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'technicians' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        الفنيين
                    </button>
                </div>
            </div>

            {/* Date Filters (Only for Sales & Techs) */}
            {activeTab !== 'inventory' && (
                <Card>
                    <CardContent className="p-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-bold">التاريخ من:</span>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">إلى:</span>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <Button variant="outline" onClick={fetchData} disabled={loading}>
                            <TrendingUp className="h-4 w-4 ml-2" />
                            تحديث
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* SALES CONTENT */}
            {activeTab === 'sales' && salesSummary && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-indigo-600">إجمالي الإيرادات</p>
                                        <h3 className="text-2xl font-bold mt-2 text-indigo-900">{formatMoney(salesSummary.total_revenue)}</h3>
                                    </div>
                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                        <DollarSign className="h-5 w-5 text-indigo-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-emerald-600">صافي الربح (التقريبي)</p>
                                        <h3 className="text-2xl font-bold mt-2 text-emerald-900">{formatMoney(salesSummary.total_profit)}</h3>
                                    </div>
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-blue-600">عدد التذاكر</p>
                                        <h3 className="text-2xl font-bold mt-2 text-blue-900">{salesSummary.repair_count}</h3>
                                    </div>
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Package className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-amber-600">متوسط التذكرة</p>
                                        <h3 className="text-2xl font-bold mt-2 text-amber-900">{formatMoney(salesSummary.avg_ticket_value)}</h3>
                                    </div>
                                    <div className="p-2 bg-amber-100 rounded-lg">
                                        <BarChart3 className="h-5 w-5 text-amber-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Daily Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>تفاصيل المبيعات اليومية</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 text-slate-700 uppercase">
                                        <tr>
                                            <th className="px-6 py-3">التاريخ</th>
                                            <th className="px-6 py-3">عدد العمليات</th>
                                            <th className="px-6 py-3">الإيرادات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dailySales.length > 0 ? (
                                            dailySales.map((day) => (
                                                <tr key={day.date} className="border-b hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-medium">{day.date}</td>
                                                    <td className="px-6 py-4">{day.count}</td>
                                                    <td className="px-6 py-4 font-bold text-emerald-600">{formatMoney(day.revenue)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                                                    لا توجد مبيعات في هذه الفترة
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* INVENTORY CONTENT */}
            {activeTab === 'inventory' && inventoryValue && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-indigo-50 border-indigo-100">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-indigo-600">إجمالي قيمة المخزون (تكلفة)</p>
                                    <h3 className="text-3xl font-bold mt-2 text-indigo-900">{formatMoney(inventoryValue.total_value)}</h3>
                                </div>
                                <Package className="h-10 w-10 text-indigo-300" />
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50 border-slate-100">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">إجمالي عدد الأصناف</p>
                                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{inventoryValue.total_items}</h3>
                                </div>
                                <BarChart3 className="h-10 w-10 text-slate-300" />
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>قيمة المخزون حسب التصنيف</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 text-slate-700 uppercase">
                                        <tr>
                                            <th className="px-6 py-3">التصنيف</th>
                                            <th className="px-6 py-3">عدد الأصناف</th>
                                            <th className="px-6 py-3">القيمة الإجمالية</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryValue.by_category.map((cat) => (
                                            <tr key={cat.category} className="border-b hover:bg-slate-50">
                                                <td className="px-6 py-4 font-medium">{cat.category || 'غير مصنف'}</td>
                                                <td className="px-6 py-4">{cat.count}</td>
                                                <td className="px-6 py-4 font-bold text-indigo-600">{formatMoney(cat.value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TECHNICIANS CONTENT */}
            {activeTab === 'technicians' && (
                <Card>
                    <CardHeader>
                        <CardTitle>أداء الفنيين</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 text-slate-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-3">اسم الفني</th>
                                        <th className="px-6 py-3">إجمالي التذاكر</th>
                                        <th className="px-6 py-3">المنجزة</th>
                                        <th className="px-6 py-3">الإيرادات المحققة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {techStats.length > 0 ? (
                                        techStats.map((tech) => (
                                            <tr key={tech.technician_id} className="border-b hover:bg-slate-50">
                                                <td className="px-6 py-4 font-medium flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                        {tech.technician_name.charAt(0)}
                                                    </div>
                                                    {tech.technician_name}
                                                </td>
                                                <td className="px-6 py-4">{tech.total_jobs}</td>
                                                <td className="px-6 py-4">{tech.completed_jobs}</td>
                                                <td className="px-6 py-4 font-bold text-emerald-600">{formatMoney(tech.total_revenue)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                                لا توجد بيانات للفنيين
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}

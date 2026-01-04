/**
 * Customers Page - Mayo Fix Enterprise
 * 
 * Customer management with:
 * - Paginated list with search
 * - Create/Edit/Delete customers
 * - View repair history per customer
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks';
import { PageTransition } from '../components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CustomerDialog } from '../components/customers/CustomerDialog';
import { AddPaymentDialog } from '../components/customers/AddPaymentDialog';
import { toast } from 'sonner';
import { THEME } from '../constants/theme';
import {
    Users,
    Plus,
    Search,
    Phone,
    Mail,
    MapPin,
    Wrench,
    Edit,
    Trash2,
    RefreshCw,
    MoreVertical,
    DollarSign,
} from 'lucide-react';

// Types
interface Customer {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    is_active: number;
    created_at: string;
    updated_at: string;
    total_repairs?: number;
    last_repair_date?: string;
    // V10: Finance (Added)
    balance?: number; // >0 means CREDIT (We owe them), <0 means DEBIT (They owe us)
}

interface ListResult {
    data: Customer[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export function Customers() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    // ⚡ Debounce search input to reduce database queries during typing
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [actionMenuId, setActionMenuId] = useState<number | null>(null);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);

    const loadCustomers = useCallback(async () => {
        setLoading(true);
        try {
            if (window.database?.customers?.list) {
                const result: ListResult = await window.database.customers.list({
                    page,
                    pageSize: 20,
                    search: debouncedSearchQuery || undefined, // ⚡ Use debounced value
                });
                setCustomers(result.data);
                setTotalPages(result.totalPages);
                setTotalCount(result.totalCount);
            }
        } catch (error) {
            console.error('Failed to load customers:', error);
            toast.error('فشل تحميل العملاء');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearchQuery]); // ⚡ Depend on debounced value

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    const handleCreateCustomer = () => {
        setEditingCustomer(null);
        setDialogOpen(true);
    };

    const handleEditCustomer = (customer: Customer) => {
        setEditingCustomer(customer);
        setDialogOpen(true);
        setActionMenuId(null);
    };

    const handleDeleteCustomer = async (customer: Customer) => {
        if (!confirm(`هل أنت متأكد من حذف العميل "${customer.name}"؟`)) {
            return;
        }

        try {
            if (window.database?.customers?.delete) {
                await window.database.customers.delete(customer.id);
                toast.success('تم حذف العميل بنجاح');
                loadCustomers();
            }
        } catch (error) {
            console.error('Failed to delete customer:', error);
            toast.error('فشل حذف العميل');
        }
        setActionMenuId(null);
    };

    const handleDialogClose = (saved: boolean) => {
        setDialogOpen(false);
        setEditingCustomer(null);
        if (saved) {
            loadCustomers();
        }
    };

    const handleViewRepairs = (customerId: number) => {
        navigate(`/repairs?customer=${customerId}`);
        setActionMenuId(null);
    };

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: THEME.slate }}>
                            <Users className="h-7 w-7" style={{ color: THEME.orange }} />
                            العملاء
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            إدارة قاعدة بيانات العملاء ({totalCount} عميل)
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadCustomers}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                            تحديث
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreateCustomer}
                            style={{ backgroundColor: THEME.orange }}
                        >
                            <Plus className="h-4 w-4 ml-2" />
                            عميل جديد
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <Card>
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="البحث بالاسم أو الهاتف..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="pr-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Customers List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">قائمة العملاء</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">
                                جاري التحميل...
                            </div>
                        ) : customers.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground">
                                    {searchQuery ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء بعد'}
                                </p>
                                {!searchQuery && (
                                    <Button
                                        className="mt-4"
                                        size="sm"
                                        onClick={handleCreateCustomer}
                                        style={{ backgroundColor: THEME.orange }}
                                    >
                                        <Plus className="h-4 w-4 ml-2" />
                                        إضافة أول عميل
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {customers.map((customer) => (
                                    <div
                                        key={customer.id}
                                        className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                                    style={{ backgroundColor: THEME.orange }}
                                                >
                                                    {customer.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{customer.name}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                                        {customer.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />
                                                                {customer.phone}
                                                            </span>
                                                        )}
                                                        {customer.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                {customer.email}
                                                            </span>
                                                        )}
                                                        {customer.address && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {customer.address.substring(0, 30)}...
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Repair count badge */}
                                            <div
                                                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                                                style={{ backgroundColor: `${THEME.slate}10`, color: THEME.slate }}
                                            >
                                                <Wrench className="h-3 w-3" />
                                                {customer.total_repairs || 0} إصلاحات
                                            </div>

                                            {/* Balance Badge (V10) */}
                                            {customer.balance !== undefined && customer.balance !== 0 && (
                                                <div
                                                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${customer.balance < 0
                                                        ? 'bg-red-100 text-red-700' // They owe us
                                                        : 'bg-green-100 text-green-700' // We owe them (Credit)
                                                        }`}
                                                >
                                                    <DollarSign className="h-3 w-3" />
                                                    {Math.abs(customer.balance).toFixed(2)} د.أ
                                                    {customer.balance < 0 ? ' (مطلوب)' : ' (رصيد)'}
                                                </div>
                                            )}

                                            {/* Action menu */}
                                            <div className="relative">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setActionMenuId(actionMenuId === customer.id ? null : customer.id)}
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>

                                                {actionMenuId === customer.id && (
                                                    <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-50">
                                                        <button
                                                            className="w-full px-4 py-2 text-right hover:bg-muted flex items-center gap-2"
                                                            onClick={() => handleEditCustomer(customer)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            تعديل
                                                        </button>
                                                        <button
                                                            className="w-full px-4 py-2 text-right hover:bg-muted flex items-center gap-2"
                                                            onClick={() => handleViewRepairs(customer.id)}
                                                        >
                                                            <Wrench className="h-4 w-4" />
                                                            عرض الإصلاحات
                                                        </button>
                                                        <button
                                                            className="w-full px-4 py-2 text-right hover:bg-muted flex items-center gap-2"
                                                            onClick={() => {
                                                                setSelectedCustomerForPayment(customer);
                                                                setPaymentDialogOpen(true);
                                                                setActionMenuId(null);
                                                            }}
                                                        >
                                                            <DollarSign className="h-4 w-4" />
                                                            تسجيل دفعة / دين
                                                        </button>
                                                        <button
                                                            className="w-full px-4 py-2 text-right hover:bg-red-50 text-red-600 flex items-center gap-2"
                                                            onClick={() => handleDeleteCustomer(customer)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            حذف
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    السابق
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    صفحة {page} من {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    التالي
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Customer Dialog */}
                <CustomerDialog
                    open={dialogOpen}
                    onClose={handleDialogClose}
                    customer={editingCustomer}
                />

                <AddPaymentDialog
                    open={paymentDialogOpen}
                    onClose={(saved) => {
                        setPaymentDialogOpen(false);
                        setSelectedCustomerForPayment(null);
                        if (saved) loadCustomers();
                    }}
                    customer={selectedCustomerForPayment}
                />
            </div>
        </PageTransition>
    );
}

export default Customers;

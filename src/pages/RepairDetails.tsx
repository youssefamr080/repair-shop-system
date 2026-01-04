import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    User, Smartphone, Calendar, Clock, DollarSign,
    Wrench, FileText, CheckCircle2, AlertCircle, Printer,
    ArrowRight, Phone
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Separator } from '../components/ui/Separator';
import { Textarea } from '../components/ui/Textarea';
import { toast } from 'sonner';
import { cn } from '../utils/helpers';
import { useReactToPrint } from 'react-to-print';
import { PrintableRepairReceipt, ReceiptData } from '../components/print/PrintableRepairReceipt';

import { AddPartDialog } from '../components/repairs/AddPartDialog';

export function RepairDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [repair, setRepair] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showAddPart, setShowAddPart] = useState(false);

    // Fetch Repair Details
    const fetchRepair = async () => {
        try {
            if (window.database?.repairs) {
                const data = await window.database.repairs.get(id!);
                setRepair(data);
            }
        } catch (error) {
            console.error(error);
            toast.error('فشل تحميل بيانات التذكرة');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRepair();
    }, [id]);

    const handleStatusChange = async (newStatus: string) => {
        if (!id) return;
        try {
            if (window.database?.repairs) {
                await window.database.repairs.update({ id, status: newStatus as any });
                toast.success(`تم تغيير الحالة إلى ${newStatus}`);
                fetchRepair();
            }
        } catch (error: any) {
            console.error(error);
            const msg = error.message?.includes('STATUS_ERROR')
                ? 'لا يمكن الانتقال لهذه الحالة مباشرة (قيود النظام)'
                : 'فشل تحديث الحالة';
            toast.error(msg);
        } finally {
            //
        }
    };

    const handleAddPart = async (productId: number, quantity: number) => {
        if (!id) return;
        try {
            if (window.database?.repairs) {
                await window.database.repairs.addPart({
                    repair_id: id,
                    part_id: productId,
                    quantity,
                    unit_price: 0 // Will be calculated from part's selling_price
                });
                toast.success('تم إضافة القطعة بنجاح');
                fetchRepair(); // Refresh
            }
        } catch (error: any) {
            console.error(error);
            const msg = error.message?.includes('INSUFFICIENT_STOCK')
                ? 'عذراً، الكمية غير متوفرة في المخزون'
                : 'فشل إضافة القطعة';
            toast.error(msg);
            throw error; // Let Dialog handle error display if needed
        }
    };

    const handleRemovePart = async (partLinkId: string) => {
        if (!confirm('هل أنت متأكد من إزالة هذه القطعة؟ سيتم إعادتها للمخزون.')) return;

        try {
            if (window.database?.repairs) {
                await window.database.repairs.removePart({
                    repair_id: id!,
                    part_link_id: partLinkId
                });
                toast.success('تم إزالة القطعة واستعادة المخزون');
                fetchRepair();
            }
        } catch (error) {
            console.error(error);
            toast.error('فشل إزالة القطعة');
        }
    };

    // Printing Logic
    const receiptRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt-${repair?.ticket_number}`,
    });

    // Transform Repair Data for Receipt
    const receiptData: ReceiptData | null = repair ? {
        ticketNumber: repair.ticket_number,
        customerName: repair.customer_name || 'Guest',
        customerPhone: repair.customer_phone || '-',
        deviceModel: `${repair.device_brand} ${repair.device_model}`,
        deviceColor: repair.color || '-',
        serialNumber: repair.serial_number,
        problemDescription: repair.problem_description || '',
        receivedDate: repair.created_at,
        companyName: 'Mayo Fix Center', // TODO: Get from settings
        companyPhone: '079XXXXXXX', // TODO: Get from settings
        companyAddress: 'Amman, Jordan', // TODO: Get from settings
    } : null;

    if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
    if (!repair) return <div className="p-8 text-center text-red-500">التذكرة غير موجودة</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'RECEIVED': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'IN_PROGRESS': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'WAITING_PARTS': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
            case 'DELIVERED': return 'bg-slate-100 text-slate-800 border-slate-200';
            case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between border-b pb-6 bg-white/50 p-6 rounded-xl shadow-sm backdrop-blur-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/repairs')} className="h-8 w-8 p-0 rounded-full">
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            {repair.ticket_number}
                            <Badge variant="outline" className={cn("text-base px-3 py-1", getStatusColor(repair.status))}>
                                {repair.status}
                            </Badge>
                        </h1>
                    </div>
                    <p className="text-slate-500 flex items-center gap-2 mr-11">
                        <Calendar className="h-4 w-4" />
                        تم الاستلام: {new Date(repair.created_at).toLocaleString('ar-EG')}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-2" onClick={handlePrint}>
                        <Printer className="h-4 w-4" />
                        طباعة الإيصال
                    </Button>

                    {repair.status !== 'COMPLETED' && repair.status !== 'DELIVERED' && (
                        <div className="flex gap-2">
                            {repair.status === 'RECEIVED' && (
                                <Button onClick={() => handleStatusChange('IN_PROGRESS')} className="bg-blue-600 hover:bg-blue-700 gap-2">
                                    <Wrench className="h-4 w-4" />
                                    بدء الفحص
                                </Button>
                            )}
                            {repair.status === 'IN_PROGRESS' && (
                                <>
                                    <Button onClick={() => handleStatusChange('WAITING_PARTS')} variant="secondary" className="gap-2">
                                        <Clock className="h-4 w-4" />
                                        انتظار قطع
                                    </Button>
                                    <Button onClick={() => handleStatusChange('COMPLETED')} className="bg-green-600 hover:bg-green-700 gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        إتمام الإصلاح
                                    </Button>
                                </>
                            )}
                            {repair.status === 'WAITING_PARTS' && (
                                <Button onClick={() => handleStatusChange('IN_PROGRESS')} className="bg-blue-600 hover:bg-blue-700 gap-2">
                                    <Wrench className="h-4 w-4" />
                                    استئناف العمل
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Right Column: Context (Customer & Device) */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Customer Card */}
                    <Card className="shadow-md border-0 ring-1 ring-slate-200">
                        <CardHeader className="pb-3 bg-slate-50/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-500" />
                                بيانات العميل
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {repair.customer_name?.[0] || '?'}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{repair.customer_name}</p>
                                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                                        <Phone className="h-3 w-3" />
                                        <span dir="ltr">{repair.customer_phone}</span>
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">العنوان:</span>
                                    <span className="font-medium text-slate-900">{repair.address || 'غير محدد'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">عدد التذاكر السابقة:</span>
                                    <span className="font-medium text-slate-900">3</span> {/* Mock */}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Device Card */}
                    <Card className="shadow-md border-0 ring-1 ring-slate-200">
                        <CardHeader className="pb-3 bg-slate-50/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-purple-500" />
                                تفاصيل الجهاز
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="space-y-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-slate-500 block text-xs mb-1">الجهاز</span>
                                        <p className="font-medium text-slate-900">{repair.device_brand} {repair.device_model}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-xs mb-1">الرقم التسلسلي</span>
                                        <p className="font-mono text-slate-900 text-xs">{repair.serial_number || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-xs mb-1">رمز القفل</span>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="font-mono tracking-widest">
                                                {repair.passcode || 'لا يوجد'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-xs mb-1">اللون / الحالة</span>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: repair.color?.toLowerCase() }}></span>
                                            <span className="text-slate-900 capitalize">{repair.condition}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-red-50 p-3 rounded-md border border-red-100">
                                    <span className="text-red-600 block text-xs font-semibold mb-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        وصف المشكلة (شكوى العميل)
                                    </span>
                                    <p className="text-slate-800 leading-relaxed text-sm">
                                        {repair.problem_description}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Left/Center Column: Workbench (Action Zone) */}
                <div className="space-y-6 lg:col-span-2">

                    {/* Diagnosis & Notes */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-slate-500" />
                                التشخيص والملاحظات الفنية
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="اكتب تشخيصك الفني هنا، وملاحظات الإصلاح..."
                                className="min-h-[120px] resize-none border-slate-200 focus:border-blue-500 transition-all font-mono text-sm"
                            />
                            <div className="flex justify-end">
                                <Button size="sm" variant="secondary">حفظ الملاحظات</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Parts & Cost */}
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Wrench className="h-5 w-5 text-slate-500" />
                                قطع الغيار والتكاليف
                            </CardTitle>
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowAddPart(true)}>
                                <DollarSign className="h-4 w-4" />
                                إضافة قطعة غيار
                            </Button>
                        </CardHeader>
                        {/* Table Content is same, no changes needed below this line actually, but replacing chunk */}
                        <CardContent>
                            <div className="relative overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3">القطعة</th>
                                            <th className="px-6 py-3">الكمية</th>
                                            <th className="px-6 py-3">سعر الوحدة</th>
                                            <th className="px-6 py-3">الإجمالي</th>
                                            <th className="px-6 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {repair.parts && repair.parts.length > 0 ? (
                                            repair.parts.map((part: any, idx: number) => (
                                                <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-900">{part.product_name}</td>
                                                    <td className="px-6 py-4">{part.quantity}</td>
                                                    <td className="px-6 py-4">{part.unit_price} د.أ</td>
                                                    <td className="px-6 py-4 font-bold text-slate-800">{part.total_price} د.أ</td>
                                                    <td className="px-6 py-4 text-left">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleRemovePart(part.id)}
                                                        >
                                                            <div className="h-4 w-4">×</div>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                                                    لم يتم إضافة أي قطع غيار حتى الآن
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {/* Financial Breakdown (V08) */}
                                    <tfoot className="bg-slate-50 border-t-2 border-slate-100">
                                        {/* Parts Total */}
                                        <tr>
                                            <td colSpan={3} className="px-6 py-2 text-left text-slate-500 text-xs">مجموع قطع الغيار</td>
                                            <td className="px-6 py-2 font-medium bg-slate-100/50">{repair.parts_total || 0} د.أ</td>
                                            <td></td>
                                        </tr>

                                        {/* Labor Cost (Input) */}
                                        <tr>
                                            <td colSpan={3} className="px-6 py-2 text-left text-slate-500 text-xs flex items-center justify-end gap-2">
                                                <span>أجور اليد</span>
                                            </td>
                                            <td className="px-6 py-2">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        className="h-8 w-24 text-center bg-white"
                                                        placeholder="0"
                                                        defaultValue={repair.labor_cost}
                                                        onBlur={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            if (val !== repair.labor_cost && id) {
                                                                window.database.repairs.update({ id, labor_cost: val }).then(fetchRepair);
                                                                toast.success('تم تحديث أجور اليد');
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-xs text-slate-400">د.أ</span>
                                                </div>
                                            </td>
                                            <td></td>
                                        </tr>

                                        {/* Discount (Input) */}
                                        <tr>
                                            <td colSpan={3} className="px-6 py-2 text-left text-slate-500 text-xs text-red-500">خصم</td>
                                            <td className="px-6 py-2">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        className="h-8 w-24 text-center bg-white border-red-200 text-red-600"
                                                        placeholder="0"
                                                        defaultValue={repair.discount}
                                                        onBlur={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            if (val !== repair.discount && id) {
                                                                window.database.repairs.update({ id, discount: val }).then(fetchRepair);
                                                                toast.success('تم تحديث الخصم');
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-xs text-slate-400">د.أ</span>
                                                </div>
                                            </td>
                                            <td></td>
                                        </tr>

                                        {/* Tax (Calculated) */}
                                        <tr>
                                            <td colSpan={3} className="px-6 py-2 text-left text-slate-500 text-xs">
                                                الضريبة ({(repair.tax_rate * 100).toFixed(0)}%)
                                            </td>
                                            <td className="px-6 py-2 text-slate-600">
                                                {(repair.tax_amount || 0).toFixed(2)} د.أ
                                            </td>
                                            <td></td>
                                        </tr>

                                        {/* Final Total */}
                                        <tr className="bg-slate-100 border-t border-slate-200">
                                            <td colSpan={3} className="px-6 py-4 text-left font-bold text-slate-900">المجموع النهائي</td>
                                            <td className="px-6 py-4 font-black text-xl text-blue-700">
                                                {(repair.total_price || 0).toFixed(2)} د.أ
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-slate-500" />
                                سجل النشاط (Timeline)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-r border-slate-200 mr-3 space-y-8">
                                {repair.history && repair.history.map((h: any, i: number) => (
                                    <div key={i} className="relative mr-6">
                                        <div className="absolute -right-[31px] bg-white p-1">
                                            <div className="h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white"></div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-sm font-medium text-slate-900">
                                                تم تغيير الحالة إلى <span className="text-blue-600 font-bold">{h.new_status}</span>
                                            </p>
                                            <span className="text-xs text-slate-500">
                                                {new Date(h.created_at).toLocaleString('ar-EG')} • بواسطة {h.user_name || 'System'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <AddPartDialog
                open={showAddPart}
                onClose={() => setShowAddPart(false)}
                onAdd={handleAddPart}
            />

            {/* Hidden Print Receipt */}
            <div style={{ display: 'none' }}>
                {receiptData && <PrintableRepairReceipt ref={receiptRef} data={receiptData} />}
            </div>
        </div>
    );
}

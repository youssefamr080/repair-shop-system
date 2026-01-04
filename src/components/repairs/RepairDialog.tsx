import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    User,
    Phone,
    Smartphone,
    Hash,
    Unlock,
    AlertCircle,
    DollarSign,
    Save,
    Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormField } from '../ui/FormField';
import { Select } from '../ui/Select';
import { THEME } from '../../constants/theme';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { RepairPriority, CreateRepairInput } from '../../types/repairs';

// Frontend Validation Schema
const repairSchema = z.object({
    // Customer Info
    customer_phone: z.string().min(10, 'رقم الهاتف مطلوب'),
    customer_name: z.string().min(3, 'اسم العميل مطلوب'),

    // Device Info
    device_type: z.string().min(1, 'نوع الجهاز مطلوب'),
    device_brand: z.string().min(1, 'الماركة مطلوبة'),
    device_model: z.string().min(1, 'الموديل مطلوب'),
    serial_number: z.string().optional(),
    imei: z.string().optional(),
    passcode: z.string().optional(),
    color: z.string().optional(),
    condition: z.string().optional(),

    // Diagnostics
    problem_description: z.string().min(3, 'وصف المشكلة مطلوب'),
    estimated_cost: z.coerce.number().min(0),
    priority: z.string(),
});

interface RepairDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function RepairDialog({ open, onOpenChange, onSuccess }: RepairDialogProps) {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const form = useForm({
        resolver: zodResolver(repairSchema),
        defaultValues: {
            customer_phone: '',
            customer_name: '',
            device_type: 'Smartphone',
            device_brand: '',
            device_model: '',
            serial_number: '',
            imei: '',
            passcode: '',
            color: '',
            condition: '',
            problem_description: '',
            priority: 'NORMAL',
            estimated_cost: 0,
        }
    });

    const onSubmit = async (data: z.infer<typeof repairSchema>) => {
        setLoading(true);
        try {
            // Send data directly. Backend handles "Find or Create" logic.
            const payload = {
                ...data,
                // Ensure proper typing for backend
                estimated_cost: Number(data.estimated_cost) || 0,
                priority: data.priority as RepairPriority,
            };

            if (window.database?.repairs) {
                const result = await window.database.repairs.create(payload as CreateRepairInput);
                if (result.success) {
                    toast.success(`تم إنشاء التذكرة ${result.ticket_number}`);
                    onSuccess?.(); // Call success callback if provided
                    navigate(`/repairs/${result.id}`);
                }
                onOpenChange(false);
                form.reset();
            } else {
                // Dev mode fallback
                console.log('Mock Submit:', payload);
                toast.success('تم الحفظ (وضع المعاينة)');
                onOpenChange(false);
            }

        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onOpenChange(false)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: THEME.primary, fontFamily: "'Amiri', serif" }}>
                        <div className="p-2 rounded-full bg-blue-50">
                            <Smartphone className="h-6 w-6 text-blue-600" />
                        </div>
                        استلام جهاز جديد
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">

                    {/* Split View Container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* RIGHT COLUMN: Customer Info (The Identity) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: `${THEME.primary}20` }}>
                                <User className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-bold text-lg">بيانات العميل</h3>
                            </div>

                            <div className="grid gap-4">
                                <FormField label="رقم الهاتف" error={form.formState.errors.customer_phone?.message}>
                                    <div className="relative">
                                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            {...form.register('customer_phone')}
                                            className="pr-9 font-mono text-left"
                                            placeholder="01xxxxxxxxx"
                                            dir="ltr"
                                        />
                                    </div>
                                </FormField>

                                <FormField label="اسم العميل" error={form.formState.errors.customer_name?.message}>
                                    <Input {...form.register('customer_name')} placeholder="الاسم ثلاثي" />
                                </FormField>
                            </div>

                            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mt-4">
                                <p className="text-sm text-blue-800 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    سيتم البحث عن العميل تلقائياً برقم الهاتف.
                                </p>
                            </div>
                        </div>

                        {/* LEFT COLUMN: Device Info (The Object) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: `${THEME.primary}20` }}>
                                <Smartphone className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-bold text-lg">بيانات الجهاز</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="نوع الجهاز">
                                    <Select
                                        name="device_type"
                                        value={form.watch('device_type')}
                                        onChange={(e) => form.setValue('device_type', e.target.value)}
                                        options={[
                                            { value: 'Smartphone', label: 'موبايل' },
                                            { value: 'Tablet', label: 'تابلت' },
                                            { value: 'Laptop', label: 'لابتوب' },
                                            { value: 'Accessory', label: 'اكسسوارات' }
                                        ]}
                                    />
                                </FormField>

                                <FormField label="الماركة" error={form.formState.errors.device_brand?.message}>
                                    <Input {...form.register('device_brand')} placeholder="Apple, Samsung..." />
                                </FormField>
                            </div>

                            <FormField label="موديل الجهاز" error={form.formState.errors.device_model?.message}>
                                <Input {...form.register('device_model')} placeholder="iPhone 13 Pro Max..." />
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="رمز القفل (Pattern/PIN)">
                                    <div className="relative">
                                        <Unlock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input {...form.register('passcode')} className="pr-9" placeholder="****" />
                                    </div>
                                </FormField>

                                <FormField label="اللون">
                                    <Input {...form.register('color')} placeholder="أزرق، أسود..." />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="الرقم التسلسلي (S/N)">
                                    <div className="relative">
                                        <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input {...form.register('serial_number')} className="pr-9 font-mono text-xs" placeholder="اختياري" />
                                    </div>
                                </FormField>
                                <FormField label="IMEI">
                                    <div className="relative">
                                        <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input {...form.register('imei')} className="pr-9 font-mono text-xs" placeholder="اختياري" />
                                    </div>
                                </FormField>
                            </div>
                        </div>

                    </div>

                    {/* BOTTOM SECTION: Diagnostics (The Context) */}
                    <div className="pt-6 border-t">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-muted-foreground" />
                            تفاصيل العطل
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <FormField label="وصف المشكلة (شكوى العميل)" error={form.formState.errors.problem_description?.message}>
                                    <textarea
                                        {...form.register('problem_description')}
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                        placeholder="الجهاز لا يشحن، الشاشة مكسورة..."
                                    />
                                </FormField>
                            </div>

                            <div className="space-y-4">
                                <FormField label="أولوية الإصلاح">
                                    <Select
                                        name="priority"
                                        value={form.watch('priority')}
                                        onChange={(e) => form.setValue('priority', e.target.value)}
                                        options={[
                                            { value: 'LOW', label: 'منخفضة' },
                                            { value: 'NORMAL', label: 'عادية' },
                                            { value: 'HIGH', label: 'مستعجلة' },
                                            { value: 'URGENT', label: 'طارئة ⚡' }
                                        ]}
                                    />
                                </FormField>

                                <FormField label="التكلفة التقديرية (اختياري)">
                                    <div className="relative">
                                        <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            {...form.register('estimated_cost')}
                                            className="pr-9 font-mono font-bold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </FormField>
                            </div>
                        </div>

                        <div className="mt-4">
                            <FormField label="حالة الجهاز الخارجية (خدوش/كسور)">
                                <Input {...form.register('condition')} placeholder="خدوش بسيطة في الظهر، الشاشة سليمة..." />
                            </FormField>
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-4 gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            إلغاء
                        </Button>
                        <Button
                            type="submit"
                            className="gap-2 min-w-[150px]"
                            style={{ backgroundColor: THEME.primary }}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            حفظ واستلام
                        </Button>
                    </DialogFooter>

                </form>
            </DialogContent>
        </Dialog>
    );
}

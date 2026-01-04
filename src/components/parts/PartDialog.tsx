import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { toast } from 'sonner';
import { Package, Barcode, DollarSign, Layers, Loader2 } from 'lucide-react';
import { useSuppliers } from '../../hooks/useQueries';

const partSchema = z.object({
    name: z.string().min(1, 'اسم القطعة مطلوب'),
    sku: z.string().min(1, 'SKU مطلوب'),
    barcode: z.string().optional(),
    description: z.string().optional(),
    cost_price: z.coerce.number().min(0, 'السعر يجب أن يكون 0 أو أكثر'),
    selling_price: z.coerce.number().min(0, 'السعر يجب أن يكون 0 أو أكثر'),
    min_stock_level: z.coerce.number().min(0),
    supplier_id: z.coerce.number().optional(),
});

type PartFormData = z.infer<typeof partSchema>;

import { DBPart } from '../../types/electron.d';

interface PartDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    part: DBPart | null;
}

export function PartDialog({ open, onOpenChange, part }: PartDialogProps) {
    const [saving, setSaving] = useState(false);
    const { data: suppliers } = useSuppliers();
    const isEditing = !!part;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(partSchema),
        defaultValues: {
            name: '',
            sku: '',
            barcode: '',
            description: '',
            cost_price: 0,
            selling_price: 0,
            min_stock_level: 5,
            supplier_id: undefined,
        },
    });

    // Fetch next SKU if creating new
    useEffect(() => {
        if (open && !part) {
            window.database?.parts?.getNextSku?.('PRT').then((sku: string) => {
                setValue('sku', sku);
            });
        }
    }, [open, part, setValue]);

    useEffect(() => {
        if (open && part) {
            reset({
                name: part.name,
                sku: part.sku,
                barcode: part.barcode || '',
                description: part.description || '',
                cost_price: part.cost_price,
                selling_price: part.selling_price,
                min_stock_level: part.min_stock_level,
                supplier_id: part.supplier_id,
            });
        } else if (open && !part) {
            // Reset handled by getNextSku effect mostly, but ensure clean slate
            setValue('name', '');
            // SKU set by other effect
            setValue('barcode', '');
            setValue('cost_price', 0);
            setValue('selling_price', 0);
        }
    }, [open, part, reset]);


    const onSubmit = async (data: PartFormData) => {
        setSaving(true);
        try {
            if (isEditing) {
                await window.database.parts.update(part.id, data);
            } else {
                await window.database.parts.create(data);
            }
            toast.success(isEditing ? 'تم تحديث القطعة بنجاح' : 'تم إضافة القطعة بنجاح');
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error('فشل في حفظ القطعة');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onOpenChange(false)}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-500" />
                        {isEditing ? 'تعديل قطعة غيار' : 'إضافة قطعة غيار جديدة'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Basic Info */}
                        <div className="col-span-2 space-y-2">
                            <label className="text-sm font-medium">اسم القطعة *</label>
                            <Input {...register('name')} placeholder="مثال: شاشة iPhone 11 Pro" className={errors.name ? 'border-red-500' : ''} />
                            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex gap-2 items-center">
                                <Barcode className="h-4 w-4" />
                                SKU (الرمز المميز) *
                            </label>
                            <Input {...register('sku')} placeholder="PRT001" className="font-mono uppercase " />
                            {errors.sku && <p className="text-xs text-red-500">{errors.sku.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">الباركود (اختياري)</label>
                            <Input {...register('barcode')} placeholder="مسح الباركود..." />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex gap-2 items-center">
                                <DollarSign className="h-4 w-4" />
                                سعر التكلفة
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('cost_price', { valueAsNumber: true })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex gap-2 items-center">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                سعر البيع
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('selling_price', { valueAsNumber: true })}
                                className="font-bold text-green-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex gap-2 items-center">
                                <Layers className="h-4 w-4" />
                                الحد الأدنى للمخزون
                            </label>
                            <Input
                                type="number"
                                {...register('min_stock_level', { valueAsNumber: true })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">المورد</label>
                            <select
                                {...register('supplier_id', { valueAsNumber: true })}
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">خارج الموردين</option>
                                {suppliers?.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-sm font-medium">وصف / ملاحظات</label>
                            <Textarea {...register('description')} rows={2} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 w-32">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEditing ? 'حفظ التغييرات' : 'إضافة القطعة')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

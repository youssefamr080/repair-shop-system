/**
 * SupplierDialog Component - Mayo Fix
 * 
 * Add/Edit supplier modal with Form Validation (Zod + React Hook Form).
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Truck, Save, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateSupplier, useUpdateSupplier } from '../../hooks';
import {
    Dialog,
    DialogHeader,
    DialogTitle,
    DialogContent,
    DialogFooter,
    DialogClose,
    Button,
    Input,
} from '../ui';
import { THEME } from '../../constants/theme';
import type { DBSupplier } from '../../types/electron.d';

// Validation Schema
const supplierSchema = z.object({
    name: z.string().min(1, 'اسم المورد مطلوب').max(100),
    phone: z.string().max(50).optional().or(z.literal('')),
    email: z.string().email('بريد إلكتروني غير صالح').max(100).optional().or(z.literal('')),
    address: z.string().max(255).optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
    is_active: z.number(), // Removed default, handled by useForm
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierDialogProps {
    open: boolean;
    supplier: DBSupplier | null;
    onClose: () => void;
}

export function SupplierDialog({ open, supplier, onClose }: SupplierDialogProps) {
    const createSupplier = useCreateSupplier();
    const updateSupplier = useUpdateSupplier();
    const isEditing = !!supplier;
    const isSaving = createSupplier.isPending || updateSupplier.isPending;

    const form = useForm({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            address: '',
            notes: '',
            is_active: 1,
        },
    });

    useEffect(() => {
        if (open) {
            if (supplier) {
                form.reset({
                    name: supplier.name,
                    phone: supplier.phone || '',
                    email: supplier.email || '',
                    address: supplier.address || '',
                    notes: supplier.notes || '',
                    is_active: supplier.is_active,
                });
            } else {
                form.reset({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    notes: '',
                    is_active: 1,
                });
            }
        }
    }, [supplier, open, form]);

    const onSubmit = async (data: SupplierFormData) => {
        try {
            const payload = {
                name: data.name,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                notes: data.notes || null,
                is_active: data.is_active,
            };

            if (isEditing && supplier) {
                await updateSupplier.mutateAsync({ id: supplier.id, updates: payload });
                toast.success('تم تحديث المورد');
            } else {
                await createSupplier.mutateAsync(payload);
                toast.success('تم إضافة المورد');
            }
            onClose();
        } catch (error: unknown) {
            console.error('Failed to save supplier:', error);
            const message = error instanceof Error ? error.message : '';
            if (message.includes('UNIQUE') || message.includes('DUPLICATE')) {
                toast.error('اسم المورد موجود مسبقاً');
            } else {
                toast.error('فشل حفظ المورد');
            }
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onClose={() => onClose()}>
            <DialogClose onClose={() => onClose()} />
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                    <Truck className="h-5 w-5" style={{ color: THEME.gold }} />
                    {isEditing ? 'تعديل مورد' : 'إضافة مورد جديد'}
                </DialogTitle>
            </DialogHeader>

            <DialogContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="text-sm font-medium mb-1 block">اسم المورد *</label>
                        <Input
                            {...form.register('name')}
                            placeholder="اسم المورد"
                            className={form.formState.errors.name ? 'border-red-500' : ''}
                        />
                        {form.formState.errors.name && (
                            <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>
                        )}
                    </div>

                    {/* Phone & Email */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> الهاتف
                            </label>
                            <Input
                                {...form.register('phone')}
                                placeholder="رقم الهاتف"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> البريد الإلكتروني
                            </label>
                            <Input
                                {...form.register('email')}
                                type="email"
                                placeholder="email@example.com"
                                dir="ltr"
                                className={form.formState.errors.email ? 'border-red-500' : ''}
                            />
                            {form.formState.errors.email && (
                                <p className="text-xs text-red-500 mt-1">{form.formState.errors.email.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="text-sm font-medium mb-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> العنوان
                        </label>
                        <Input
                            {...form.register('address')}
                            placeholder="عنوان المورد"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-sm font-medium mb-1 flex items-center gap-1">
                            <FileText className="h-3 w-3" /> ملاحظات
                        </label>
                        <textarea
                            {...form.register('notes')}
                            placeholder="ملاحظات إضافية"
                            rows={2}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            {...form.register('is_active', {
                                setValueAs: (v: boolean) => v ? 1 : 0 // Handle checkbox as 1/0
                            })}
                            defaultChecked={form.getValues('is_active') === 1}
                            className="rounded border-input"
                        />
                        <label htmlFor="is_active" className="text-sm">مورد نشط</label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onClose()}>إلغاء</Button>
                        <Button type="submit" disabled={isSaving} style={{ backgroundColor: THEME.gold }}>
                            {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                            {isEditing ? 'حفظ التعديلات' : 'إضافة المورد'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


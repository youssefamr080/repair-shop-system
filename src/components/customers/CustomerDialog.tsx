/**
 * Customer Dialog - Mayo Fix Enterprise
 * 
 * Create/Edit customer modal with form validation.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { toast } from 'sonner';
import { THEME } from '../../constants/theme';
import { User, Phone, Mail, MapPin, FileText, Loader2 } from 'lucide-react';

// Validation Schema
const customerSchema = z.object({
    name: z.string().min(1, 'اسم العميل مطلوب').max(200),
    phone: z.string().max(20).optional().or(z.literal('')),
    email: z.string().email('بريد إلكتروني غير صالح').max(100).optional().or(z.literal('')),
    address: z.string().max(500).optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Customer {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
}

interface CustomerDialogProps {
    open: boolean;
    onClose: (saved: boolean) => void;
    customer: Customer | null;
}

export function CustomerDialog({ open, onClose, customer }: CustomerDialogProps) {
    const [saving, setSaving] = useState(false);
    const isEditing = !!customer;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            address: '',
            notes: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (customer) {
                reset({
                    name: customer.name,
                    phone: customer.phone || '',
                    email: customer.email || '',
                    address: customer.address || '',
                    notes: customer.notes || '',
                });
            } else {
                reset({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    notes: '',
                });
            }
        }
    }, [open, customer, reset]);

    const onSubmit = async (data: CustomerFormData) => {
        setSaving(true);
        try {
            const payload = {
                name: data.name,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                notes: data.notes || null,
            };

            if (isEditing && customer) {
                if (window.database?.customers?.update) {
                    await window.database.customers.update(customer.id, payload);
                    toast.success('تم تحديث بيانات العميل');
                }
            } else {
                if (window.database?.customers?.create) {
                    await window.database.customers.create(payload);
                    toast.success('تم إضافة العميل بنجاح');
                }
            }
            onClose(true);
        } catch (error) {
            console.error('Failed to save customer:', error);
            toast.error(isEditing ? 'فشل تحديث العميل' : 'فشل إضافة العميل');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2" style={{ color: THEME.slate }}>
                        <User className="h-5 w-5" style={{ color: THEME.orange }} />
                        {isEditing ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            اسم العميل *
                        </label>
                        <Input
                            {...register('name')}
                            placeholder="أدخل اسم العميل"
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            رقم الهاتف
                        </label>
                        <Input
                            {...register('phone')}
                            placeholder="01xxxxxxxxx"
                            dir="ltr"
                            className="text-left"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            البريد الإلكتروني
                        </label>
                        <Input
                            {...register('email')}
                            type="email"
                            placeholder="example@email.com"
                            dir="ltr"
                            className={`text-left ${errors.email ? 'border-red-500' : ''}`}
                        />
                        {errors.email && (
                            <p className="text-sm text-red-500">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            العنوان
                        </label>
                        <Input
                            {...register('address')}
                            placeholder="أدخل العنوان"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            ملاحظات
                        </label>
                        <Textarea
                            {...register('notes')}
                            placeholder="ملاحظات إضافية..."
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onClose(false)}
                            disabled={saving}
                        >
                            إلغاء
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            style={{ backgroundColor: THEME.orange }}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                isEditing ? 'حفظ التعديلات' : 'إضافة العميل'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default CustomerDialog;

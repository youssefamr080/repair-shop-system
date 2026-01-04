import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/Textarea';
import { toast } from 'sonner';

import { DBCustomer } from '../../types/electron.d';

interface AddPaymentDialogProps {
    open: boolean;
    onClose: (saved: boolean) => void;
    customer: DBCustomer | null;
}

export function AddPaymentDialog({ open, onClose, customer }: AddPaymentDialogProps) {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'CREDIT' | 'DEBIT'>('CREDIT'); // CREDIT = Payment, DEBIT = Charge
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setAmount('');
            setNotes('');
            setType('CREDIT');
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(parseFloat(amount))) {
            toast.error('الرجاء إدخال مبلغ صحيح');
            return;
        }

        if (!customer) {
            toast.error('لا يوجد عميل محدد');
            return;
        }

        setLoading(true);
        try {
            if (window.database?.customers?.addTransaction) {
                await window.database.customers.addTransaction({
                    customer_id: customer.id,
                    type,
                    amount: parseFloat(amount),
                    reference_type: 'PAYMENT',
                    notes: notes || 'دفعة نقدية'
                });
                toast.success('تم تسجيل العملية بنجاح');
                onClose(true);
            }
        } catch (error) {
            console.error(error);
            toast.error('فشل تسجيل العملية');
        } finally {
            setLoading(false);
        }
    };

    if (!customer) return null;

    return (
        <Dialog open={open} onClose={() => onClose(false)}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>تسجيل عملية مالية - {customer.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">

                    {/* Transaction Type */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <input
                                type="radio"
                                id="type-credit"
                                name="type"
                                className="peer hidden"
                                checked={type === 'CREDIT'}
                                onChange={() => setType('CREDIT')}
                            />
                            <label
                                htmlFor="type-credit"
                                className="block text-center p-2 rounded-md border-2 cursor-pointer peer-checked:border-green-500 peer-checked:bg-green-50 peer-checked:text-green-700 hover:bg-slate-50 transition-all font-bold"
                            >
                                قبض (دفع)
                            </label>
                        </div>
                        <div className="flex-1">
                            <input
                                type="radio"
                                id="type-debit"
                                name="type"
                                className="peer hidden"
                                checked={type === 'DEBIT'}
                                onChange={() => setType('DEBIT')}
                            />
                            <label
                                htmlFor="type-debit"
                                className="block text-center p-2 rounded-md border-2 cursor-pointer peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700 hover:bg-slate-50 transition-all font-bold"
                            >
                                دين (عليه)
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>المبلغ (د.أ)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="text-center text-lg font-mono font-bold"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>ملاحظات</Label>
                        <Textarea
                            placeholder="تفاصيل العملية..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onClose(false)}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={loading || !amount}>
                            {loading ? 'جاري الحفظ...' : 'حفظ'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

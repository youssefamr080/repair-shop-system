import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/Textarea';
import { toast } from 'sonner';
import { PackagePlus, PackageMinus, RefreshCw } from 'lucide-react';
import { useActiveWarehouses } from '../../hooks/useQueries';
import { DBPart } from '../../types/electron';

type OperationType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUST';

interface StockOperationDialogProps {
    open: boolean;
    onClose: (saved: boolean) => void;
    part: DBPart | null;
}

export function StockOperationDialog({ open, onClose, part }: StockOperationDialogProps) {
    const [operation, setOperation] = useState<OperationType>('STOCK_IN');
    const [warehouseId, setWarehouseId] = useState<number>(1);
    const [quantity, setQuantity] = useState<string>('');
    const [unitCost, setUnitCost] = useState<string>('');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const { data: warehouses } = useActiveWarehouses();

    useEffect(() => {
        if (open) {
            setQuantity('');
            setUnitCost('');
            setReference('');
            setNotes('');
            setOperation('STOCK_IN');
            // Default to first warehouse if available
            if (warehouses && warehouses.length > 0) {
                setWarehouseId(warehouses[0].id);
            }
        }
    }, [open, warehouses]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!part) return;

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            if (operation !== 'ADJUST') {
                toast.error('الرجاء إدخال كمية صحيحة');
                return;
            } else if (isNaN(qty)) {
                // Allow 0 for adjust? Yes. But strictly checking NaN
                toast.error('الرجاء إدخال كمية صحيحة');
                return;
            }
        }

        setLoading(true);
        try {
            if (operation === 'STOCK_IN') {
                await window.database.inventory.stockIn({
                    product_id: part.id,
                    warehouse_id: warehouseId,
                    quantity: qty,
                    unit_cost: unitCost ? parseFloat(unitCost) : undefined,
                    reference_number: reference,
                    notes
                });
                toast.success('تم إضافة الرصيد بنجاح');
            } else if (operation === 'STOCK_OUT') {
                await window.database.inventory.stockOut({
                    product_id: part.id,
                    warehouse_id: warehouseId,
                    quantity: qty,
                    reference_number: reference,
                    notes
                });
                toast.success('تم صرف الرصيد بنجاح');
            } else if (operation === 'ADJUST') {
                await window.database.inventory.adjust({
                    product_id: part.id,
                    warehouse_id: warehouseId,
                    new_quantity: qty,
                    reason: notes
                });
                toast.success('تم تسوية المخزون بنجاح');
            }
            onClose(true);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'فشل العملية');
        } finally {
            setLoading(false);
        }
    };

    if (!part) return null;

    return (
        <Dialog open={open} onClose={() => onClose(false)}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>عمليات المخزون - {part.name}</DialogTitle>
                </DialogHeader>

                {/* Operation Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                    <button
                        type="button"
                        onClick={() => setOperation('STOCK_IN')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${operation === 'STOCK_IN' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <PackagePlus className="h-4 w-4" />
                        إضافة رصيد
                    </button>
                    <button
                        type="button"
                        onClick={() => setOperation('STOCK_OUT')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${operation === 'STOCK_OUT' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <PackageMinus className="h-4 w-4" />
                        صرف رصيد
                    </button>
                    <button
                        type="button"
                        onClick={() => setOperation('ADJUST')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${operation === 'ADJUST' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <RefreshCw className="h-4 w-4" />
                        تسوية (جرد)
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>المستودع</Label>
                            <select
                                value={warehouseId}
                                onChange={(e) => setWarehouseId(parseInt(e.target.value))}
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                {warehouses?.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label>
                                {operation === 'ADJUST' ? 'الكمية الفعلية (الجديدة)' : 'الكمية'}
                            </Label>
                            <Input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0"
                                className="font-mono text-center"
                                autoFocus
                            />
                        </div>
                    </div>

                    {operation === 'STOCK_IN' && (
                        <div className="space-y-2">
                            <Label>تكلفة الوحدة (اختياري)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={unitCost}
                                onChange={(e) => setUnitCost(e.target.value)}
                                placeholder={`التكلفة الحالية: ${part.cost_price}`}
                            />
                            <p className="text-xs text-slate-500">
                                ترك الحقل فارغاً سيستخدم متوسط التكلفة الحالي.
                            </p>
                        </div>
                    )}

                    {(operation === 'STOCK_IN' || operation === 'STOCK_OUT') && (
                        <div className="space-y-2">
                            <Label>رقم المرجع (اختياري)</Label>
                            <Input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder={operation === 'STOCK_IN' ? 'رقم الفاتورة...' : 'رقم الإذن...'}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>ملاحظات / سبب</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="تفاصيل العملية..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onClose(false)}>
                            إلغاء
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !quantity}
                            className={
                                operation === 'STOCK_IN' ? 'bg-green-600 hover:bg-green-700' :
                                    operation === 'STOCK_OUT' ? 'bg-red-600 hover:bg-red-700' :
                                        'bg-blue-600 hover:bg-blue-700'
                            }
                        >
                            {loading ? 'جاري التنفيذ...' : 'تأكيد العملية'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

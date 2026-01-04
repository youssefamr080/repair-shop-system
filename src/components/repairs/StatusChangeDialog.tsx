/**
 * Status Change Dialog Component
 * Mayo Fix Enterprise - Smart status transitions with workflow validation
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { toast } from 'sonner';
import { RepairWorkflowEngine } from '../../utils/repairWorkflow';
import type { DBRepair, RepairStatus } from '../../types/repairs';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface StatusChangeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    repair: DBRepair;
    onSuccess: () => void;
}

export function StatusChangeDialog({ open, onOpenChange, repair, onSuccess }: StatusChangeDialogProps) {
    const [selectedStatus, setSelectedStatus] = useState<RepairStatus | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const allowedTransitions = RepairWorkflowEngine.getAllowedTransitions(repair.status);

    const handleSubmit = async () => {
        if (!selectedStatus) {
            toast.error('يرجى اختيار الحالة الجديدة');
            return;
        }

        // Validate transition
        const validation = RepairWorkflowEngine.canTransition(repair, selectedStatus);
        if (!validation.allowed) {
            toast.error(validation.reason || 'الانتقال غير مسموح');
            return;
        }

        setLoading(true);
        try {
            const result = await window.database.repairs.changeStatus({
                repair_id: repair.id,
                new_status: selectedStatus,
                notes
            });

            if (result.success) {
                toast.success('تم تغيير حالة التذكرة بنجاح');
                onSuccess();
                onOpenChange(false);
                setSelectedStatus(null);
                setNotes('');
            } else {
                toast.error(result.message || 'فشل تغيير الحالة');
            }
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء تغيير الحالة');
        } finally {
            setLoading(false);
        }
    };

    const selectedTransition = allowedTransitions.find(t => t.to === selectedStatus);

    return (
        <Dialog open={open} onClose={() => onOpenChange(false)}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-blue-500" />
                        تغيير حالة التذكرة
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Current Status */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">الحالة الحالية</p>
                        <p className="font-semibold text-gray-900">{repair.status}</p>
                        <p className="text-xs text-gray-500 mt-1">التذكرة: {repair.ticket_number}</p>
                    </div>

                    {/* Allowed Transitions */}
                    {allowedTransitions.length === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-yellow-900">لا توجد انتقالات متاحة</p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    الحالة الحالية نهائية ولا يمكن تغييرها
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    الحالة الجديدة
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={selectedStatus || ''}
                                    onChange={(e) => setSelectedStatus(e.target.value as RepairStatus)}
                                >
                                    <option value="">اختر الحالة...</option>
                                    {allowedTransitions.map((transition) => (
                                        <option key={transition.to} value={transition.to}>
                                            {transition.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Validation Messages */}
                            {selectedStatus && selectedTransition && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-900">
                                            <p className="font-medium">متطلبات الانتقال:</p>
                                            {selectedTransition.requiredFields && selectedTransition.requiredFields.length > 0 && (
                                                <ul className="list-disc list-inside mt-1 text-blue-800">
                                                    {selectedTransition.requiredFields.map(field => (
                                                        <li key={String(field)}>{String(field)}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            {!selectedTransition.requiredFields && (
                                                <p className="text-blue-800 mt-1">لا توجد متطلبات إضافية</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ملاحظات (اختياري)
                                </label>
                                <Textarea
                                    placeholder="أضف أي ملاحظات حول تغيير الحالة..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={loading}
                                >
                                    إلغاء
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!selectedStatus || loading}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {loading ? 'جاري الحفظ...' : 'تغيير الحالة'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

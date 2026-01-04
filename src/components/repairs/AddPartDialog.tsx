import { useState, useEffect } from 'react';
import { Search, Plus, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useDebounce } from '../../hooks/useDebounce'; // Assuming this hook exists, or I'll implement local debounce

export function AddPartDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (productId: number, quantity: number) => Promise<void> }) {
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Debounce search
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        if (!debouncedSearch) {
            setProducts([]);
            return;
        }

        const fetchProducts = async () => {
            setLoading(true);
            try {
                if (window.database?.parts) {
                    const results = await window.database.parts.search(debouncedSearch, 10);
                    setProducts(results || []);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [debouncedSearch]);

    const handleSubmit = async () => {
        if (!selectedProduct) return;
        setSubmitting(true);
        try {
            await onAdd(selectedProduct.id, quantity);
            onClose();
            // Reset
            setSearch('');
            setSelectedProduct(null);
            setQuantity(1);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>إضافة قطعة غيار</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Search Section */}
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="ابحث عن المنتج..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setSelectedProduct(null); // Reset selection on search change
                                }}
                                className="pr-9"
                            />
                        </div>

                        {/* Search Results */}
                        {search && !selectedProduct && (
                            <div className="border rounded-md shadow-sm bg-white divide-y max-h-48 overflow-y-auto">
                                {loading ? (
                                    <div className="p-3 text-center text-sm text-slate-500">جاري البحث...</div>
                                ) : products.length > 0 ? (
                                    products.map((p) => (
                                        <div
                                            key={p.id}
                                            onClick={() => setSelectedProduct(p)}
                                            className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center group"
                                        >
                                            <div>
                                                <p className="font-medium text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</p>
                                                <p className="text-xs text-slate-500">{p.sku}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-sm font-bold text-slate-700">{p.selling_price} د.أ</span>
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                                    مخزون: {p.stock_level || 0}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-sm text-slate-500">لا توجد نتائج</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Selected Product Review */}
                    {selectedProduct && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 bg-white rounded-md border flex items-center justify-center">
                                        <Package className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{selectedProduct.name}</p>
                                        <p className="text-xs text-slate-500">{selectedProduct.sku}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)} className="h-6 w-6 p-0 rounded-full hover:bg-red-50 hover:text-red-500">
                                    &times;
                                </Button>
                            </div>

                            <div className="flex items-center justify-between bg-white p-3 rounded border">
                                <span className="text-sm font-medium text-slate-600">الكمية</span>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    >
                                        -
                                    </Button>
                                    <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setQuantity(quantity + 1)}
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                <span className="text-sm text-slate-500">الإجمالي</span>
                                <span className="font-bold text-lg text-blue-600">
                                    {(selectedProduct.selling_price * quantity).toFixed(2)} د.أ
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>إلغاء</Button>
                    <Button onClick={handleSubmit} disabled={!selectedProduct || submitting} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        {submitting ? 'جاري الإضافة...' : (
                            <>
                                <Plus className="h-4 w-4" />
                                إضافة
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

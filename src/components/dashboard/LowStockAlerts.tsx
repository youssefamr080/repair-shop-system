/**
 * LowStockAlerts - Dashboard Low Stock Alerts Component
 * 
 * Displays products that are below their minimum stock level.
 */

import { AlertTriangle, Package, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

// Theme Constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
};

// Interface matching Dashboard.tsx LowStockProduct
export interface LowStockProduct {
    id: number;
    name: string;
    sku: string;
    currentStock: number;
    minStock: number;
    category?: string;
}

interface LowStockAlertsProps {
    products: LowStockProduct[];
    loading?: boolean;
    maxItems?: number;
    onProductClick?: (product: LowStockProduct) => void;
    onViewAll?: () => void;
}

export function LowStockAlerts({
    products,
    loading,
    maxItems = 5,
    onProductClick,
    onViewAll,
}: LowStockAlertsProps) {

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-5 w-5" />
                        تنبيهات نقص المخزون
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border animate-pulse">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-muted rounded" />
                                <div className="h-3 w-20 bg-muted rounded" />
                            </div>
                            <div className="h-6 w-16 bg-muted rounded-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!products || products.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <Package className="h-5 w-5" style={{ color: THEME.gold }} />
                        حالة المخزون
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div
                            className="p-4 rounded-full mb-4"
                            style={{ backgroundColor: '#22c55e15' }}
                        >
                            <Package className="h-8 w-8 text-green-500" />
                        </div>
                        <p className="text-green-600 font-medium">المخزون في حالة ممتازة</p>
                        <p className="text-sm text-muted-foreground mt-1">لا توجد منتجات تحت الحد الأدنى</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const displayProducts = products.slice(0, maxItems);
    const remainingCount = products.length - maxItems;

    return (
        <Card className="border-orange-200">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-5 w-5" />
                        تنبيهات نقص المخزون
                        <Badge variant="destructive" className="mr-2">
                            {products.length}
                        </Badge>
                    </CardTitle>
                    {onViewAll && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onViewAll}
                            className="text-orange-600 hover:text-orange-700"
                        >
                            عرض الكل
                            <ExternalLink className="h-3 w-3 mr-1" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <motion.div
                    className="space-y-2"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.1
                            }
                        }
                    }}
                >
                    {displayProducts.map((product) => {
                        const stockPercentage = product.minStock > 0
                            ? Math.round((product.currentStock / product.minStock) * 100)
                            : 0;
                        const isOutOfStock = product.currentStock === 0;

                        return (
                            <motion.div
                                key={product.id}
                                variants={{
                                    hidden: { opacity: 0, x: -20 },
                                    visible: { opacity: 1, x: 0 }
                                }}
                                className="flex items-center justify-between p-3 rounded-lg border border-orange-100 bg-orange-50/50 hover:bg-orange-50 transition-colors cursor-pointer"
                                onClick={() => onProductClick?.(product)}
                            >
                                <div className="space-y-1">
                                    <p className="font-medium text-sm">{product.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>SKU: {product.sku}</span>
                                        {product.category && (
                                            <>
                                                <span>•</span>
                                                <span>{product.category}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-left">
                                    <Badge
                                        variant={isOutOfStock ? 'destructive' : 'outline'}
                                        className={isOutOfStock ? '' : 'border-orange-300 text-orange-700 bg-orange-100'}
                                    >
                                        {isOutOfStock ? 'نفذ' : `${product.currentStock} / ${product.minStock}`}
                                    </Badge>
                                    {!isOutOfStock && (
                                        <p className="text-xs text-orange-600 mt-1">
                                            {stockPercentage}% من الحد الأدنى
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
                {remainingCount > 0 && (
                    <p className="text-center text-sm text-muted-foreground pt-2">
                        و {remainingCount} منتج آخر...
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Suppliers Page - Mayo Fix (Redesigned)
 * 
 * Enhanced supplier management with:
 * - Animated cards with contact details
 * - Quick stats bar
 * - Improved visual design
 */

import { useState, useMemo } from 'react';
import { Truck, Plus, RefreshCw, Edit, Trash2, Phone, Mail, MapPin, Package, Users, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useSuppliers, useDeleteSupplier } from '../hooks';
import { PageTransition } from '../components/layout';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { SupplierDialog } from '../components/suppliers';
import { PrintPreviewModal, PrintableSuppliersReport } from '../components/print';
import { cn } from '../utils/helpers';
import { THEME } from '../constants/theme';
import { DonutChart } from '../components/charts';
import type { DBSupplier } from '../types/electron.d';

// Simple animations for performance
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
};

const cardVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
};

export function Suppliers() {
    const {
        data: suppliersData,
        isLoading: loading,
        isRefetching,
        refetch
    } = useSuppliers();

    const deleteSupplier = useDeleteSupplier();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<DBSupplier | null>(null);
    const [printModalOpen, setPrintModalOpen] = useState(false);

    const suppliers = suppliersData || [];
    const isRefreshing = isRefetching;

    // Stats
    const stats = useMemo(() => {
        const active = suppliers.filter(s => s.is_active).length;
        const withContact = suppliers.filter(s => s.phone || s.email).length;
        const totalProducts = suppliers.reduce((sum, s) => sum + (s.products_count || 0), 0);
        return { total: suppliers.length, active, withContact, totalProducts };
    }, [suppliers]);

    // Data for DonutChart - top suppliers by product count
    const chartData = useMemo(() => {
        return suppliers
            .filter(s => (s.products_count || 0) > 0)
            .sort((a, b) => (b.products_count || 0) - (a.products_count || 0))
            .slice(0, 6)
            .map(s => ({
                label: s.name,
                value: s.products_count || 0,
            }));
    }, [suppliers]);

    const handleAdd = () => {
        setEditingSupplier(null);
        setDialogOpen(true);
    };

    const handleEdit = (supplier: DBSupplier) => {
        setEditingSupplier(supplier);
        setDialogOpen(true);
    };

    const handleDelete = async (supplier: DBSupplier) => {
        if (!confirm(`هل أنت متأكد من حذف "${supplier.name}"؟`)) return;
        try {
            await deleteSupplier.mutateAsync(supplier.id);
            toast.success('تم حذف المورد');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '';
            if (errorMessage.includes('products')) {
                toast.error('لا يمكن حذف مورد مرتبط بمنتجات');
            } else {
                toast.error('فشل حذف المورد');
            }
        }
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingSupplier(null);
    };

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Header */}
                <motion.div
                    className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-4">
                        <motion.div
                            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${THEME.navy} 0%, ${THEME.navy}dd 100%)` }}
                            whileHover={{ scale: 1.05 }}
                        >
                            <Truck className="h-7 w-7 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-3xl font-bold" style={{ color: THEME.navy, fontFamily: "'Amiri', serif" }}>
                                الموردين
                            </h1>
                            <p className="text-muted-foreground">
                                {loading ? 'جاري التحميل...' : `${suppliers.length} مورد`}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleAdd} className="gap-2 shadow-lg" variant="orange">
                            <Plus className="h-4 w-4" />
                            إضافة مورد
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => refetch()}
                            disabled={isRefreshing}
                            style={{ borderColor: THEME.navy, color: THEME.navy }}
                        >
                            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setPrintModalOpen(true)}
                            style={{ borderColor: THEME.gold, color: THEME.navy }}
                            title="طباعة التقرير"
                        >
                            <Printer className="h-4 w-4" />
                        </Button>
                    </div>
                </motion.div>

                {/* Quick Stats */}
                <motion.div
                    className="grid gap-3 grid-cols-2 lg:grid-cols-4"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    {[
                        { label: 'إجمالي الموردين', value: stats.total, icon: Truck, color: THEME.navy },
                        { label: 'موردين نشطين', value: stats.active, icon: Users, color: THEME.emerald },
                        { label: 'لديهم بيانات اتصال', value: stats.withContact, icon: Phone, color: THEME.gold },
                        { label: 'إجمالي المنتجات', value: stats.totalProducts, icon: Package, color: THEME.navy },
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            className="flex items-center gap-3 p-4 rounded-xl bg-card border hover:shadow-md transition-shadow"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            style={{ borderColor: `${stat.color}30` }}
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${stat.color}15` }}
                            >
                                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <p className="text-lg font-bold" style={{ color: stat.color }}>
                                    {loading ? '-' : stat.value.toLocaleString('ar-EG')}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Product Distribution by Supplier Chart */}
                {!loading && chartData.length > 0 && (
                    <motion.div
                        className="grid gap-4 md:grid-cols-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                                    <Package className="h-5 w-5" style={{ color: THEME.gold }} />
                                    توزيع المنتجات على الموردين
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <DonutChart
                                    data={chartData}
                                    height={250}
                                    showTotal={true}
                                    totalLabel="إجمالي المنتجات"
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle style={{ color: THEME.navy }}>أكبر الموردين</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {chartData.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                                style={{ backgroundColor: ['#1a237e', '#c5a153', '#3b82f6', '#22c55e', '#f97316', '#ef4444'][index % 6] }}
                                            >
                                                {index + 1}
                                            </div>
                                            <span className="font-medium">{item.label}</span>
                                        </div>
                                        <Badge variant="outline" style={{ borderColor: THEME.navy, color: THEME.navy }}>
                                            {item.value} منتج
                                        </Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Suppliers Grid */}
                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="h-48 rounded-xl bg-muted animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                            />
                        ))}
                    </div>
                ) : suppliers.length === 0 ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="border-dashed border-2">
                            <CardContent className="p-16 text-center">
                                <motion.div
                                    className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
                                    style={{ backgroundColor: `${THEME.navy}10` }}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring' }}
                                >
                                    <Truck className="h-10 w-10" style={{ color: THEME.navy }} />
                                </motion.div>
                                <h3 className="text-xl font-semibold mb-2" style={{ color: THEME.navy }}>
                                    لا يوجد موردين
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    ابدأ بإضافة موردين لتتبع مشترياتك ومصادر منتجاتك
                                </p>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <Button onClick={handleAdd} className="gap-2" variant="orange">
                                        <Plus className="h-4 w-4" />
                                        إضافة مورد
                                    </Button>
                                </motion.div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <AnimatePresence mode="popLayout">
                            {suppliers.map(supplier => (
                                <SupplierCard
                                    key={supplier.id}
                                    supplier={supplier}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                <SupplierDialog
                    open={dialogOpen}
                    supplier={editingSupplier}
                    onClose={handleDialogClose}
                />

                {/* Tip */}
                {suppliers.length > 0 && (
                    <motion.div
                        className="text-center text-sm text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        💡 <span className="font-medium">نصيحة:</span> أضف بيانات الاتصال للموردين لسهولة التواصل معهم
                    </motion.div>
                )}

                {/* Print Preview Modal */}
                <PrintPreviewModal
                    isOpen={printModalOpen}
                    onClose={() => setPrintModalOpen(false)}
                    title="تقرير الموردين"
                >
                    <PrintableSuppliersReport suppliers={suppliers} />
                </PrintPreviewModal>
            </div>
        </PageTransition>
    );
}

// Supplier Card Component
interface SupplierCardProps {
    supplier: DBSupplier;
    onEdit: (s: DBSupplier) => void;
    onDelete: (s: DBSupplier) => void;
}

function SupplierCard({ supplier, onEdit, onDelete }: SupplierCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const hasContactInfo = supplier.phone || supplier.email || supplier.address;

    return (
        <motion.div
            variants={cardVariants}
            layout
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Card
                className={cn(
                    'transition-all duration-300 h-full',
                    isHovered && 'shadow-lg -translate-y-1'
                )}
                style={{ borderTop: `3px solid ${THEME.gold}` }}
            >
                <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                                style={{ background: `linear-gradient(135deg, ${THEME.navy} 0%, ${THEME.navy}cc 100%)` }}
                            >
                                {supplier.name.charAt(0)}
                            </div>
                            <div>
                                <CardTitle className="text-lg" style={{ color: THEME.navy }}>
                                    {supplier.name}
                                </CardTitle>
                                {supplier.contact_person && (
                                    <p className="text-xs text-muted-foreground">
                                        {supplier.contact_person}
                                    </p>
                                )}
                            </div>
                        </div>
                        <motion.div
                            className="flex gap-1"
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: isHovered ? 1 : 0.5 }}
                        >
                            <Button variant="ghost" size="sm" onClick={() => onEdit(supplier)} className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(supplier)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </motion.div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Contact Info */}
                    {hasContactInfo && (
                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                            {supplier.phone && (
                                <motion.a
                                    href={`tel:${supplier.phone}`}
                                    className="flex items-center gap-2 hover:text-primary transition-colors"
                                    whileHover={{ x: -4 }}
                                >
                                    <Phone className="h-4 w-4" style={{ color: THEME.gold }} />
                                    <span dir="ltr">{supplier.phone}</span>
                                </motion.a>
                            )}
                            {supplier.email && (
                                <motion.a
                                    href={`mailto:${supplier.email}`}
                                    className="flex items-center gap-2 hover:text-primary transition-colors"
                                    whileHover={{ x: -4 }}
                                >
                                    <Mail className="h-4 w-4" style={{ color: THEME.gold }} />
                                    <span dir="ltr" className="truncate">{supplier.email}</span>
                                </motion.a>
                            )}
                            {supplier.address && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: THEME.gold }} />
                                    <span className="line-clamp-2">{supplier.address}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                            {supplier.is_active ? '✓ نشط' : 'غير نشط'}
                        </Badge>
                        {supplier.products_count !== undefined && supplier.products_count > 0 && (
                            <Badge variant="outline" className="gap-1">
                                <Package className="h-3 w-3" />
                                {supplier.products_count} منتج
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default Suppliers;

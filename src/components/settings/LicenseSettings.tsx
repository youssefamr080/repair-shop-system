/**
 * LicenseSettings - License Management Tab (Tab 4)
 * 
 * Features:
 * - View license status and days remaining
 * - Activate license with key
 * - Renew license
 * - View device info
 * - Navy Blue (#1a237e) & Gold (#c5a153) theme
 */

import { useState, useEffect } from 'react';
import { Shield, Key, RefreshCw, Monitor, CheckCircle, XCircle, AlertTriangle, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Button,
} from '../ui';
import type { LicenseStatus, LicenseAPI } from '../../types/electron.d';

// Theme Constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
    emerald: '#10b981',
    rose: '#f43f5e',
    amber: '#f59e0b',
};

interface DeviceInfo {
    verification: {
        valid: boolean;
        isNewDevice: boolean;
        similarityScore: number;
        matchedComponents: string[];
        unmatchedComponents: string[];
        reason?: string;
    };
    components: {
        hostname: string;
        cpuModel: string;
        cpuCores: number;
        totalMemoryGB: number;
        platform: string;
    };
}

export function LicenseSettings() {
    const [status, setStatus] = useState<LicenseStatus | null>(null);
    const [machineId, setMachineId] = useState<string>('');
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [activationKey, setActivationKey] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [isRenewing, setIsRenewing] = useState(false);
    const [copied, setCopied] = useState(false);

    // Get typed license API
    const license = window.license as LicenseAPI | undefined;

    // Load license data
    useEffect(() => {
        const fetchData = async () => {
            if (!license) {
                setLoading(false);
                return;
            }

            try {
                const [statusResult, machineResult, deviceResult] = await Promise.all([
                    license.getStatus(),
                    license.getMachineId(),
                    license.getDeviceInfo(),
                ]);

                setStatus(statusResult);
                setMachineId(machineResult.machineId);
                setDeviceInfo(deviceResult);
            } catch (error) {
                // Silent fail - license system might not be available
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Activate license
    const handleActivate = async () => {
        if (!activationKey.trim()) {
            toast.error('يرجى إدخال مفتاح التفعيل');
            return;
        }

        setIsActivating(true);
        try {
            const result = await license?.activate(activationKey.trim());
            if (result?.success) {
                toast.success('تم تفعيل الترخيص بنجاح!');
                setActivationKey('');
                // Refresh status
                const newStatus = await license?.getStatus();
                if (newStatus) setStatus(newStatus);
            } else {
                toast.error(result?.message || 'فشل تفعيل الترخيص');
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء التفعيل');
        } finally {
            setIsActivating(false);
        }
    };

    // Renew license
    const handleRenew = async () => {
        setIsRenewing(true);
        try {
            const result = await license?.renew();
            if (result?.success) {
                toast.success('تم تجديد الترخيص بنجاح!');
                const newStatus = await license?.getStatus();
                if (newStatus) setStatus(newStatus);
            } else {
                toast.error(result?.message || 'فشل تجديد الترخيص');
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء التجديد');
        } finally {
            setIsRenewing(false);
        }
    };

    // Copy machine ID
    const handleCopyMachineId = async () => {
        try {
            await navigator.clipboard.writeText(machineId);
            setCopied(true);
            toast.success('تم نسخ معرف الجهاز');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('فشل النسخ');
        }
    };

    // Get status color and icon
    const getStatusDisplay = () => {
        if (!status) return { color: THEME.amber, icon: AlertTriangle, text: 'غير متاح' };

        if (!status.valid) {
            return {
                color: THEME.rose,
                icon: XCircle,
                text: status.inGracePeriod ? 'فترة السماح' : 'غير مفعل',
            };
        }

        if ((status.daysRemaining ?? 0) <= 7) {
            return { color: THEME.amber, icon: AlertTriangle, text: 'يحتاج تجديد' };
        }

        return { color: THEME.emerald, icon: CheckCircle, text: 'مفعل' };
    };

    const statusDisplay = getStatusDisplay();
    const StatusIcon = statusDisplay.icon;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: THEME.navy }} />
            </div>
        );
    }

    // License type display
    const licenseTypeLabels: Record<string, string> = {
        trial: 'تجريبي',
        monthly: 'شهري',
        yearly: 'سنوي',
        lifetime: 'دائم',
        enterprise: 'مؤسسة',
        'enterprise-plus': 'مؤسسة+',
    };

    return (
        <div className="space-y-6">
            {/* ⚠️ Expiration Warning Banners */}
            {status && !status.valid && !status.inGracePeriod && (
                <div
                    className="flex items-start gap-3 p-4 rounded-lg border-2"
                    style={{ backgroundColor: `${THEME.rose}10`, borderColor: THEME.rose }}
                >
                    <XCircle className="h-6 w-6 flex-shrink-0 mt-0.5" style={{ color: THEME.rose }} />
                    <div>
                        <h4 className="font-bold" style={{ color: THEME.rose }}>⛔ الترخيص غير مفعل</h4>
                        <p className="text-sm mt-1 text-muted-foreground">
                            يجب تفعيل الترخيص لاستخدام النظام. أدخل مفتاح التفعيل أدناه.
                        </p>
                    </div>
                </div>
            )}

            {status?.inGracePeriod && (
                <div
                    className="flex items-start gap-3 p-4 rounded-lg border-2"
                    style={{ backgroundColor: `${THEME.rose}10`, borderColor: THEME.rose }}
                >
                    <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" style={{ color: THEME.rose }} />
                    <div>
                        <h4 className="font-bold" style={{ color: THEME.rose }}>🚨 انتهت صلاحية الترخيص!</h4>
                        <p className="text-sm mt-1 text-muted-foreground">
                            أنت الآن في <strong>فترة السماح (7 أيام)</strong>. يجب التجديد فوراً لتجنب توقف النظام.
                        </p>
                        <p className="text-sm mt-2 font-medium" style={{ color: THEME.rose }}>
                            ⚡ وصّل الإنترنت واضغط "تجديد الترخيص" أو أدخل مفتاح جديد.
                        </p>
                    </div>
                </div>
            )}

            {status?.valid && (status?.daysRemaining ?? 0) <= 7 && (status?.daysRemaining ?? 0) > 0 && (
                <div
                    className="flex items-start gap-3 p-4 rounded-lg border-2"
                    style={{ backgroundColor: `${THEME.amber}10`, borderColor: THEME.amber }}
                >
                    <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" style={{ color: THEME.amber }} />
                    <div>
                        <h4 className="font-bold" style={{ color: THEME.amber }}>⚠️ الترخيص على وشك الانتهاء</h4>
                        <p className="text-sm mt-1 text-muted-foreground">
                            متبقي <strong>{status.daysRemaining} {status.daysRemaining === 1 ? 'يوم' : 'أيام'}</strong> فقط.
                            يُرجى التجديد قبل انتهاء الصلاحية.
                        </p>
                        <p className="text-sm mt-2 font-medium" style={{ color: THEME.amber }}>
                            💡 وصّل الإنترنت قبل تاريخ الانتهاء للتجديد التلقائي.
                        </p>
                    </div>
                </div>
            )}

            {status?.valid && (status?.daysRemaining ?? 0) > 7 && (status?.daysRemaining ?? 0) <= 14 && (
                <div
                    className="flex items-start gap-3 p-4 rounded-lg border"
                    style={{ backgroundColor: `${THEME.gold}08`, borderColor: THEME.gold }}
                >
                    <RefreshCw className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: THEME.gold }} />
                    <div>
                        <h4 className="font-medium" style={{ color: THEME.navy }}>🔔 تذكير بالتجديد</h4>
                        <p className="text-sm mt-1 text-muted-foreground">
                            متبقي {status.daysRemaining} يوم على انتهاء الترخيص. تأكد من توفر الإنترنت للتجديد.
                        </p>
                    </div>
                </div>
            )}

            {/* License Status Card */}
            <Card style={{ borderTop: `3px solid ${statusDisplay.color}` }}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <Shield className="h-5 w-5" style={{ color: THEME.gold }} />
                        حالة الترخيص
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Status */}
                        <div className="p-4 rounded-lg" style={{ backgroundColor: `${statusDisplay.color}10` }}>
                            <div className="flex items-center gap-2 mb-1">
                                <StatusIcon className="h-4 w-4" style={{ color: statusDisplay.color }} />
                                <span className="text-sm text-muted-foreground">الحالة</span>
                            </div>
                            <p className="text-lg font-bold" style={{ color: statusDisplay.color }}>
                                {statusDisplay.text}
                            </p>
                        </div>

                        {/* Days Remaining */}
                        <div className="p-4 rounded-lg" style={{ backgroundColor: `${THEME.navy}08` }}>
                            <span className="text-sm text-muted-foreground">الأيام المتبقية</span>
                            <p className="text-2xl font-bold" style={{ color: THEME.navy }}>
                                {status?.daysRemaining ?? 0}
                            </p>
                        </div>

                        {/* License Type */}
                        <div className="p-4 rounded-lg" style={{ backgroundColor: `${THEME.gold}10` }}>
                            <span className="text-sm text-muted-foreground">نوع الترخيص</span>
                            <p className="text-lg font-bold" style={{ color: THEME.navy }}>
                                {licenseTypeLabels[status?.licenseType || 'monthly'] || 'عادي'}
                            </p>
                        </div>

                        {/* Expiry Date */}
                        <div className="p-4 rounded-lg" style={{ backgroundColor: `${THEME.navy}08` }}>
                            <span className="text-sm text-muted-foreground">تاريخ الانتهاء</span>
                            <p className="text-lg font-bold" style={{ color: THEME.navy }}>
                                {status?.expiresAt
                                    ? new Date(status.expiresAt).toLocaleDateString('ar-EG')
                                    : 'مدى الحياة'}
                            </p>
                        </div>
                    </div>

                    {/* Renew Button */}
                    {status?.valid && status?.needsRenewal && (
                        <Button
                            onClick={handleRenew}
                            disabled={isRenewing}
                            style={{ backgroundColor: THEME.gold }}
                        >
                            {isRenewing ? (
                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="ml-2 h-4 w-4" />
                            )}
                            تجديد الترخيص
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Activation Card */}
            <Card style={{ borderTop: `3px solid ${THEME.navy}` }}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <Key className="h-5 w-5" style={{ color: THEME.gold }} />
                        تفعيل الترخيص
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        أدخل مفتاح التفعيل لتفعيل أو تجديد الترخيص
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={activationKey}
                            onChange={(e) => setActivationKey(e.target.value)}
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            className="font-mono"
                            dir="ltr"
                        />
                        <Button
                            onClick={handleActivate}
                            disabled={isActivating || !activationKey.trim()}
                            style={{ backgroundColor: THEME.navy }}
                        >
                            {isActivating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'تفعيل'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Device Info Card */}
            <Card style={{ borderTop: `3px solid ${THEME.gold}` }}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <Monitor className="h-5 w-5" style={{ color: THEME.gold }} />
                        معلومات الجهاز
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Machine ID */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 rounded-lg font-mono text-sm" style={{ backgroundColor: `${THEME.navy}08` }} dir="ltr">
                            {machineId || 'غير متاح'}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyMachineId}
                            title="نسخ معرف الجهاز"
                        >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Device Components */}
                    {deviceInfo && (
                        <div className="grid gap-3 sm:grid-cols-2 text-sm">
                            <div className="p-3 rounded-lg" style={{ backgroundColor: `${THEME.navy}05` }}>
                                <span className="text-muted-foreground">اسم الجهاز:</span>
                                <span className="font-medium mr-2">{deviceInfo.components.hostname}</span>
                            </div>
                            <div className="p-3 rounded-lg" style={{ backgroundColor: `${THEME.navy}05` }}>
                                <span className="text-muted-foreground">المعالج:</span>
                                <span className="font-medium mr-2 text-xs">{deviceInfo.components.cpuModel}</span>
                            </div>
                            <div className="p-3 rounded-lg" style={{ backgroundColor: `${THEME.navy}05` }}>
                                <span className="text-muted-foreground">الذاكرة:</span>
                                <span className="font-medium mr-2">{deviceInfo.components.totalMemoryGB} GB</span>
                            </div>
                            <div className="p-3 rounded-lg" style={{ backgroundColor: `${THEME.navy}05` }}>
                                <span className="text-muted-foreground">النظام:</span>
                                <span className="font-medium mr-2">{deviceInfo.components.platform}</span>
                            </div>
                        </div>
                    )}

                    {/* Device Verification Status */}
                    {deviceInfo?.verification && (
                        <div
                            className="flex items-center gap-2 p-3 rounded-lg text-sm"
                            style={{
                                backgroundColor: deviceInfo.verification.valid ? `${THEME.emerald}10` : `${THEME.rose}10`,
                            }}
                        >
                            {deviceInfo.verification.valid ? (
                                <CheckCircle className="h-4 w-4" style={{ color: THEME.emerald }} />
                            ) : (
                                <XCircle className="h-4 w-4" style={{ color: THEME.rose }} />
                            )}
                            <span>
                                التطابق: {Math.round(deviceInfo.verification.similarityScore * 100)}%
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card style={{ borderTop: `3px solid ${THEME.navy}`, backgroundColor: `${THEME.navy}05` }}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base" style={{ color: THEME.navy }}>
                        📋 تعليمات التجديد
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                        <span className="text-lg">1️⃣</span>
                        <p className="text-muted-foreground">
                            <strong>التجديد التلقائي:</strong> عند اتصالك بالإنترنت، سيحاول النظام التجديد تلقائياً إذا كانت الرخصة قيد الانتهاء.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-lg">2️⃣</span>
                        <p className="text-muted-foreground">
                            <strong>التجديد اليدوي:</strong> اضغط "تجديد الترخيص" عند ظهوره، أو أدخل مفتاح تفعيل جديد.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-lg">3️⃣</span>
                        <p className="text-muted-foreground">
                            <strong>العمل بدون إنترنت:</strong> يمكنك العمل offline طوال فترة صلاحية الرخصة، لكن يجب توصيل الإنترنت قبل الانتهاء للتجديد.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-lg">4️⃣</span>
                        <p className="text-muted-foreground">
                            <strong>فترة السماح:</strong> بعد انتهاء الرخصة، لديك <strong>7 أيام</strong> للتجديد قبل توقف النظام.
                        </p>
                    </div>
                    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: `${THEME.gold}10` }}>
                        <p className="font-medium" style={{ color: THEME.navy }}>
                            💡 للحصول على مفتاح تفعيل جديد، تواصل مع الدعم الفني.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

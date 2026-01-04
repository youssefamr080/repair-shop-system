/**
 * GeneralSettings - Company & Appearance Settings (Tab 1)
 * 
 * Features:
 * - Company name and logo upload
 * - Sound toggle for notifications
 * - Theme switcher (Light/Dark/System)
 * - Navy Blue (#1a237e) & Gold (#c5a153) theme
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    Building2,
    Image,
    Upload,
    Trash2,
    Volume2,
    VolumeX,
    Save,
    Sun,
    Moon,
    Monitor,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Button,
} from '../ui';
import { useUIStore } from '../../stores';
import { cn } from '../../utils/helpers';

// Theme Constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
};

const THEME_OPTIONS = [
    { value: 'light', label: 'فاتح', icon: Sun },
    { value: 'dark', label: 'داكن', icon: Moon },
    { value: 'system', label: 'تلقائي', icon: Monitor },
] as const;

export function GeneralSettings() {
    const { theme, setTheme } = useUIStore();
    const [companyName, setCompanyName] = useState('Mayo Tech');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [companyLogo, setCompanyLogo] = useState<string>('');
    const [ttsEnabled, setTtsEnabled] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Load settings from database
    const loadSettingsFromDB = useCallback(async () => {
        try {
            if (window.database?.getAllSettings) {
                const settings = await window.database.getAllSettings();
                if (settings.company_name) setCompanyName(settings.company_name);
                if (settings.company_address) setCompanyAddress(settings.company_address);
                if (settings.company_phone) setCompanyPhone(settings.company_phone);
                if (settings.company_logo) setCompanyLogo(settings.company_logo);
                if (settings.tts_enabled) setTtsEnabled(settings.tts_enabled === '1');
            }
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to load settings:', error);
            }
        }
    }, []);

    useEffect(() => {
        loadSettingsFromDB();
    }, [loadSettingsFromDB]);

    // Handle logo file upload
    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('يرجى اختيار ملف صورة صالح');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            setCompanyLogo(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setCompanyLogo('');
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (window.database?.settings) {
                await window.database.settings.set('company_name', companyName);
                await window.database.settings.set('company_address', companyAddress);
                await window.database.settings.set('company_phone', companyPhone);
                await window.database.settings.set('company_logo', companyLogo);
                await window.database.settings.set('tts_enabled', ttsEnabled ? '1' : '0');
                toast.success('تم حفظ الإعدادات بنجاح');
            } else {
                toast.error('فشل الاتصال بقاعدة البيانات');
            }
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to save settings:', error);
            }
            toast.error('فشل حفظ الإعدادات');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Company Info Card */}
            <Card style={{ borderTop: `3px solid ${THEME.navy}` }}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <Building2 className="h-5 w-5" style={{ color: THEME.gold }} />
                        بيانات الشركة
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        المعلومات التي تظهر في التقارير والفواتير
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Company Name */}
                    <div>
                        <label className="mb-2 block text-sm font-medium">اسم الشركة</label>
                        <Input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="أدخل اسم الشركة"
                        />
                    </div>

                    {/* Company Address & Phone */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">العنوان</label>
                            <Input
                                value={companyAddress}
                                onChange={(e) => setCompanyAddress(e.target.value)}
                                placeholder="عنوان الشركة"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">رقم الهاتف</label>
                            <Input
                                value={companyPhone}
                                onChange={(e) => setCompanyPhone(e.target.value)}
                                placeholder="01xxxxxxxxx"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {/* Company Logo */}
                    <div>
                        <label className="mb-2 block text-sm font-medium">شعار الشركة</label>
                        <div className="flex items-start gap-4">
                            <div
                                className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed"
                                style={{ borderColor: `${THEME.navy}30`, backgroundColor: `${THEME.navy}05` }}
                            >
                                {companyLogo ? (
                                    <img
                                        src={companyLogo}
                                        alt="شعار الشركة"
                                        className="h-full w-full rounded-xl object-contain p-2"
                                    />
                                ) : (
                                    <Image className="h-10 w-10 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    id="logo-upload"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => logoInputRef.current?.click()}
                                    style={{ borderColor: THEME.navy, color: THEME.navy }}
                                >
                                    <Upload className="ml-2 h-4 w-4" />
                                    رفع صورة
                                </Button>
                                {companyLogo && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleRemoveLogo}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="ml-2 h-4 w-4" />
                                        إزالة
                                    </Button>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    PNG أو JPG (حد أقصى 2 ميجابايت)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* TTS Toggle */}
                    <div
                        className="flex items-center justify-between rounded-lg border p-4"
                        style={{ borderColor: `${THEME.navy}20` }}
                    >
                        <div className="flex items-center gap-3">
                            {ttsEnabled ? (
                                <Volume2 className="h-5 w-5" style={{ color: THEME.gold }} />
                            ) : (
                                <VolumeX className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                                <p className="text-sm font-medium">تشغيل الأصوات</p>
                                <p className="text-xs text-muted-foreground">
                                    تشغيل أصوات التنبيهات والإشعارات
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={ttsEnabled}
                            onClick={() => setTtsEnabled(!ttsEnabled)}
                            className={cn(
                                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                                ttsEnabled ? 'bg-primary' : 'bg-input'
                            )}
                            style={ttsEnabled ? { backgroundColor: THEME.navy } : undefined}
                        >
                            <span
                                className={cn(
                                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                                    ttsEnabled ? 'translate-x-0' : 'translate-x-5'
                                )}
                            />
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Theme Card */}
            <Card style={{ borderTop: `3px solid ${THEME.gold}` }}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <Sun className="h-5 w-5" style={{ color: THEME.gold }} />
                        المظهر
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">اختر وضع العرض المناسب</p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                        {THEME_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setTheme(option.value)}
                                className={cn(
                                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all duration-200 hover:shadow-md',
                                    theme === option.value
                                        ? 'border-2'
                                        : 'border-input text-muted-foreground hover:bg-muted'
                                )}
                                style={
                                    theme === option.value
                                        ? { borderColor: THEME.navy, backgroundColor: `${THEME.navy}10`, color: THEME.navy }
                                        : undefined
                                }
                            >
                                <option.icon className="h-6 w-6" />
                                {option.label}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-2 px-6"
                    style={{ backgroundColor: THEME.gold }}
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    حفظ الإعدادات
                </Button>
            </div>
        </div>
    );
}

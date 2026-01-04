// React & Router
import { useEffect, useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { QueryProvider } from './providers/QueryProvider';

// Components
import { Toaster } from 'sonner';
import { MainLayout } from './components/layout/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SystemCheck } from './components/startup/SystemCheck';
import { RouteLoadingScreen } from './components/ui/RouteLoadingScreen';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/Card';
import { Input } from './components/ui/Input';
import { Button } from './components/ui/Button';
import { PageGuard } from './components/ui/PageGuard';
import { ShieldAlert, Loader2, Smartphone, Lock } from 'lucide-react';

// Lazy load pages for code splitting - Mayo Fix Enterprise
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Repairs = lazy(() => import('./pages/Repairs').then(module => ({ default: module.Repairs })));
const RepairDetails = lazy(() => import('./pages/RepairDetails').then(module => ({ default: module.RepairDetails })));
const TechnicianDashboard = lazy(() => import('./pages/TechnicianDashboard').then(module => ({ default: module.TechnicianDashboard })));
const Customers = lazy(() => import('./pages/Customers').then(module => ({ default: module.Customers })));
const Parts = lazy(() => import('./pages/Parts').then(module => ({ default: module.Parts })));
const Suppliers = lazy(() => import('./pages/Suppliers').then(m => ({ default: m.Suppliers })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));

import { RequireAuth } from './components/auth/RequireAuth';
import { useUIStore } from './stores';
import type { LicenseStatus } from './types/electron.d';

type ActivationResponse = { success: boolean; message?: string };
import './index.css';

// Theme Constants - Mayo Fix Enterprise
const THEME = {
  navy: '#1a237e',
  gold: '#c5a153',
  orange: '#f97316',
};

function App() {
  const { theme, loadSettings } = useUIStore();
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [activationKey, setActivationKey] = useState('');
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    const fetchLicenseStatus = async () => {
      // Dev mode bypass
      if (!window.license) {
        setLicenseStatus({ valid: true } as LicenseStatus);
        setLicenseLoading(false);
        return;
      }

      try {
        const status = (await window.license.getStatus()) as LicenseStatus;
        setLicenseStatus(status);
      } catch (error) {
        console.error('Failed to read license status', error);
        setLicenseStatus({ valid: false } as LicenseStatus);
      } finally {
        setLicenseLoading(false);
      }
    };

    fetchLicenseStatus();
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleActivate = async () => {
    if (!window.license) return;
    setActivationError(null);
    setActivating(true);

    try {
      const response = (await window.license.activate(activationKey.trim())) as ActivationResponse;
      if (!response.success) {
        setActivationError(response.message || 'فشل التفعيل');
        return;
      }

      const status = (await window.license.getStatus()) as LicenseStatus;
      setLicenseStatus(status);
    } catch (error) {
      console.error('Activation failed', error);
      setActivationError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setActivating(false);
    }
  };

  // 1. Premium Loading Screen - Mayo Fix Enterprise
  if (licenseLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: THEME.orange }}></div>
          <div className="relative bg-white p-4 rounded-full shadow-xl">
            <Smartphone className="h-12 w-12" style={{ color: THEME.orange }} />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2" style={{ color: THEME.navy, fontFamily: "'Amiri', serif" }}>
            Mayo Fix Enterprise
          </h2>
          <div className="flex items-center gap-2 text-muted-foreground justify-center">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: THEME.orange }} />
            <p>جاري التحقق من الترخيص...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Premium Activation Screen
  if (!licenseStatus?.valid) {
    const deviceIdDisplay = licenseStatus?.deviceId || licenseStatus?.machineId || 'غير متوفر';
    const isTampered = licenseStatus?.tampered;
    const isExpired = licenseStatus?.daysRemaining === 0 && licenseStatus?.expiresAt;
    const isInGracePeriod = licenseStatus?.inGracePeriod;

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4" dir="rtl">
        <Card className="w-full max-w-xl shadow-2xl border-0 overflow-hidden">
          <div className="h-2 w-full" style={{ background: `linear-gradient(to right, ${THEME.navy}, ${THEME.gold})` }} />

          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 shadow-inner">
              <ShieldAlert className="h-10 w-10" style={{ color: isTampered ? '#ef4444' : THEME.navy }} />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold" style={{ color: THEME.navy, fontFamily: "'Amiri', serif" }}>
                {isTampered ? 'تنبيه أمني' : isExpired ? 'انتهت صلاحية الترخيص' : 'تفعيل النظام'}
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                {isTampered
                  ? 'تم اكتشاف تغيير في بيانات الجهاز. يرجى إعادة التفعيل.'
                  : isExpired
                    ? 'يرجى تجديد الترخيص للمتابعة.'
                    : 'نسخة غير مفعلة. يرجى إدخال مفتاح المنتج للمتابعة.'}
              </p>

              {isInGracePeriod && (
                <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700 font-medium">
                    ⚠️ أنت في فترة السماح. يرجى تجديد الترخيص قريباً.
                  </p>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-8">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.navy }}>
                <Smartphone className="h-4 w-4" />
                معرّف الجهاز (Device ID)
              </label>
              <div className="relative">
                <Input
                  value={deviceIdDisplay.length > 32 ? deviceIdDisplay.substring(0, 16) + '...' + deviceIdDisplay.slice(-16) : deviceIdDisplay}
                  readOnly
                  className="bg-slate-50 font-mono text-center text-sm border-2 tracking-wider"
                  style={{ borderColor: `${THEME.navy}20`, color: THEME.navy }}
                />
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 transition-colors"
                  onClick={() => navigator.clipboard.writeText(deviceIdDisplay)}
                >
                  نسخ
                </button>
              </div>
              <p className="text-xs text-muted-foreground">أرسل هذا الكود للدعم الفني للحصول على مفتاح التفعيل.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.navy }}>
                <Lock className="h-4 w-4" />
                مفتاح التفعيل
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                  placeholder="أدخل مفتاح التفعيل هنا..."
                  className="font-mono text-center border-2 focus-visible:ring-0"
                  style={{ borderColor: activationError ? '#ef4444' : `${THEME.gold}60` }}
                />
                <Button
                  onClick={handleActivate}
                  disabled={activating || !activationKey.trim()}
                  className="sm:w-32 shadow-lg transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: THEME.navy }}
                >
                  {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تفعيل'}
                </Button>
              </div>
              {activationError && (
                <p className="text-sm text-destructive font-medium animate-pulse flex items-center gap-1">
                  ⚠️ {activationError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-1 bg-slate-100 rounded font-mono">{licenseStatus?.productCode || 'MAYO_STOCK_PRO_V1'}</span>
            </div>

            <div className="rounded-xl p-4 text-center border mt-6" style={{ backgroundColor: `${THEME.navy}05`, borderColor: `${THEME.navy}10` }}>
              <p className="text-sm text-muted-foreground">لشراء الترخيص، تواصل مع فريق المبيعات</p>
              <p className="text-lg font-bold font-mono mt-1" style={{ color: THEME.navy }} dir="ltr">010 203 20 981</p>
              <p className="text-xs font-semibold mt-1" style={{ color: THEME.gold }}>Mayo Tech Solutions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <QueryProvider>
      <SystemCheck>
        <Suspense fallback={<RouteLoadingScreen />}>
          <HashRouter>
            <div className="antialiased text-gray-900 bg-background min-h-screen font-cairo" dir="rtl">
              <ErrorBoundary>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected Routes */}
                  <Route element={
                    <RequireAuth>
                      <MainLayout />
                    </RequireAuth>
                  }>
                    {/* Dashboard */}
                    <Route index element={<Dashboard />} />

                    {/* Settings */}
                    <Route path="/settings" element={
                      <PageGuard permission="settings.view" pageTitle="الإعدادات">
                        <Settings />
                      </PageGuard>
                    } />

                    {/* Audit Logs */}
                    <Route path="/audit-logs" element={
                      <PageGuard permission="audit.view" pageTitle="سجل التدقيق">
                        <AuditLogs />
                      </PageGuard>
                    } />

                    {/* Repairs */}
                    <Route path="/repairs" element={
                      <PageGuard permission="repairs.view" pageTitle="تذاكر الصيانة">
                        <Repairs />
                      </PageGuard>
                    } />

                    {/* Repair Details */}
                    <Route path="/repairs/:id" element={
                      <PageGuard permission="repairs.view" pageTitle="تفاصيل الصيانة">
                        <RepairDetails />
                      </PageGuard>
                    } />

                    {/* Technician Dashboard */}
                    <Route path="/my-jobs" element={
                      <PageGuard permission="repairs.view" pageTitle="مهامي">
                        <TechnicianDashboard />
                      </PageGuard>
                    } />

                    {/* Reports */}
                    <Route path="/reports" element={
                      <PageGuard permission="reports.view" pageTitle="التقارير">
                        <Reports />
                      </PageGuard>
                    } />

                    {/* Customers */}
                    <Route path="/customers" element={
                      <PageGuard permission="suppliers.view" pageTitle="العملاء">
                        <Customers />
                      </PageGuard>
                    } />

                    {/* Parts & Inventory */}
                    <Route path="/parts" element={
                      <PageGuard permission="parts.view" pageTitle="إدارة قطع الغيار">
                        <Parts />
                      </PageGuard>
                    } />

                    <Route path="/suppliers" element={
                      <PageGuard permission="suppliers.view" pageTitle="موردي قطع الغيار">
                        <Suppliers />
                      </PageGuard>
                    } />

                    {/* Repair Details */}
                    <Route path="/repairs/:id" element={
                      <PageGuard permission="repairs.view" pageTitle="تفاصيل الصيانة">
                        <RepairDetails />
                      </PageGuard>
                    } />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </ErrorBoundary>
              <Toaster richColors position="top-right" />
            </div>
          </HashRouter>
        </Suspense>
      </SystemCheck>
    </QueryProvider>
  );
}

export default App;
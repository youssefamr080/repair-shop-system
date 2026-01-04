/**
 * Settings Page - Mayo Fix Enterprise
 * 
 * Premium tabbed settings with:
 * - Animated tab transitions
 * - Enhanced visual design
 * - About section with animations
 */

import { useState } from 'react';
import { Settings2, Shield, Database, Info, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '../components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { GeneralSettings, SecuritySettings, DatabaseSettings, LicenseSettings } from '../components/settings';
import { cn } from '../utils/helpers';
import { THEME } from '../constants/theme';

// Tab Definitions
const TABS = [
  {
    id: 'general',
    label: 'عام',
    icon: Settings2,
    component: GeneralSettings,
    description: 'إعدادات التطبيق العامة',
  },
  {
    id: 'security',
    label: 'الأمان',
    icon: Shield,
    component: SecuritySettings,
    description: 'إدارة المستخدمين والصلاحيات',
  },
  {
    id: 'license',
    label: 'الترخيص',
    icon: Key,
    component: LicenseSettings,
    description: 'معلومات الترخيص والتفعيل',
  },
  {
    id: 'database',
    label: 'قاعدة البيانات',
    icon: Database,
    component: DatabaseSettings,
    description: 'النسخ الاحتياطي والاستعادة',
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

// Tab content animation variants
const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
  },
  exit: { opacity: 0, y: -10 }
};

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const ActiveComponent = TABS.find((tab) => tab.id === activeTab)?.component ?? GeneralSettings;
  const activeTabInfo = TABS.find((tab) => tab.id === activeTab);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${THEME.navy} 0%, ${THEME.navy}dd 100%)`,
            }}
            whileHover={{ scale: 1.05 }}
          >
            <Settings2 className="h-7 w-7 text-white" />
          </motion.div>
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: THEME.navy, fontFamily: "'Amiri', serif" }}
            >
              إعدادات النظام
            </h1>
            <p className="text-muted-foreground">
              تكوين التطبيق والأمان وقاعدة البيانات
            </p>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          className="flex gap-2 p-1.5 rounded-xl border"
          style={{ backgroundColor: `${THEME.navy}05`, borderColor: `${THEME.navy}15` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-300 flex-1 justify-center relative',
                  !isActive && 'text-muted-foreground hover:bg-muted/50'
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: isActive ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-lg shadow-md"
                    style={{ backgroundColor: THEME.navy }}
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={cn('relative z-10 flex items-center gap-2', isActive && 'text-white')}>
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Tab Description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={activeTab}
            className="text-sm text-muted-foreground text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {activeTabInfo?.description}
          </motion.p>
        </AnimatePresence>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="min-h-[400px]"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>

        {/* About Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="overflow-hidden" style={{ borderTop: `3px solid ${THEME.gold}` }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                <motion.div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${THEME.gold}15` }}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <Info className="h-4 w-4" style={{ color: THEME.gold }} />
                </motion.div>
                حول التطبيق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'التطبيق', value: 'Mayo Fix Enterprise', highlight: true },
                  { label: 'الإصدار', value: '1.0.0', gold: true },
                  { label: 'الدعم الفني', value: '01020320981', dir: 'ltr', mono: true },
                  { label: 'الشركة المطورة', value: 'Mayo Tech' },
                  { label: 'قاعدة البيانات', value: 'SQLite' },
                  { label: 'الفئة', value: 'إدارة المخزون' },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-muted/50"
                    style={{ backgroundColor: `${THEME.navy}05` }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    whileHover={{ x: -4 }}
                  >
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        item.mono && 'font-mono'
                      )}
                      style={{ color: item.gold ? THEME.gold : THEME.navy }}
                      dir={item.dir as 'ltr' | 'rtl' | undefined}
                    >
                      {item.value}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Copyright */}
              <motion.div
                className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                © {new Date().getFullYear()} Mayo Tech. جميع الحقوق محفوظة.
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
}

export default Settings;

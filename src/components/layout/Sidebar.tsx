/**
 * Sidebar Component - Mayo Fix Enterprise
 * 
 * Modern sidebar with Slate & Orange theme
 * Phone Repair Management System
 */

import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Wrench,
  Smartphone,
  Truck,
  Users,
  Package,
  BarChart3,
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useUIStore, useAuthStore } from '../../stores';
import { Button } from '../ui/Button';
import { THEME } from '../../constants/theme';

// Navigation items for Mayo Fix Enterprise (Phone Repair)
const navItems = [
  { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard, permission: null },
  { path: '/reports', label: 'التقارير', icon: BarChart3, permission: 'reports.view' },
  { path: '/repairs', label: 'تذاكر الصيانة', icon: Wrench, permission: 'repairs.view' },
  { path: '/customers', label: 'العملاء', icon: Users, permission: 'suppliers.view' },
  { path: '/parts', label: 'قطع الغيار', icon: Package, permission: 'parts.view' },
  { path: '/suppliers', label: 'موردي قطع الغيار', icon: Truck, permission: 'suppliers.view' },
  { path: '/audit-logs', label: 'سجل التدقيق', icon: Shield, permission: 'audit.view' },
  { path: '/settings', label: 'الإعدادات', icon: Settings, permission: 'settings.view' },
];

export function Sidebar() {
  const { sidebarExpanded, toggleSidebar } = useUIStore();
  const { hasPermission } = useAuthStore();
  useLocation(); // Used to trigger re-render on navigation
  const isExpanded = sidebarExpanded;

  // Filter nav items based on user permissions
  const visibleNavItems = navItems.filter(item =>
    item.permission === null || hasPermission(item.permission)
  );

  return (
    <motion.aside
      layout
      initial={false}
      animate={{ width: isExpanded ? 256 : 64 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'fixed right-0 top-0 z-40 h-screen border-l bg-card shadow-xl overflow-hidden'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {isExpanded && (
          <div className="flex items-center gap-2">
            <Smartphone className="h-8 w-8" style={{ color: THEME.orange }} />
            <span className="text-xl font-bold" style={{ color: THEME.slate, fontFamily: "'Amiri', serif" }}>Mayo Fix</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(!isExpanded && 'mx-auto')}
          aria-label={isExpanded ? 'تصغير القائمة الجانبية' : 'توسيع القائمة الجانبية'}
        >
          {isExpanded ? (
            <ChevronRight className="h-5 w-5" style={{ color: THEME.slate }} />
          ) : (
            <ChevronLeft className="h-5 w-5" style={{ color: THEME.slate }} />
          )}
        </Button>
      </div>

      {/* Navigation - pb-20 to leave room for footer */}
      <nav className="flex flex-col gap-1 p-2 mt-2 overflow-y-auto flex-1 pb-20">
        {visibleNavItems.map((item) => {
          // Generate data-tour attribute based on path
          const tourId = item.path === '/' ? 'sidebar-dashboard' : `sidebar-${item.path.replace('/', '').replace(/-/g, '')}`;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-tour={tourId}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-all duration-200 relative overflow-hidden',
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-900',
                  !isExpanded && 'justify-center px-2'
                )
              }
              style={({ isActive }) => isActive ? { backgroundColor: THEME.slate } : { backgroundColor: 'transparent' }}
              title={!isExpanded ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  {/* Orange Accent Border for Active Item */}
                  {isActive && (
                    <div className="absolute right-0 top-0 bottom-0 w-1" style={{ backgroundColor: THEME.orange }} />
                  )}

                  <item.icon className={cn("h-5 w-5 flex-shrink-0")} style={{ color: isActive ? THEME.orange : 'currentColor' }} />
                  <AnimatePresence mode="wait">
                    {isExpanded && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      {isExpanded && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg p-3 border" style={{ backgroundColor: THEME.slateLight, borderColor: `${THEME.slate}15` }}>
            <p className="text-xs font-semibold text-center" style={{ color: THEME.slate }} dir="ltr">
              Powered by Mayo Tech
            </p>
          </div>
        </div>
      )}
    </motion.aside>
  );
}

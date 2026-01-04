/**
 * Main Layout - Mayo Fix (Enhanced)
 * 
 * Application shell with:
 * - Sidebar navigation
 * - Header with alerts
 * - Quick Actions FAB
 * - Keyboard shortcuts support
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { QuickActionsFAB } from './QuickActionsFAB';
import { ShortcutsHelp } from './ShortcutsHelp';
import { useUIStore } from '../../stores';
import { cn } from '../../utils/helpers';
import { Toaster } from 'sonner';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Loader2 } from 'lucide-react';


export function MainLayout() {
  const { sidebarExpanded } = useUIStore();
  const isExpanded = sidebarExpanded;

  // Enable global keyboard shortcuts
  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    enabled: true,
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          isExpanded ? 'mr-64' : 'mr-16'
        )}
      >
        <Header />
        <main className="p-6">
          <React.Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">جاري التحميل...</p>
              </div>
            </div>
          }>
            <Outlet />
          </React.Suspense>
        </main>
      </div>

      {/* Quick Actions FAB */}
      <QuickActionsFAB />

      {/* Keyboard Shortcuts Help */}
      <ShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />

      {/* Toast Notifications */}
      <Toaster richColors position="top-left" />
    </div>
  );
}

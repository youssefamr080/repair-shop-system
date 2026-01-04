import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, User, Clock, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LicenseStatusBadge } from '../LicenseStatusBadge';
import { SmartAlerts } from './SmartAlerts';
import { useUIStore } from '../../stores';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../utils/helpers';

// ----------------------------------------------------------------------------
// Internal Components
// ----------------------------------------------------------------------------

function HeaderLogo() {
  return (
    <div className="flex items-center gap-3">
      {/* Decorative Icon or Logo Placeholder */}
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl font-amiri">
        <span className="text-primary">نظام</span>{' '}
        <span className="text-foreground/80">إدارة المخزون</span>
      </h1>
    </div>
  );
}

function HeaderClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={cn(
        "hidden md:flex items-center gap-3 rounded-full border px-4 py-1.5 shadow-sm transition-colors",
        "bg-secondary/30 hover:bg-secondary/50 border-secondary-foreground/10"
      )}
      dir="ltr"
    >
      <Clock className="h-4 w-4 text-primary" />
      <div className="flex flex-col items-center leading-none">
        <span className="text-sm font-bold tabular-nums text-foreground">
          {format(time, 'hh:mm:ss a')}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">
          {format(time, 'yyyy/MM/dd')}
        </span>
      </div>
    </div>
  );
}

interface UserProfileData {
  display_name: string;
  role_display_name?: string;
  role_name?: string;
}

function UserProfile({ user, onLogout }: { user: UserProfileData; onLogout: () => void }) {
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 transition-all shadow-sm",
          "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
        )}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
          <User className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-bold text-foreground/90">{user.display_name}</span>
        <span className="rounded-full bg-background/50 px-2 py-0.5 text-[10px] font-medium text-primary">
          {user.role_display_name || user.role_name}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onLogout}
        title="تسجيل الخروج"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------

export function Header() {
  const { theme, setTheme } = useUIStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await logout();
    toast.success('تم تسجيل الخروج بنجاح');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">

        {/* Right Section: Logo & Title */}
        <HeaderLogo />

        {/* Left Section: Controls */}
        <div className="flex items-center gap-3 md:gap-4">

          {/* License Badge (Desktop) */}
          <div className="hidden lg:block">
            <LicenseStatusBadge />
          </div>

          {/* Clock */}
          <HeaderClock />

          {/* Smart Alerts */}
          <SmartAlerts />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full text-foreground hover:bg-secondary"
            aria-label={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-600" />
            )}
          </Button>

          {/* User Section */}
          <div className="h-6 w-px bg-border hidden md:block" /> {/* Separator */}

          {isAuthenticated && user ? (
            <UserProfile user={user} onLogout={handleLogout} />
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              <User className="h-3.5 w-3.5" />
              <span className="hidden md:inline">غير مسجل</span>
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}

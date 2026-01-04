/**
 * RequireAuth Component - Route Protection
 * 
 * Wraps routes that require authentication.
 * Redirects to login if not authenticated.
 * Optionally checks for specific permissions.
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Loader2 } from 'lucide-react';
import { THEME } from '../../constants/theme';

interface RequireAuthProps {
    children: React.ReactNode;
    permission?: string;
    anyPermission?: string[];
}

export function RequireAuth({ children, permission, anyPermission }: RequireAuthProps) {
    const location = useLocation();
    const { isAuthenticated, isLoading, validateSession, hasPermission, hasAnyPermission } = useAuthStore();
    const [isValidating, setIsValidating] = useState(true);

    // M1+M2 FIX: Added cleanup to prevent memory leak
    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            if (!isAuthenticated) {
                await validateSession();
            }
            if (isMounted) {
                setIsValidating(false);
            }
        };
        checkSession();

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, validateSession]);

    // Show loading while validating session
    if (isValidating || isLoading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: `${THEME.navy}10` }}
            >
                <div className="text-center">
                    <Loader2
                        className="w-12 h-12 animate-spin mx-auto mb-4"
                        style={{ color: THEME.navy }}
                    />
                    <p className="text-gray-600">جاري التحقق من الجلسة...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check specific permission
    if (permission && !hasPermission(permission)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div
                        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                        style={{ backgroundColor: `${THEME.navy}10` }}
                    >
                        <span className="text-4xl">🔒</span>
                    </div>
                    <h1
                        className="text-2xl font-bold mb-2"
                        style={{ color: THEME.navy }}
                    >
                        غير مصرح
                    </h1>
                    <p className="text-gray-600 mb-6">
                        ليس لديك صلاحية للوصول إلى هذه الصفحة.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-2 rounded-lg text-white transition-colors"
                        style={{ backgroundColor: THEME.navy }}
                    >
                        الرجوع للخلف
                    </button>
                </div>
            </div>
        );
    }

    // Check any of multiple permissions
    if (anyPermission && anyPermission.length > 0 && !hasAnyPermission(anyPermission)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div
                        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                        style={{ backgroundColor: `${THEME.navy}10` }}
                    >
                        <span className="text-4xl">🔒</span>
                    </div>
                    <h1
                        className="text-2xl font-bold mb-2"
                        style={{ color: THEME.navy }}
                    >
                        غير مصرح
                    </h1>
                    <p className="text-gray-600">
                        ليس لديك صلاحية للوصول إلى هذه الصفحة.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * PermissionGuard Component - UI Element Protection
 * 
 * Conditionally renders children based on permissions.
 * Use this to hide/show buttons, menu items, etc.
 */
interface PermissionGuardProps {
    children: React.ReactNode;
    permission?: string;
    anyPermission?: string[];
    fallback?: React.ReactNode;
}

export function PermissionGuard({ children, permission, anyPermission, fallback = null }: PermissionGuardProps) {
    const { hasPermission, hasAnyPermission } = useAuthStore();

    if (permission && !hasPermission(permission)) {
        return <>{fallback}</>;
    }

    if (anyPermission && anyPermission.length > 0 && !hasAnyPermission(anyPermission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

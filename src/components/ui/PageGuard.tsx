/**
 * PageGuard - RBAC Page-Level Permission Guard
 * 
 * Wraps page content to check if the user has the required permission.
 * - If user has permission → shows page content
 * - If user lacks permission → shows "no access" message
 * 
 * Pages remain visible in menu, but content is protected.
 */

import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowRight, Lock } from 'lucide-react';
import { Button } from './Button';
import { useAuthStore } from '../../stores/authStore';
import type { PermissionCode } from '../../constants/permissions';

interface PageGuardProps {
    children: ReactNode;
    /** The permission code required to view this page (e.g., 'products.view') */
    permission: PermissionCode;
    /** Page title for the denied message */
    pageTitle?: string;
}

/**
 * PageGuard - Protects page content based on user permissions
 */
export function PageGuard({ children, permission, pageTitle = 'هذه الصفحة' }: PageGuardProps) {
    const navigate = useNavigate();
    const { hasPermission, user, isAuthenticated } = useAuthStore();

    // If not authenticated, RequireAuth should handle this
    if (!isAuthenticated || !user) {
        return null;
    }

    // Admin (is_system = 1) bypasses all checks
    if (user.is_system === 1) {
        return <>{children}</>;
    }

    // Check if user has the required permission
    if (hasPermission(permission)) {
        return <>{children}</>;
    }

    // User lacks permission - show access denied message
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-6 max-w-md mx-auto p-8">
                {/* Icon */}
                <div
                    className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                >
                    <ShieldX className="h-10 w-10 text-red-500" />
                </div>

                {/* Title */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        ليس لديك صلاحية
                    </h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        لا تملك الصلاحيات اللازمة للوصول إلى {pageTitle}
                    </p>
                </div>

                {/* Details */}
                <div
                    className="rounded-lg p-4 text-sm"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                >
                    <div className="flex items-center gap-2 text-red-600">
                        <Lock className="h-4 w-4" />
                        <span>الصلاحية المطلوبة: <code className="font-mono bg-red-100 dark:bg-red-900/30 px-1 rounded">{permission}</code></span>
                    </div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        تواصل مع مسؤول النظام لطلب هذه الصلاحية
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-3">
                    <Button
                        onClick={() => navigate('/')}
                        variant="outline"
                        className="gap-2"
                    >
                        <ArrowRight className="h-4 w-4" />
                        العودة للرئيسية
                    </Button>
                </div>
            </div>
        </div>
    );
}

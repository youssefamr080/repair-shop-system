import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { PasswordModal } from './PasswordModal';
import { usePermissionStore } from '../../stores';
import { useAuthStore } from '../../stores/authStore';
import type { PermissionKey } from '../../constants/permissions';

interface ProtectedRouteProps {
    children: ReactNode;
    pageKey: PermissionKey;
    fallbackPath?: string;
}

/**
 * ProtectedRoute - Wraps page content with page-level permission check.
 * - Admin Mode: Bypass all checks, show content immediately.
 * - User Mode: Check if page is locked, show password prompt if needed.
 */
export function ProtectedRoute({
    children,
    pageKey,
    fallbackPath = '/'
}: ProtectedRouteProps) {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const { isLocked, loadPermissions, isLoaded } = usePermissionStore();

    const [showModal, setShowModal] = useState(false);
    const [accessGranted, setAccessGranted] = useState(false);

    // Load permissions on mount
    useEffect(() => {
        loadPermissions();
    }, [loadPermissions]);

    // Check access when permissions are loaded
    useEffect(() => {
        if (!isLoaded) return;

        // ADMIN BYPASS: Users logged in as admin get instant access
        if (isAuthenticated && user?.role_name === 'admin') {
            setAccessGranted(true);
            return;
        }

        // USER MODE: Check if page is locked
        if (isLocked(pageKey)) {
            setShowModal(true);
        } else {
            setAccessGranted(true);
        }
    }, [isLoaded, isAuthenticated, isLocked, pageKey]);

    const handleSuccess = () => {
        setAccessGranted(true);
        setShowModal(false);
    };

    const handleCancel = () => {
        setShowModal(false);
        navigate(fallbackPath);
    };

    // Loading state
    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
                </div>
            </div>
        );
    }

    // Access Denied overlay (while modal is showing)
    if (!accessGranted && !showModal) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="text-xl font-semibold">الصفحة محمية</h2>
                    <p className="text-muted-foreground">هذه الصفحة تتطلب صلاحيات خاصة</p>
                    <Button onClick={() => navigate(fallbackPath)} variant="outline">
                        <ArrowRight className="ml-2 h-4 w-4" />
                        العودة للرئيسية
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Password Modal */}
            <PasswordModal
                isOpen={showModal}
                onClose={handleCancel}
                onSuccess={handleSuccess}
                title="الصفحة محمية"
                description="يرجى إدخال كلمة مرور المسؤول للوصول"
            />

            {/* Page Content - Only shown when access granted */}
            {accessGranted && children}

            {/* Loading overlay while checking (modal is open) */}
            {!accessGranted && showModal && (
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Lock className="h-12 w-12 mx-auto text-primary" />
                        <h2 className="text-xl font-semibold">التحقق من الهوية</h2>
                        <p className="text-muted-foreground">جاري التحقق...</p>
                    </div>
                </div>
            )}
        </>
    );
}

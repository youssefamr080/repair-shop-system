/**
 * 📊 License Status Badge
 * 
 * Shows remaining license days and status in the header.
 * Color-coded: Green (>30 days), Yellow (7-30), Orange (1-7), Red (expired/grace)
 */

import { useEffect, useState } from 'react';
import { Shield, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import type { LicenseStatus } from '../types/electron.d';
import { cn } from '../utils/helpers';

interface LicenseBadgeState {
    daysRemaining: number;
    isValid: boolean;
    isInGracePeriod: boolean;
    needsRenewal: boolean;
    licenseType: string | null;
}

export function LicenseStatusBadge() {
    const [state, setState] = useState<LicenseBadgeState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!window.license) {
                setLoading(false);
                return;
            }

            try {
                const status = (await window.license.getStatus()) as LicenseStatus;
                setState({
                    daysRemaining: status.daysRemaining ?? 0,
                    isValid: status.valid,
                    isInGracePeriod: status.inGracePeriod ?? false,
                    needsRenewal: status.needsRenewal ?? false,
                    licenseType: status.licenseType ?? null,
                });
            } catch {
                // Silent fail - license system might not be available
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();

        // Refresh every 5 minutes
        const interval = setInterval(fetchStatus, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !state || !state.isValid) {
        return null; // Don't show badge if not valid or loading
    }

    // Determine badge color and icon based on days remaining
    const getBadgeStyle = () => {
        if (state.isInGracePeriod) {
            return {
                bg: 'bg-destructive/10',
                border: 'border-destructive/30',
                text: 'text-destructive',
                icon: AlertTriangle,
                label: 'فترة السماح',
            };
        }

        if (state.daysRemaining <= 3) {
            return {
                bg: 'bg-orange-500/10',
                border: 'border-orange-500/30',
                text: 'text-orange-600 dark:text-orange-400',
                icon: AlertTriangle,
                label: `${state.daysRemaining} يوم`,
            };
        }

        if (state.daysRemaining <= 7) {
            return {
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/30',
                text: 'text-amber-600 dark:text-amber-400',
                icon: Clock,
                label: `${state.daysRemaining} أيام`,
            };
        }

        if (state.daysRemaining <= 30) {
            return {
                bg: 'bg-yellow-500/10',
                border: 'border-yellow-500/30',
                text: 'text-yellow-600 dark:text-yellow-400',
                icon: Clock,
                label: `${state.daysRemaining} يوم`,
            };
        }

        return {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-600 dark:text-emerald-400',
            icon: CheckCircle,
            label: `${state.daysRemaining} يوم`,
        };
    };

    const style = getBadgeStyle();
    const Icon = style.icon;

    // License type display
    const licenseTypeLabel = {
        trial: 'تجريبي',
        monthly: 'شهري',
        yearly: 'سنوي',
        lifetime: 'دائم',
        enterprise: 'مؤسسة',
        'enterprise-plus': 'مؤسسة+',
    }[state.licenseType || 'monthly'] || 'عادي';

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm hover:shadow-md transition-all duration-200",
                style.bg,
                style.border,
                style.text
            )}
            title={`الترخيص: ${licenseTypeLabel} - متبقي ${state.daysRemaining} يوم`}
        >
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold whitespace-nowrap">
                {licenseTypeLabel}
            </span>
            <div className="w-px h-3 bg-current opacity-20" />
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs font-bold tabular-nums">
                {style.label}
            </span>
        </div>
    );
}

export default LicenseStatusBadge;

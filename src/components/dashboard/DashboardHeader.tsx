import { RefreshCw } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../utils/helpers';

// Theme Constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
};

interface DashboardHeaderProps {
    serverDate: string | null;
    isHoliday: boolean;
    isRefreshing: boolean;
    isSyncing: boolean;
    onRefresh: () => void;
    onSync: () => void;
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء النور';
}

export function DashboardHeader({
    serverDate,
    isHoliday,
    isRefreshing,
    isSyncing,
    onRefresh,
    onSync,
}: DashboardHeaderProps) {
    const formattedDate = serverDate
        ? new Date(serverDate).toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : '...';

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Title Section */}
            <div className="flex items-center gap-4">
                <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                    style={{
                        background: `linear-gradient(135deg, ${THEME.navy} 0%, ${THEME.navy}dd 100%)`,
                    }}
                >
                    <span className="text-2xl">📊</span>
                </div>
                <div>
                    <p className="text-lg text-muted-foreground">{getGreeting()}</p>
                    <h1
                        className="text-3xl font-bold"
                        style={{ color: THEME.navy, fontFamily: "'Amiri', serif" }}
                    >
                        لوحة التحكم
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-muted-foreground text-sm">{formattedDate}</p>
                        {isHoliday && (
                            <span
                                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={{ backgroundColor: `${THEME.gold}20`, color: THEME.gold }}
                            >
                                🎉 عطلة رسمية
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Button
                    onClick={onSync}
                    disabled={isSyncing}
                    className="gap-2"
                    style={{ backgroundColor: THEME.navy }}
                >
                    <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
                    {isSyncing ? 'جاري المزامنة...' : 'مزامنة مع الجهاز'}
                </Button>
                <Button
                    variant="outline"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="gap-2"
                    style={{ borderColor: THEME.gold, color: THEME.navy }}
                >
                    <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                    تحديث
                </Button>
            </div>
        </div>
    );
}

import { Loader2 } from 'lucide-react';

/**
 * Loading screen shown during route transitions
 * Replaces generic fallback with branded loading experience
 */
export function RouteLoadingScreen() {
    return (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">جاري التحميل...</h3>
                <p className="text-sm text-muted-foreground mt-1">Mayo Fix Enterprise</p>
            </div>
        </div>
    );
}

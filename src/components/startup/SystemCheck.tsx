import { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Database, ServerCrash } from 'lucide-react';
import { Button } from '../ui/Button';

// Hardcoded theme to avoid dependency issues during critical failure
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
    orange: '#f97316',
};

interface SystemCheckProps {
    children: ReactNode;
}

export function SystemCheck({ children }: SystemCheckProps) {
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [retryCount, setRetryCount] = useState(0);

    const checkSystem = useCallback(async () => {
        setStatus('loading');
        try {
            // Force a small delay to prevent flickering if it encounters a race condition
            // and to show the cool loading animation for at least a split second :)
            const minDelay = new Promise(resolve => setTimeout(resolve, 800));

            const [health] = await Promise.all([
                window.database.health_check(),
                minDelay
            ]);

            if (health) {
                setStatus('ready');
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error('System Check Failed:', error);
            setStatus('error');
        }
    }, []);

    useEffect(() => {
        checkSystem();
    }, [checkSystem]);

    const handleRetry = () => {
        setRetryCount(c => c + 1);
        checkSystem();
    };

    if (status === 'ready') {
        return <>{children}</>;
    }

    return (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4 z-50">
            <AnimatePresence mode="wait">
                {status === 'loading' ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center gap-6"
                    >
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                                <RefreshCw className="h-16 w-16 text-primary" style={{ color: THEME.orange }} />
                            </motion.div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Database className="h-6 w-6 text-primary/50" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold" style={{ color: THEME.navy }}>جاري فحص النظام...</h2>
                            <p className="text-muted-foreground">نتأكد من سلامة الاتصال بقاعدة البيانات</p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full bg-card border border-destructive/20 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                                <ServerCrash className="h-10 w-10 text-destructive" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-destructive">فشل الاتصال بالنظام</h2>
                                <p className="text-muted-foreground">
                                    تعذر الوصول إلى قاعدة البيانات المحلية. قد يكون السبب:
                                </p>
                                <ul className="text-sm text-muted-foreground text-right list-disc pr-5 space-y-1 bg-muted/50 p-3 rounded-lg">
                                    <li>قاعدة البيانات قيد الاستخدام من برنامج آخر.</li>
                                    <li>ملفات النظام تالفة أو مفقودة.</li>
                                    <li>مشكلة في صلاحيات الوصول للملفات.</li>
                                </ul>
                            </div>

                            <div className="flex gap-3 w-full mt-4">
                                <Button
                                    className="flex-1"
                                    size="lg"
                                    onClick={handleRetry}
                                >
                                    <RefreshCw className="ml-2 h-4 w-4" />
                                    إعادة المحاولة {retryCount > 0 && `(${retryCount})`}
                                </Button>
                            </div>
                        </div>
                        <div className="bg-destructive/10 p-3 text-center">
                            <p className="text-xs text-destructive font-mono">CODE: DB_CONNECTION_TIMEOUT</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

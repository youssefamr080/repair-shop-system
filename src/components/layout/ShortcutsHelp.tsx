/**
 * Shortcuts Help Modal - Mayo Fix
 * 
 * Displays available keyboard shortcuts in a modal dialog.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../ui';
import { SHORTCUTS_LIST } from '../../hooks/useKeyboardShortcuts';
import { THEME } from '../../constants/theme';

interface ShortcutsHelpProps {
    open: boolean;
    onClose: () => void;
}

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
    // Group shortcuts by category
    const groupedShortcuts = SHORTCUTS_LIST.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, typeof SHORTCUTS_LIST>);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        <Card
                            className="w-full max-w-md shadow-2xl"
                            style={{ borderTop: `3px solid ${THEME.gold}` }}
                            onClick={e => e.stopPropagation()}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                                        <Keyboard className="h-5 w-5" style={{ color: THEME.gold }} />
                                        اختصارات لوحة المفاتيح
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onClose}
                                        className="h-8 w-8 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                                    <div key={category}>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                            {category}
                                        </h3>
                                        <div className="space-y-2">
                                            {shortcuts.map(shortcut => (
                                                <motion.div
                                                    key={shortcut.keys}
                                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                >
                                                    <span className="text-sm">{shortcut.description}</span>
                                                    <kbd
                                                        className="px-2 py-1 text-xs font-mono rounded border"
                                                        style={{
                                                            backgroundColor: `${THEME.navy}10`,
                                                            borderColor: `${THEME.navy}30`,
                                                            color: THEME.navy
                                                        }}
                                                    >
                                                        {shortcut.keys}
                                                    </kbd>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-3 border-t text-center">
                                    <p className="text-xs text-muted-foreground">
                                        اضغط <kbd className="px-1 py-0.5 text-xs border rounded">Ctrl + /</kbd> لإظهار/إخفاء هذه النافذة
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default ShortcutsHelp;

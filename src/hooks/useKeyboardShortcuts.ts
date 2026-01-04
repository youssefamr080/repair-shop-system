/**
 * Keyboard Shortcuts Hook - Mayo Fix
 * 
 * Global keyboard shortcuts for quick navigation and actions:
 * - Ctrl+N: New item (context-aware)
 * - Ctrl+F: Focus search
 * - Ctrl+/: Show shortcuts help
 * - Esc: Close dialogs/modals
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface Shortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    description: string;
    action: () => void;
}

interface UseKeyboardShortcutsOptions {
    onNewItem?: () => void;
    onSearch?: () => void;
    onEscape?: () => void;
    enabled?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
    const { onNewItem, onSearch, onEscape, enabled = true } = options;
    const navigate = useNavigate();
    const location = useLocation();
    const [showHelp, setShowHelp] = useState(false);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Skip if user is typing in an input
        const target = event.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        // Escape always works
        if (event.key === 'Escape') {
            onEscape?.();
            setShowHelp(false);
            return;
        }

        // Skip other shortcuts when typing
        if (isInput && !event.ctrlKey) return;

        // Ctrl + N: New item
        if (event.ctrlKey && event.key === 'n') {
            event.preventDefault();
            if (onNewItem) {
                onNewItem();
            } else {
                // Navigate to appropriate new page based on current location
                const path = location.pathname;
                if (path.includes('products')) navigate('/products/new');
                else if (path.includes('categories')) navigate('/categories/new');
                else if (path.includes('suppliers')) navigate('/suppliers/new');
            }
        }

        // Ctrl + F: Focus search
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            if (onSearch) {
                onSearch();
            } else {
                // Try to find and focus search input
                const searchInput = document.querySelector('input[type="search"], input[placeholder*="بحث"], input[placeholder*="search"]') as HTMLInputElement;
                searchInput?.focus();
            }
        }

        // Ctrl + /: Show shortcuts help
        if (event.ctrlKey && event.key === '/') {
            event.preventDefault();
            setShowHelp(prev => !prev);
        }

        // Ctrl + H: Go home (dashboard)
        if (event.ctrlKey && event.key === 'h') {
            event.preventDefault();
            navigate('/');
        }

        // Ctrl + P: Go to products
        if (event.ctrlKey && event.key === 'p') {
            event.preventDefault();
            navigate('/products');
        }

    }, [enabled, onNewItem, onSearch, onEscape, navigate, location.pathname]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return { showHelp, setShowHelp };
}

// Shortcut definitions for help modal
export const SHORTCUTS_LIST: Array<{ keys: string; description: string; category: string }> = [
    { keys: 'Ctrl + N', description: 'إنشاء عنصر جديد', category: 'عام' },
    { keys: 'Ctrl + F', description: 'التركيز على البحث', category: 'عام' },
    { keys: 'Ctrl + H', description: 'الذهاب للوحة التحكم', category: 'تنقل' },
    { keys: 'Ctrl + P', description: 'الذهاب للمنتجات', category: 'تنقل' },
    { keys: 'Ctrl + /', description: 'عرض/إخفاء المساعدة', category: 'عام' },
    { keys: 'Esc', description: 'إغلاق النوافذ', category: 'عام' },
];

export default useKeyboardShortcuts;

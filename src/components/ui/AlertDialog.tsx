
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './Dialog';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
import { THEME } from '../../constants/theme';

interface AlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    variant?: 'destructive' | 'default';
    isLoading?: boolean;
}

export function AlertDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'تأكيد',
    cancelLabel = 'إلغاء',
    onConfirm,
    variant = 'default',
    isLoading = false
}: AlertDialogProps) {
    return (
        <Dialog open={open} onClose={() => onOpenChange(false)} children={
            <DialogContent className="max-w-md">
                <DialogHeader className="gap-2">
                    <DialogTitle className="flex items-center gap-2">
                        {variant === 'destructive' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={onConfirm}
                        disabled={isLoading}
                        style={variant !== 'destructive' ? { backgroundColor: THEME.navy } : undefined}
                    >
                        {isLoading ? 'جاري التنفيذ...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        } />
    );
}

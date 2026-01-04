import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './Dialog';

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
    description?: string;
}

export function PasswordModal({
    isOpen,
    onClose,
    onSuccess,
    title = 'التحقق من الهوية',
    description = 'يرجى إدخال كلمة مرور المسؤول للمتابعة',
}: PasswordModalProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setError(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) {
            setError('يرجى إدخال كلمة المرور');
            return;
        }

        setIsVerifying(true);
        setError(null);

        try {
            // Use the old auth:verifyPassword for page lock verification
            const isValid = await window.ipcRenderer.invoke('auth:verifyPassword', password);

            if (isValid) {
                onSuccess();
                onClose();
            } else {
                setError('كلمة المرور غير صحيحة');
            }
        } catch (err) {
            setError('حدث خطأ أثناء التحقق');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                        <Lock className="h-7 w-7 text-primary" />
                    </div>
                    <DialogTitle className="text-center">{title}</DialogTitle>
                    <p className="text-center text-sm text-muted-foreground">{description}</p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError(null);
                            }}
                            placeholder="كلمة المرور"
                            autoFocus
                            className={error ? 'border-destructive' : ''}
                        />
                        {error && (
                            <p className="mt-2 text-sm text-destructive">{error}</p>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isVerifying}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={isVerifying}>
                            {isVerifying ? 'جاري التحقق...' : 'تأكيد'}
                        </Button>
                    </DialogFooter>
                </form>

                <DialogClose onClose={onClose} />
            </DialogContent>
        </Dialog>
    );
}

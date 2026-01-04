import * as React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 350,
      delay: 0.05
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 }
  }
};

const Dialog: React.FC<DialogProps> = ({ open, onClose, children }) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // 1. Focus Management Effect (Runs only when open changes)
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Focus the dialog container for accessibility
      setTimeout(() => {
        dialogRef.current?.focus();
      }, 100);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // 2. Event Listeners Effect (Runs when onClose changes too)
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          {/* Animated Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          {/* Dialog - Centered */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              ref={dialogRef}
              tabIndex={-1}
              className="relative w-full max-w-lg rounded-lg bg-background shadow-xl border my-auto outline-none"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)}
    {...props}
  >
    {children}
  </div>
);

const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h2
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  >
    {children}
  </h2>
);

const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props}>
    {children}
  </p>
);

const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('px-6 py-4 max-h-[calc(100vh-8rem)] overflow-y-auto', className)} {...props}>
    {children}
  </div>
);

const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('flex justify-end gap-2 p-6 pt-4', className)}
    {...props}
  >
    {children}
  </div>
);

interface DialogCloseProps {
  onClose: () => void;
}

const DialogClose: React.FC<DialogCloseProps> = ({ onClose }) => (
  <Button
    variant="ghost"
    size="icon"
    className="absolute left-4 top-4 rounded-full hover:bg-muted"
    onClick={onClose}
    aria-label="إغلاق"
  >
    <X className="h-4 w-4" />
  </Button>
);

export {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
};

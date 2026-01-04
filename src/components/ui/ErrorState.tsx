/**
 * ErrorState Component
 * 
 * Displays an error state message when something goes wrong
 */

import { AlertCircle, LucideIcon } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { Button } from './Button';

export interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function ErrorState({
  icon: Icon = AlertCircle,
  title = 'حدث خطأ',
  description = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('error-state', className)}>
      <Icon className="error-state-icon" />
      <h3 className="error-state-title">{title}</h3>
      {description && <p className="error-state-description">{description}</p>}
      {action && (
        <div className="mt-6">
          <Button onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  );
}


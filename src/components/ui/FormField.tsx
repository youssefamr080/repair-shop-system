/**
 * FormField Component
 * 
 * A unified form field component that provides consistent styling and layout
 * for labels, inputs, error messages, and help text.
 */

import * as React from 'react';
import { cn } from '../../utils/helpers';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function FormField({
  label,
  required = false,
  error,
  helpText,
  className,
  children,
  htmlFor,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="text-destructive mr-1">*</span>}
        </label>
      )}
      <div className={cn(error && 'has-error')}>
        {children}
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-xs text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  );
}

/**
 * FormFieldGroup - Groups multiple form fields together
 */
export interface FormFieldGroupProps {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormFieldGroup({
  title,
  description,
  className,
  children,
}: FormFieldGroupProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-base font-semibold">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}


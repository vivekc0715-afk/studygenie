import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef(function Input({ className, type = 'text', invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-10 w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink transition-colors',
        'placeholder:text-ink-faint focus-visible:border-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/15',
        'disabled:cursor-not-allowed disabled:bg-canvas-deep disabled:opacity-70',
        'file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        invalid && 'border-danger focus-visible:border-danger focus-visible:ring-danger/15',
        className
      )}
      {...props}
    />
  );
});

export default Input;

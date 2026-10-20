import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Textarea = forwardRef(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-ink transition-colors',
        'placeholder:text-ink-faint focus-visible:border-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/15',
        'disabled:cursor-not-allowed disabled:bg-canvas-deep disabled:opacity-70',
        invalid && 'border-danger focus-visible:border-danger focus-visible:ring-danger/15',
        className
      )}
      {...props}
    />
  );
});

export default Textarea;

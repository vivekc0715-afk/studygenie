import { Label } from '../ui/label';
import { cn } from '../../lib/utils';

/** Label + control + inline error, used by every react-hook-form field. */
export function Field({ label, htmlFor, error, hint, required, className, children, actions }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={htmlFor} required={required}>
            {label}
          </Label>
          {actions}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="text-[12px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Inline form-level error (e.g. invalid credentials). */
export function FormError({ error, className }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  return (
    <p className={cn('rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] font-medium text-danger', className)}>
      {message}
    </p>
  );
}

/** Two-column responsive form grid. */
export function FormGrid({ columns = 2, className, ...props }) {
  return (
    <div
      className={cn('grid gap-4', columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3', className)}
      {...props}
    />
  );
}

export default Field;

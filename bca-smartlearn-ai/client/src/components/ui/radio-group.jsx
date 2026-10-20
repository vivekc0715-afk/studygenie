import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '../../lib/utils';

export function RadioGroup({ className, ...props }) {
  return <RadioGroupPrimitive.Root className={cn('grid gap-2', className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'aspect-square size-[18px] shrink-0 rounded-full border border-line-strong bg-surface transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-brand data-[state=checked]:bg-brand',
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex size-full items-center justify-center after:block after:size-[7px] after:rounded-full after:bg-white" />
    </RadioGroupPrimitive.Item>
  );
}

/** A ready-made option row: radio + label + optional description. */
export function RadioCard({ value, title, description, icon: Icon, disabled }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3.5 transition-all',
        'hover:border-line-strong hover:shadow-card',
        'has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-lavender-soft has-[[data-state=checked]]:shadow-card',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      <RadioGroupItem value={value} id={`radio-${value}`} className="mt-0.5" />
      <span className="flex-1">
        <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
          {Icon ? <Icon className="size-4 text-ink-muted" /> : null}
          {title}
        </span>
        {description ? <span className="mt-0.5 block text-[12.5px] text-ink-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export default RadioGroup;

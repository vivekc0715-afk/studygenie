import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../../lib/utils';

const FILL = {
  brand: 'bg-brand',
  mint: 'bg-mastery-mastered',
  sky: 'bg-mastery-strong',
  butter: 'bg-mastery-developing',
  peach: 'bg-mastery-weak',
  danger: 'bg-mastery-critical',
  ink: 'bg-ink',
};

export function Progress({ className, value = 0, tone = 'brand', indicatorClassName, ...props }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <ProgressPrimitive.Root
      value={safe}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-canvas-deep', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full w-full rounded-full transition-transform duration-500', FILL[tone] || FILL.brand, indicatorClassName)}
        style={{ transform: `translateX(-${100 - safe}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export default Progress;

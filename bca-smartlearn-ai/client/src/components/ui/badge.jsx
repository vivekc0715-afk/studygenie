import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium leading-5 whitespace-nowrap transition-colors [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'border-line bg-canvas-deep text-ink-soft',
        outline: 'border-line-strong bg-transparent text-ink-soft',
        brand: 'border-lavender bg-lavender-soft text-lavender-ink',
        lavender: 'border-lavender bg-lavender-soft text-lavender-ink',
        sky: 'border-sky bg-sky-soft text-sky-ink',
        mint: 'border-mint bg-mint-soft text-mint-ink',
        peach: 'border-peach bg-peach-soft text-peach-ink',
        butter: 'border-butter bg-butter-soft text-butter-ink',
        blush: 'border-blush bg-blush-soft text-blush-ink',
        success: 'border-mint bg-mint-soft text-mint-ink',
        warning: 'border-butter bg-butter-soft text-butter-ink',
        danger: 'border-blush bg-danger-soft text-danger',
        info: 'border-sky bg-sky-soft text-sky-ink',
        solid: 'border-transparent bg-ink text-canvas',
      },
      size: {
        sm: 'px-2 py-0 text-[10.5px]',
        default: '',
        lg: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'default' },
  }
);

export function Badge({ className, variant, size, ...props }) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { badgeVariants };

/** Mastery band -> pastel variant + readable label. */
export function masteryVariant(band) {
  return (
    {
      critical: 'danger',
      weak: 'peach',
      developing: 'butter',
      strong: 'sky',
      mastered: 'mint',
    }[band] || 'neutral'
  );
}

export function difficultyVariant(level) {
  return (
    {
      easy: 'mint',
      medium: 'butter',
      hard: 'peach',
      expert: 'blush',
    }[level] || 'neutral'
  );
}

export function statusVariant(status) {
  return (
    {
      active: 'mint',
      pending: 'butter',
      suspended: 'blush',
      accepted: 'mint',
      wrong_answer: 'blush',
      partial: 'peach',
      error: 'danger',
      in_progress: 'sky',
      submitted: 'mint',
      expired: 'neutral',
      abandoned: 'neutral',
      queued: 'butter',
      processing: 'sky',
      completed: 'mint',
      failed: 'danger',
    }[status] || 'neutral'
  );
}

export default Badge;

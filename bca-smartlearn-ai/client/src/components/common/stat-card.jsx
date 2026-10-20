import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

const TONE_MAP = {
  lavender: { chip: 'bg-lavender-soft text-lavender-ink' },
  sky: { chip: 'bg-sky-soft text-sky-ink' },
  mint: { chip: 'bg-mint-soft text-mint-ink' },
  peach: { chip: 'bg-peach-soft text-peach-ink' },
  butter: { chip: 'bg-butter-soft text-butter-ink' },
  blush: { chip: 'bg-blush-soft text-blush-ink' },
  neutral: { chip: 'bg-canvas-deep text-ink-soft' },
};

/** Compact KPI tile used across dashboards. */
export function StatCard({
  label,
  value,
  suffix,
  hint,
  icon: Icon,
  tone = 'lavender',
  trend,
  className,
  onClick,
  as: Comp = 'div',
}) {
  const tones = TONE_MAP[tone] || TONE_MAP.lavender;
  const TrendIcon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;

  return (
    <Comp
      onClick={onClick}
      className={cn(
        'card-surface card-interactive p-4',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium text-ink-muted">{label}</p>
        {Icon ? (
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tones.chip)}>
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[26px] font-semibold leading-none tracking-tight text-ink">{value ?? '—'}</span>
        {suffix ? <span className="text-[13px] font-medium text-ink-muted">{suffix}</span> : null}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        {typeof trend === 'number' ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[12px] font-medium',
              trend > 0 ? 'text-mint-ink' : trend < 0 ? 'text-danger' : 'text-ink-muted'
            )}
          >
            <TrendIcon className="size-3.5" />
            {Math.abs(trend)}%
          </span>
        ) : null}
        {hint ? <span className="text-[12px] text-ink-muted">{hint}</span> : null}
      </div>
    </Comp>
  );
}

export default StatCard;

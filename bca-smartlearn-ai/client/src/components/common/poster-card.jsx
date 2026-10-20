import { cn, ACCENT_CLASSES, accentFor } from '../../lib/utils';
import { Badge } from '../ui/badge';

/**
 * Base masonry card: a pastel "poster" band, a title and a meta row.
 * Every listing page builds on this so the grid looks uniform yet varied.
 */
export function PosterCard({
  title,
  subtitle,
  description,
  icon: Icon,
  accent,
  badges,
  meta,
  footer,
  onClick,
  as: Comp = 'article',
  className,
  children,
  bannerHeight = 'h-24',
  ...props
}) {
  const tone = ACCENT_CLASSES[accent || accentFor(title || subtitle || '')] || ACCENT_CLASSES.lavender;
  const clickable = Boolean(onClick);

  return (
    <Comp
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.(event);
              }
            }
          : undefined
      }
      className={cn(
        'group card-surface card-interactive overflow-hidden',
        clickable && 'cursor-pointer hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover',
        className
      )}
      {...props}
    >
      <div className={cn('relative flex items-center justify-center overflow-hidden', tone.bg, bannerHeight)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.75),transparent_60%)]" />
        {Icon ? <Icon className={cn('relative size-7', tone.ink, 'opacity-80')} /> : null}
        {badges?.length ? (
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">{badges.slice(0, 2)}</div>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink">{title}</h3>
        {subtitle ? <p className={cn('mt-0.5 text-[12.5px] font-medium', tone.ink)}>{subtitle}</p> : null}
        {description ? (
          <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-ink-muted">{description}</p>
        ) : null}
        {children}
        {meta?.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-3 text-[12px] text-ink-muted">
            {meta.map((item, index) => (
              <span key={index} className="inline-flex items-center gap-1.5">
                {item.icon ? <item.icon className="size-3.5" /> : null}
                {item.label}
              </span>
            ))}
          </div>
        ) : null}
        {footer ? <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">{footer}</div> : null}
      </div>
    </Comp>
  );
}

/** Small labelled metric used inside PosterCard / detail panels. */
export function MetricPill({ label, value, tone = 'neutral', icon: Icon }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2')}>
      {Icon ? <Icon className="size-4 text-ink-muted" /> : null}
      <div className="min-w-0">
        <p className="truncate text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
        <p className={cn('text-[13.5px] font-semibold text-ink')}>
          {value ?? '—'}
          {tone === 'muted' ? null : null}
        </p>
      </div>
    </div>
  );
}

/** Row of pills used on detail pages. */
export function MetricRow({ items = [], className }) {
  return (
    <div className={cn('grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {items.map((item, index) => (
        <MetricPill key={index} {...item} />
      ))}
    </div>
  );
}

export function TagList({ tags = [], max = 4, variant = 'neutral', className }) {
  if (!tags?.length) return null;
  const shown = tags.slice(0, max);
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {shown.map((tag) => (
        <Badge key={tag} variant={variant} size="sm">
          {tag}
        </Badge>
      ))}
      {tags.length > max ? (
        <Badge variant="outline" size="sm">
          +{tags.length - max}
        </Badge>
      ) : null}
    </div>
  );
}

export default PosterCard;

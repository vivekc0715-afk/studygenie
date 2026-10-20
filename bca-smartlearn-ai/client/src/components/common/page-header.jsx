import { cn } from '../../lib/utils';

/** Consistent page title block used by every route. */
export function PageHeader({ title, description, eyebrow, icon: Icon, actions, className, children }) {
  return (
    <header className={cn('mb-5 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon className="size-5" />
          </span>
        ) : null}
        <div>
          {eyebrow ? (
            <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">{eyebrow}</p>
          ) : null}
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-ink sm:text-[26px]">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-muted">{description}</p>
          ) : null}
          {children}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({ title, description, icon: Icon, actions, className }) {
  return (
    <div className={cn('mb-3 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
          {Icon ? <Icon className="size-4 text-ink-muted" /> : null}
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export default PageHeader;

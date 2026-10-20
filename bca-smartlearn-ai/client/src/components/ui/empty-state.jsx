import { RefreshCw, SearchX, ServerCrash, Inbox, ShieldAlert, Lock } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

const PRESETS = {
  empty: { icon: Inbox, tone: 'text-ink-faint', title: 'Nothing here yet' },
  search: { icon: SearchX, tone: 'text-ink-faint', title: 'No matches found' },
  error: { icon: ServerCrash, tone: 'text-danger', title: 'Something went wrong' },
  forbidden: { icon: ShieldAlert, tone: 'text-butter-ink', title: 'Access restricted' },
  auth: { icon: Lock, tone: 'text-lavender-ink', title: 'Sign in required' },
};

export function EmptyState({
  preset = 'empty',
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
  compact,
}) {
  const config = PRESETS[preset] || PRESETS.empty;
  const Icon = icon || config.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface/60 text-center',
        compact ? 'gap-2 px-6 py-8' : 'gap-3 px-6 py-14',
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-canvas-deep">
        <Icon className={cn('size-5', config.tone)} />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title || config.title}</h3>
      {description ? <p className="max-w-md text-[13px] leading-relaxed text-ink-muted">{description}</p> : null}
      {action || (onAction && actionLabel) ? (
        action || (
          <Button variant="outline" size="sm" className="mt-1" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  );
}

/** Standard wrapper for a failed query with retry. */
export function ErrorState({ error, onRetry, className, title }) {
  const notConfigured = error?.code === 'service_not_configured' || error?.notConfigured;
  const preset = error?.status === 401 ? 'auth' : error?.status === 403 ? 'forbidden' : 'error';

  return (
    <EmptyState
      preset={preset}
      title={title || (notConfigured ? 'Not configured yet' : undefined)}
      description={
        notConfigured
          ? `${error.message}${error.envKey ? ` Add ${error.envKey} to server/.env to switch it on.` : ''}`
          : error?.message || 'We could not load this content. Please try again.'
      }
      className={className}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
            <RefreshCw className="size-3.5" /> Try again
          </Button>
        ) : null
      }
    />
  );
}

/** Friendly banner for endpoints that degrade when a key is missing. */
export function NotConfigured({ message, envKey, className, action }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border border-butter bg-butter-soft p-4 text-[13px] text-butter-ink',
        className
      )}
    >
      <ShieldAlert className="size-4 shrink-0" />
      <p className="flex-1">
        {message}
        {envKey ? (
          <>
            {' '}Add <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[12px]">{envKey}</code> to{' '}
            <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[12px]">server/.env</code> to enable it.
          </>
        ) : null}
      </p>
      {action}
    </div>
  );
}

export default EmptyState;

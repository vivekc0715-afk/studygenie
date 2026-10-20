import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Spinner({ className, size = 16 }) {
  return <Loader2 className={cn('animate-spin text-ink-muted', className)} style={{ width: size, height: size }} />;
}

/** Full-page centred loader used by route-level suspense. */
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-lavender/60" />
        <div className="relative flex size-11 items-center justify-center rounded-full bg-brand-soft">
          <Spinner size={20} className="text-brand" />
        </div>
      </div>
      <p className="text-[13px] text-ink-muted">{label}</p>
    </div>
  );
}

export default Spinner;

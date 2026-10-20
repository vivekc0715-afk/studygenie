import { cva } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const alertVariants = cva('flex gap-3 rounded-xl border p-3.5 text-[13px] leading-relaxed', {
  variants: {
    variant: {
      info: 'border-sky bg-sky-soft text-sky-ink',
      success: 'border-mint bg-mint-soft text-mint-ink',
      warning: 'border-butter bg-butter-soft text-butter-ink',
      danger: 'border-blush bg-danger-soft text-danger',
      neutral: 'border-line bg-canvas-deep text-ink-soft',
    },
  },
  defaultVariants: { variant: 'info' },
});

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  neutral: Info,
};

export function Alert({ className, variant = 'info', title, children, icon: Icon, ...props }) {
  const Resolved = Icon || ICONS[variant] || Info;
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Resolved className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1 space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="[&_a]:underline">{children}</div> : null}
      </div>
    </div>
  );
}

export default Alert;

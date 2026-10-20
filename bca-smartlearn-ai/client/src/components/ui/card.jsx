import { cn } from '../../lib/utils';

export function Card({ className, interactive, accent, ...props }) {
  return (
    <div
      className={cn(
        'card-surface',
        interactive && 'card-interactive hover:-translate-y-0.5 hover:shadow-card-hover',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />;
}

export function CardTitle({ className, as: Comp = 'h3', ...props }) {
  return <Comp className={cn('text-[15px] font-semibold leading-snug text-ink', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-[13px] leading-relaxed text-ink-muted', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center gap-2 p-5 pt-0', className)} {...props} />;
}

export default Card;

import { cn } from '../../lib/utils';

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-line bg-surface">
      <table className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn('bg-canvas-deep/70 [&_tr]:border-b [&_tr]:border-line', className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableFooter({ className, ...props }) {
  return <tfoot className={cn('border-t border-line bg-canvas-deep/60 font-medium', className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn('border-b border-line transition-colors hover:bg-canvas-deep/45 data-[state=selected]:bg-lavender-soft', className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        'h-10 whitespace-nowrap px-4 text-left align-middle text-[11.5px] font-semibold uppercase tracking-wide text-ink-muted',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return <td className={cn('px-4 py-3 align-middle text-[13px] text-ink-soft', className)} {...props} />;
}

export function TableCaption({ className, ...props }) {
  return <caption className={cn('mt-2 px-4 py-2 text-[12.5px] text-ink-muted', className)} {...props} />;
}

export default Table;

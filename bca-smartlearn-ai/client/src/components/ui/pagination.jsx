import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn, formatNumber, pluralise } from '../../lib/utils';

/** Pagination footer driven by the server's `meta` envelope. */
export function Pagination({ meta, onPageChange, onLimitChange, className, limitOptions = [12, 24, 48, 96] }) {
  if (!meta) return null;
  const { page = 1, limit = 24, total = 0, totalPages = 1 } = meta;
  if (!total) return null;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 pt-1', className)}>
      <p className="text-[12.5px] text-ink-muted">
        Showing <span className="font-medium text-ink-soft">{formatNumber(from)}</span>–
        <span className="font-medium text-ink-soft">{formatNumber(to)}</span> of{' '}
        <span className="font-medium text-ink-soft">{formatNumber(total)}</span>{' '}
        {pluralise(total, 'result')}
      </p>

      <div className="flex items-center gap-3">
        {onLimitChange ? (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-[12.5px] text-ink-muted">Per page</span>
            <Select value={String(limit)} onValueChange={(value) => onLimitChange(Number(value))}>
              <SelectTrigger className="h-8 w-[4.75rem] text-[12.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {limitOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="iconSm"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-[4.5rem] text-center text-[12.5px] text-ink-muted">
            Page <span className="font-medium text-ink-soft">{page}</span> / {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="iconSm"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Pagination;

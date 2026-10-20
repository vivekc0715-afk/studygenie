import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';

/** Debounced search box with a clear button. */
export function SearchInput({ value, onChange, placeholder = 'Search…', delay = 320, className, ...props }) {
  const [local, setLocal] = useState(value ?? '');

  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);

  useEffect(() => {
    if (local === (value ?? '')) return undefined;
    const timer = setTimeout(() => onChange?.(local), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, delay]);

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
      <Input
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
        {...props}
      />
      {local ? (
        <button
          type="button"
          onClick={() => {
            setLocal('');
            onChange?.('');
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-faint transition-colors hover:bg-canvas-deep hover:text-ink"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export default SearchInput;

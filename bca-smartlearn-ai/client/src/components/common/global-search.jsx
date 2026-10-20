import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Code2, FileText, Layers, Loader2, Search, Youtube } from 'lucide-react';
import { academicService } from '../../services/academic.service';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';

const TYPE_META = {
  subject: { icon: BookOpen, label: 'Subjects', base: '/app/subjects' },
  topic: { icon: Layers, label: 'Topics', base: '/app/subjects' },
  note: { icon: FileText, label: 'Notes', base: '/app/notes' },
  exercise: { icon: Code2, label: 'Coding', base: '/app/practice' },
  video: { icon: Youtube, label: 'Videos', base: '/app/videos' },
};

/** Debounced cross-entity search backed by `/academic/search`. */
export function GlobalSearch({ className }) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const query = term.trim();

  const { data, isFetching } = useQuery({
    queryKey: ['academic', 'search', query],
    queryFn: () => academicService.search({ q: query, limit: 5 }),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });

  const results = data?.results || [];

  // Group by entity type while preserving the server's relevance order.
  const groups = results.reduce((acc, item) => {
    const key = item.type || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const go = (item) => {
    const meta = TYPE_META[item.type];
    setOpen(false);
    setTerm('');
    if (item.type === 'video') {
      navigate('/app/videos');
      return;
    }
    navigate(`${meta?.base || '/app'}/${item.id}`);
  };

  return (
    <Popover open={open && query.length >= 2} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative', className)}>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search subjects, topics, notes…"
            className="h-9 bg-canvas-deep pl-9 pr-9 focus-visible:bg-surface"
            aria-label="Global search"
          />
          {isFetching ? (
            <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-ink-faint" />
          ) : null}
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(26rem,calc(100vw-2rem))] p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-ink-muted">
            {isFetching ? 'Searching…' : `No results for “${query}”.`}
          </p>
        ) : (
          <div className="max-h-[22rem] space-y-2 overflow-y-auto">
            {Object.entries(groups).map(([type, items]) => {
              const meta = TYPE_META[type] || { icon: Search, label: type };
              const Icon = meta.icon;
              return (
                <div key={type}>
                  <p className="px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
                    {meta.label}
                  </p>
                  <ul>
                    {items.map((item) => (
                      <li key={`${type}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => go(item)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-canvas-deep"
                        >
                          <Icon className="size-3.5 shrink-0 text-ink-faint" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-ink-soft">{item.title}</span>
                            {item.subtitle ? (
                              <span className="block truncate text-[11.5px] text-ink-faint">{item.subtitle}</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default GlobalSearch;

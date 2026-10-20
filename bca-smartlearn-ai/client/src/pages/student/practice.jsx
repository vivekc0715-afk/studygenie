import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Code2,
  Filter,
  PlayCircle,
  RefreshCw,
  Trophy,
  Zap,
} from 'lucide-react';
import { codeService } from '../../services/code.service';
import { qk } from '../../lib/queryClient';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { PageHeader } from '../../components/common/page-header';
import { StatCard } from '../../components/common/stat-card';
import { SearchInput } from '../../components/common/search-input';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Pagination } from '../../components/ui/pagination';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { formatNumber, accentFor, humaniseKey } from '../../lib/utils';

const DIFFICULTY_COLORS = {
  easy: 'mint',
  medium: 'butter',
  hard: 'blush',
};

export default function Practice() {
  useDocumentTitle('Coding Practice');
  const navigate = useNavigate();
  const { params, setSearch, setPage, setFilter } = useListParams({ page: 1, limit: 12 });

  const statsQuery = useQuery({ queryKey: qk.codeStats, queryFn: () => codeService.stats() });
  const metaQuery = useQuery({ queryKey: qk.codeMeta, queryFn: () => codeService.meta() });
  const exercisesQuery = useQuery({
    queryKey: qk.exercises(params),
    queryFn: () => codeService.exercises(params),
  });

  const stats = statsQuery.data;
  const meta = metaQuery.data || {};
  const { data: exercises = [], pagination } = exercisesQuery.data || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coding Practice"
        description="Sharpen your programming skills with hands-on exercises across languages and difficulty levels."
        actions={
          <Button size="sm" onClick={() => navigate('/app/compiler')}>
            <Code2 className="size-4" /> Open compiler
          </Button>
        }
      />

      {/* Stats */}
      <section className="grid gap-3.5 sm:grid-cols-3">
        {statsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
        ) : (
          <>
            <StatCard label="Exercises solved" value={formatNumber(stats?.solved ?? 0)} icon={Trophy} tone="mint" />
            <StatCard label="Submission streak" value={formatNumber(stats?.streak ?? 0)} suffix="days" icon={Zap} tone="butter" />
            <StatCard label="Total exercises" value={formatNumber(stats?.total ?? 0)} icon={Code2} tone="lavender" />
          </>
        )}
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={params.search || ''}
          onChange={(v) => setSearch(v)}
          placeholder="Search exercises…"
          className="w-64"
        />
        <Select value={params.difficulty || 'all'} onValueChange={(v) => setFilter('difficulty', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40">
            <Filter className="size-3.5 mr-1.5 text-ink-muted" />
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            {(meta.difficulties || ['easy', 'medium', 'hard']).map((d) => (
              <SelectItem key={d} value={d}>{humaniseKey(d)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.language || 'all'} onValueChange={(v) => setFilter('language', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {(meta.languages || []).map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Exercise grid */}
      {exercisesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : exercisesQuery.isError ? (
        <ErrorState error={exercisesQuery.error} onRetry={exercisesQuery.refetch} />
      ) : exercises.length === 0 ? (
        <EmptyState
          preset="empty"
          title="No exercises found"
          description="Try adjusting your filters or search term."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {exercises.map((ex) => (
              <Card
                key={ex.id}
                interactive
                className="cursor-pointer"
                onClick={() => navigate(`/app/practice/${ex.id}`)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[14px] text-ink leading-snug">{ex.title}</p>
                    <Badge variant={DIFFICULTY_COLORS[ex.difficulty] || 'neutral'} size="sm">
                      {humaniseKey(ex.difficulty || 'medium')}
                    </Badge>
                  </div>
                  <p className="text-[12.5px] text-ink-muted line-clamp-2">{ex.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(ex.tags || []).slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-canvas-deep px-2.5 py-0.5 text-[11px] text-ink-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-ink-muted pt-1 border-t border-line">
                    <span>{ex.language || 'Any language'}</span>
                    <span className="flex items-center gap-1">
                      <Trophy className="size-3.5" /> {formatNumber(ex.solveCount || 0)} solved
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

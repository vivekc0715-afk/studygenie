import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  BookOpen,
  Filter,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { analyticsService } from '../../services/analytics.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { PageHeader } from '../../components/common/page-header';
import { StatCard } from '../../components/common/stat-card';
import { ChartCard, DonutChart, CHART_COLORS } from '../../components/common/chart-card';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge, masteryVariant } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Pagination } from '../../components/ui/pagination';
import { Skeleton, SkeletonCards } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { cn, formatPercent, formatNumber, humaniseKey } from '../../lib/utils';

const BAND_TONE = {
  critical: 'blush', weak: 'peach', developing: 'butter', strong: 'sky', mastered: 'mint',
};

export default function Analytics() {
  useDocumentTitle('Analytics');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, setPage, setFilter } = useListParams({ page: 1, limit: 10 });

  const overviewQuery = useQuery({ queryKey: qk.analyticsOverview, queryFn: () => analyticsService.overview() });
  const subjectsQuery = useQuery({ queryKey: qk.analyticsSubjects, queryFn: () => analyticsService.subjects() });
  const filterSubjectsQuery = useQuery({ queryKey: qk.analyticsFilterSubjects, queryFn: () => analyticsService.filterSubjects() });
  const topicsQuery = useQuery({
    queryKey: qk.analyticsTopics(params),
    queryFn: () => analyticsService.topics(params),
  });

  const recompute = useMutation({
    mutationFn: () => analyticsService.recompute(),
    onSuccess: () => {
      notifySuccess('Analytics updated!');
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (e) => toastError(e, 'Could not recompute analytics.'),
  });

  const overview = overviewQuery.data;
  const subjects = subjectsQuery.data || [];
  const filterSubjects = filterSubjectsQuery.data || [];
  const { data: topics = [], pagination } = topicsQuery.data || {};

  const masteryData = useMemo(
    () =>
      (overview?.masteryDistribution || [])
        .filter((b) => b.count > 0)
        .map((b) => ({ name: b.label, value: b.count })),
    [overview]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Detailed insights into your mastery, performance trends, and weak areas across all subjects."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
          >
            <RefreshCw className={cn('size-4', recompute.isPending && 'animate-spin')} />
            {recompute.isPending ? 'Updating…' : 'Recalculate'}
          </Button>
        }
      />

      {/* KPIs */}
      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {overviewQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[112px]" />)
        ) : (
          <>
            <StatCard label="Overall mastery" value={formatPercent(overview?.overallMastery ?? 0)} icon={Target} tone="lavender" />
            <StatCard label="Topics measured" value={formatNumber(overview?.masteryDistribution?.reduce((s, b) => s + b.count, 0) ?? 0)} icon={BookOpen} tone="sky" />
            <StatCard label="Weak topics" value={formatNumber(overview?.weakTopics?.length ?? 0)} icon={TrendingDown} tone={overview?.weakTopics?.length ? 'peach' : 'mint'} />
            <StatCard label="Study streak" value={formatNumber(overview?.streak?.current ?? 0)} suffix="days" icon={Zap} tone="butter" />
          </>
        )}
      </section>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Mastery distribution"
          description="How topics are spread across mastery bands."
          isEmpty={!masteryData.length}
          emptyMessage="No mastery data yet. Take some tests to get started."
          height={240}
        >
          <DonutChart data={masteryData} />
        </ChartCard>

        {/* Subject breakdown */}
        <Card>
          <CardHeader><CardTitle>Subject performance</CardTitle></CardHeader>
          <CardContent>
            {subjectsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : subjects.length === 0 ? (
              <EmptyState compact preset="empty" title="No subject data" />
            ) : (
              <div className="space-y-4">
                {subjects.map((s) => (
                  <div key={s.subjectId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-ink truncate">{s.subjectName}</span>
                      <span className="text-ink-muted tabular-nums ml-2">{formatPercent(s.mastery ?? 0)}</span>
                    </div>
                    <Progress value={s.mastery ?? 0} tone={s.mastery >= 70 ? 'mint' : s.mastery >= 40 ? 'sky' : 'peach'} />
                    <div className="flex gap-2 text-[11.5px] text-ink-faint">
                      <span>{s.topicCount || 0} topics</span>
                      <span>·</span>
                      <span>{s.attemptCount || 0} tests</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Topics table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Topic mastery detail</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={params.subjectId || 'all'} onValueChange={(v) => setFilter('subjectId', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {filterSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={params.band || 'all'} onValueChange={(v) => setFilter('band', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All bands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bands</SelectItem>
                {['critical', 'weak', 'developing', 'strong', 'mastered'].map((b) => (
                  <SelectItem key={b} value={b}>{humaniseKey(b)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {topicsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : topicsQuery.isError ? (
            <ErrorState error={topicsQuery.error} onRetry={topicsQuery.refetch} />
          ) : topics.length === 0 ? (
            <EmptyState compact preset="empty" title="No topics match the filter" />
          ) : (
            <>
              <div className="divide-y divide-line">
                {topics.map((t) => (
                  <div key={t.topicId} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium text-ink truncate">{t.title}</p>
                      <p className="text-[11.5px] text-ink-muted">{t.subjectName}</p>
                    </div>
                    <div className="w-24">
                      <Progress value={t.masteryScore ?? 0} tone={BAND_TONE[t.masteryLevel] || 'brand'} />
                      <p className="mt-0.5 text-[11px] text-ink-faint text-right">{t.masteryScore ?? 0}%</p>
                    </div>
                    <Badge variant={masteryVariant(t.masteryLevel)} size="sm" className="shrink-0 w-24 justify-center">
                      {humaniseKey(t.masteryLevel || 'unknown')}
                    </Badge>
                    <div className="text-[12px] text-ink-muted w-16 text-right tabular-nums">
                      {formatPercent(t.accuracy ?? 0)} acc
                    </div>
                  </div>
                ))}
              </div>
              {pagination && (
                <div className="mt-4">
                  <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

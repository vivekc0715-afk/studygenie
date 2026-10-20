import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  BarChart3,
  Clock3,
  ListChecks,
  PlayCircle,
  Trophy,
} from 'lucide-react';
import { testsService } from '../../services/tests.service';
import { qk } from '../../lib/queryClient';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { PageHeader } from '../../components/common/page-header';
import { StatCard } from '../../components/common/stat-card';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Pagination } from '../../components/ui/pagination';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { formatNumber, formatPercent, formatMinutes } from '../../lib/utils';

const GRADE_COLORS = {
  A: 'mint', B: 'sky', C: 'butter', D: 'peach', F: 'blush',
};

function gradeFromPercent(p) {
  if (p >= 90) return 'A';
  if (p >= 75) return 'B';
  if (p >= 60) return 'C';
  if (p >= 40) return 'D';
  return 'F';
}

export default function Results() {
  useDocumentTitle('My Results');
  const navigate = useNavigate();
  const { params, setPage } = useListParams({ page: 1, limit: 10 });

  const statsQuery = useQuery({ queryKey: qk.testStats, queryFn: () => testsService.stats() });
  const attemptsQuery = useQuery({
    queryKey: qk.attempts(params),
    queryFn: () => testsService.attempts(params),
  });

  const stats = statsQuery.data;
  const { data: attempts = [], pagination } = attemptsQuery.data || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Results"
        description="Review all your past test attempts, scores, and performance trends."
        actions={
          <Button size="sm" onClick={() => navigate('/app/tests')}>
            <PlayCircle className="size-4" /> Take a test
          </Button>
        }
      />

      {/* Stats */}
      <section className="grid gap-3.5 sm:grid-cols-4">
        {statsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
        ) : (
          <>
            <StatCard label="Total attempts" value={formatNumber(stats?.attempts ?? 0)} icon={ListChecks} tone="lavender" />
            <StatCard label="Average score" value={formatPercent(stats?.averagePercentage ?? 0)} icon={BarChart3} tone="sky" />
            <StatCard label="Best score" value={formatPercent(stats?.bestPercentage ?? 0)} icon={Trophy} tone="mint" />
            <StatCard label="Avg time taken" value={formatMinutes(stats?.avgDurationMinutes ?? 0)} icon={Clock3} tone="butter" />
          </>
        )}
      </section>

      {/* Attempts list */}
      <Card>
        <CardHeader>
          <CardTitle>All Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {attemptsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : attemptsQuery.isError ? (
            <ErrorState error={attemptsQuery.error} onRetry={attemptsQuery.refetch} />
          ) : attempts.length === 0 ? (
            <EmptyState
              preset="empty"
              title="No attempts yet"
              description="Take your first test and your results will appear here."
              action={
                <Button size="sm" onClick={() => navigate('/app/tests')}>
                  Browse tests
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-line">
              {attempts.map((att) => {
                const pct = att.scorePercentage ?? 0;
                const grade = gradeFromPercent(pct);
                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-4 py-3.5 cursor-pointer hover:bg-canvas-deep -mx-2 px-2 rounded-xl transition-colors"
                    onClick={() => navigate(`/app/results/${att.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink truncate">{att.testTitle || 'Practice Test'}</p>
                      <p className="text-[12px] text-ink-muted mt-0.5">
                        {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'In progress'}
                        {att.durationMinutes ? ` · ${formatMinutes(att.durationMinutes)}` : ''}
                        {att.totalQuestions ? ` · ${att.totalQuestions} questions` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[15px] font-bold text-ink tabular-nums">{formatPercent(pct)}</p>
                        <p className="text-[11.5px] text-ink-muted">{att.score ?? 0}/{att.maxScore ?? 0} pts</p>
                      </div>
                      <Badge variant={GRADE_COLORS[grade] || 'neutral'} className="text-[13px] w-8 justify-center">
                        {grade}
                      </Badge>
                      <ArrowRight className="size-4 text-ink-faint" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {pagination && (
            <div className="mt-4">
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { predictionService } from '../../services/predictions.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState, NotConfigured } from '../../components/ui/empty-state';
import { formatPercent, humaniseKey } from '../../lib/utils';
import { cn } from '../../lib/utils';

const GRADE_BANDS = [
  { min: 90, label: 'A+', tone: 'mint' },
  { min: 80, label: 'A', tone: 'mint' },
  { min: 70, label: 'B+', tone: 'sky' },
  { min: 60, label: 'B', tone: 'sky' },
  { min: 50, label: 'C', tone: 'butter' },
  { min: 40, label: 'D', tone: 'peach' },
  { min: 0, label: 'F', tone: 'blush' },
];

function predictedGrade(score) {
  return GRADE_BANDS.find((b) => score >= b.min) || GRADE_BANDS[GRADE_BANDS.length - 1];
}

export default function Predictions() {
  useDocumentTitle('Grade Predictions');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const metaQuery = useQuery({ queryKey: qk.predictionMeta, queryFn: () => predictionService.meta() });
  const predictionsQuery = useQuery({ queryKey: qk.predictions, queryFn: () => predictionService.list() });

  const recompute = useMutation({
    mutationFn: () => predictionService.computeAll(),
    onSuccess: () => {
      notifySuccess('Predictions refreshed!');
      queryClient.invalidateQueries({ queryKey: qk.predictions });
    },
    onError: (e) => toastError(e, 'Could not refresh predictions.'),
  });

  const predictions = predictionsQuery.data || [];
  const notConfigured = metaQuery.isSuccess && !metaQuery.data?.configured;

  if (notConfigured) {
    return (
      <NotConfigured
        feature="Grade Predictions"
        reason="Complete your academic profile and attempt some tests to enable AI-powered grade predictions."
        action={<Button size="sm" onClick={() => navigate('/app/profile')}>Set up profile</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade Predictions"
        description="AI-powered predictions of your expected grade in each subject based on your mastery and performance data."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
          >
            <RefreshCw className={cn('size-4', recompute.isPending && 'animate-spin')} />
            {recompute.isPending ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />

      {predictionsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : predictionsQuery.isError ? (
        <ErrorState error={predictionsQuery.error} onRetry={predictionsQuery.refetch} />
      ) : predictions.length === 0 ? (
        <EmptyState
          preset="empty"
          title="No predictions available"
          description="Attempt tests and mark topics as studied. Once we have enough data, predictions will appear here."
          action={<Button size="sm" onClick={() => navigate('/app/tests')}>Take a test</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {predictions.map((pred) => {
            const grade = predictedGrade(pred.predictedScore ?? 0);
            return (
              <Card key={pred.subjectId} className="overflow-hidden">
                {/* Gradient header */}
                <div className={cn('px-5 pt-5 pb-3', `bg-${grade.tone}-soft`)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink truncate">{pred.subjectName}</p>
                      <p className="text-[12px] text-ink-muted">{pred.subjectCode}</p>
                    </div>
                    <div className={cn('flex flex-col items-center rounded-xl px-3 py-1.5', `bg-${grade.tone} text-${grade.tone}-ink`)}>
                      <span className="text-[22px] font-black leading-none">{grade.label}</span>
                      <span className="text-[10px] font-medium">PREDICTED</span>
                    </div>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Score bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[12.5px]">
                      <span className="text-ink-muted">Predicted score</span>
                      <span className="font-semibold text-ink">{formatPercent(pred.predictedScore ?? 0)}</span>
                    </div>
                    <Progress value={pred.predictedScore ?? 0} tone={pred.predictedScore >= 60 ? 'mint' : 'peach'} />
                  </div>

                  {/* Factors */}
                  {pred.factors?.length ? (
                    <div className="space-y-2">
                      <p className="text-[12px] font-semibold text-ink-soft">Contributing factors</p>
                      {pred.factors.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                          {f.impact === 'positive' ? (
                            <TrendingUp className="size-3.5 text-mint-ink shrink-0" />
                          ) : f.impact === 'negative' ? (
                            <TrendingDown className="size-3.5 text-blush-ink shrink-0" />
                          ) : (
                            <Target className="size-3.5 text-ink-faint shrink-0" />
                          )}
                          <span>{f.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Confidence */}
                  {pred.confidence ? (
                    <div className="rounded-lg bg-canvas-deep px-3 py-2 flex items-center justify-between">
                      <span className="text-[12px] text-ink-muted">Confidence</span>
                      <span className="text-[12.5px] font-medium text-ink">{humaniseKey(pred.confidence)}</span>
                    </div>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-brand"
                    onClick={() => navigate(`/app/analytics`)}
                  >
                    View analytics <ArrowRight className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

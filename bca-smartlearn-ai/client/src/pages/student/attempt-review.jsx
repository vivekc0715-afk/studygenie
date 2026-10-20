import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  BarChart3,
  Clock3,
  Target,
  Trophy,
} from 'lucide-react';
import { testsService } from '../../services/tests.service';
import { qk } from '../../lib/queryClient';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/empty-state';
import { cn, formatPercent, formatMinutes } from '../../lib/utils';

function gradeFromPercent(p) {
  if (p >= 90) return { label: 'A+', tone: 'mint' };
  if (p >= 80) return { label: 'A', tone: 'mint' };
  if (p >= 70) return { label: 'B+', tone: 'sky' };
  if (p >= 60) return { label: 'B', tone: 'sky' };
  if (p >= 50) return { label: 'C', tone: 'butter' };
  if (p >= 40) return { label: 'D', tone: 'peach' };
  return { label: 'F', tone: 'blush' };
}

export default function AttemptReview() {
  useDocumentTitle('Attempt Review');
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: qk.attempt(attemptId),
    queryFn: () => testsService.attempt(attemptId),
    enabled: !!attemptId,
  });

  const attempt = query.data;
  const responses = attempt?.responses || [];
  const pct = attempt?.scorePercentage ?? 0;
  const grade = gradeFromPercent(pct);

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  }

  const correct = responses.filter((r) => r.isCorrect).length;
  const wrong = responses.filter((r) => r.selectedOption && !r.isCorrect).length;
  const skipped = responses.filter((r) => !r.selectedOption).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/results')}>
          <ArrowLeft className="size-4" /> All results
        </Button>
      </div>

      {/* Score card */}
      <Card className={cn('border-2', pct >= 60 ? 'border-mint' : 'border-blush')}>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Big grade */}
            <div className={cn('flex size-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-black', `bg-${grade.tone} text-${grade.tone}-ink`)}>
              {grade.label}
            </div>

            <div className="flex-1 space-y-2">
              <h1 className="text-[20px] font-bold text-ink">{attempt?.testTitle || 'Test Review'}</h1>
              <p className="text-[13px] text-ink-muted">
                {attempt?.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                {attempt?.durationMinutes ? ` · ${formatMinutes(attempt.durationMinutes)} taken` : ''}
              </p>
              <Progress value={pct} tone={pct >= 60 ? 'mint' : 'danger'} className="max-w-xs" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[22px] font-bold text-mint-ink">{correct}</p>
                <p className="text-[11.5px] text-ink-muted">Correct</p>
              </div>
              <div>
                <p className="text-[22px] font-bold text-blush-ink">{wrong}</p>
                <p className="text-[11.5px] text-ink-muted">Wrong</p>
              </div>
              <div>
                <p className="text-[22px] font-bold text-ink-faint">{skipped}</p>
                <p className="text-[11.5px] text-ink-muted">Skipped</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[36px] font-black text-ink tabular-nums">{formatPercent(pct)}</p>
              <p className="text-[13px] text-ink-muted">{attempt?.score ?? 0} / {attempt?.maxScore ?? 0} pts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question review */}
      <div className="space-y-4">
        <h2 className="text-[16px] font-semibold text-ink">Question Review</h2>
        {responses.map((r, idx) => (
          <Card key={r.questionId || idx} className={cn('border', r.isCorrect ? 'border-mint' : r.selectedOption ? 'border-blush' : 'border-line')}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                {r.isCorrect ? (
                  <CheckCircle2 className="size-5 text-mint-ink mt-0.5 shrink-0" />
                ) : r.selectedOption ? (
                  <XCircle className="size-5 text-blush-ink mt-0.5 shrink-0" />
                ) : (
                  <MinusCircle className="size-5 text-ink-faint mt-0.5 shrink-0" />
                )}
                <div className="flex-1 space-y-2">
                  <p className="text-[14px] font-medium text-ink">{idx + 1}. {r.prompt || r.question?.prompt}</p>
                  <div className="space-y-1.5">
                    {(r.options || r.question?.options || []).map((opt, i) => {
                      const isSelected = opt === r.selectedOption;
                      const isCorrect = opt === r.correctAnswer;
                      return (
                        <div
                          key={i}
                          className={cn(
                            'rounded-lg px-3 py-2 text-[13px]',
                            isCorrect ? 'bg-mint text-mint-ink font-medium' :
                            isSelected && !isCorrect ? 'bg-blush text-blush-ink' :
                            'bg-canvas-deep text-ink-soft'
                          )}
                        >
                          {opt}
                          {isCorrect && <span className="ml-2 text-[11px]">✓ Correct</span>}
                          {isSelected && !isCorrect && <span className="ml-2 text-[11px]">✗ Your answer</span>}
                        </div>
                      );
                    })}
                  </div>
                  {r.explanation && (
                    <p className="text-[12.5px] text-ink-muted bg-lavender-soft rounded-lg px-3 py-2">
                      💡 {r.explanation}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/app/results')}>View all results</Button>
        <Button onClick={() => navigate('/app/tests')}>Take another test</Button>
      </div>
    </div>
  );
}

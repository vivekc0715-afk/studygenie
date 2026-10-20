import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Code2, Clock3, Trophy } from 'lucide-react';
import { codeService } from '../../services/code.service';
import { qk } from '../../lib/queryClient';
import { notifySuccess, toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/empty-state';
import { humaniseKey } from '../../lib/utils';
import { useState } from 'react';

const DIFFICULTY_COLORS = { easy: 'mint', medium: 'butter', hard: 'blush' };

export default function ExerciseDetail() {
  useDocumentTitle('Exercise');
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  const query = useQuery({
    queryKey: qk.exercise(exerciseId),
    queryFn: () => codeService.exercise(exerciseId),
    enabled: !!exerciseId,
  });

  const ex = query.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/practice')}>
          <ArrowLeft className="size-4" /> Back to exercises
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Problem description */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-bold text-ink">{ex?.title}</h1>
                <p className="mt-1 text-[13px] text-ink-muted">{ex?.language || 'Any language'}</p>
              </div>
              <Badge variant={DIFFICULTY_COLORS[ex?.difficulty] || 'neutral'}>
                {humaniseKey(ex?.difficulty || 'medium')}
              </Badge>
            </div>

            <Card>
              <CardHeader><CardTitle>Problem Statement</CardTitle></CardHeader>
              <CardContent>
                <p className="text-[14px] text-ink-soft leading-relaxed whitespace-pre-wrap">
                  {ex?.description}
                </p>
              </CardContent>
            </Card>

            {ex?.examples?.length ? (
              <Card>
                <CardHeader><CardTitle>Examples</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {ex.examples.map((eg, i) => (
                    <div key={i} className="rounded-lg bg-canvas-deep p-3 font-mono text-[12.5px]">
                      <div className="text-ink-muted mb-1">Input:</div>
                      <div className="text-ink">{eg.input}</div>
                      <div className="text-ink-muted mt-2 mb-1">Output:</div>
                      <div className="text-ink">{eg.output}</div>
                      {eg.explanation && (
                        <div className="mt-2 text-ink-faint text-[12px]">{eg.explanation}</div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {ex?.constraints?.length ? (
              <Card>
                <CardHeader><CardTitle>Constraints</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-[13px] text-ink-soft list-disc pl-4">
                    {ex.constraints.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Solution panel */}
          <div className="space-y-4">
            {submitted ? (
              <Card className="border-mint bg-mint-soft">
                <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle2 className="size-12 text-mint-ink" />
                  <h2 className="text-[18px] font-semibold text-ink">Exercise submitted!</h2>
                  <p className="text-[13px] text-ink-muted">
                    Great work. Head to the compiler to keep practising.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/app/practice')}>
                      Back to exercises
                    </Button>
                    <Button size="sm" onClick={() => navigate('/app/compiler')}>
                      <Code2 className="size-4" /> Open compiler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Solve in Compiler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[13px] text-ink-muted">
                    Use the full-featured online compiler to write, run and submit your solution.
                  </p>
                  <div className="flex items-center gap-3 rounded-xl bg-canvas-deep p-4">
                    <Clock3 className="size-5 text-ink-muted" />
                    <div>
                      <p className="text-[13px] font-medium text-ink">Time limit</p>
                      <p className="text-[12px] text-ink-muted">{ex?.timeLimit || 2000}ms</p>
                    </div>
                    <div className="ml-4 pl-4 border-l border-line">
                      <p className="text-[13px] font-medium text-ink">Memory limit</p>
                      <p className="text-[12px] text-ink-muted">{ex?.memoryLimit || 256}MB</p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/app/compiler?exerciseId=${exerciseId}`)}
                  >
                    <Code2 className="size-4" /> Solve in Compiler
                  </Button>
                </CardContent>
              </Card>
            )}

            {ex?.hints?.length ? (
              <Card>
                <CardHeader><CardTitle>Hints</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {ex.hints.map((hint, i) => (
                    <details key={i} className="rounded-lg border border-line p-3">
                      <summary className="cursor-pointer text-[13px] font-medium text-brand select-none">
                        Hint {i + 1}
                      </summary>
                      <p className="mt-2 text-[13px] text-ink-soft">{hint}</p>
                    </details>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

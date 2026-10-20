import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Flag,
  ListChecks,
  XCircle,
} from 'lucide-react';
import { testsService } from '../../services/tests.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { cn, formatMinutes } from '../../lib/utils';

function useCountdown(endTime) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!endTime) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(endTime) - Date.now()) / 1000));
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return remaining;
}

function formatTime(sec) {
  if (sec === null) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TestRunner() {
  useDocumentTitle('Test — In Progress');
  const { testId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const autosaveTimer = useRef(null);

  // Load live attempt
  const attemptQuery = useQuery({
    queryKey: qk.attempt(`live-${testId}`),
    queryFn: () => testsService.start(testId),
    enabled: !!testId,
    staleTime: Infinity,
  });

  const attempt = attemptQuery.data;
  const questions = attempt?.questions || [];
  const endTime = attempt?.endsAt;
  const remaining = useCountdown(endTime);

  // Pre-seed answers from attempt
  useEffect(() => {
    if (attempt?.responses) {
      const saved = {};
      attempt.responses.forEach((r) => { saved[r.questionId] = r.selectedOption; });
      setAnswers(saved);
    }
  }, [attempt]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (remaining === 0 && attempt?.id) {
      submitMutation.mutate();
    }
  }, [remaining]);

  const autosave = useMutation({
    mutationFn: (payload) => testsService.autosave(attempt?.id, payload),
  });

  const submitMutation = useMutation({
    mutationFn: () => testsService.submit(attempt?.id, { responses: buildResponses() }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      notifySuccess('Test submitted!');
      navigate(`/app/results/${data?.attemptId || attempt?.id}`);
    },
    onError: (e) => toastError(e, 'Could not submit test.'),
  });

  const abandonMutation = useMutation({
    mutationFn: () => testsService.abandon(attempt?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      navigate('/app/tests');
    },
    onError: (e) => toastError(e, 'Could not abandon test.'),
  });

  function buildResponses() {
    return Object.entries(answers).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }));
  }

  const handleAnswer = useCallback(
    (questionId, value) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: value };
        // Debounced autosave
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
          autosave.mutate({
            responses: Object.entries(next).map(([qId, opt]) => ({ questionId: qId, selectedOption: opt })),
          });
        }, 3000);
        return next;
      });
    },
    [autosave]
  );

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length ? (answeredCount / questions.length) * 100 : 0;
  const isLast = current === questions.length - 1;
  const isLow = remaining !== null && remaining < 120;

  if (attemptQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (attemptQuery.isError) {
    return <ErrorState error={attemptQuery.error} onRetry={attemptQuery.refetch} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => setAbandonOpen(true)}>
          <ArrowLeft className="size-4" /> Exit test
        </Button>
        <div className={cn('flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold tabular-nums', isLow ? 'bg-blush text-blush-ink' : 'bg-canvas-deep text-ink-soft')}>
          <Clock3 className="size-4" />
          {formatTime(remaining)}
        </div>
        <Button size="sm" onClick={() => setSubmitOpen(true)}>
          <Flag className="size-4" /> Submit test
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[12px] text-ink-muted">
          <span>Question {current + 1} of {questions.length}</span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={progress} tone="brand" />
      </div>

      {/* Question card */}
      {q && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <p className="text-[15px] font-medium text-ink leading-relaxed">{q.prompt}</p>
            <RadioGroup
              value={answers[q.id] || ''}
              onValueChange={(v) => handleAnswer(q.id, v)}
              className="space-y-2.5"
            >
              {(q.options || []).map((opt, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border border-line p-3.5 cursor-pointer transition-colors',
                    answers[q.id] === opt && 'border-brand bg-lavender-soft'
                  )}
                >
                  <RadioGroupItem value={opt} id={`opt-${idx}`} />
                  <Label htmlFor={`opt-${idx}`} className="cursor-pointer flex-1 text-[14px]">
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          Previous
        </Button>

        {/* Question dots */}
        <div className="flex flex-wrap gap-1.5 justify-center flex-1">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={cn(
                'size-7 rounded-full text-[11px] font-semibold transition-colors',
                idx === current ? 'bg-brand text-white' : answers[questions[idx]?.id] ? 'bg-mint text-mint-ink' : 'bg-canvas-deep text-ink-muted'
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <Button
          onClick={() => isLast ? setSubmitOpen(true) : setCurrent((c) => c + 1)}
          variant={isLast ? 'default' : 'outline'}
        >
          {isLast ? 'Finish' : 'Next'}
        </Button>
      </div>

      {/* Submit dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit test?</DialogTitle>
            <DialogDescription>
              You have answered {answeredCount} of {questions.length} questions. Unanswered questions will be marked wrong.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Continue test</Button>
            <Button onClick={() => { setSubmitOpen(false); submitMutation.mutate(); }} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting…' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Abandon dialog */}
      <Dialog open={abandonOpen} onOpenChange={setAbandonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-peach-ink" /> Abandon test?
            </DialogTitle>
            <DialogDescription>
              Your progress will be lost and the attempt will be marked abandoned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbandonOpen(false)}>Stay</Button>
            <Button variant="destructive" onClick={() => { setAbandonOpen(false); abandonMutation.mutate(); }} disabled={abandonMutation.isPending}>
              {abandonMutation.isPending ? 'Leaving…' : 'Abandon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

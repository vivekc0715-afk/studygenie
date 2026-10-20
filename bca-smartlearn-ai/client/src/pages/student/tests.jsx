import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Clock3,
  Layers,
  ListChecks,
  PlayCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Timer,
  Trophy,
  Wand2,
} from 'lucide-react';
import { testsService } from '../../services/tests.service';
import { studentService } from '../../services/student.service';
import { qk } from '../../lib/queryClient';
import { notifySuccess, toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { PageHeader } from '../../components/common/page-header';
import { StatCard } from '../../components/common/stat-card';
import { PosterCard } from '../../components/common/poster-card';
import { MasonryGrid } from '../../components/common/masonry-grid';
import { SearchInput } from '../../components/common/search-input';
import { Field, FormGrid } from '../../components/common/form';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge, difficultyVariant } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Pagination } from '../../components/ui/pagination';
import { Skeleton, SkeletonCards } from '../../components/ui/skeleton';
import { EmptyState, ErrorState, NotConfigured } from '../../components/ui/empty-state';
import { accentFor, formatMinutes, formatNumber, formatPercent, humaniseKey } from '../../lib/utils';

const SOURCE_LABELS = { bank: 'Question bank', ai: 'AI generated', mixed: 'Bank + AI', manual: 'Curated' };

/** Shared start-attempt mutation: resumes a live attempt and opens the runner. */
function useStartTest() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => testsService.start(id),
    onSuccess: (_payload, id) => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      navigate(`/app/tests/${id}`);
    },
    onError: (error) => toastError(error, 'Could not start this test.'),
  });
}

function DifficultyMix({ mix }) {
  const entries = Object.entries(mix || {}).filter(([, count]) => count > 0);
  if (!entries.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {entries.map(([level, count]) => (
        <Badge key={level} variant={difficultyVariant(level)} size="sm">
          {humaniseKey(level)} · {count}
        </Badge>
      ))}
    </div>
  );
}

/* ----------------------------------------------------- generate dialog --- */

function GenerateTestDialog({ open, onOpenChange, meta, subjects, tree, subjectsLoading, treeLoading, deepLink }) {
  const startTest = useStartTest();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [questionCount, setQuestionCount] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [difficulty, setDifficulty] = useState('mixed');
  const [types, setTypes] = useState([]);
  const [source, setSource] = useState('bank');
  const [marksPerQuestion, setMarksPerQuestion] = useState('1');
  const [adaptive, setAdaptive] = useState(false);
  const [aiError, setAiError] = useState(null);

  const prefilledRef = useRef(false);

  const limits = meta?.limits || {};
  const maxQuestions = limits.maxQuestions || 50;
  const autoGradable = meta?.autoGradableTypes || [];
  const difficulties = meta?.difficulties || ['mixed', 'easy', 'medium', 'hard'];
  const sources = meta?.sources || ['bank', 'ai', 'mixed'];
  const aiConfigured = Boolean(meta?.aiConfigured);

  // Seed defaults the first time real metadata arrives.
  useEffect(() => {
    if (!meta) return;
    setQuestionCount((current) => current || String(limits.defaultQuestionCount || 10));
    setDurationMinutes((current) => current || String(limits.defaultDurationMinutes || 20));
    setTypes((current) => (current.length ? current : autoGradable));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);

  // Resolve a ?topicId= / ?subjectId= deep link once the scope tree is ready.
  useEffect(() => {
    if (!open || prefilledRef.current) return;
    if (!subjects.length || !tree.length) return;

    const { subjectId: subjectParam, topicId: topicParam } = deepLink || {};
    if (topicParam) {
      for (const entry of tree) {
        const entryId = String(entry.subject?.id || entry.subject?._id || '');
        for (const unit of entry.units || []) {
          const match = (unit.topics || []).find((topic) => String(topic.id || topic._id) === topicParam);
          if (match) {
            setSubjectId(entryId);
            setUnitId(String(unit.id || unit._id));
            setTopicId(topicParam);
            prefilledRef.current = true;
            return;
          }
        }
      }
    }
    if (subjectParam) {
      setSubjectId(subjectParam);
      prefilledRef.current = true;
    }
  }, [open, subjects, tree, deepLink]);

  const subjectEntry = useMemo(
    () => tree.find((entry) => String(entry.subject?.id || entry.subject?._id) === subjectId),
    [tree, subjectId]
  );
  const units = subjectEntry?.units || [];
  const topicOptions = useMemo(() => {
    const all = (subjectEntry?.units || []).flatMap((unit) => unit.topics || []);
    return unitId ? all.filter((topic) => String(topic.unit) === unitId) : all;
  }, [subjectEntry, unitId]);

  const reset = () => {
    prefilledRef.current = false;
    setTitle('');
    setSubjectId('');
    setUnitId('');
    setTopicId('');
    setDifficulty('mixed');
    setSource('bank');
    setMarksPerQuestion('1');
    setAdaptive(false);
    setAiError(null);
  };

  const toggleType = (type) => {
    setTypes((current) => (current.includes(type) ? current.filter((entry) => entry !== type) : [...current, type]));
  };

  const scopeChosen = Boolean(subjectId || unitId || topicId);
  const countValue = Number(questionCount) || 0;
  const durationValue = Number(durationMinutes) || 0;
  const canSubmit =
    scopeChosen &&
    types.length > 0 &&
    countValue >= 1 &&
    countValue <= maxQuestions &&
    durationValue >= 1 &&
    durationValue <= 300;

  const createMutation = useMutation({
    mutationFn: (payload) => testsService.create(payload),
    onSuccess: (test) => {
      notifySuccess('Practice test ready', 'Opening your attempt now.');
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      onOpenChange(false);
      reset();
      if (test?.id || test?._id) startTest.mutate(test.id || test._id);
    },
    onError: (error) => {
      if (error?.notConfigured) setAiError({ message: error.message, envKey: error.envKey });
      toastError(error, 'Could not generate the test.');
    },
  });

  const handleSubmit = () => {
    if (!canSubmit) return;
    setAiError(null);
    createMutation.mutate({
      title: title.trim() || undefined,
      subject: subjectId || undefined,
      unit: unitId || undefined,
      topic: topicId || undefined,
      questionCount: countValue,
      durationMinutes: durationValue,
      difficulty,
      types,
      source,
      marksPerQuestion: Number(marksPerQuestion) || 1,
      adaptive,
    });
  };

  const busy = createMutation.isPending || startTest.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4 text-brand" /> Generate a practice test
          </DialogTitle>
          <DialogDescription>
            Pick a scope, tune the mix and we will assemble a timed, auto-graded attempt from your syllabus.
          </DialogDescription>
        </DialogHeader>

        {!aiConfigured ? (
          <NotConfigured
            message="AI-assisted drafting is not configured on this server, so bank questions will be used."
            envKey="GEMINI_API_KEY"
          />
        ) : null}

        {aiError ? <NotConfigured message={aiError.message} envKey={aiError.envKey} /> : null}

        <div className="space-y-4">
          <Field label="Test title" htmlFor="test-title" hint="Optional — we will name it from the scope if left blank.">
            <Input
              id="test-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Data Structures — Unit 2 drill"
              maxLength={240}
            />
          </Field>

          <FormGrid>
            <Field label="Subject" htmlFor="test-subject" required>
              <Select
                value={subjectId || 'none'}
                onValueChange={(value) => {
                  const next = value === 'none' ? '' : value;
                  setSubjectId(next);
                  setUnitId('');
                  setTopicId('');
                }}
                disabled={subjectsLoading}
              >
                <SelectTrigger id="test-subject">
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any subject</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id || subject._id} value={String(subject.id || subject._id)}>
                      {subject.name} · {formatNumber(subject.questionCount || 0)} questions
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Unit" htmlFor="test-unit" hint="Narrow the scope to a single unit.">
              <Select
                value={unitId || 'none'}
                onValueChange={(value) => {
                  setUnitId(value === 'none' ? '' : value);
                  setTopicId('');
                }}
                disabled={!subjectId || treeLoading || !units.length}
              >
                <SelectTrigger id="test-unit">
                  <SelectValue placeholder={units.length ? 'All units' : 'Select a subject first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All units</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id || unit._id} value={String(unit.id || unit._id)}>
                      {unit.number ? `Unit ${unit.number} · ` : ''}
                      {unit.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Topic" htmlFor="test-topic" hint="Focus on one topic for a tight drill.">
              <Select
                value={topicId || 'none'}
                onValueChange={(value) => setTopicId(value === 'none' ? '' : value)}
                disabled={!subjectId || treeLoading || !topicOptions.length}
              >
                <SelectTrigger id="test-topic">
                  <SelectValue placeholder={topicOptions.length ? 'All topics' : 'No topics available'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All topics</SelectItem>
                  {topicOptions.map((topic) => (
                    <SelectItem key={topic.id || topic._id} value={String(topic.id || topic._id)}>
                      {topic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Question count"
              htmlFor="test-count"
              required
              hint={`Between 1 and ${maxQuestions} questions.`}
            >
              <Input
                id="test-count"
                type="number"
                min={1}
                max={maxQuestions}
                value={questionCount}
                onChange={(event) => setQuestionCount(event.target.value)}
                invalid={countValue < 1 || countValue > maxQuestions}
              />
            </Field>

            <Field label="Duration (minutes)" htmlFor="test-duration" required hint="Between 1 and 300 minutes.">
              <Input
                id="test-duration"
                type="number"
                min={1}
                max={300}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                invalid={durationValue < 1 || durationValue > 300}
              />
            </Field>

            <Field label="Difficulty" htmlFor="test-difficulty">
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="test-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map((level) => (
                    <SelectItem key={level} value={level}>
                      {humaniseKey(level)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Source" htmlFor="test-source" hint={aiConfigured ? undefined : 'Bank only — AI needs GEMINI_API_KEY.'}>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="test-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((entry) => (
                    <SelectItem key={entry} value={entry} disabled={entry !== 'bank' && !aiConfigured}>
                      {SOURCE_LABELS[entry] || humaniseKey(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Marks per question" htmlFor="test-marks" hint="Applied to AI-drafted questions.">
              <Input
                id="test-marks"
                type="number"
                min={1}
                max={100}
                value={marksPerQuestion}
                onChange={(event) => setMarksPerQuestion(event.target.value)}
              />
            </Field>
          </FormGrid>

          <Field label="Question types" required hint="Only auto-graded types can be used in a practice test.">
            <div className="grid gap-2 sm:grid-cols-2">
              {autoGradable.map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] text-ink transition-colors hover:border-line-strong"
                >
                  <Checkbox checked={types.includes(type)} onCheckedChange={() => toggleType(type)} aria-label={humaniseKey(type)} />
                  {humaniseKey(type)}
                </label>
              ))}
            </div>
            {!types.length ? <p className="text-[12px] font-medium text-danger">Select at least one question type.</p> : null}
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-line bg-canvas-deep px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="size-4 text-brand" />
              <div>
                <p className="text-[13px] font-medium text-ink">Adaptive difficulty</p>
                <p className="text-[12px] text-ink-muted">Let the server pick a level from your measured mastery.</p>
              </div>
            </div>
            <Switch checked={adaptive} onCheckedChange={setAdaptive} aria-label="Toggle adaptive difficulty" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || busy}>
            {busy ? <RefreshCw className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {busy ? 'Preparing…' : 'Generate & start'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- page --- */

export default function TestsPage() {
  useDocumentTitle('Tests & Quizzes');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { params, setParams } = useListParams({ defaults: { limit: 12, subject: '' } });

  const metaQuery = useQuery({ queryKey: qk.testMeta, queryFn: () => testsService.meta() });
  const scopeQuery = useQuery({ queryKey: qk.testScope, queryFn: () => testsService.scope() });
  const statsQuery = useQuery({ queryKey: qk.testStats, queryFn: () => testsService.stats() });
  const treeQuery = useQuery({ queryKey: qk.mySubjects({ source: 'tests' }), queryFn: () => studentService.mySubjects({}) });

  const listQuery = useQuery({
    queryKey: qk.tests({ page: params.page, limit: params.limit, search: params.search, subject: params.subject, sortBy: params.sortBy }),
    queryFn: () =>
      testsService.list({
        page: params.page,
        limit: params.limit,
        search: params.search,
        subject: params.subject,
        sortBy: params.sortBy,
      }),
  });

  const attemptsQuery = useQuery({
    queryKey: qk.attempts({ view: 'tests-overview' }),
    queryFn: () => testsService.attempts({ page: 1, limit: 100 }),
  });

  const startTest = useStartTest();

  const deepLink = useMemo(
    () => ({ subjectId: searchParams.get('subjectId') || '', topicId: searchParams.get('topicId') || '' }),
    [searchParams]
  );

  // Open the generator automatically when arriving through a deep link.
  useEffect(() => {
    if (deepLink.subjectId || deepLink.topicId) setDialogOpen(true);
  }, [deepLink]);

  const stats = statsQuery.data;
  const subjects = scopeQuery.data || [];
  const tree = treeQuery.data || [];
  const tests = listQuery.data?.data || [];
  const meta = listQuery.data?.meta;

  const attemptsByTest = useMemo(() => {
    const map = new Map();
    for (const attempt of attemptsQuery.data?.data || []) {
      const key = String(attempt.test?.id || attempt.test?._id || attempt.test || '');
      if (!key) continue;
      const entry = map.get(key) || { count: 0, best: 0, inProgress: false };
      entry.count += 1;
      if (Number.isFinite(attempt.percentage)) entry.best = Math.max(entry.best, attempt.percentage);
      if (attempt.status === 'in_progress') entry.inProgress = true;
      map.set(key, entry);
    }
    return map;
  }, [attemptsQuery.data]);

  const metaError = metaQuery.error || scopeQuery.error;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assessment"
        title="Tests & Quizzes"
        description="Build timed practice tests from your syllabus, resume live attempts and track how you score."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate('/app/results')}>
              <Trophy className="size-4" /> Results
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" /> Generate test
            </Button>
          </>
        }
      />

      {/* -------------------------------------------------------- KPIs */}
      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        {statsQuery.isLoading ? (
          Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-[112px]" />)
        ) : statsQuery.isError ? (
          <div className="sm:col-span-2 xl:col-span-5">
            <ErrorState error={statsQuery.error} onRetry={statsQuery.refetch} />
          </div>
        ) : (
          <>
            <StatCard
              label="Tests attempted"
              value={formatNumber(stats?.attempts ?? 0)}
              hint={`${formatNumber(stats?.testsCreated ?? 0)} created`}
              icon={ListChecks}
              tone="lavender"
            />
            <StatCard
              label="Average score"
              value={formatPercent(stats?.averagePercentage ?? 0)}
              hint={`Best ${formatPercent(stats?.bestPercentage ?? 0)}`}
              icon={Award}
              tone="sky"
            />
            <StatCard
              label="Best score"
              value={formatPercent(stats?.bestPercentage ?? 0)}
              hint={`${formatNumber(stats?.totalCorrect ?? 0)} correct answers`}
              icon={Trophy}
              tone="mint"
            />
            <StatCard
              label="Study time"
              value={formatMinutes(stats?.studyMinutes ?? 0)}
              hint={`${formatNumber(stats?.totalUnanswered ?? 0)} unanswered`}
              icon={Clock3}
              tone="butter"
            />
            <StatCard
              label="In progress"
              value={formatNumber(stats?.inProgress ?? 0)}
              hint={stats?.inProgress ? 'Resume below' : 'Nothing pending'}
              icon={PlayCircle}
              tone={stats?.inProgress ? 'peach' : 'mint'}
            />
          </>
        )}
      </section>

      {/* ------------------------------------------- AI configuration */}
      {metaQuery.isSuccess && !metaQuery.data?.aiConfigured ? (
        <NotConfigured message={metaQuery.data?.aiHint || 'AI generation is disabled; curated bank questions are used.'} envKey="GEMINI_API_KEY" />
      ) : null}

      {/* ------------------------------------------------------ toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={params.search}
          onChange={(value) => setParams({ search: value })}
          placeholder="Search your tests…"
          className="sm:max-w-sm"
          aria-label="Search tests"
        />
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-ink-muted">Subject</span>
          <Select value={params.subject || 'all'} onValueChange={(value) => setParams({ subject: value === 'all' ? '' : value })}>
            <SelectTrigger className="h-9 w-[12rem] text-[12.5px]" aria-label="Filter by subject">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id || subject._id} value={String(subject.id || subject._id)}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* --------------------------------------------------------- list */}
      {metaError ? (
        <ErrorState error={metaError} onRetry={() => (metaQuery.error ? metaQuery.refetch() : scopeQuery.refetch())} />
      ) : listQuery.isLoading ? (
        <SkeletonCards count={6} heights={[210, 240, 200, 230, 210, 250]} />
      ) : listQuery.isError ? (
        <ErrorState error={listQuery.error} onRetry={listQuery.refetch} />
      ) : tests.length === 0 ? (
        <EmptyState
          preset="empty"
          title={params.search || params.subject ? 'No tests match these filters' : 'No practice tests yet'}
          description={
            params.search || params.subject
              ? 'Try clearing the search or picking a different subject.'
              : 'Generate your first practice test — we will build it from your enrolled subjects and topics.'
          }
          action={
            params.search || params.subject ? (
              <Button variant="outline" size="sm" onClick={() => setParams({ search: '', subject: '' })}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" /> Generate test
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <MasonryGrid breakpoints={{ default: 3, 1536: 3, 1280: 3, 1024: 2, 768: 2, 640: 2, 0: 1 }}>
            {tests.map((test) => {
              const testId = test.id || test._id;
              const attemptInfo = attemptsByTest.get(String(testId));
              const config = test.configuration || {};
              const inProgress = Boolean(attemptInfo?.inProgress);
              return (
                <PosterCard
                  key={testId}
                  title={test.title}
                  subtitle={SOURCE_LABELS[test.sourceType] || humaniseKey(test.sourceType || 'bank')}
                  description={test.description}
                  icon={Layers}
                  accent={accentFor(test.title)}
                  bannerHeight="h-20"
                  badges={[
                    config.adaptive ? (
                      <Badge key="adaptive" variant="lavender" size="sm">
                        <Sparkles className="size-3" /> Adaptive
                      </Badge>
                    ) : null,
                    inProgress ? (
                      <Badge key="live" variant="sky" size="sm">
                        In progress
                      </Badge>
                    ) : null,
                  ].filter(Boolean)}
                  meta={[
                    { icon: ListChecks, label: `${formatNumber(config.questionCount ?? test.questionCount ?? 0)} questions` },
                    { icon: Timer, label: `${formatNumber(config.durationMinutes ?? 0)} min` },
                    { icon: Clock3, label: `${formatNumber(test.totalMarks ?? 0)} marks` },
                    attemptInfo?.count ? { icon: Trophy, label: `${formatNumber(attemptInfo.count)} attempts` } : null,
                  ].filter(Boolean)}
                  footer={
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={startTest.isPending && startTest.variables === testId}
                      onClick={() => startTest.mutate(testId)}
                    >
                      {startTest.isPending && startTest.variables === testId ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : (
                        <PlayCircle className="size-4" />
                      )}
                      {inProgress ? 'Resume test' : 'Start test'}
                    </Button>
                  }
                >
                  <DifficultyMix mix={test.difficultyMix} />
                  {attemptInfo?.best ? (
                    <p className="mt-2 text-[12px] text-ink-muted">
                      Best score <span className="font-semibold text-ink-soft">{formatPercent(attemptInfo.best)}</span>
                    </p>
                  ) : null}
                </PosterCard>
              );
            })}
          </MasonryGrid>

          <Pagination meta={meta} onPageChange={(page) => setParams({ page })} onLimitChange={(limit) => setParams({ limit })} />
        </div>
      )}

      <GenerateTestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        meta={metaQuery.data}
        subjects={subjects}
        tree={tree}
        subjectsLoading={scopeQuery.isLoading}
        treeLoading={treeQuery.isLoading}
        deepLink={deepLink}
      />
    </div>
  );
}

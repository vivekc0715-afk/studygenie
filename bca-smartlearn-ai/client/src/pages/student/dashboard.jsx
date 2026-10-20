import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  Flame,
  Layers,
  NotebookText,
  PlayCircle,
  Sparkles,
  Target,
  TerminalSquare,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { analyticsService } from '../../services/analytics.service';
import { plannerService } from '../../services/planner.service';
import { studentService } from '../../services/student.service';
import { testsService } from '../../services/tests.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useAuthStore } from '../../stores/authStore';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { StatCard } from '../../components/common/stat-card';
import { PosterCard } from '../../components/common/poster-card';
import { ChartCard, DonutChart, CHART_COLORS } from '../../components/common/chart-card';
import { SidePanel } from '../../components/common/side-panel';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge, masteryVariant } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Skeleton, SkeletonCards } from '../../components/ui/skeleton';
import { EmptyState, ErrorState, NotConfigured } from '../../components/ui/empty-state';
import { cn, formatMinutes, formatNumber, formatPercent, humaniseKey, titleCase } from '../../lib/utils';

const BAND_TONE = {
  critical: 'danger',
  weak: 'peach',
  developing: 'butter',
  strong: 'sky',
  mastered: 'mint',
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function TaskRow({ task, onToggle, busy }) {
  const done = task.status === 'completed';
  return (
    <li className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-line-strong">
      <button
        type="button"
        onClick={() => onToggle(task)}
        disabled={busy}
        className="mt-0.5 shrink-0 text-ink-faint transition-colors hover:text-brand disabled:opacity-50"
        aria-label={done ? 'Mark as pending' : 'Mark as complete'}
      >
        {done ? <CheckCircle2 className="size-5 text-mint-ink" /> : <Circle className="size-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[13.5px] font-medium text-ink', done && 'line-through opacity-60')}>
          {task.title || titleCase(task.activity || 'Study task')}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-muted">
          {task.subject?.name ? (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="size-3.5" /> {task.subject.name}
            </span>
          ) : null}
          {task.topic?.title ? <span className="truncate">{task.topic.title}</span> : null}
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" /> {formatMinutes(task.estimatedMinutes)}
          </span>
          <Badge variant={task.priority >= 7 ? 'blush' : 'neutral'} size="sm">
            {humaniseKey(task.activity || 'study')}
          </Badge>
        </div>
      </div>
    </li>
  );
}

export default function StudentDashboard() {
  useDocumentTitle('Dashboard');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const overviewQuery = useQuery({ queryKey: qk.analyticsOverview, queryFn: () => analyticsService.overview() });
  const todayQuery = useQuery({ queryKey: qk.plannerToday, queryFn: () => plannerService.today() });
  const subjectsQuery = useQuery({ queryKey: qk.mySubjects({}), queryFn: () => studentService.mySubjects({}) });
  const testsQuery = useQuery({ queryKey: qk.testStats, queryFn: () => testsService.stats() });

  const completeTask = useMutation({
    mutationFn: (task) =>
      plannerService.updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' }),
    onSuccess: () => {
      notifySuccess('Task updated');
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (error) => toastError(error, 'Could not update the task.'),
  });

  const overview = overviewQuery.data;
  const today = todayQuery.data;
  const subjects = subjectsQuery.data || [];
  const testStats = testsQuery.data;

  const masteryData = useMemo(
    () =>
      (overview?.masteryDistribution || [])
        .filter((band) => band.count > 0)
        .map((band) => ({ name: band.label, value: band.count })),
    [overview]
  );

  const topSubjects = useMemo(
    () => [...subjects].sort((a, b) => (b.stats?.completionPercent || 0) - (a.stats?.completionPercent || 0)).slice(0, 4),
    [subjects]
  );

  const pendingToday = (today?.tasks || []).filter((task) => task.status !== 'completed');
  const showFirstRun = subjectsQuery.isSuccess && subjects.length === 0;

  return (
    <div className="flex flex-col gap-6 2xl:flex-row">
      <div className="min-w-0 flex-1 space-y-6">
        <PageHeader
          eyebrow={formatNumber(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
          title={`${greeting()}, ${String(user?.name || 'student').split(' ')[0]}`}
          description="Here is where your learning stands today — pick up a task, clear a weak topic or take a quick test."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => navigate('/app/notes/generate')}>
                <Sparkles className="size-4" /> Generate notes
              </Button>
              <Button size="sm" onClick={() => navigate('/app/tests')}>
                <PlayCircle className="size-4" /> Take a test
              </Button>
            </>
          }
        />

        {showFirstRun ? (
          <Card className="border-lavender bg-lavender-soft">
            <CardContent className="flex flex-wrap items-center gap-4 p-5">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-brand">
                <BookOpen className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold text-ink">Let's set up your semester</p>
                <p className="mt-0.5 text-[13px] text-ink-soft">
                  Add the subjects you are studying so notes, tests and analytics become personalised.
                </p>
              </div>
              <Button size="sm" onClick={() => navigate('/app/semester')}>
                Add subjects <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* ---------------------------------------------------------- KPIs */}
        <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {overviewQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px]" />)
          ) : (
            <>
              <StatCard
                label="Overall mastery"
                value={formatPercent(overview?.overallMastery ?? 0)}
                hint={`${overview?.masteryDistribution?.reduce((s, b) => s + b.count, 0) || 0} topics measured`}
                icon={Target}
                tone="lavender"
              />
              <StatCard
                label="Tests attempted"
                value={formatNumber(testStats?.attempts ?? overview?.stats?.attempts ?? 0)}
                hint={`Average ${formatPercent(testStats?.averagePercentage ?? 0)}`}
                icon={Trophy}
                tone="sky"
              />
              <StatCard
                label="Weak topics"
                value={formatNumber(overview?.weakTopics?.length ?? 0)}
                hint={overview?.weakTopics?.length ? 'Needs revision' : 'Nothing flagged'}
                icon={TrendingDown}
                tone={overview?.weakTopics?.length ? 'peach' : 'mint'}
              />
              <StatCard
                label="Study streak"
                value={formatNumber(overview?.streak?.current ?? 0)}
                suffix="days"
                hint={`Longest ${overview?.streak?.longest ?? 0} days`}
                icon={Flame}
                tone="butter"
              />
            </>
          )}
        </section>

        {/* ------------------------------------------------- today's plan */}
        <section className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Today's study plan</CardTitle>
                <p className="mt-0.5 text-[12.5px] text-ink-muted">
                  {today?.summary
                    ? `${today.summary.completed} of ${today.summary.total} done · ${formatMinutes(today.summary.minutes)} planned`
                    : 'Your planner will fill this in.'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/planner')}>
                Open planner <ArrowRight className="size-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {todayQuery.isLoading ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-16" />
                  ))}
                </div>
              ) : todayQuery.isError ? (
                <ErrorState error={todayQuery.error} onRetry={todayQuery.refetch} />
              ) : pendingToday.length === 0 && !today?.tasks?.length ? (
                <EmptyState
                  compact
                  preset="empty"
                  title="No tasks scheduled today"
                  description="Generate a study plan and we will spread your topics across the coming days."
                  action={
                    <Button size="sm" onClick={() => navigate('/app/planner')}>
                      Generate study plan
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-2.5">
                  {(today?.tasks || []).slice(0, 5).map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      busy={completeTask.isPending && completeTask.variables?.id === task.id}
                      onToggle={(value) => completeTask.mutate(value)}
                    />
                  ))}
                </ul>
              )}

              {today?.summary?.overdueCount ? (
                <p className="mt-3 rounded-lg bg-butter-soft px-3 py-2 text-[12.5px] text-butter-ink">
                  {today.summary.overdueCount} task(s) are overdue — reschedule them from the planner.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <ChartCard
            className="lg:col-span-2"
            title="Mastery spread"
            description="How your measured topics are distributed across bands."
            isEmpty={!masteryData.length}
            emptyMessage="Take a test on any topic to start measuring mastery."
            height={230}
          >
            <DonutChart data={masteryData} />
          </ChartCard>
        </section>

        {/* ------------------------------------------------ weak topics */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
                <TrendingDown className="size-4 text-ink-muted" /> Needs your attention
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                The lowest-mastery topics from your latest assessment data.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/analytics')}>
              Full analytics <ArrowRight className="size-3.5" />
            </Button>
          </div>

          {overviewQuery.isLoading ? (
            <SkeletonCards count={3} heights={[196, 196, 196]} />
          ) : overviewQuery.isError ? (
            <ErrorState error={overviewQuery.error} onRetry={overviewQuery.refetch} />
          ) : overview?.weakTopics?.length ? (
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {overview.weakTopics.slice(0, 6).map((topic) => (
                <PosterCard
                  key={topic.topicId}
                  title={topic.title}
                  subtitle={humaniseKey(topic.masteryLevel)}
                  icon={Layers}
                  accent={BAND_TONE[topic.masteryLevel] === 'danger' ? 'blush' : 'peach'}
                  bannerHeight="h-16"
                  badges={[
                    <Badge key="band" variant={masteryVariant(topic.masteryLevel)} size="sm">
                      {humaniseKey(topic.masteryLevel)}
                    </Badge>,
                  ]}
                  meta={[
                    { icon: Target, label: `${formatPercent(topic.accuracy)} accuracy` },
                    {
                      icon: topic.trend === 'declining' ? TrendingDown : TrendingUp,
                      label: humaniseKey(topic.trend || 'stable'),
                    },
                  ]}
                  footer={
                    <>
                      <Button
                        size="sm"
                        variant="subtle"
                        className="flex-1"
                        onClick={() => navigate(`/app/videos?topicId=${topic.topicId}`)}
                      >
                        Find lessons
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/app/notes/generate?topicId=${topic.topicId}`)}
                      >
                        Notes
                      </Button>
                    </>
                  }
                >
                  <div className="mt-2.5">
                    <Progress value={topic.masteryScore} tone={BAND_TONE[topic.masteryLevel] || 'brand'} />
                    <p className="mt-1 text-[11.5px] text-ink-muted">{topic.masteryScore}% mastery</p>
                  </div>
                </PosterCard>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              preset="empty"
              title="No weak topics detected"
              description="Once you have attempted a few tests we will flag anything that needs revision."
            />
          )}
        </section>

        {/* ------------------------------------------------ subjects */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
                <BookOpen className="size-4 text-ink-muted" /> Your subjects
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-muted">Syllabus coverage across your current enrolments.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/subjects')}>
              View syllabus <ArrowRight className="size-3.5" />
            </Button>
          </div>

          {subjectsQuery.isLoading ? (
            <SkeletonCards count={3} heights={[150, 150, 150]} />
          ) : subjectsQuery.isError ? (
            <ErrorState error={subjectsQuery.error} onRetry={subjectsQuery.refetch} />
          ) : subjects.length === 0 ? (
            <EmptyState
              compact
              preset="empty"
              title="No subjects yet"
              description="Enrol in your semester subjects to unlock notes, tests and analytics."
              action={
                <Button size="sm" onClick={() => navigate('/app/semester')}>
                  Add subjects
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {topSubjects.map((entry) => (
                <Card key={entry.subject?.id} interactive onClick={() => navigate(`/app/subjects/${entry.subject?.id}`)} className="cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-ink">{entry.subject?.name}</p>
                        <p className="text-[12px] text-ink-muted">
                          {entry.subject?.code || 'No code'} · Semester {entry.subject?.semesterNumber ?? '—'}
                        </p>
                      </div>
                      <Badge variant="sky" size="sm">
                        {entry.stats?.topicCount || 0} topics
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[12px] text-ink-muted">
                        <span>Syllabus coverage</span>
                        <span className="font-medium text-ink-soft">{entry.stats?.completionPercent || 0}%</span>
                      </div>
                      <Progress value={entry.stats?.completionPercent || 0} tone="mint" />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-muted">
                      <CheckCircle2 className="size-3.5" />
                      {entry.stats?.completedTopics || 0} of {entry.stats?.topicCount || 0} topics covered
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ------------------------------------------------------ right panel */}
      <SidePanel title="This week" description="Keep the momentum going and stay on top of your targets.">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-canvas-deep px-3 py-2.5">
            <span className="text-[12.5px] text-ink-muted">Notes generated</span>
            <span className="text-[13.5px] font-semibold text-ink">
              {formatNumber(overview?.streak?.notesGenerated ?? 0)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-canvas-deep px-3 py-2.5">
            <span className="text-[12.5px] text-ink-muted">Code submissions</span>
            <span className="text-[13.5px] font-semibold text-ink">
              {formatNumber(overview?.streak?.codeSubmissions ?? 0)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-canvas-deep px-3 py-2.5">
            <span className="text-[12.5px] text-ink-muted">Target grade</span>
            <span className="text-[13.5px] font-semibold text-ink">
              {overview?.targets?.targetGrade || 'Not set'}
            </span>
          </div>
        </div>

        {overview?.recommendations?.length ? (
          <div className="mt-4 space-y-2">
            <p className="text-[12.5px] font-semibold text-ink">Recommended next steps</p>
            {overview.recommendations.slice(0, 4).map((item, index) => (
              <div key={`${item.action}-${index}`} className="rounded-xl border border-line bg-surface p-3">
                <p className="text-[13px] font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{item.detail}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1.5 h-7 px-0 text-[12px] text-brand"
                  onClick={() =>
                    item.action === 'revise'
                      ? navigate(`/app/videos?topicId=${item.topicId}`)
                      : item.action === 'practice_test'
                        ? navigate('/app/tests')
                        : navigate('/app/planner')
                  }
                >
                  {item.action === 'revise'
                    ? 'Revise now'
                    : item.action === 'practice_test'
                      ? 'Take a practice test'
                      : 'Generate a plan'}
                  <ArrowRight className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button variant="outline" size="sm" onClick={() => navigate('/app/compiler')}>
            <TerminalSquare className="size-4" /> Compiler
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/notes')}>
            <NotebookText className="size-4" /> Notes
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/analytics')}>
            <BarChart3 className="size-4" /> Analytics
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/predictions')}>
            <Trophy className="size-4" /> Grades
          </Button>
        </div>
      </SidePanel>
    </div>
  );
}

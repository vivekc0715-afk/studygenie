import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { plannerService } from '../../services/planner.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { StatCard } from '../../components/common/stat-card';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { cn, formatMinutes, formatNumber, humaniseKey, titleCase } from '../../lib/utils';

const PRIORITY_TONE = { 9: 'blush', 8: 'blush', 7: 'peach', 6: 'peach', 5: 'butter' };

function getWeekDates() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Timetable() {
  useDocumentTitle('Study Planner');
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(() => new Date().toDateString());

  const weekDates = useMemo(getWeekDates, []);

  const statsQuery = useQuery({ queryKey: qk.plannerStats, queryFn: () => plannerService.stats() });
  const planQuery = useQuery({
    queryKey: qk.planner({}),
    queryFn: () => plannerService.current({}),
  });
  const todayQuery = useQuery({ queryKey: qk.plannerToday, queryFn: () => plannerService.today() });

  const generateMutation = useMutation({
    mutationFn: () => plannerService.generate(),
    onSuccess: () => {
      notifySuccess('Study plan generated!');
      queryClient.invalidateQueries({ queryKey: ['planner'] });
    },
    onError: (e) => toastError(e, 'Could not generate plan.'),
  });

  const toggleTask = useMutation({
    mutationFn: (task) =>
      plannerService.updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' }),
    onSuccess: () => {
      notifySuccess('Task updated');
      queryClient.invalidateQueries({ queryKey: ['planner'] });
    },
    onError: (e) => toastError(e, 'Could not update task.'),
  });

  const stats = statsQuery.data;
  const allTasks = planQuery.data?.tasks || [];
  const today = todayQuery.data;

  // Group tasks by date string
  const tasksByDay = useMemo(() => {
    const map = {};
    allTasks.forEach((t) => {
      const d = t.date ? new Date(t.date).toDateString() : null;
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(t);
      }
    });
    return map;
  }, [allTasks]);

  const selectedTasks = tasksByDay[selectedDay] || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Planner"
        description="Your personalised AI-generated weekly study schedule. Mark tasks complete as you go."
        actions={
          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <Sparkles className="size-4" />
            {generateMutation.isPending ? 'Generating…' : 'Generate plan'}
          </Button>
        }
      />

      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-3">
        {statsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
        ) : (
          <>
            <StatCard label="Tasks today" value={formatNumber(today?.summary?.total ?? 0)} hint={`${today?.summary?.completed ?? 0} done`} icon={CheckCircle2} tone="mint" />
            <StatCard label="Study minutes planned" value={formatMinutes(stats?.totalMinutes ?? 0)} icon={Clock3} tone="sky" />
            <StatCard label="Completion rate" value={`${stats?.completionRate ?? 0}%`} icon={CalendarDays} tone="lavender" />
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Week strip */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle>This week</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {weekDates.map((date, idx) => {
                const ds = date.toDateString();
                const tasks = tasksByDay[ds] || [];
                const done = tasks.filter((t) => t.status === 'completed').length;
                const isToday = ds === new Date().toDateString();
                const isSelected = ds === selectedDay;
                return (
                  <button
                    key={ds}
                    onClick={() => setSelectedDay(ds)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      isSelected ? 'bg-brand text-white' : isToday ? 'bg-lavender-soft border border-lavender' : 'hover:bg-canvas-deep'
                    )}
                  >
                    <div className="w-8 text-center">
                      <p className={cn('text-[11px] font-semibold uppercase', isSelected ? 'text-white/70' : 'text-ink-faint')}>{DAY_LABELS[idx]}</p>
                      <p className={cn('text-[15px] font-bold', isSelected ? 'text-white' : 'text-ink')}>{date.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[12.5px]', isSelected ? 'text-white/80' : 'text-ink-muted')}>
                        {tasks.length === 0 ? 'No tasks' : `${done}/${tasks.length} done`}
                      </p>
                    </div>
                    {tasks.length > 0 && (
                      <div className={cn('size-2 rounded-full shrink-0', done === tasks.length ? 'bg-mint-ink' : 'bg-peach-ink')} />
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Tasks for selected day */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>
                {new Date(selectedDay).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </CardTitle>
              {selectedTasks.length > 0 && (
                <span className="text-[12.5px] text-ink-muted">
                  {selectedTasks.filter((t) => t.status === 'completed').length} of {selectedTasks.length} done
                </span>
              )}
            </CardHeader>
            <CardContent>
              {planQuery.isLoading ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : planQuery.isError ? (
                <ErrorState error={planQuery.error} onRetry={planQuery.refetch} />
              ) : selectedTasks.length === 0 ? (
                <EmptyState
                  preset="empty"
                  compact
                  title="No tasks for this day"
                  description={allTasks.length === 0 ? 'Generate a study plan to see tasks here.' : 'Free day! Take a break or review your notes.'}
                  action={allTasks.length === 0 ? (
                    <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                      <Sparkles className="size-4" /> Generate plan
                    </Button>
                  ) : undefined}
                />
              ) : (
                <ul className="space-y-2.5">
                  {selectedTasks.map((task) => {
                    const done = task.status === 'completed';
                    return (
                      <li key={task.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-line-strong">
                        <button
                          type="button"
                          onClick={() => toggleTask.mutate(task)}
                          className="mt-0.5 shrink-0 text-ink-faint hover:text-brand transition-colors"
                        >
                          {done ? <CheckCircle2 className="size-5 text-mint-ink" /> : <Circle className="size-5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-[13.5px] font-medium text-ink', done && 'line-through opacity-60')}>
                            {task.title || titleCase(task.activity || 'Study')}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-muted">
                            {task.subject?.name && <span className="flex items-center gap-1"><BookOpen className="size-3.5" />{task.subject.name}</span>}
                            {task.estimatedMinutes && <span className="flex items-center gap-1"><Clock3 className="size-3.5" />{formatMinutes(task.estimatedMinutes)}</span>}
                            {task.priority >= 5 && (
                              <Badge variant={PRIORITY_TONE[task.priority] || 'neutral'} size="sm">
                                {task.priority >= 7 ? 'High' : 'Medium'} priority
                              </Badge>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

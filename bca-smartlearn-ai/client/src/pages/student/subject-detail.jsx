import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers,
  PlayCircle,
  Sparkles,
  Target,
} from 'lucide-react';
import { academicService } from '../../services/academic.service';
import { studentService } from '../../services/student.service';
import { qk } from '../../lib/queryClient';
import { notifySuccess, toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge, difficultyVariant } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { Checkbox } from '../../components/ui/checkbox';
import { cn, formatMinutes, formatNumber, formatPercent, humaniseKey } from '../../lib/utils';

const idOf = (value) => value?.id || value?._id || '';

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useDocumentTitle('Subject Detail');

  const subjectQuery = useQuery({
    queryKey: qk.academicSubject(subjectId),
    queryFn: () => academicService.subject(subjectId),
    enabled: Boolean(subjectId),
  });

  // We need mySubjects to know which topics are already completed.
  const mySubjectsQuery = useQuery({
    queryKey: qk.mySubjects({}),
    queryFn: () => studentService.mySubjects({}),
  });

  const setCompletion = useMutation({
    mutationFn: ({ topicId, completed }) =>
      studentService.setTopicCompletion(topicId, { completed }),
    onSuccess: (_, variables) => {
      notifySuccess(variables.completed ? 'Topic marked as covered' : 'Topic marked as pending');
      queryClient.invalidateQueries({ queryKey: qk.mySubjects({}) });
      queryClient.invalidateQueries({ queryKey: qk.analyticsOverview });
    },
    onError: (error) => toastError(error, 'We could not update that topic.'),
  });

  const data = subjectQuery.data;
  const subject = data?.subject;
  const tree = data?.tree || [];
  const stats = data?.stats || {};

  // Build a map of topicId -> isCompleted from the student's enrolment data.
  const completionMap = useMemo(() => {
    const map = new Map();
    const enrolled = mySubjectsQuery.data || [];
    const match = enrolled.find((entry) => idOf(entry.subject) === subjectId);
    if (!match) return map;
    (match.units || []).forEach((unit) => {
      (unit.topics || []).forEach((topic) => {
        map.set(idOf(topic), Boolean(topic.progress?.isCompleted));
      });
    });
    return map;
  }, [mySubjectsQuery.data, subjectId]);

  const allTopics = useMemo(() => tree.flatMap((group) => group.topics || []), [tree]);
  const completedCount = allTopics.filter((topic) => completionMap.get(idOf(topic))).length;
  const totalCount = allTopics.length;
  const completionPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleTopic = (topic) => {
    const topicId = idOf(topic);
    const completed = !completionMap.get(topicId);
    setCompletion.mutate({ topicId, completed });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title={subject?.name || 'Subject'}
        description={
          subject
            ? `${subject.code || 'No code'} · ${formatNumber(subject.credits ?? 0)} credits · ${humaniseKey(subject.type || 'theory')}`
            : 'Loading subject…'
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate('/app/subjects')}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/app/notes/generate?subjectId=${subjectId}`)}
              disabled={!subject}
            >
              <Sparkles className="size-4" /> Generate notes
            </Button>
            <Button size="sm" onClick={() => navigate(`/app/tests?subjectId=${subjectId}`)} disabled={!subject}>
              <PlayCircle className="size-4" /> Take a test
            </Button>
          </>
        }
      />

      {subjectQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : subjectQuery.isError ? (
        <ErrorState error={subjectQuery.error} onRetry={subjectQuery.refetch} />
      ) : !subject ? (
        <EmptyState title="Subject not found" description="This subject may have been removed." />
      ) : (
        <>
          {/* Subject summary + progress */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink-muted">
                  Semester {subject.semesterNumber ?? '—'}
                  {subject.examDate ? ` · Exam ${new Date(subject.examDate).toLocaleDateString()}` : ''}
                </p>
                {subject.description ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{subject.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="sky" size="sm">
                    <Layers className="size-3" /> {stats.unitCount || 0} units
                  </Badge>
                  <Badge variant="lavender" size="sm">
                    <BookOpen className="size-3" /> {totalCount} topics
                  </Badge>
                  {stats.recommendedStudyHours ? (
                    <Badge variant="butter" size="sm">
                      <Clock3 className="size-3" /> {formatNumber(stats.recommendedStudyHours)}h recommended
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="w-full sm:w-64">
                <div className="mb-1.5 flex items-center justify-between text-[12px] text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Target className="size-3.5" /> Syllabus coverage
                  </span>
                  <span className="font-medium text-ink">
                    {completedCount}/{totalCount} · {formatPercent(completionPercent)}
                  </span>
                </div>
                <Progress
                  value={completionPercent}
                  tone={completionPercent >= 75 ? 'mint' : completionPercent >= 40 ? 'butter' : 'peach'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Units & topics */}
          {tree.length === 0 ? (
            <EmptyState
              compact
              preset="empty"
              title="No units in this subject"
              description="This subject does not have any units or topics yet."
            />
          ) : (
            <Accordion type="multiple" defaultValue={tree.map((group) => idOf(group.unit))}>
              {tree.map((group) => {
                const unit = group.unit;
                const topics = group.topics || [];
                const unitCompleted = topics.filter((topic) => completionMap.get(idOf(topic))).length;
                const unitPercent = topics.length ? Math.round((unitCompleted / topics.length) * 100) : 0;
                return (
                  <AccordionItem key={idOf(unit)} value={idOf(unit)} className="mb-3">
                    <AccordionTrigger>
                      <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-canvas-deep text-[12px] font-semibold text-ink-soft">
                          {unit.number}
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-[14px] font-semibold text-ink">{unit.title}</p>
                          <p className="text-[12px] text-ink-muted">
                            {topics.length} topic{topics.length === 1 ? '' : 's'} · {unitCompleted} covered
                          </p>
                        </div>
                      </div>
                      <div className="hidden w-40 shrink-0 sm:block">
                        <Progress value={unitPercent} tone="mint" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {unit.description ? (
                        <p className="mb-3 text-[12.5px] leading-relaxed text-ink-muted">{unit.description}</p>
                      ) : null}
                      {topics.length === 0 ? (
                        <p className="text-[12.5px] text-ink-faint">No topics in this unit.</p>
                      ) : (
                        <ul className="space-y-2">
                          {topics.map((topic) => {
                            const topicId = idOf(topic);
                            const completed = completionMap.get(topicId);
                            const busy = setCompletion.isPending && setCompletion.variables?.topicId === topicId;
                            return (
                              <li
                                key={topicId}
                                className={cn(
                                  'flex items-start gap-3 rounded-xl border border-line bg-surface p-3 transition-colors',
                                  completed && 'border-mint/60 bg-mint-soft/40'
                                )}
                              >
                                <Checkbox
                                  checked={completed}
                                  onCheckedChange={() => toggleTopic(topic)}
                                  disabled={busy}
                                  className="mt-0.5"
                                  aria-label={completed ? 'Mark topic as pending' : 'Mark topic as covered'}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p
                                      className={cn(
                                        'text-[13.5px] font-medium text-ink',
                                        completed && 'text-ink-soft line-through'
                                      )}
                                    >
                                      {topic.title}
                                    </p>
                                    <Badge variant={difficultyVariant(topic.difficulty)} size="sm">
                                      {humaniseKey(topic.difficulty || 'medium')}
                                    </Badge>
                                    {topic.recommendedMinutes ? (
                                      <Badge variant="neutral" size="sm">
                                        <Clock3 className="size-3" /> {formatMinutes(topic.recommendedMinutes)}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  {topic.description ? (
                                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                                      {topic.description}
                                    </p>
                                  ) : null}
                                </div>
                                {completed ? (
                                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mint-ink" />
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </>
      )}
    </div>
  );
}

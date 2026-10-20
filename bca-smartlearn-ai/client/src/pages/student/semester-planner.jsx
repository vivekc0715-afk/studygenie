import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { academicService } from '../../services/academic.service';
import { studentService } from '../../services/student.service';
import { qk } from '../../lib/queryClient';
import { notifySuccess, toastError } from '../../lib/notify';
import { useAuthStore } from '../../stores/authStore';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Skeleton, SkeletonCards } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { SearchInput } from '../../components/common/search-input';
import { cn, formatNumber, formatPercent, humaniseKey } from '../../lib/utils';

const idOf = (value) => value?.id || value?._id || '';

export default function SemesterPlanner() {
  useDocumentTitle('Semester Planner');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');

  const profileQuery = useQuery({
    queryKey: qk.profile,
    queryFn: () => studentService.getProfile(),
  });

  const mySubjectsQuery = useQuery({
    queryKey: qk.mySubjects({}),
    queryFn: () => studentService.mySubjects({}),
  });

  const semesterNumber = profileQuery.data?.profile?.currentSemesterNumber;

  const catalogueQuery = useQuery({
    queryKey: qk.academicSubjects({ semesterNumber: semesterNumber ?? '', search: search || '' }),
    queryFn: () =>
      academicService.subjects({
        semesterNumber,
        search: search || undefined,
        limit: 50,
      }),
    enabled: Boolean(semesterNumber),
  });

  const addEnrollment = useMutation({
    mutationFn: (subjectId) => studentService.addEnrollments({ subjectIds: [subjectId] }),
    onSuccess: () => {
      notifySuccess('Subject added', 'You are now enrolled in this subject.');
      queryClient.invalidateQueries({ queryKey: qk.mySubjects({}) });
      queryClient.invalidateQueries({ queryKey: qk.profile });
    },
    onError: (error) => toastError(error, 'We could not add that subject.'),
  });

  const removeEnrollment = useMutation({
    mutationFn: (enrollmentId) => studentService.removeEnrollment(enrollmentId),
    onSuccess: () => {
      notifySuccess('Subject removed', 'The enrolment has been dropped.');
      queryClient.invalidateQueries({ queryKey: qk.mySubjects({}) });
      queryClient.invalidateQueries({ queryKey: qk.profile });
    },
    onError: (error) => toastError(error, 'We could not remove that enrolment.'),
  });

  const enrolled = mySubjectsQuery.data || [];
  const enrolledSubjectIds = useMemo(
    () => new Set(enrolled.map((entry) => idOf(entry.subject))),
    [enrolled]
  );

  const catalogue = catalogueQuery.data?.data || [];
  const available = catalogue.filter((subject) => !enrolledSubjectIds.has(idOf(subject)));

  const totalTopics = enrolled.reduce((sum, entry) => sum + (entry.stats?.topicCount || 0), 0);
  const completedTopics = enrolled.reduce((sum, entry) => sum + (entry.stats?.completedTopics || 0), 0);
  const overallPercent = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarRange}
        title="Semester Planner"
        description="Enrol in your semester subjects and manage them."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/app/profile')}>
            Edit semester <ArrowRight className="size-3.5" />
          </Button>
        }
      />

      {/* Semester summary */}
      <Card className="border-lavender bg-lavender-soft">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-brand">
            <CalendarRange className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold text-ink">
              {profileQuery.isLoading
                ? 'Loading semester…'
                : profileQuery.data?.profile
                  ? `Semester ${profileQuery.data.profile.currentSemesterNumber ?? '—'}`
                  : 'No semester set'}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-soft">
              {profileQuery.data?.profile?.academicYear
                ? `Academic year ${profileQuery.data.profile.academicYear}`
                : 'Set your semester from your profile.'}
              {' · '}
              {enrolled.length} enrolled
            </p>
          </div>
          <div className="w-full sm:w-56">
            <div className="mb-1 flex items-center justify-between text-[12px] text-ink-soft">
              <span>Syllabus coverage</span>
              <span className="font-medium text-ink">{formatPercent(overallPercent)}</span>
            </div>
            <Progress value={overallPercent} tone="mint" />
          </div>
        </CardContent>
      </Card>

      {/* My enrolled subjects */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
              <BookOpen className="size-4 text-ink-muted" /> My enrolled subjects
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              {enrolled.length
                ? `${enrolled.length} subject${enrolled.length === 1 ? '' : 's'} · ${completedTopics} of ${totalTopics} topics covered`
                : 'Enrol in subjects below to start tracking your syllabus.'}
            </p>
          </div>
        </div>

        {mySubjectsQuery.isLoading ? (
          <SkeletonCards count={3} heights={[150, 150, 150]} />
        ) : mySubjectsQuery.isError ? (
          <ErrorState error={mySubjectsQuery.error} onRetry={mySubjectsQuery.refetch} />
        ) : enrolled.length === 0 ? (
          <EmptyState
            compact
            preset="empty"
            title="No enrolled subjects"
            description="Browse the catalogue below and add the subjects you are studying this semester."
          />
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {enrolled.map((entry) => {
              const subject = entry.subject;
              const stats = entry.stats || {};
              const completion = stats.completionPercent || 0;
              return (
                <Card key={idOf(subject)} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-ink">{subject.name}</p>
                        <p className="text-[12px] text-ink-muted">
                          {subject.code || 'No code'} · {subject.credits ?? 0} credits · {humaniseKey(subject.type || 'theory')}
                        </p>
                      </div>
                      <Badge variant="sky" size="sm">
                        {stats.topicCount || 0} topics
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[12px] text-ink-muted">
                        <span>Coverage</span>
                        <span className="font-medium text-ink-soft">{formatPercent(completion)}</span>
                      </div>
                      <Progress value={completion} tone="mint" />
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-muted">
                      <CheckCircle2 className="size-3.5" />
                      {stats.completedTopics || 0} of {stats.topicCount || 0} topics covered
                    </div>

                    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-line">
                      <Button
                        size="sm"
                        variant="subtle"
                        className="flex-1"
                        onClick={() => navigate(`/app/subjects/${idOf(subject)}`)}
                      >
                        Open syllabus
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger-soft hover:text-danger"
                        onClick={() => removeEnrollment.mutate(idOf(entry.enrollment))}
                        disabled={removeEnrollment.isPending}
                        aria-label={`Remove ${subject.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Browse subjects */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
              <Search className="size-4 text-ink-muted" /> Browse subjects
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              {semesterNumber
                ? `Catalogue for semester ${semesterNumber}`
                : 'Set a semester in your profile to browse the catalogue.'}
            </p>
          </div>
          <SearchInput
            className="w-full sm:w-72"
            value={search}
            onChange={setSearch}
            placeholder="Search catalogue…"
            aria-label="Search catalogue subjects"
          />
        </div>

        {!semesterNumber ? (
          <EmptyState
            compact
            preset="empty"
            title="No semester selected"
            description="Set your current semester from your profile to browse available subjects."
            action={
              <Button size="sm" onClick={() => navigate('/app/profile')}>
                Open profile
              </Button>
            }
          />
        ) : catalogueQuery.isLoading ? (
          <SkeletonCards count={4} heights={[96, 96, 96, 96]} />
        ) : catalogueQuery.isError ? (
          <ErrorState error={catalogueQuery.error} onRetry={catalogueQuery.refetch} />
        ) : available.length === 0 ? (
          <EmptyState
            compact
            preset={search ? 'search' : 'empty'}
            title={
              search
                ? `No subjects match “${search}”`
                : catalogue.length
                  ? 'All catalogue subjects are enrolled'
                  : 'No subjects in the catalogue for this semester'
            }
            description={
              search
                ? 'Try a different keyword, or clear the search.'
                : catalogue.length
                  ? 'You have already enrolled in every available subject.'
                  : 'The catalogue does not have subjects for this semester yet.'
            }
          />
        ) : (
          <div className="space-y-2.5">
            {available.map((subject) => {
              const subjectId = idOf(subject);
              const busy = addEnrollment.isPending && addEnrollment.variables === subjectId;
              return (
                <Card
                  key={subjectId}
                  interactive
                  onClick={() => navigate(`/app/subjects/${subjectId}`)}
                  className={cn('cursor-pointer', busy && 'opacity-60')}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas-deep text-ink-soft">
                      <BookOpen className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{subject.name}</p>
                      <p className="text-[12px] text-ink-muted">
                        {subject.code || 'No code'} · {formatNumber(subject.credits ?? 0)} credits ·{' '}
                        {humaniseKey(subject.type || 'theory')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        addEnrollment.mutate(subjectId);
                      }}
                      disabled={busy}
                    >
                      {busy ? 'Adding…' : <><Plus className="size-4" /> Enrol</>}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

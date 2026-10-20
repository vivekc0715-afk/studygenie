import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, BookOpen, Clock3, Layers } from 'lucide-react';
import { studentService } from '../../services/student.service';
import { qk } from '../../lib/queryClient';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { PosterCard } from '../../components/common/poster-card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { SkeletonCards } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { SearchInput } from '../../components/common/search-input';
import { accentFor, formatPercent, humaniseKey } from '../../lib/utils';

const idOf = (value) => value?.id || value?._id || '';

export default function Subjects() {
  useDocumentTitle('Subjects & Syllabus');
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');

  const subjectsQuery = useQuery({
    queryKey: qk.mySubjects({}),
    queryFn: () => studentService.mySubjects({}),
  });

  const subjects = subjectsQuery.data || [];

  const filtered = useMemo(() => {
    return subjects.filter((entry) => {
      const subject = entry.subject || {};
      const semMatches =
        selectedSemester === 'all' || Number(subject.semesterNumber) === Number(selectedSemester);
      if (!semMatches) return false;

      if (!search.trim()) return true;
      const needle = search.trim().toLowerCase();
      return (
        String(subject.name || '').toLowerCase().includes(needle) ||
        String(subject.code || '').toLowerCase().includes(needle)
      );
    });
  }, [subjects, search, selectedSemester]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Subjects & Syllabus (BCA Curriculum)"
        description="Explore all your semester subjects, curriculum units, topics, and exam notes."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/app/semester')}>
              Manage enrolments
            </Button>
            <Button size="sm" onClick={() => navigate('/app/notes/generate')}>
              Generate Notes
            </Button>
          </div>
        }
      />

      {/* Semester Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedSemester('all')}
          className={cn(
            'rounded-xl px-3.5 py-1.5 text-[12.5px] font-medium transition',
            selectedSemester === 'all'
              ? 'bg-brand text-white shadow-sm'
              : 'border border-line bg-surface text-ink-soft hover:bg-canvas-deep hover:text-ink'
          )}
        >
          All Semesters ({subjects.length})
        </button>
        {[1, 2, 3, 4, 5, 6].map((sem) => {
          const count = subjects.filter((s) => Number(s.subject?.semesterNumber) === sem).length;
          return (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={cn(
                'rounded-xl px-3.5 py-1.5 text-[12.5px] font-medium transition',
                selectedSemester === sem
                  ? 'bg-brand text-white shadow-sm'
                  : 'border border-line bg-surface text-ink-soft hover:bg-canvas-deep hover:text-ink'
              )}
            >
              Semester {sem} {count ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <SearchInput
          className="w-full sm:w-80"
          value={search}
          onChange={setSearch}
          placeholder="Search subjects by name or code…"
          aria-label="Search subjects"
        />
        {filtered.length ? (
          <Badge variant="neutral" size="sm">
            {filtered.length} subject{filtered.length === 1 ? '' : 's'}
          </Badge>
        ) : null}
      </div>

      {subjectsQuery.isLoading ? (
        <SkeletonCards count={4} heights={[200, 200, 200, 200]} />
      ) : subjectsQuery.isError ? (
        <ErrorState error={subjectsQuery.error} onRetry={subjectsQuery.refetch} />
      ) : subjects.length === 0 ? (
        <EmptyState
          preset="empty"
          title="No subjects yet"
          description="Enrol in your semester subjects to unlock notes, tests and analytics."
          action={
            <Button size="sm" onClick={() => navigate('/app/semester')}>
              Add subjects
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          preset="search"
          title={`No subjects match “${search}”`}
          description="Try a different keyword, or clear the search."
        />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => {
            const subject = entry.subject || {};
            const stats = entry.stats || {};
            const completion = stats.completionPercent || 0;
            const subjectId = idOf(subject);
            const accent = accentFor(subject.name || subject.code || '');
            return (
              <PosterCard
                key={subjectId}
                title={subject.name}
                subtitle={subject.code || 'No code'}
                description={subject.description || undefined}
                icon={BookOpen}
                accent={accent}
                bannerHeight="h-20"
                badges={[
                  <Badge key="credits" variant="neutral" size="sm">
                    {subject.credits ?? 0} credits
                  </Badge>,
                  <Badge key="type" variant="lavender" size="sm">
                    {humaniseKey(subject.type || 'theory')}
                  </Badge>,
                ]}
                meta={[
                  { icon: Layers, label: `${stats.topicCount || 0} topics` },
                  {
                    icon: Award,
                    label: `${stats.completedTopics || 0} completed`,
                  },
                ]}
                onClick={() => navigate(`/app/subjects/${subjectId}`)}
              >
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[12px] text-ink-muted">
                    <span>Syllabus coverage</span>
                    <span className="font-medium text-ink-soft">{formatPercent(completion)}</span>
                  </div>
                  <Progress value={completion} tone={completion >= 75 ? 'mint' : completion >= 40 ? 'butter' : 'peach'} />
                </div>
              </PosterCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

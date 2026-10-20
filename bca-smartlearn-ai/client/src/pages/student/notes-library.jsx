import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, BookmarkCheck, Calendar, FileText, NotebookText, Plus, Type } from 'lucide-react';
import { notesService } from '../../services/notes.service';
import { qk } from '../../lib/queryClient';
import { notifySuccess, toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { PageHeader } from '../../components/common/page-header';
import { PosterCard } from '../../components/common/poster-card';
import { SearchInput } from '../../components/common/search-input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { SkeletonCards } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { Pagination } from '../../components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { accentFor, formatDateTime, formatNumber, humaniseKey } from '../../lib/utils';

const NOTE_FORMAT_OPTIONS = [
  { value: 'quick_revision', label: 'Quick revision notes' },
  { value: 'detailed_conceptual', label: 'Detailed conceptual notes' },
  { value: 'short_answer', label: 'Short-answer exam prep' },
  { value: 'long_answer', label: 'Long-answer exam prep' },
  { value: 'definitions', label: 'Definitions & terminology' },
  { value: 'important_questions', label: 'Important questions' },
  { value: 'programming_examples', label: 'Worked programming examples' },
  { value: 'comparison_tables', label: 'Comparison tables' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'practice_questions', label: 'Practice questions' },
  { value: 'last_minute', label: 'Last-minute revision sheet' },
  { value: 'viva_questions', label: 'Viva questions & answers' },
];

const FORMAT_LABEL = NOTE_FORMAT_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

function formatBadgeVariant(format) {
  const map = {
    quick_revision: 'sky',
    detailed_conceptual: 'lavender',
    short_answer: 'mint',
    long_answer: 'peach',
    definitions: 'butter',
    important_questions: 'blush',
    programming_examples: 'sky',
    comparison_tables: 'lavender',
    flashcards: 'mint',
    practice_questions: 'peach',
    last_minute: 'butter',
    viva_questions: 'blush',
  };
  return map[format] || 'neutral';
}

function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notesService.toggleBookmark(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      const bookmarked = Boolean(data?.bookmarked ?? data?.isBookmarked);
      notifySuccess(bookmarked ? 'Added to bookmarks' : 'Removed from bookmarks');
    },
    onError: (error) => toastError(error, 'Could not update bookmark.'),
  });
}

function NoteCard({ note, onOpen }) {
  const bookmark = useToggleBookmark();
  const id = note.id || note._id;
  const subjectName = note.subject?.name || note.subjectName || note.subject?.title || '—';
  const createdAt = note.createdAt || note.created_at;
  const wordCount = note.wordCount ?? note.word_count ?? 0;
  const bookmarked = Boolean(note.bookmarked ?? note.isBookmarked);

  return (
    <PosterCard
      title={note.title || 'Untitled note'}
      subtitle={subjectName}
      description={note.summary || note.description}
      icon={FileText}
      accent={accentFor(note.title || id)}
      bannerHeight="h-20"
      onClick={() => onOpen(id)}
      badges={[
        <Badge key="format" variant={formatBadgeVariant(note.format)} size="sm">
          {FORMAT_LABEL[note.format] || humaniseKey(note.format)}
        </Badge>,
      ]}
      meta={[
        { icon: Calendar, label: formatDateTime(createdAt) },
        wordCount ? { icon: Type, label: `${formatNumber(wordCount)} words` } : null,
      ].filter(Boolean)}
      footer={
        <Button
          variant={bookmarked ? 'subtle' : 'outline'}
          size="sm"
          className="ml-auto"
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          disabled={bookmark.isPending && bookmark.variables === id}
          onClick={(event) => {
            event.stopPropagation();
            bookmark.mutate(id);
          }}
        >
          {bookmark.isPending && bookmark.variables === id ? (
            <Bookmark className="size-4 animate-pulse" />
          ) : bookmarked ? (
            <BookmarkCheck className="size-4" />
          ) : (
            <Bookmark className="size-4" />
          )}
          {bookmarked ? 'Saved' : 'Bookmark'}
        </Button>
      }
    />
  );
}

export default function NotesLibraryPage() {
  useDocumentTitle('Saved Notes & GeeksforGeeks Library');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' | 'gfg'
  const { params, setParams } = useListParams({ defaults: { limit: 12, format: '' } });

  const listQuery = useQuery({
    queryKey: qk.notes({ page: params.page, limit: params.limit, search: params.search, format: params.format }),
    queryFn: () =>
      notesService.list({
        page: params.page,
        limit: params.limit,
        search: params.search,
        format: params.format,
      }),
    enabled: activeTab === 'saved',
  });

  const gfgQuery = useQuery({
    queryKey: ['notes', 'gfg', params.search],
    queryFn: () => notesService.listGfg({ search: params.search }),
    enabled: activeTab === 'gfg',
  });

  const importGfgMutation = useMutation({
    mutationFn: (payload) => notesService.importGfg(payload),
    onSuccess: (data) => {
      const id = data?.id || data?._id;
      notifySuccess('Saved to your library', 'Opening your notes now.');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (id) navigate(`/app/notes/${id}`);
    },
    onError: (error) => toastError(error, 'Could not import note.'),
  });

  const notes = useMemo(() => listQuery.data?.data || [], [listQuery.data]);
  const gfgNotes = gfgQuery.data || [];
  const meta = listQuery.data?.meta;
  const hasFilters = Boolean(params.search || params.format);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Study material"
        icon={NotebookText}
        title="Notes & GeeksforGeeks Library"
        description="Your saved notes, AI drafts, and curated GeeksforGeeks reference guides."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => navigate('/app/notes/generate')}>
              <Plus className="size-4" /> Generate or Fetch Notes
            </Button>
          </div>
        }
      />

      {/* Tab Switcher */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setActiveTab('saved')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition',
            activeTab === 'saved'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <FileText className="size-4" />
          <span>My Saved Notes ({meta?.total ?? notes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gfg')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition',
            activeTab === 'gfg'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[11px] font-bold text-brand">GFG</span>
          <span>GeeksforGeeks Syllabus Notes ({gfgNotes.length})</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={params.search}
          onChange={(value) => setParams({ search: value })}
          placeholder="Search your notes…"
          className="sm:max-w-sm"
          aria-label="Search notes"
        />
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-ink-muted">Format</span>
          <Select value={params.format || 'all'} onValueChange={(value) => setParams({ format: value === 'all' ? '' : value })}>
            <SelectTrigger className="h-9 w-[13rem] text-[12.5px]" aria-label="Filter by format">
              <SelectValue placeholder="All formats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              {NOTE_FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeTab === 'gfg' ? (
        gfgQuery.isLoading ? (
          <SkeletonCards count={6} heights={[210, 240, 200, 230, 210, 250]} />
        ) : gfgNotes.length === 0 ? (
          <EmptyState
            preset="search"
            title="No GeeksforGeeks notes match your search"
            description="Try a different topic like Array, Stack, Normalization, OSI, or Python."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {gfgNotes.map((gfg) => (
              <div
                key={gfg.id}
                className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand/40 hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="brand" size="xs">
                      {gfg.subjectCode} · {gfg.difficulty}
                    </Badge>
                    <span className="text-[11.5px] font-medium text-ink-muted">{gfg.readingTime}</span>
                  </div>

                  <div>
                    <h3 className="text-[15px] font-semibold text-ink line-clamp-2">{gfg.topicTitle}</h3>
                    <p className="text-[12px] font-medium text-brand mt-0.5">{gfg.subjectName}</p>
                    <p className="text-[12.5px] text-ink-muted line-clamp-3 mt-2 leading-relaxed">
                      {gfg.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(gfg.tags || []).slice(0, 3).map((tag, i) => (
                      <span key={i} className="rounded-md bg-canvas-deep px-2 py-0.5 text-[11px] text-ink-soft">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-line/60 pt-4">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={importGfgMutation.isPending}
                    onClick={() =>
                      importGfgMutation.mutate({
                        topicTitle: gfg.topicTitle,
                        subjectName: gfg.subjectName,
                        subjectCode: gfg.subjectCode,
                      })
                    }
                  >
                    Import & Read
                  </Button>
                  <a
                    href={gfg.gfgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-line p-2 text-ink-muted hover:border-brand hover:text-brand transition"
                    title="Read on GeeksforGeeks"
                  >
                    <span className="sr-only">Open GeeksforGeeks</span>
                    ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )
      ) : listQuery.isLoading ? (
        <SkeletonCards count={6} heights={[210, 240, 200, 230, 210, 250]} />
      ) : listQuery.isError ? (
        <ErrorState error={listQuery.error} onRetry={listQuery.refetch} />
      ) : notes.length === 0 ? (
        <EmptyState
          preset="empty"
          title={hasFilters ? 'No notes match these filters' : 'No saved notes yet'}
          description={
            hasFilters
              ? 'Try clearing the search or picking a different format.'
              : 'Generate your first set of notes or fetch from GeeksforGeeks above.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={() => setParams({ search: '', format: '' })}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate('/app/notes/generate')}>
                <Plus className="size-4" /> Generate notes
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {notes.map((note) => (
              <NoteCard key={note.id || note._id} note={note} onOpen={(id) => navigate(`/app/notes/${id}`)} />
            ))}
          </div>
          <Pagination
            meta={meta}
            onPageChange={(page) => setParams({ page })}
            onLimitChange={(limit) => setParams({ limit })}
          />
        </div>
      )}
    </div>
  );
}

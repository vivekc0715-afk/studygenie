import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Download,
  FileText,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { notesService } from '../../services/notes.service';
import { qk } from '../../lib/queryClient';
import { notifySuccess, toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { ConfirmDialog } from '../../components/common/confirm-dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Markdown } from '../../components/ui/markdown';
import { download, formatDateTime, formatNumber, humaniseKey } from '../../lib/utils';

const FORMAT_LABELS = {
  quick_revision: 'Quick revision notes',
  detailed_conceptual: 'Detailed conceptual notes',
  short_answer: 'Short-answer exam prep',
  long_answer: 'Long-answer exam prep',
  definitions: 'Definitions & terminology',
  important_questions: 'Important questions',
  programming_examples: 'Worked programming examples',
  comparison_tables: 'Comparison tables',
  flashcards: 'Flashcards',
  practice_questions: 'Practice questions',
  last_minute: 'Last-minute revision sheet',
  viva_questions: 'Viva questions & answers',
};

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

function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'notes';
}

export default function NoteDetailPage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [exportFormat, setExportFormat] = useState('markdown');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const noteQuery = useQuery({
    queryKey: qk.note(noteId),
    queryFn: () => notesService.getOne(noteId),
    enabled: Boolean(noteId),
  });

  const bookmarkMutation = useMutation({
    mutationFn: (id) => notesService.toggleBookmark(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk.note(noteId) });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      const bookmarked = Boolean(data?.bookmarked ?? data?.isBookmarked);
      notifySuccess(bookmarked ? 'Added to bookmarks' : 'Removed from bookmarks');
    },
    onError: (error) => toastError(error, 'Could not update bookmark.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => notesService.remove(id),
    onSuccess: () => {
      notifySuccess('Note deleted');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setDeleteOpen(false);
      navigate('/app/notes', { replace: true });
    },
    onError: (error) => {
      toastError(error, 'Could not delete the note.');
    },
  });

  const exportMutation = useMutation({
    mutationFn: ({ id, format }) => notesService.exportNote(id, format),
    onSuccess: (content, variables) => {
      const ext = variables.format === 'pdf' ? 'pdf' : 'md';
      const mime = variables.format === 'pdf' ? 'application/pdf' : 'text/markdown;charset=utf-8';
      const filename = `${slugify(note?.title)}.${ext}`;
      if (variables.format === 'pdf' && typeof content === 'string' && !content.startsWith('%PDF')) {
        // Server likely returned base64-encoded PDF bytes.
        try {
          const binary = atob(content);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          download(filename, bytes, mime);
        } catch {
          download(filename, content, mime);
        }
      } else {
        download(filename, content, mime);
      }
      notifySuccess('Export ready', `Downloaded ${filename}`);
    },
    onError: (error) => toastError(error, 'Could not export the note.'),
  });

  const note = noteQuery.data;
  const bookmarked = Boolean(note?.bookmarked ?? note?.isBookmarked);
  const subjectName = note?.subject?.name || note?.subjectName || note?.subject?.title || '—';
  const topicName = note?.topic?.title || note?.topic?.name || note?.topicName || '—';
  const createdAt = note?.createdAt || note?.created_at;
  const wordCount = note?.wordCount ?? note?.word_count ?? 0;
  const content = note?.content || note?.body || note?.markdown || '';

  useDocumentTitle(note?.title || 'Note');

  const metaItems = useMemo(
    () => [
      { label: 'Subject', value: subjectName },
      { label: 'Topic', value: topicName },
      { label: 'Format', value: FORMAT_LABELS[note?.format] || humaniseKey(note?.format) },
      { label: 'Created', value: formatDateTime(createdAt) },
      { label: 'Words', value: wordCount ? formatNumber(wordCount) : '—' },
    ],
    [subjectName, topicName, note?.format, createdAt, wordCount]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Saved note"
        icon={FileText}
        title={note?.title || (noteQuery.isLoading ? 'Loading note…' : 'Note')}
        description={
          note ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge variant={formatBadgeVariant(note.format)} size="sm">
                {FORMAT_LABELS[note.format] || humaniseKey(note.format)}
              </Badge>
              <span className="text-ink-muted">{subjectName}</span>
            </span>
          ) : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/app/notes')}>
              <ArrowLeft className="size-4" /> Library
            </Button>
            {note ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger className="h-9 w-[8.5rem] text-[12.5px]" aria-label="Export format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={exportMutation.isPending}
                    onClick={() => exportMutation.mutate({ id: noteId, format: exportFormat })}
                  >
                    <Download className="size-4" /> Export
                  </Button>
                </div>
                <Button
                  variant={bookmarked ? 'subtle' : 'outline'}
                  size="sm"
                  disabled={bookmarkMutation.isPending}
                  onClick={() => bookmarkMutation.mutate(noteId)}
                  aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                  {bookmarked ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                  {bookmarked ? 'Saved' : 'Bookmark'}
                </Button>
                <Button variant="dangerSoft" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {noteQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-[60vh] w-full" />
        </div>
      ) : noteQuery.isError ? (
        <ErrorState error={noteQuery.error} onRetry={noteQuery.refetch} />
      ) : !note ? (
        <EmptyState
          preset="search"
          title="Note not found"
          description="This note may have been deleted or the link is invalid."
          action={
            <Button size="sm" onClick={() => navigate('/app/notes')}>
              <ArrowLeft className="size-4" /> Back to library
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          <Card className="overflow-hidden">
            <CardContent className="pt-6">
              {content ? (
                <Markdown>{content}</Markdown>
              ) : (
                <p className="text-[13px] text-ink-muted">This note has no content yet.</p>
              )}
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card>
              <CardContent className="pt-5">
                <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <FileText className="size-4 text-ink-muted" /> Note details
                </h2>
                <dl className="space-y-3">
                  {metaItems.map((item) => (
                    <div key={item.label} className="space-y-0.5">
                      <dt className="text-[11px] uppercase tracking-wide text-ink-faint">{item.label}</dt>
                      <dd className="text-[13px] font-medium text-ink">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <Sparkles className="size-4 text-ink-muted" /> Quick actions
                </h2>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    block
                    disabled={exportMutation.isPending}
                    onClick={() => exportMutation.mutate({ id: noteId, format: exportFormat })}
                  >
                    <Download className="size-4" /> Export as {exportFormat === 'pdf' ? 'PDF' : 'Markdown'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    block
                    onClick={() => navigate(`/app/notes/generate?subjectId=${note.subject?.id || note.subjectId || ''}`)}
                  >
                    <Sparkles className="size-4" /> Generate more from this subject
                  </Button>
                  <Button variant="ghost" size="sm" block onClick={() => navigate('/app/notes')}>
                    <ArrowLeft className="size-4" /> Back to library
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this note?"
        description="This action cannot be undone. The note will be permanently removed from your library."
        confirmLabel="Delete note"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(noteId)}
      />
    </div>
  );
}

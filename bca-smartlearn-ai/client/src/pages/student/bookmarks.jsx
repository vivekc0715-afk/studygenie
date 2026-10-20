import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookmarkX,
  FileText,
  Layers,
  ListChecks,
  Video,
  Code2,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { bookmarkService, ENTITY_TYPES } from '../../services/bookmarks.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Pagination } from '../../components/ui/pagination';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { ConfirmDialog } from '../../components/common/confirm-dialog';
import { formatNumber, humaniseKey } from '../../lib/utils';

const ENTITY_ICONS = {
  note: FileText,
  question: HelpCircle,
  exercise: Code2,
  video: Video,
  test: ListChecks,
  topic: Layers,
};

const ENTITY_ROUTES = {
  note: (id) => `/app/notes/${id}`,
  test: (id) => `/app/tests`,
  video: (id) => `/app/videos`,
  exercise: (id) => `/app/practice/${id}`,
};

export default function Bookmarks() {
  useDocumentTitle('Bookmarks');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, setPage, setFilter } = useListParams({ page: 1, limit: 12 });
  const [toDelete, setToDelete] = useState(null);

  const summaryQuery = useQuery({ queryKey: qk.bookmarksSummary, queryFn: () => bookmarkService.summary() });
  const listQuery = useQuery({
    queryKey: qk.bookmarks(params),
    queryFn: () => bookmarkService.list(params),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => bookmarkService.remove(id),
    onSuccess: () => {
      notifySuccess('Bookmark removed');
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
    onError: (e) => toastError(e, 'Could not remove bookmark.'),
  });

  const summary = summaryQuery.data || {};
  const { data: bookmarks = [], pagination } = listQuery.data || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookmarks"
        description="All your saved notes, questions, exercises, and videos in one place."
      />

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('entityType', '')}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${!params.entityType ? 'bg-brand text-white' : 'bg-canvas-deep text-ink-soft hover:bg-canvas-deep'}`}
        >
          All ({formatNumber(Object.values(summary).reduce((s, n) => s + (n || 0), 0))})
        </button>
        {ENTITY_TYPES.map((type) => {
          const Icon = ENTITY_ICONS[type] || FileText;
          return (
            <button
              key={type}
              onClick={() => setFilter('entityType', type)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${params.entityType === type ? 'bg-brand text-white' : 'bg-canvas-deep text-ink-soft hover:bg-line'}`}
            >
              <Icon className="size-3.5" />
              {humaniseKey(type)} ({formatNumber(summary[type] || 0)})
            </button>
          );
        })}
      </div>

      {/* List */}
      {listQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : listQuery.isError ? (
        <ErrorState error={listQuery.error} onRetry={listQuery.refetch} />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          preset="empty"
          title="No bookmarks yet"
          description="Bookmark notes, questions, or videos by clicking the bookmark icon on any item."
        />
      ) : (
        <>
          <div className="space-y-2">
            {bookmarks.map((bm) => {
              const Icon = ENTITY_ICONS[bm.entityType] || FileText;
              const route = ENTITY_ROUTES[bm.entityType]?.(bm.entityId);
              return (
                <Card key={bm.id} interactive className={route ? 'cursor-pointer' : ''}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas-deep text-ink-muted">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1" onClick={() => route && navigate(route)}>
                      <p className="text-[14px] font-medium text-ink truncate">{bm.title || bm.entityId}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-muted">
                        <Badge variant="neutral" size="sm">{humaniseKey(bm.entityType)}</Badge>
                        {bm.createdAt && (
                          <span>{new Date(bm.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-ink-faint hover:text-blush-ink"
                      onClick={(e) => { e.stopPropagation(); setToDelete(bm); }}
                    >
                      <BookmarkX className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Remove bookmark?"
        description={`"${toDelete?.title || 'This item'}" will be removed from your bookmarks.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          removeMutation.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

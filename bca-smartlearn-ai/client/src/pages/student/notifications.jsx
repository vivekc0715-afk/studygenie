import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { notificationService } from '../../services/notifications.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Pagination } from '../../components/ui/pagination';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { cn, humaniseKey } from '../../lib/utils';

const TYPE_ICONS = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  test_result: '📝',
  plan_generated: '📅',
  mastery_update: '🎯',
};

export default function Notifications() {
  useDocumentTitle('Notifications');
  const queryClient = useQueryClient();
  const { params, setPage } = useListParams({ page: 1, limit: 15 });

  const listQuery = useQuery({
    queryKey: qk.notifications(params),
    queryFn: () => notificationService.list(params),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => toastError(e, 'Could not mark as read.'),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      notifySuccess('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toastError(e, 'Could not mark all as read.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => notificationService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => toastError(e, 'Could not delete notification.'),
  });

  const clearReadMutation = useMutation({
    mutationFn: () => notificationService.clearRead(),
    onSuccess: () => {
      notifySuccess('Read notifications cleared');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toastError(e, 'Could not clear notifications.'),
  });

  const { data: notifications = [], pagination } = listQuery.data || {};
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated on your study progress, test results, and system messages."
        actions={
          <div className="flex gap-2">
            {unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
              >
                <CheckCheck className="size-4" /> Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearReadMutation.mutate()}
              disabled={clearReadMutation.isPending}
            >
              <Trash2 className="size-4" /> Clear read
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="divide-y divide-line p-4 space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-3.5">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : listQuery.isError ? (
            <div className="p-4">
              <ErrorState error={listQuery.error} onRetry={listQuery.refetch} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6">
              <EmptyState
                preset="empty"
                title="No notifications"
                description="You're all caught up! Notifications will appear here as you study."
              />
            </div>
          ) : (
            <div className="divide-y divide-line">
              {notifications.map((notif) => {
                const icon = TYPE_ICONS[notif.type] || '🔔';
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'group flex items-start gap-4 px-5 py-4 transition-colors',
                      !notif.isRead && 'bg-lavender-soft'
                    )}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[13.5px] text-ink leading-snug', !notif.isRead && 'font-medium')}>
                        {notif.message}
                      </p>
                      <p className="mt-1 text-[12px] text-ink-faint">
                        {notif.createdAt
                          ? new Date(notif.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                        {notif.type && ` · ${humaniseKey(notif.type)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markReadMutation.mutate(notif.id)}
                          className="h-7 w-7 p-0"
                          title="Mark as read"
                        >
                          <Check className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMutation.mutate(notif.id)}
                        className="h-7 w-7 p-0 text-ink-faint hover:text-blush-ink"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    {!notif.isRead && (
                      <div className="size-2 rounded-full bg-brand shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {pagination && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}

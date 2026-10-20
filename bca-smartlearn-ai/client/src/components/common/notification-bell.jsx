import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationService } from '../../services/notifications.service';
import { qk } from '../../lib/queryClient';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { EmptyState } from '../ui/empty-state';
import { cn, relativeTime } from '../../lib/utils';

const TYPE_TONE = {
  test: 'bg-sky-soft text-sky-ink',
  note: 'bg-lavender-soft text-lavender-ink',
  planner: 'bg-mint-soft text-mint-ink',
  video: 'bg-blush-soft text-blush-ink',
  system: 'bg-canvas-deep text-ink-soft',
  achievement: 'bg-butter-soft text-butter-ink',
};

export function NotificationBell({ to = '/app/notifications' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unread } = useQuery({
    queryKey: qk.unreadCount,
    queryFn: () => notificationService.unreadCount(),
    refetchInterval: 60_000,
  });

  const { data } = useQuery({
    queryKey: qk.notifications({ limit: 6 }),
    queryFn: () => notificationService.list({ limit: 6 }),
    staleTime: 30_000,
  });

  const count = unread?.count ?? unread?.unread ?? 0;
  const items = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
        ? data
        : [];

  const markAll = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-[18px]" />
          {count > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex min-w-[1.05rem] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
              {count > 9 ? '9+' : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-[13.5px] font-semibold text-ink">Notifications</p>
          {count > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[12px]"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          ) : null}
        </div>

        <div className="max-h-[22rem] overflow-y-auto p-2">
          {items.length === 0 ? (
            <EmptyState compact preset="empty" title="All caught up" description="No notifications yet." />
          ) : (
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!item.isRead) markOne.mutate(item.id);
                      navigate(to);
                    }}
                    className={cn(
                      'flex w-full gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-canvas-deep',
                      !item.isRead && 'bg-lavender-soft/50'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1 size-2 shrink-0 rounded-full',
                        item.isRead ? 'bg-line-strong' : 'bg-brand'
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{item.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-ink-muted">
                        {item.message}
                      </span>
                      <span className="mt-1 block text-[11px] text-ink-faint">{relativeTime(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-line p-2">
          <Button variant="ghost" size="sm" block onClick={() => navigate(to)}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;

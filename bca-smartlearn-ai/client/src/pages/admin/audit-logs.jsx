import { useQuery } from '@tanstack/react-query';
import { useListParams } from '../../hooks/use-list-params';
import { adminService } from '../../services/admin.service';
import { qk } from '../../lib/queryClient';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Pagination } from '../../components/ui/pagination';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { humaniseKey } from '../../lib/utils';
import { ScrollText } from 'lucide-react';

const ACTION_VARIANT = {
  create: 'mint',
  update: 'sky',
  delete: 'blush',
  login: 'lavender',
  logout: 'neutral',
  suspend: 'peach',
  restore: 'butter',
};

export default function AdminAuditLogs() {
  useDocumentTitle('Audit Logs — Admin');
  const { params, setPage, setFilter } = useListParams({ page: 1, limit: 25 });

  const logsQuery = useQuery({
    queryKey: qk.adminAuditLogs(params),
    queryFn: () => adminService.auditLogs(params),
  });

  const logsResult = logsQuery.data || {};
  const logs = logsResult.data || [];
  const pagination = logsResult.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="A chronological record of all admin and significant student actions on the platform."
      />

      <div className="flex items-center gap-3">
        <Select value={params.action || 'all'} onValueChange={(v) => setFilter('action', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.keys(ACTION_VARIANT).map((a) => (
              <SelectItem key={a} value={a}>{humaniseKey(a)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.entity || 'all'} onValueChange={(v) => setFilter('entity', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {['student', 'subject', 'topic', 'test', 'note', 'user', 'settings'].map((e) => (
              <SelectItem key={e} value={e}>{humaniseKey(e)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {logsQuery.isLoading ? (
            <div className="divide-y divide-line p-4 space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="py-3 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : logsQuery.isError ? (
            <div className="p-4"><ErrorState error={logsQuery.error} onRetry={logsQuery.refetch} /></div>
          ) : logs.length === 0 ? (
            <div className="p-6">
              <EmptyState preset="empty" title="No audit logs" description="Actions will be recorded here as administrators and students interact with the platform." />
            </div>
          ) : (
            <div className="divide-y divide-line">
              {logs.map((log) => (
                <div key={log.id || log._id} className="flex items-start gap-4 px-5 py-3.5">
                  <ScrollText className="size-4 text-ink-faint mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={ACTION_VARIANT[log.action] || 'neutral'} size="sm">
                        {humaniseKey(log.action || 'action')}
                      </Badge>
                      {log.entity && (
                        <span className="text-[12.5px] font-medium text-ink">{humaniseKey(log.entity)}</span>
                      )}
                      {log.entityId && (
                        <span className="text-[12px] text-ink-faint font-mono">{String(log.entityId).slice(0, 12)}…</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-ink-soft">{log.description || log.message || ''}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11.5px] text-ink-faint">
                      {log.performedBy?.name && <span>by {log.performedBy.name}</span>}
                      {log.ip && <span>from {log.ip}</span>}
                      {log.createdAt && (
                        <span>
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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

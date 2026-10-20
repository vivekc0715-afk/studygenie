import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Activity, Database, Server, Cpu, HardDrive, Clock } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { qk } from '../../lib/queryClient';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/empty-state';
import { formatNumber, humaniseKey } from '../../lib/utils';
import { cn } from '../../lib/utils';

const STATUS_TONE = {
  healthy: 'mint', connected: 'mint',
  degraded: 'butter', slow: 'butter',
  unhealthy: 'blush', disconnected: 'blush', error: 'blush',
};

function statusTone(status) {
  return STATUS_TONE[status?.toLowerCase()] || 'neutral';
}

export default function AdminSystemHealth() {
  useDocumentTitle('System Health — Admin');

  const healthQuery = useQuery({
    queryKey: qk.adminHealth,
    queryFn: () => adminService.systemHealth(),
    refetchInterval: 30_000, // refresh every 30s
  });

  const h = healthQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        description="Real-time status of all platform services and resources."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => healthQuery.refetch()}
            disabled={healthQuery.isFetching}
          >
            <RefreshCw className={cn('size-4', healthQuery.isFetching && 'animate-spin')} />
            {healthQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />

      {healthQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : healthQuery.isError ? (
        <ErrorState error={healthQuery.error} onRetry={healthQuery.refetch} />
      ) : (
        <>
          {/* Overall status banner */}
          <div className={cn('rounded-2xl px-5 py-4 flex items-center gap-4', h?.status === 'healthy' ? 'bg-mint-soft border border-mint' : 'bg-blush-soft border border-blush')}>
            <Activity className={cn('size-6 shrink-0', h?.status === 'healthy' ? 'text-mint-ink' : 'text-blush-ink')} />
            <div>
              <p className={cn('text-[15px] font-semibold', h?.status === 'healthy' ? 'text-mint-ink' : 'text-blush-ink')}>
                System is {h?.status === 'healthy' ? 'healthy' : 'experiencing issues'}
              </p>
              <p className="text-[12.5px] text-ink-muted mt-0.5">
                Last checked: {h?.checkedAt ? new Date(h.checkedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'just now'}
              </p>
            </div>
          </div>

          {/* Services */}
          {h?.services && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(h.services).map(([name, status]) => (
                <Card key={name}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn('flex size-10 items-center justify-center rounded-xl shrink-0', `bg-${statusTone(status)}-soft`)}>
                      <Server className={cn('size-5', `text-${statusTone(status)}-ink`)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-ink capitalize">{humaniseKey(name)}</p>
                      <Badge variant={statusTone(status)} size="sm" className="mt-1">{status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Resources */}
          {h?.resources && (
            <div className="grid gap-4 sm:grid-cols-2">
              {h.resources.memory && (
                <Card>
                  <CardHeader className="flex-row items-center gap-2">
                    <Cpu className="size-4 text-ink-muted" />
                    <CardTitle>Memory</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-[12.5px] text-ink-muted">
                      <span>Used</span>
                      <span className="font-medium text-ink">{h.resources.memory.used} / {h.resources.memory.total}</span>
                    </div>
                    <Progress value={h.resources.memory.percent || 0} tone={h.resources.memory.percent > 80 ? 'blush' : 'sky'} />
                  </CardContent>
                </Card>
              )}
              {h?.uptime && (
                <Card>
                  <CardHeader className="flex-row items-center gap-2">
                    <Clock className="size-4 text-ink-muted" />
                    <CardTitle>Server Uptime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[22px] font-bold text-ink">{h.uptime}</p>
                    <p className="text-[12.5px] text-ink-muted mt-1">Since last restart</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Database stats */}
          {h?.database && (
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <Database className="size-4 text-ink-muted" />
                <CardTitle>Database</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(h.database).map(([key, val]) => (
                    <div key={key} className="rounded-xl bg-canvas-deep px-4 py-3">
                      <p className="text-[11.5px] text-ink-muted">{humaniseKey(key)}</p>
                      <p className="text-[16px] font-bold text-ink mt-0.5">{typeof val === 'number' ? formatNumber(val) : String(val)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

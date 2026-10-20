import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BookOpen,
  Building2,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  TrendingUp,
} from 'lucide-react';
import { adminService, ADMIN_ENTITIES } from '../../services/admin.service';
import { qk } from '../../lib/queryClient';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { StatCard } from '../../components/common/stat-card';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/empty-state';
import { formatNumber } from '../../lib/utils';

const ICON_MAP = {
  Users, Building2, GraduationCap, BookOpen, HelpCircle,
  ClipboardCheck, Activity, TrendingUp,
};

export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard');
  const navigate = useNavigate();

  const dashQuery = useQuery({ queryKey: qk.adminDashboard, queryFn: () => adminService.dashboard() });
  const healthQuery = useQuery({ queryKey: qk.adminHealth, queryFn: () => adminService.systemHealth() });

  const dash = dashQuery.data;
  const health = healthQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="Platform-wide overview — students, content, and system health."
        actions={
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/system-health')}>
            <Activity className="size-4" /> System health
          </Button>
        }
      />

      {/* KPIs */}
      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {dashQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[112px]" />)
        ) : dashQuery.isError ? (
          <ErrorState error={dashQuery.error} onRetry={dashQuery.refetch} />
        ) : (
          <>
            <StatCard label="Total students" value={formatNumber(dash?.totalStudents ?? 0)} icon={Users} tone="lavender" />
            <StatCard label="Active this week" value={formatNumber(dash?.activeStudents ?? 0)} icon={TrendingUp} tone="mint" />
            <StatCard label="Tests taken" value={formatNumber(dash?.totalAttempts ?? 0)} icon={ClipboardCheck} tone="sky" />
            <StatCard label="Notes generated" value={formatNumber(dash?.notesGenerated ?? 0)} icon={BookOpen} tone="butter" />
          </>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Entity quick links */}
        <Card>
          <CardHeader><CardTitle>Content entities</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {ADMIN_ENTITIES.slice(0, 10).map((entity) => (
              <button
                key={entity.path}
                onClick={() => navigate(`/admin/${entity.path}`)}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas p-3 text-left transition-colors hover:border-brand hover:bg-lavender-soft"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-canvas-deep text-ink-muted">
                  <LayoutDashboard className="size-4" />
                </span>
                <span className="text-[13px] font-medium text-ink">{entity.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* System health */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>System health</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/system-health')}>
                Details →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {healthQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : healthQuery.isError ? (
              <ErrorState error={healthQuery.error} compact onRetry={healthQuery.refetch} />
            ) : (
              <div className="space-y-2.5">
                {Object.entries(health?.services || {}).map(([name, status]) => (
                  <div key={name} className="flex items-center justify-between rounded-xl bg-canvas-deep px-3 py-2">
                    <span className="text-[13px] font-medium text-ink capitalize">{name}</span>
                    <Badge variant={status === 'healthy' || status === 'connected' ? 'mint' : 'blush'}>
                      {status}
                    </Badge>
                  </div>
                ))}
                {health?.uptime && (
                  <div className="flex items-center justify-between rounded-xl bg-canvas-deep px-3 py-2">
                    <span className="text-[13px] font-medium text-ink">Uptime</span>
                    <span className="text-[13px] text-ink-muted">{health.uptime}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      {dash?.recentActivity?.length ? (
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-line">
              {dash.recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="size-2 rounded-full bg-brand shrink-0" />
                  <p className="text-[13.5px] text-ink flex-1">{item.message}</p>
                  <span className="text-[12px] text-ink-faint shrink-0">
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

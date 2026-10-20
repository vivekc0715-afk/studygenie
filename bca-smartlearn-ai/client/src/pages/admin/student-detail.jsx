import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/empty-state';
import { ConfirmDialog } from '../../components/common/confirm-dialog';
import { formatPercent, formatNumber, humaniseKey } from '../../lib/utils';
import { useState } from 'react';

const STATUS_VARIANT = { active: 'mint', suspended: 'blush', pending: 'butter', deleted: 'neutral' };

export default function AdminStudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [action, setAction] = useState(null);

  const query = useQuery({
    queryKey: qk.adminStudent(studentId),
    queryFn: () => adminService.student(studentId),
    enabled: !!studentId,
  });

  useDocumentTitle(query.data?.name ? `${query.data.name} — Admin` : 'Student — Admin');

  const statusMutation = useMutation({
    mutationFn: (status) => adminService.setStudentStatus(studentId, { status }),
    onSuccess: () => {
      notifySuccess('Status updated');
      queryClient.invalidateQueries({ queryKey: qk.adminStudent(studentId) });
    },
    onError: (e) => toastError(e, 'Could not update status.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminService.deleteStudent(studentId),
    onSuccess: () => {
      notifySuccess('Student deleted');
      navigate('/admin/students');
    },
    onError: (e) => toastError(e, 'Could not delete student.'),
  });

  const s = query.data;

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/students')}>
          <ArrowLeft className="size-4" /> All students
        </Button>
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="flex flex-wrap items-start gap-5 p-5">
          <Avatar name={s?.name} size="lg" />
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-[20px] font-bold text-ink">{s?.name}</h1>
                <p className="text-[13.5px] text-ink-muted">{s?.email}</p>
              </div>
              <Badge variant={STATUS_VARIANT[s?.status] || 'neutral'}>
                {humaniseKey(s?.status || 'active')}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 pt-2 text-[13px] text-ink-muted">
              {s?.college && <span className="flex items-center gap-1.5"><BookOpen className="size-3.5" />{s.college}</span>}
              {s?.createdAt && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  Joined {new Date(s.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {s?.status === 'active' && (
              <Button variant="outline" size="sm" onClick={() => setAction('suspend')}>
                <ShieldAlert className="size-4" /> Suspend
              </Button>
            )}
            {s?.status === 'suspended' && (
              <Button variant="outline" size="sm" className="text-mint-ink" onClick={() => statusMutation.mutate('active')}>
                <ShieldCheck className="size-4" /> Activate
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-blush-ink" onClick={() => setAction('delete')}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Academic profile */}
        <Card>
          <CardHeader><CardTitle>Academic profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Semester', value: s?.profile?.currentSemesterNumber ? `Semester ${s.profile.currentSemesterNumber}` : null },
              { label: 'Academic year', value: s?.profile?.academicYear },
              { label: 'Daily study goal', value: s?.profile?.dailyStudyMinutes ? `${s.profile.dailyStudyMinutes} minutes` : null },
              { label: 'Target grade', value: s?.profile?.targetGrade },
              { label: 'Learning level', value: s?.profile?.learningLevel ? humaniseKey(s.profile.learningLevel) : null },
            ]
              .filter((r) => r.value)
              .map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-canvas-deep px-3 py-2">
                  <span className="text-[12.5px] text-ink-muted">{label}</span>
                  <span className="text-[13px] font-medium text-ink">{value}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Analytics summary */}
        <Card>
          <CardHeader><CardTitle>Performance summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {s?.analytics ? (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-ink-muted">Overall mastery</span>
                    <span className="font-medium text-ink">{formatPercent(s.analytics.overallMastery ?? 0)}</span>
                  </div>
                  <Progress value={s.analytics.overallMastery ?? 0} tone="mint" />
                </div>
                {[
                  { label: 'Tests attempted', value: formatNumber(s.analytics.attempts ?? 0) },
                  { label: 'Avg. score', value: formatPercent(s.analytics.averageScore ?? 0) },
                  { label: 'Study streak', value: `${s.analytics.streak ?? 0} days` },
                  { label: 'Notes generated', value: formatNumber(s.analytics.notesGenerated ?? 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-canvas-deep px-3 py-2">
                    <span className="text-[12.5px] text-ink-muted">{label}</span>
                    <span className="text-[13px] font-medium text-ink">{value}</span>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-[13px] text-ink-muted">No analytics data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!action}
        onOpenChange={(open) => !open && setAction(null)}
        title={action === 'delete' ? 'Delete student?' : 'Suspend student?'}
        description={
          action === 'delete'
            ? `${s?.name} will be soft-deleted.`
            : `${s?.name} will be suspended and locked out.`
        }
        confirmLabel={action === 'delete' ? 'Delete' : 'Suspend'}
        destructive
        onConfirm={() => {
          if (action === 'delete') deleteMutation.mutate();
          if (action === 'suspend') statusMutation.mutate('suspended');
          setAction(null);
        }}
      />
    </div>
  );
}

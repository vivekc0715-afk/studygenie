import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { PageHeader } from '../../components/common/page-header';
import { SearchInput } from '../../components/common/search-input';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Pagination } from '../../components/ui/pagination';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { ConfirmDialog } from '../../components/common/confirm-dialog';
import { Avatar } from '../../components/ui/avatar';
import { formatNumber, humaniseKey } from '../../lib/utils';

const STATUS_VARIANT = { active: 'mint', suspended: 'blush', pending: 'butter', deleted: 'neutral' };

export default function AdminStudents() {
  useDocumentTitle('Students — Admin');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, setSearch, setPage, setFilter } = useListParams({ page: 1, limit: 20 });
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null); // 'suspend' | 'delete' | 'restore'

  const studentsQuery = useQuery({
    queryKey: qk.adminStudents(params),
    queryFn: () => adminService.students(params),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => adminService.setStudentStatus(id, { status }),
    onSuccess: () => {
      notifySuccess('Student status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
    onError: (e) => toastError(e, 'Could not update student.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminService.deleteStudent(id),
    onSuccess: () => {
      notifySuccess('Student removed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
    onError: (e) => toastError(e, 'Could not delete student.'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => adminService.restoreStudent(id),
    onSuccess: () => {
      notifySuccess('Student restored');
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
    onError: (e) => toastError(e, 'Could not restore student.'),
  });

  const studentsResult = studentsQuery.data || {};
  const students = studentsResult.data || [];
  const pagination = studentsResult.meta;

  function confirmAction(student, act) {
    setSelected(student);
    setAction(act);
  }

  function executeAction() {
    if (!selected) return;
    if (action === 'suspend') statusMutation.mutate({ id: selected.id, status: 'suspended' });
    if (action === 'activate') statusMutation.mutate({ id: selected.id, status: 'active' });
    if (action === 'delete') deleteMutation.mutate(selected.id);
    if (action === 'restore') restoreMutation.mutate(selected.id);
    setSelected(null);
    setAction(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`Managing ${formatNumber(pagination?.total ?? students.length)} registered students.`}
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={params.search || ''}
          onChange={setSearch}
          placeholder="Search by name or email…"
          className="w-72"
        />
        <Select value={params.status || 'all'} onValueChange={(v) => setFilter('status', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {['active', 'suspended', 'pending', 'deleted'].map((s) => (
              <SelectItem key={s} value={s}>{humaniseKey(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {studentsQuery.isLoading ? (
            <div className="divide-y divide-line p-4 space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : studentsQuery.isError ? (
            <div className="p-4">
              <ErrorState error={studentsQuery.error} onRetry={studentsQuery.refetch} />
            </div>
          ) : students.length === 0 ? (
            <div className="p-6">
              <EmptyState preset="empty" title="No students found" description="Try adjusting your search or filter." />
            </div>
          ) : (
            <div className="divide-y divide-line">
              {students.map((s) => (
                <div key={s.id} className="group flex items-center gap-4 px-5 py-3.5">
                  <Avatar name={s.name} size="sm" />
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/admin/students/${s.id}`)}>
                    <p className="text-[13.5px] font-medium text-ink truncate">{s.name}</p>
                    <p className="text-[12px] text-ink-muted truncate">{s.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {s.college && <span className="hidden sm:block text-[12px] text-ink-muted truncate max-w-[140px]">{s.college}</span>}
                    <Badge variant={STATUS_VARIANT[s.status] || 'neutral'} size="sm">
                      {humaniseKey(s.status || 'active')}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {s.status !== 'suspended' && s.status !== 'deleted' && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px]" onClick={() => confirmAction(s, 'suspend')}>
                          <ShieldAlert className="size-3.5" />
                        </Button>
                      )}
                      {(s.status === 'suspended') && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px] text-mint-ink" onClick={() => confirmAction(s, 'activate')}>
                          <ShieldCheck className="size-3.5" />
                        </Button>
                      )}
                      {s.status !== 'deleted' && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-blush-ink" onClick={() => confirmAction(s, 'delete')}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/admin/students/${s.id}`)}>
                      <ArrowRight className="size-4" />
                    </Button>
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

      <ConfirmDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={action === 'delete' ? 'Delete student?' : action === 'suspend' ? 'Suspend student?' : action === 'restore' ? 'Restore student?' : 'Activate student?'}
        description={
          action === 'delete'
            ? `${selected?.name} will be soft-deleted. Their data is preserved.`
            : action === 'suspend'
            ? `${selected?.name} will be suspended and locked out.`
            : `${selected?.name}'s account will be restored.`
        }
        confirmLabel={action === 'delete' ? 'Delete' : action === 'suspend' ? 'Suspend' : 'Confirm'}
        destructive={action === 'delete' || action === 'suspend'}
        onConfirm={executeAction}
      />
    </div>
  );
}

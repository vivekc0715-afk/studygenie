import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { adminService, ADMIN_ENTITIES } from '../../services/admin.service';
import { ENTITY_FIELDS } from '../../features/admin/entity-fields';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { PageHeader } from '../../components/common/page-header';
import { SearchInput } from '../../components/common/search-input';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Pagination } from '../../components/ui/pagination';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { ConfirmDialog } from '../../components/common/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Field, FormGrid } from '../../components/common/form';
import { formatNumber, humaniseKey } from '../../lib/utils';

/* ---------------------------------------------------------------- helpers -- */

function getValue(obj, fieldName) {
  const v = obj?.[fieldName];
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return v?.name || v?.title || v?.label || JSON.stringify(v).slice(0, 40);
  return String(v);
}

function FieldInput({ field, value, onChange }) {
  const { type, name, options, placeholder, rows, min, max, required } = field;

  if (type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={!!value} onCheckedChange={onChange} id={name} />
        <Label htmlFor={name}>{value ? 'Yes' : 'No'}</Label>
      </div>
    );
  }

  if (type === 'select') {
    return (
      <Select value={String(value || '')} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder || `Select ${field.label}`} /></SelectTrigger>
        <SelectContent>
          {(options || []).map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (type === 'textarea' || type === 'richtext') {
    return (
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows || 4}
      />
    );
  }

  if (type === 'tags') {
    const displayVal = Array.isArray(value) ? value.join(', ') : (value || '');
    return (
      <Input
        value={displayVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Comma-separated values (e.g. concept1, concept2)'}
      />
    );
  }

  if (type === 'json') {
    const displayVal = typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : (value || '');
    return (
      <Textarea
        value={displayVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || '{\n  "key": "value"\n}'}
        rows={rows || 3}
        className="font-mono text-xs"
      />
    );
  }

  if (type === 'reference') {
    const refVal = typeof value === 'object' && value !== null ? (value.id || value._id || '') : (value || '');
    return (
      <Input
        value={refVal}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder={placeholder || 'Enter 24-char ObjectId'}
      />
    );
  }

  return (
    <Input
      type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
      value={value === 0 ? 0 : (value || '')}
      onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      required={required}
    />
  );
}

/* --------------------------------------------------------------- component -- */

export default function AdminEntity() {
  const { entity } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, setSearch, setPage } = useListParams({ page: 1, limit: 20 });

  const entityMeta = ADMIN_ENTITIES.find((e) => e.path === entity);
  const fieldConfig = ENTITY_FIELDS[entity];
  const tableFields = (fieldConfig?.fields || []).filter((f) => !f.hideInTable).slice(0, 5);

  useDocumentTitle(`${entityMeta?.label || 'Entity'} — Admin`);

  const [editRecord, setEditRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [toDelete, setToDelete] = useState(null);

  const listQuery = useQuery({
    queryKey: qk.adminEntity(entity, params),
    queryFn: () => adminService.list(entity, params),
    enabled: !!entity,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => adminService.create(entity, payload),
    onSuccess: () => {
      notifySuccess(`${entityMeta?.singular || 'Record'} created`);
      queryClient.invalidateQueries({ queryKey: ['admin', entity] });
      setEditRecord(null);
    },
    onError: (e) => toastError(e, 'Could not create record.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => adminService.update(entity, id, payload),
    onSuccess: () => {
      notifySuccess(`${entityMeta?.singular || 'Record'} updated`);
      queryClient.invalidateQueries({ queryKey: ['admin', entity] });
      setEditRecord(null);
    },
    onError: (e) => toastError(e, 'Could not update record.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminService.remove(entity, id),
    onSuccess: () => {
      notifySuccess('Record deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', entity] });
    },
    onError: (e) => toastError(e, 'Could not delete record.'),
  });

  const listResult = listQuery.data || {};
  const records = listResult.data || [];
  const pagination = listResult.meta;

  function openCreate() {
    const defaults = {};
    (fieldConfig?.fields || []).forEach((f) => { defaults[f.name] = f.defaultValue ?? ''; });
    setFormData(defaults);
    setEditRecord({ __new: true });
  }

  function openEdit(record) {
    setFormData({ ...record });
    setEditRecord(record);
  }

  function handleSave() {
    const clean = {};
    const fieldMap = new Map((fieldConfig?.fields || []).map((f) => [f.name, f]));
    Object.entries(formData).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) return;
      const f = fieldMap.get(k);
      if (f?.type === 'tags' && typeof v === 'string') {
        clean[k] = v.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (f?.type === 'json' && typeof v === 'string') {
        try {
          clean[k] = JSON.parse(v);
        } catch {
          clean[k] = v;
        }
      } else if (f?.type === 'number') {
        const numVal = Number(v);
        if (!isNaN(numVal)) clean[k] = numVal;
      } else {
        clean[k] = v;
      }
    });
    if (editRecord?.__new) {
      createMutation.mutate(clean);
    } else {
      updateMutation.mutate({ id: editRecord.id || editRecord._id, payload: clean });
    }
  }

  const isNew = editRecord?.__new;
  const isBusy = createMutation.isPending || updateMutation.isPending;

  if (!entityMeta) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="size-4" /> Dashboard
        </Button>
        <EmptyState preset="error" title="Unknown entity" description={`"${entity}" is not a known admin entity.`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="size-4" /> Dashboard
        </Button>
      </div>

      <PageHeader
        title={entityMeta.label}
        description={`Manage ${entityMeta.label.toLowerCase()} in the content library.`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" /> Add {entityMeta.singular}
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <SearchInput value={params.search || ''} onChange={setSearch} placeholder={`Search ${entityMeta.label.toLowerCase()}…`} className="w-72" />
        <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', entity] })}>
          <RefreshCw className="size-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {listQuery.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : listQuery.isError ? (
            <div className="p-4"><ErrorState error={listQuery.error} onRetry={listQuery.refetch} /></div>
          ) : records.length === 0 ? (
            <div className="p-6">
              <EmptyState
                preset="empty"
                title={`No ${entityMeta.label.toLowerCase()} yet`}
                action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Add first</Button>}
              />
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-canvas-deep">
                  {tableFields.map((f) => (
                    <th key={f.name} className="px-4 py-3 text-left font-semibold text-ink-muted">{f.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold text-ink-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {records.map((record) => (
                  <tr key={record.id || record._id} className="group hover:bg-canvas-deep transition-colors">
                    {tableFields.map((f) => (
                      <td key={f.name} className="px-4 py-3 text-ink max-w-[200px] truncate">
                        {f.type === 'boolean' ? (
                          <Badge variant={record[f.name] ? 'mint' : 'neutral'} size="sm">{record[f.name] ? 'Yes' : 'No'}</Badge>
                        ) : getValue(record, f.name)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(record)}>
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-blush-ink" onClick={() => setToDelete(record)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {pagination && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      {/* Create / Edit dialog */}
      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? `Add ${entityMeta.singular}` : `Edit ${entityMeta.singular}`}</DialogTitle>
          </DialogHeader>
          <FormGrid>
            {(fieldConfig?.fields || []).filter((f) => !f.hideInForm).map((field) => (
              <Field
                key={field.name}
                label={field.label}
                hint={field.hint}
                required={field.required}
                colSpan={field.colSpan}
              >
                <FieldInput
                  field={field}
                  value={formData[field.name]}
                  onChange={(v) => setFormData((prev) => ({ ...prev, [field.name]: v }))}
                />
              </Field>
            ))}
          </FormGrid>
          {!fieldConfig && (
            <p className="text-[13px] text-ink-muted">No field configuration found for "{entity}". Generic key-value editing is not supported.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isBusy || !fieldConfig}>
              {isBusy ? 'Saving…' : isNew ? 'Create' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${entityMeta.singular}?`}
        description={`"${toDelete?.name || toDelete?.title || toDelete?.id}" will be removed. This may be irreversible.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteMutation.mutate(toDelete.id || toDelete._id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

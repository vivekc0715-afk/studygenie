import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Save, Settings } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Field } from '../../components/common/form';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/empty-state';
import { humaniseKey } from '../../lib/utils';

export default function AdminSettings() {
  useDocumentTitle('Settings — Admin');
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: qk.adminSettings,
    queryFn: () => adminService.settings(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, payload }) => adminService.updateSettings(key, payload),
    onSuccess: () => {
      notifySuccess('Settings saved');
      queryClient.invalidateQueries({ queryKey: qk.adminSettings });
    },
    onError: (e) => toastError(e, 'Could not save settings.'),
  });

  const settings = settingsQuery.data || {};

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }

  if (settingsQuery.isError) {
    return <ErrorState error={settingsQuery.error} onRetry={settingsQuery.refetch} />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Platform Settings" description="Configure platform-wide features and integrations." />

      {Object.entries(settings).map(([groupKey, groupVal]) => {
        if (typeof groupVal !== 'object' || groupVal === null) return null;
        return (
          <SettingGroup
            key={groupKey}
            groupKey={groupKey}
            groupVal={groupVal}
            onSave={(payload) => updateMutation.mutate({ key: groupKey, payload })}
            isSaving={updateMutation.isPending}
          />
        );
      })}

      {Object.keys(settings).length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-[13.5px] text-ink-muted">
            No settings available. Settings will appear here once configured on the server.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SettingGroup({ groupKey, groupVal, onSave, isSaving }) {
  const [localVal, setLocalVal] = useState({ ...groupVal });
  const isDirty = JSON.stringify(localVal) !== JSON.stringify(groupVal);

  function update(key, value) {
    setLocalVal((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Settings className="size-4 text-ink-muted" />
        <CardTitle>{humaniseKey(groupKey)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(localVal).map(([key, val]) => (
          <Field key={key} label={humaniseKey(key)}>
            {typeof val === 'boolean' ? (
              <div className="flex items-center gap-2">
                <Switch checked={val} onCheckedChange={(v) => update(key, v)} id={`${groupKey}-${key}`} />
                <Label htmlFor={`${groupKey}-${key}`}>{val ? 'Enabled' : 'Disabled'}</Label>
              </div>
            ) : typeof val === 'number' ? (
              <Input
                type="number"
                value={val}
                onChange={(e) => update(key, Number(e.target.value))}
              />
            ) : (
              <Input
                value={val || ''}
                onChange={(e) => update(key, e.target.value)}
              />
            )}
          </Field>
        ))}
        <Button
          size="sm"
          onClick={() => onSave(localVal)}
          disabled={!isDirty || isSaving}
        >
          <Save className="size-4" />
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </CardContent>
    </Card>
  );
}

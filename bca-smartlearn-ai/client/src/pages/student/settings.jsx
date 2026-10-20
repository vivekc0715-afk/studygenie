import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Moon,
  Palette,
  Shield,
  Sun,
  User,
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import { toastError, notifySuccess } from '../../lib/notify';
import { useAuthStore } from '../../stores/authStore';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { PageHeader } from '../../components/common/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { useUiStore } from '../../stores/uiStore';

function useTheme() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  return { theme, setTheme };
}

export default function StudentSettings() {
  useDocumentTitle('Settings');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [planReminders, setPlanReminders] = useState(true);
  const [testReminders, setTestReminders] = useState(true);

  const { theme, setTheme } = useTheme();

  const changePassword = useMutation({
    mutationFn: (payload) => authService.changePassword(payload),
    onSuccess: () => {
      notifySuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e) => toastError(e, 'Could not change password.'),
  });

  function handlePasswordSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError(null, 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toastError(null, 'Password must be at least 8 characters.');
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" description="Manage your account preferences and security." />

      {/* Account info */}
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <User className="size-5 text-ink-muted" />
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[12px] text-ink-muted mb-1.5 block">Name</Label>
              <p className="text-[14px] font-medium text-ink">{user?.name || '—'}</p>
            </div>
            <div>
              <Label className="text-[12px] text-ink-muted mb-1.5 block">Email</Label>
              <p className="text-[14px] font-medium text-ink">{user?.email || '—'}</p>
            </div>
            <div>
              <Label className="text-[12px] text-ink-muted mb-1.5 block">Role</Label>
              <p className="text-[14px] font-medium text-ink capitalize">{user?.role || 'Student'}</p>
            </div>
            <div>
              <Label className="text-[12px] text-ink-muted mb-1.5 block">Member since</Label>
              <p className="text-[14px] font-medium text-ink">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <Palette className="size-5 text-ink-muted" />
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium text-ink">Dark mode</p>
              <p className="text-[12.5px] text-ink-muted">Switch between light and dark themes.</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <Bell className="size-5 text-ink-muted" />
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Email notifications', description: 'Receive emails about test results and system updates.', value: emailNotifs, onChange: setEmailNotifs },
            { label: 'Study plan reminders', description: 'Get reminded about pending tasks in your daily plan.', value: planReminders, onChange: setPlanReminders },
            { label: 'Test reminders', description: 'Notifications before scheduled tests.', value: testReminders, onChange: setTestReminders },
          ].map(({ label, description, value, onChange }) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-ink">{label}</p>
                <p className="text-[12.5px] text-ink-muted">{description}</p>
              </div>
              <Switch checked={value} onCheckedChange={onChange} />
            </div>
          ))}
          <p className="text-[12px] text-ink-faint">
            Note: notification preferences are saved locally and will sync to the server in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <Lock className="size-5 text-ink-muted" />
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Field label="Current password">
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Field label="New password">
              <Input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
              />
            </Field>
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Saving…' : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-blush">
        <CardHeader className="flex-row items-center gap-3">
          <Shield className="size-5 text-blush-ink" />
          <CardTitle className="text-blush-ink">Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium text-ink">Sign out</p>
              <p className="text-[12.5px] text-ink-muted">Sign out of your account on this device.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

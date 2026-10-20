import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { AuthLayout } from '../../components/layout/auth-layout';
import { Field, FormError } from '../../components/common/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Spinner } from '../../components/ui/spinner';
import { authService } from '../../services/auth.service';
import { notifySuccess, toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number');

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function ResetPassword() {
  useDocumentTitle('Set a new password');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const resetMutation = useMutation({
    mutationFn: (values) => authService.resetPassword({ token, password: values.password }),
    onSuccess: () => {
      setDone(true);
      notifySuccess('Password reset', 'You can now sign in with your new password.');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    },
    onError: (error) => toastError(error, 'Could not reset your password.'),
  });

  const onSubmit = (values) => resetMutation.mutate(values);

  if (!token) {
    return (
      <AuthLayout
        title="Set a new password"
        subtitle="Choose a strong password you haven't used before."
        footer={
          <p>
            Need a new reset link?{' '}
            <Link to="/forgot-password" className="font-medium text-brand hover:underline">
              Request one
            </Link>
          </p>
        }
      >
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="text-[13.5px] font-semibold text-danger">Invalid reset link</p>
            <p className="mt-0.5 text-[12.5px] text-danger/80">
              This link is missing its verification token. Please request a new password reset link.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" block className="mt-4">
          <Link to="/forgot-password">Request a new reset link</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
      footer={
        <p>
          Remembered your password?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="size-7 text-success" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink">Password updated</p>
            <p className="mt-1 text-[13px] text-ink-muted">Redirecting you to sign in…</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormError error={errors.root?.message} />

          <div className="flex items-center gap-2 rounded-xl bg-canvas-deep px-3 py-2 text-[12px] text-ink-muted">
            <KeyRound className="size-3.5 text-ink-faint" />
            Reset token verified from your email link.
          </div>

          <Field
            label="New password"
            htmlFor="password"
            required
            error={errors.password?.message}
            hint="At least 8 characters, with at least one letter and one number."
          >
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a new password"
                autoComplete="new-password"
                className="pl-10 pr-11"
                invalid={Boolean(errors.password)}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirm new password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                className="pl-10 pr-11"
                invalid={Boolean(errors.confirmPassword)}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          <Button type="submit" block size="lg" disabled={resetMutation.isPending}>
            {resetMutation.isPending ? <Spinner size={16} /> : <CheckCircle2 className="size-4" />}
            {resetMutation.isPending ? 'Resetting password…' : 'Reset password'}
            {!resetMutation.isPending ? <ArrowRight className="size-4" /> : null}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

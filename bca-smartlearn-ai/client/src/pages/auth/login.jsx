import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { AuthLayout } from '../../components/layout/auth-layout';
import { Field, FormError } from '../../components/common/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Spinner } from '../../components/ui/spinner';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/authStore';
import { notifySuccess, toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  password: z.string().min(1, 'Password is required'),
});

const HOME_FOR_ROLE = { super_admin: '/admin', student: '/app' };

export default function Login() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: (values) => authService.login(values),
    onSuccess: (data) => {
      useAuthStore.getState().setSession(data);
      const role = data?.user?.role;
      const from = location.state?.from;
      const target = from?.pathname || HOME_FOR_ROLE[role] || '/app';
      navigate(target, { replace: true });
    },
    onError: (error) => {
      if (error?.code === 'email_not_verified') {
        setUnverifiedEmail(getValues('email'));
        setError('root', {
          type: 'manual',
          message: 'Please verify your email address before signing in. We just sent you a new link.',
        });
      } else {
        toastError(error, 'Invalid email or password.');
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: (email) => authService.resendVerification(email),
    onSuccess: () => {
      notifySuccess('Verification email sent', 'Check your inbox to verify your account.');
    },
    onError: (error) => toastError(error, 'Could not resend the verification email.'),
  });

  const onSubmit = (values) => loginMutation.mutate(values);

  const isUnverified = Boolean(unverifiedEmail);

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your personalised learning journey."
      footer={
        <p>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Sign up
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {isUnverified ? (
          <div className="rounded-xl border border-butter bg-butter-soft p-3.5 text-[13px] text-butter-ink">
            <p className="font-medium">Your email isn&apos;t verified yet.</p>
            <p className="mt-0.5 text-butter-ink/80">
              A new verification link was sent to <span className="font-medium">{unverifiedEmail}</span>.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => resendMutation.mutate(unverifiedEmail)}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? <Spinner size={14} /> : null}
                Resend link
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUnverifiedEmail('');
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : null}

        <FormError error={errors.root?.message} />

        <Field label="Email" htmlFor="email" required error={errors.email?.message}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="pl-10"
              invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </div>
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          required
          error={errors.password?.message}
          actions={
            <Link
              to="/forgot-password"
              className="text-[12px] font-medium text-brand hover:underline"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          }
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
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

        <Button type="submit" block size="lg" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? <Spinner size={16} /> : null}
          {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
          {!loginMutation.isPending ? <ArrowRight className="size-4" /> : null}
        </Button>

        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-line" />
          </div>
          <span className="relative bg-surface px-3 text-[11.5px] uppercase tracking-wider text-ink-muted">
            Instant 1-Click Access
          </span>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="brand"
            block
            size="md"
            onClick={async () => {
              try {
                const user = await useAuthStore.getState().loginAsDemo('student');
                if (user) {
                  notifySuccess('Welcome!', 'Signed in as Demo Student. All features unlocked.');
                  navigate('/app', { replace: true });
                }
              } catch (e) {
                toastError(e, 'Could not log in as demo student.');
              }
            }}
          >
            ⚡ Explore as Demo Student (Instant Access)
          </Button>

          {import.meta.env.DEV ? (
            <Button
              type="button"
              variant="outline"
              block
              size="sm"
              onClick={async () => {
                try {
                  const user = await useAuthStore.getState().loginAsDemo('super_admin');
                  if (user) {
                    notifySuccess('Admin Mode', 'Signed in as Platform Owner.');
                    navigate('/admin', { replace: true });
                  }
                } catch (e) {
                  toastError(e, 'Could not log in as admin.');
                }
              }}
            >
              🔑 Admin Access (Platform Owner)
            </Button>
          ) : null}
        </div>
      </form>
    </AuthLayout>
  );
}

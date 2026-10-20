import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { AuthLayout } from '../../components/layout/auth-layout';
import { Field, FormError } from '../../components/common/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Spinner } from '../../components/ui/spinner';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/authStore';
import { notifySuccess, toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number');

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name').max(120, 'Name is too long'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function Register() {
  useDocumentTitle('Create account');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const registerMutation = useMutation({
    mutationFn: (values) => authService.register(values),
    onSuccess: (data) => {
      useAuthStore.getState().setSession(data);
      notifySuccess('Account created', 'Welcome to BCA SmartLearn AI.');
      navigate('/app/onboarding', { replace: true });
    },
    onError: (error) => {
      toastError(error, 'Could not create your account.');
    },
  });

  const onSubmit = (values) => {
    const payload = { name: values.name, email: values.email, password: values.password };
    registerMutation.mutate(payload);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start turning your syllabus into notes, tests and a grade forecast."
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormError error={errors.root?.message} />

        <Field label="Full name" htmlFor="name" required error={errors.name?.message}>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              id="name"
              type="text"
              placeholder="e.g. Aarav Sharma"
              autoComplete="name"
              className="pl-10"
              invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </div>
        </Field>

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
          hint="At least 8 characters, with at least one letter and one number."
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
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

        <Field label="Confirm password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter your password"
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

        <Button type="submit" block size="lg" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? <Spinner size={16} /> : null}
          {registerMutation.isPending ? 'Creating account…' : 'Create account'}
          {!registerMutation.isPending ? <ArrowRight className="size-4" /> : null}
        </Button>

        <p className="text-center text-[12px] text-ink-muted">
          By creating an account, you agree to our Terms and Privacy Policy.
        </p>
      </form>
    </AuthLayout>
  );
}

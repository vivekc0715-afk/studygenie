import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { AuthLayout } from '../../components/layout/auth-layout';
import { Field, FormError } from '../../components/common/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Spinner } from '../../components/ui/spinner';
import { authService } from '../../services/auth.service';
import { toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
});

export default function ForgotPassword() {
  useDocumentTitle('Forgot password');
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const forgotMutation = useMutation({
    mutationFn: (email) => authService.forgotPassword(email),
    onSuccess: (_data, variables) => {
      setSubmittedEmail(variables);
      setSent(true);
    },
    onError: (error) => toastError(error, 'Could not send the reset link.'),
  });

  const onSubmit = (values) => forgotMutation.mutate(values.email);

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <p>
          <Link to="/login" className="font-medium text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="size-7 text-success" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink">Check your email</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                If an account exists for <span className="font-medium text-ink">{submittedEmail}</span>, a password
                reset link is on its way. The link expires in 1 hour.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            block
            onClick={() => {
              setSent(false);
              setSubmittedEmail('');
            }}
          >
            Try a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
          <Button type="submit" block size="lg" disabled={forgotMutation.isPending}>
            {forgotMutation.isPending ? <Spinner size={16} /> : <Mail className="size-4" />}
            {forgotMutation.isPending ? 'Sending link…' : 'Send reset link'}
            {!forgotMutation.isPending ? <ArrowRight className="size-4" /> : null}
          </Button>
          <p className="text-center text-[12px] text-ink-muted">
            We&apos;ll never reveal whether an email is registered.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

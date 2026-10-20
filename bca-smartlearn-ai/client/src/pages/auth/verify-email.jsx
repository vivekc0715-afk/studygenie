import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, KeyRound, Mail, Send } from 'lucide-react';
import { AuthLayout } from '../../components/layout/auth-layout';
import { Field } from '../../components/common/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Spinner } from '../../components/ui/spinner';
import { authService } from '../../services/auth.service';
import { notifySuccess, toastError } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { cn } from '../../lib/utils';

const verifySchema = z.object({
  token: z.string().min(10, 'Verification token is required'),
});

const resendSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
});

export default function VerifyEmail() {
  useDocumentTitle('Verify your email');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token');

  const [status, setStatus] = useState(urlToken ? 'verifying' : 'idle'); // idle | verifying | success | error
  const [errorMessage, setErrorMessage] = useState('');

  /* ------------------------------------------------------- manual token form */
  const {
    register,
    handleSubmit,
    formState: { errors: verifyErrors },
  } = useForm({
    resolver: zodResolver(verifySchema),
    defaultValues: { token: '' },
  });

  /* ------------------------------------------------------- resend email form */
  const {
    register: registerResend,
    handleSubmit: handleSubmitResend,
    formState: { errors: resendErrors },
  } = useForm({
    resolver: zodResolver(resendSchema),
    defaultValues: { email: '' },
  });

  const verifyMutation = useMutation({
    mutationFn: (token) => authService.verifyEmail(token),
    onSuccess: () => {
      setStatus('success');
      notifySuccess('Email verified', 'You can now sign in to your account.');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    },
    onError: (error) => {
      setStatus('error');
      setErrorMessage(error?.message || 'This verification link is invalid or has expired.');
    },
  });

  const resendMutation = useMutation({
    mutationFn: (email) => authService.resendVerification(email),
    onSuccess: () => {
      notifySuccess('Verification email sent', 'If the account needs verification, a new link has been sent.');
    },
    onError: (error) => toastError(error, 'Could not resend the verification email.'),
  });

  // Auto-verify when a token is present in the URL.
  useEffect(() => {
    if (urlToken) {
      verifyMutation.mutate(urlToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken]);

  const onVerify = (values) => {
    setStatus('verifying');
    verifyMutation.mutate(values.token);
  };

  const onResend = (values) => resendMutation.mutate(values.email);

  const isVerifying = status === 'verifying';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={
        urlToken
          ? 'We are checking your verification link…'
          : 'Enter the verification code or request a new one.'
      }
      footer={
        <p>
          Remembered your password?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {isVerifying ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="relative flex size-14 items-center justify-center rounded-full bg-brand-soft">
            <Spinner size={24} className="text-brand" />
          </div>
          <p className="text-[13.5px] text-ink-muted">Verifying your email address…</p>
        </div>
      ) : isSuccess ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="size-7 text-success" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink">Email verified</p>
            <p className="mt-1 text-[13px] text-ink-muted">Redirecting you to sign in…</p>
          </div>
        </div>
      ) : isError ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
            <div>
              <p className="text-[13.5px] font-semibold text-danger">Verification failed</p>
              <p className="mt-0.5 text-[12.5px] text-danger/80">{errorMessage}</p>
            </div>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleSubmit(onVerify)} noValidate className="space-y-4">
              <Field label="Verification code" htmlFor="token" required error={verifyErrors.token?.message}>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
                  <Input
                    id="token"
                    type="text"
                    placeholder="Paste your verification code"
                    className="pl-10"
                    invalid={Boolean(verifyErrors.token)}
                    {...register('token')}
                  />
                </div>
              </Field>

              <Button type="submit" block size="lg" disabled={verifyMutation.isPending}>
                {verifyMutation.isPending ? <Spinner size={16} /> : <CheckCircle2 className="size-4" />}
                {verifyMutation.isPending ? 'Verifying…' : 'Verify email'}
              </Button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-canvas px-3 text-[12px] text-ink-muted">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmitResend(onResend)} noValidate className="space-y-4">
              <p className="text-[13px] text-ink-muted">
                Didn&apos;t get the email? Enter your address to receive a new link.
              </p>
              <Field label="Email" htmlFor="resend-email" required error={resendErrors.email?.message}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
                  <Input
                    id="resend-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="pl-10"
                    invalid={Boolean(resendErrors.email)}
                    {...registerResend('email')}
                  />
                </div>
              </Field>
              <Button
                type="submit"
                variant="outline"
                block
                disabled={resendMutation.isPending}
                className={cn(resendMutation.isSuccess && 'border-success text-success')}
              >
                {resendMutation.isPending ? <Spinner size={16} /> : <Send className="size-4" />}
                {resendMutation.isSuccess ? 'Link sent' : 'Resend verification email'}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        /* No token in URL — manual entry + resend */
        <div className="space-y-5">
          <form onSubmit={handleSubmit(onVerify)} noValidate className="space-y-4">
            <Field label="Verification code" htmlFor="token" required error={verifyErrors.token?.message}>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
                <Input
                  id="token"
                  type="text"
                  placeholder="Paste your verification code"
                  className="pl-10"
                  invalid={Boolean(verifyErrors.token)}
                  {...register('token')}
                />
              </div>
            </Field>

            <Button type="submit" block size="lg" disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? <Spinner size={16} /> : <CheckCircle2 className="size-4" />}
              {verifyMutation.isPending ? 'Verifying…' : 'Verify email'}
            </Button>
          </form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-canvas px-3 text-[12px] text-ink-muted">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmitResend(onResend)} noValidate className="space-y-4">
            <p className="text-[13px] text-ink-muted">
              Didn&apos;t get the email? Enter your address to receive a new link.
            </p>
            <Field label="Email" htmlFor="resend-email" required error={resendErrors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="pl-10"
                  invalid={Boolean(resendErrors.email)}
                  {...registerResend('email')}
                />
              </div>
            </Field>
            <Button
              type="submit"
              variant="outline"
              block
              disabled={resendMutation.isPending}
              className={cn(resendMutation.isSuccess && 'border-success text-success')}
            >
              {resendMutation.isPending ? <Spinner size={16} /> : <Send className="size-4" />}
              {resendMutation.isSuccess ? 'Link sent' : 'Resend verification email'}
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}

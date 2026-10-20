import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { PageLoader } from '../ui/spinner';
import { EmptyState } from '../ui/empty-state';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

const HOME_FOR_ROLE = { super_admin: '/admin', student: '/app' };

/** Ensures protected routes require authentication, redirecting to /login if signed out. */
export function RequireAuth({ role }) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') return <PageLoader label="Starting BCA SmartLearn AI…" />;

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) {
      return <Navigate to={HOME_FOR_ROLE[user.role] || '/login'} replace />;
    }
  }

  return <Outlet />;
}

/** Keeps signed-in users away from the auth pages. */
export function RequireGuest() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === 'idle' || status === 'loading') return <PageLoader label="Loading…" />;
  if (status === 'authenticated' && user) {
    return <Navigate to={HOME_FOR_ROLE[user.role] || '/app'} replace />;
  }
  return <Outlet />;
}

/** Sends the student to the onboarding wizard until it is completed. */
export function RequireOnboarding() {
  const profile = useAuthStore((state) => state.profile);
  const location = useLocation();

  const done = profile?.onboardingCompleted;
  const onWizard = location.pathname.startsWith('/app/onboarding');

  if (profile && !done && !onWizard) return <Navigate to="/app/onboarding" replace />;
  if (profile && done && onWizard) return <Navigate to="/app" replace />;
  return <Outlet />;
}

/** 404 page used for unknown routes. */
export function NotFoundPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    document.title = 'Page not found · BCA SmartLearn AI';
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6">
      <EmptyState
        preset="search"
        className="w-full border-solid"
        title="We couldn't find that page"
        description="The link may be outdated, or the record was removed. Let's get you back on track."
        action={
          <div className="mt-2 flex gap-2">
            <Button onClick={() => navigate(user ? HOME_FOR_ROLE[user.role] || '/app' : '/login')}>Go to Sign In</Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go back
            </Button>
          </div>
        }
      />
    </div>
  );
}

export default RequireAuth;

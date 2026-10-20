import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { ThemeSync } from './components/layout/theme-sync';
import AppRoutes from './routes';

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const status = useAuthStore((state) => state.status);

  // Load the session once on boot — the JWT lives in an httpOnly cookie.
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <>
      <ThemeSync />
      <AppRoutes status={status} />
    </>
  );
}

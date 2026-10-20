import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useUiStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { SidebarContent } from './sidebar';
import { Topbar } from './topbar';
import { ErrorBoundary } from '../common/error-boundary';
import { AIChatbot } from '../common/ai-chatbot';

/** Scrolls to the top whenever the route changes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}

/**
 * Three-zone shell: collapsible left rail, sticky top bar (search /
 * notifications / profile) and the routed content area.
 */
export function AppShell({ showRightPanelToggle = false }) {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-canvas">
      <ScrollToTop />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-surface transition-[width] duration-300 lg:block',
          collapsed ? 'w-[4.75rem]' : 'w-[17rem]'
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <div className={cn('transition-[padding] duration-300', collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-[17rem]')}>
        <Topbar showRightPanelToggle={showRightPanelToggle} />

        <main className="mx-auto w-full max-w-[104rem] px-3 py-5 sm:px-5 sm:py-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        <footer className="mx-auto w-full max-w-[104rem] px-3 pb-8 pt-2 sm:px-5">
          <p className="text-[11.5px] text-ink-faint">
            BCA SmartLearn AI — personalised learning for Bachelor of Computer Applications students.
          </p>
        </footer>
      </div>

      <AIChatbot />
    </div>
  );
}

export default AppShell;

import { NavLink } from 'react-router-dom';
import { ChevronLeft, GraduationCap, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { navForRole } from '../../config/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';

function NavItem({ item, collapsed, onNavigate }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200',
          isActive
            ? 'bg-brand-soft text-brand shadow-sm'
            : 'text-ink-soft hover:bg-canvas-deep hover:text-ink',
          collapsed && 'justify-center px-0'
        )
      }
    >
      <item.icon className="size-[18px] shrink-0" />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarContent({ collapsed = false, onNavigate, showCollapseToggle = true }) {
  const role = useAuthStore((state) => state.user?.role);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.clear);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const groups = navForRole(role);

  const signOut = async () => {
    try {
      const { authService } = await import('../../services/auth.service');
      await authService.logout();
    } catch {
      /* ignore — clearing locally is enough */
    }
    logout();
    window.location.assign('/login');
  };

  return (
    <div className="flex h-full flex-col gap-2 bg-surface">
      <div className={cn('flex items-center gap-2.5 px-4 pt-5', collapsed && 'justify-center px-0')}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
          <GraduationCap className="size-[18px]" />
        </span>
        {collapsed ? null : (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14px] font-semibold text-ink">SmartLearn AI</p>
            <p className="truncate text-[11.5px] text-ink-muted">
              {role === 'super_admin' ? 'Admin console' : 'BCA learning platform'}
            </p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-5 pb-4">
          {groups.map((group) => (
            <div key={group.label}>
              {collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-line" />
              ) : (
                <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className={cn('space-y-2 border-t border-line p-3', collapsed && 'px-2')}>
        {collapsed ? null : (
          <div className="rounded-xl bg-canvas-deep px-3 py-2.5">
            <p className="truncate text-[13px] font-medium text-ink">{user?.name || 'Student'}</p>
            <p className="truncate text-[11.5px] text-ink-muted">{user?.email}</p>
          </div>
        )}
        <div className={cn('flex gap-2', collapsed && 'flex-col items-center')}>
          <Button
            variant="ghost"
            size={collapsed ? 'iconSm' : 'sm'}
            onClick={signOut}
            className={cn('text-ink-muted hover:text-danger', !collapsed && 'flex-1 justify-start')}
          >
            <LogOut className="size-4" />
            {collapsed ? null : 'Sign out'}
          </Button>
          {showCollapseToggle && !collapsed ? (
            <Button variant="ghost" size="iconSm" onClick={toggleSidebar} aria-label="Collapse sidebar">
              <ChevronLeft className="size-4" />
            </Button>
          ) : null}
        </div>
        {showCollapseToggle && collapsed ? (
          <Button variant="ghost" size="iconSm" onClick={toggleSidebar} aria-label="Expand sidebar">
            <ChevronLeft className="size-4 rotate-180" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default SidebarContent;

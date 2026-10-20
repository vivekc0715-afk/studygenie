import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, Menu, Moon, PanelRight, Settings, Sun, UserRound } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '../ui/sheet';
import { SidebarContent } from './sidebar';
import { GlobalSearch } from '../common/global-search';
import { NotificationBell } from '../common/notification-bell';
import { HOME_FOR_ROLE } from '../../config/navigation';

export function Topbar({ showRightPanelToggle = false }) {
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const toggleRightPanel = useUiStore((state) => state.toggleRightPanel);
  const setMobileNav = useUiStore((state) => state.setMobileNav);
  const navigate = useNavigate();

  const isAdmin = user?.role === 'super_admin';
  const settingsPath = isAdmin ? '/admin/settings' : '/app/settings';
  const profilePath = isAdmin ? '/admin' : '/app/profile';

  const signOut = async () => {
    try {
      const { authService } = await import('../../services/auth.service');
      await authService.logout();
    } catch {
      /* ignore */
    }
    clear();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className="flex h-15 items-center gap-3 px-3 py-2.5 sm:px-5">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
              <Menu className="size-[18px]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[18.5rem] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMobileNav(false)} showCollapseToggle={false} />
          </SheetContent>
        </Sheet>

        <Link to={HOME_FOR_ROLE[user?.role] || '/'} className="flex items-center gap-2 lg:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
            <GraduationCap className="size-4" />
          </span>
        </Link>

        <GlobalSearch className="hidden max-w-md flex-1 sm:block" />

        <div className="ml-auto flex items-center gap-1">
          {showRightPanelToggle ? (
            <Button
              variant="ghost"
              size="icon"
              className="hidden 2xl:inline-flex"
              onClick={toggleRightPanel}
              aria-label="Toggle side panel"
            >
              <PanelRight className="size-[18px]" />
            </Button>
          ) : null}

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </Button>

          <NotificationBell to={isAdmin ? '/admin/audit-logs' : '/app/notifications'} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 rounded-full ring-offset-2 ring-offset-canvas transition focus-visible:outline-2 focus-visible:outline-brand"
                aria-label="Account menu"
              >
                <Avatar>
                  {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user?.name} /> : null}
                  <AvatarFallback name={user?.name} />
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="normal-case">
                <span className="block truncate text-[13px] font-semibold text-ink">{user?.name}</span>
                <span className="block truncate text-[11.5px] font-normal text-ink-muted">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate(profilePath)}>
                <UserRound /> {isAdmin ? 'Admin dashboard' : 'Academic profile'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(settingsPath)}>
                <Settings /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="danger" onSelect={signOut}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default Topbar;

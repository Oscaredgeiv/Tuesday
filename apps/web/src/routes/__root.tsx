import { createRootRoute, Outlet, Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuthStore } from '../lib/store';
import { useEffect } from 'react';

const NAV_SECTIONS = [
  { label: 'OPERATE', items: [
    { to: '/', icon: '◆', label: 'Home' },
    { to: '/command', icon: '⌘', label: 'Command Center' },
    { to: '/voice', icon: '◉', label: 'Voice Console' },
    { to: '/agent', icon: '⚡', label: 'Agent Workspace' },
  ]},
  { label: 'LEARN', items: [
    { to: '/memory', icon: '◈', label: 'Memory & Learning' },
    { to: '/skills', icon: '✦', label: 'Skills & Playbooks' },
    { to: '/library', icon: '▤', label: 'Library' },
  ]},
  { label: 'TRACK', items: [
    { to: '/sessions', icon: '◎', label: 'Sessions' },
    { to: '/automations', icon: '↻', label: 'Automations' },
  ]},
] as const;

function RootLayout() {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    if (!isAuthenticated && currentPath !== '/login') {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, currentPath, navigate]);

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <nav className="w-60 shrink-0 bg-surface-raised border-r border-border flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-tuesday-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">Tuesday</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">AI Workspace</p>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-5 mb-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">{section.label}</p>
              {section.items.map((item) => (
                <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} active={currentPath === item.to} />
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="px-4 py-3 border-t border-border space-y-2">
          <Link
            to="/settings"
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs ${
              currentPath === '/settings' ? 'text-tuesday-400 bg-surface-active' : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-hover'
            }`}
          >
            <span className="text-sm">⚙</span>
            <span>Settings</span>
          </Link>
          <button
            onClick={() => { logout(); navigate({ to: '/login' }); }}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-zinc-600 hover:text-zinc-400 hover:bg-surface-hover"
          >
            <span className="text-sm">⏻</span>
            <span>Sign out</span>
          </button>
        </div>
      </nav>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 shrink-0 bg-surface-raised border-b border-border flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <StatusDot color="success" label="Online" />
            <span className="text-xs text-zinc-600">|</span>
            <span className="text-xs text-zinc-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-1.5 py-0.5 text-[10px] text-zinc-500 bg-surface border border-border rounded">⌘K</kbd>
            <span className="text-[10px] text-zinc-600">Command Palette</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, active }: { to: string; icon: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-sm transition-all ${
        active
          ? 'text-tuesday-400 bg-tuesday-600/10 font-medium shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-hover'
      }`}
    >
      <span className={`text-xs ${active ? 'text-tuesday-400' : 'text-zinc-600'}`}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function StatusDot({ color, label }: { color: string; label: string }) {
  const colorClass = color === 'success' ? 'bg-success' : color === 'warning' ? 'bg-warning' : 'bg-danger';
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${colorClass} animate-pulse-glow`} />
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});

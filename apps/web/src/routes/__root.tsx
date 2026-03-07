import { createRootRoute, Outlet, Link, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../lib/store';

function RootLayout() {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-56 shrink-0 bg-surface border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-tuesday-400">Tuesday</h1>
          <p className="text-xs text-zinc-500">AI Assistant</p>
        </div>

        <div className="flex-1 py-2">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/approvals">Approvals</NavLink>
          <NavLink to="/commands">Commands</NavLink>
          <NavLink to="/workflows">Workflows</NavLink>
          <NavLink to="/agents">Agents</NavLink>
          <NavLink to="/audit">Audit Log</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={() => { logout(); navigate({ to: '/login' }); }}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="block px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-surface-raised transition-colors"
      activeProps={{ className: 'block px-4 py-2 text-sm text-tuesday-400 bg-surface-raised font-medium' }}
    >
      {children}
    </Link>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});

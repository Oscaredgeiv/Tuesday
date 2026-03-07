import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface DashStats {
  activeSessions: number;
  pendingApprovals: number;
  connectedAgents: number;
  memorySuggestions: number;
  recentCommands: number;
  libraryDocs: number;
  playbooks: number;
  automations: number;
}

function HomePage() {
  const [stats, setStats] = useState<DashStats>({
    activeSessions: 0, pendingApprovals: 0, connectedAgents: 0,
    memorySuggestions: 0, recentCommands: 0, libraryDocs: 0,
    playbooks: 0, automations: 0,
  });
  const [recentCommands, setRecentCommands] = useState<Array<{ id: string; rawText: string; mode: string; status: string; createdAt: string }>>([]);

  useEffect(() => {
    api.getDashboardStats().then(d => setStats(d as unknown as DashStats)).catch(() => {});
    api.getRecentCommands(5).then(d => setRecentCommands(d as typeof recentCommands)).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{greeting}</h1>
          <p className="text-sm text-zinc-500 mt-1">Tuesday is online and ready.</p>
        </div>
        <div className="flex gap-2">
          <QuickAction to="/voice" icon="◉" label="Voice" kbd="⌘T" />
          <QuickAction to="/command" icon="⌘" label="Command" kbd="⌘K" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Active Sessions" value={stats.activeSessions} icon="◎" />
        <StatCard label="Pending Approvals" value={stats.pendingApprovals} icon="⏳" accent={stats.pendingApprovals > 0} />
        <StatCard label="Agents Online" value={stats.connectedAgents} icon="⚡" />
        <StatCard label="Memory Suggestions" value={stats.memorySuggestions} icon="◈" accent={stats.memorySuggestions > 0} />
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-3 gap-4">
        {/* Active session / Quick command */}
        <div className="col-span-2 space-y-4">
          <Panel title="Quick Command" icon="⌘">
            <CommandInput />
          </Panel>

          <Panel title="Recent Activity" icon="◎">
            {recentCommands.length === 0 ? (
              <p className="text-sm text-zinc-600 py-4 text-center">No commands yet. Try the Command Center or Voice Console.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {recentCommands.map(cmd => (
                  <div key={cmd.id} className="flex items-center justify-between py-2.5 px-1">
                    <div className="flex items-center gap-3">
                      <span className={`w-1.5 h-1.5 rounded-full ${cmd.status === 'executed' ? 'bg-success' : cmd.status === 'failed' ? 'bg-danger' : 'bg-zinc-600'}`} />
                      <span className="text-sm text-zinc-300 truncate max-w-md">{cmd.rawText}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${cmd.mode === 'command' ? 'bg-tuesday-600/20 text-tuesday-400' : 'bg-zinc-800 text-zinc-500'}`}>{cmd.mode}</span>
                      <span className="text-xs text-zinc-600">{timeAgo(cmd.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Panel title="Quick Launch" icon="▸">
            <div className="space-y-1">
              <LaunchItem to="/voice" label="Start Voice Session" desc="Push-to-talk" />
              <LaunchItem to="/library" label="Search Library" desc="Find solutions fast" />
              <LaunchItem to="/skills" label="Browse Playbooks" desc="Run saved workflows" />
              <LaunchItem to="/memory" label="Review Learnings" desc={`${stats.memorySuggestions} pending`} />
            </div>
          </Panel>

          <Panel title="System Status" icon="⚙">
            <div className="space-y-2">
              <StatusRow label="Server" status="online" />
              <StatusRow label="Agent" status={stats.connectedAgents > 0 ? 'online' : 'offline'} />
              <StatusRow label="Voice" status="ready" />
              <StatusRow label="Library" status="indexed" />
            </div>
          </Panel>

          <Panel title="Keyboard Shortcuts" icon="⌨">
            <div className="space-y-1.5 text-xs">
              <KbdRow label="Command Palette" keys="⌘ K" />
              <KbdRow label="Push-to-Talk" keys="⌘ ⇧ T" />
              <KbdRow label="Save Memory" keys="⌘ ⇧ M" />
              <KbdRow label="Open Library" keys="⌘ ⇧ L" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function CommandInput() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const r = await api.sendCommand(text);
      setResult(JSON.stringify(r, null, 2));
      setText('');
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : err}`);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 command-glow rounded-lg border border-border bg-surface p-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a command, ask a question, or use /slash commands..."
            className="flex-1 px-3 py-2 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
          <button type="submit" className="px-4 py-2 bg-tuesday-600 hover:bg-tuesday-500 text-white text-sm rounded-md font-medium">
            Run
          </button>
        </div>
      </form>
      {result && (
        <pre className="mt-3 p-3 bg-surface rounded-lg text-xs text-zinc-500 overflow-auto max-h-32 border border-border-subtle">{result}</pre>
      )}
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-raised rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
        <span className="text-xs text-zinc-600">{icon}</span>
        <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent?: boolean }) {
  return (
    <div className={`bg-surface-raised rounded-xl border p-4 ${accent ? 'border-tuesday-600/30 glow-card' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-600 text-sm">{icon}</span>
      </div>
      <p className={`text-2xl font-semibold ${accent ? 'text-tuesday-400' : 'text-zinc-100'}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function QuickAction({ to, icon, label, kbd }: { to: string; icon: string; label: string; kbd: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-lg hover:border-border-active hover:bg-surface-hover">
      <span className="text-tuesday-400 text-sm">{icon}</span>
      <span className="text-sm text-zinc-300">{label}</span>
      <kbd className="ml-1 px-1 py-0.5 text-[10px] text-zinc-600 bg-surface border border-border rounded">{kbd}</kbd>
    </Link>
  );
}

function LaunchItem({ to, label, desc }: { to: string; label: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-surface-hover group">
      <span className="text-sm text-zinc-300 group-hover:text-zinc-100">{label}</span>
      <span className="text-xs text-zinc-600">{desc}</span>
    </Link>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  const isGood = ['online', 'ready', 'indexed'].includes(status);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${isGood ? 'bg-success' : 'bg-zinc-600'}`} />
        <span className={`text-xs ${isGood ? 'text-success' : 'text-zinc-600'}`}>{status}</span>
      </div>
    </div>
  );
}

function KbdRow({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <kbd className="px-1.5 py-0.5 text-[10px] text-zinc-500 bg-surface border border-border rounded font-mono">{keys}</kbd>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const Route = createFileRoute('/')({
  component: HomePage,
});

import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function DashboardPage() {
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    recentCommands: 0,
    connectedAgents: 0,
    activeWorkflows: 0,
  });
  const [commandText, setCommandText] = useState('');
  const [commandResult, setCommandResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getPendingApprovals(),
      api.getCommandHistory(10),
      api.getAgents(),
      api.getWorkflows(),
    ]).then(([approvals, commands, agents, workflows]) => {
      setStats({
        pendingApprovals: (approvals as unknown[]).length,
        recentCommands: (commands as unknown[]).length,
        connectedAgents: (agents as { status: string }[]).filter((a) => a.status === 'online').length,
        activeWorkflows: (workflows as unknown[]).length,
      });
    }).catch(console.error);
  }, []);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim()) return;
    try {
      const result = await api.sendCommand(commandText);
      setCommandResult(JSON.stringify(result, null, 2));
      setCommandText('');
    } catch (err) {
      setCommandResult(`Error: ${err instanceof Error ? err.message : err}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Approvals" value={stats.pendingApprovals} accent={stats.pendingApprovals > 0} />
        <StatCard label="Recent Commands" value={stats.recentCommands} />
        <StatCard label="Connected Agents" value={stats.connectedAgents} />
        <StatCard label="Workflows" value={stats.activeWorkflows} />
      </div>

      {/* Command input */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Send Command</h3>
        <form onSubmit={handleCommand} className="flex gap-2">
          <input
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            placeholder='Try: "Open Gmail" or "Search Orbit for..."'
            className="flex-1 px-3 py-2 bg-zinc-900 border border-border rounded-lg text-zinc-100 focus:outline-none focus:border-tuesday-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-tuesday-600 hover:bg-tuesday-500 text-white rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </form>
        {commandResult && (
          <pre className="mt-3 p-3 bg-zinc-900 rounded-lg text-xs text-zinc-400 overflow-auto max-h-48">
            {commandResult}
          </pre>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-amber-400' : 'text-zinc-100'}`}>
        {value}
      </p>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

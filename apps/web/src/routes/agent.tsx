import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function AgentWorkspacePage() {
  const [agents, setAgents] = useState<Array<{ id: string; name: string; hostname: string; os: string; status: string; lastSeenAt: string }>>([]);
  const [actions, setActions] = useState<Array<{ id: string; toolName: string; intent?: string; status: string; riskLevel: string; createdAt: string; output?: unknown }>>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  useEffect(() => {
    api.getAgents().then(d => setAgents(d as any)).catch(() => {});
    api.getActions(30).then(d => setActions(d as any)).catch(() => {});
  }, []);

  const selected = actions.find(a => a.id === selectedAction);

  return (
    <div className="flex h-full">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Agent Workspace</h2>
          <p className="text-sm text-zinc-500 mt-1">Monitor active tasks, tool execution, and agent decisions.</p>
        </div>

        {/* Agent cards */}
        <div className="px-6 pb-4">
          <div className="flex gap-3">
            {agents.length === 0 ? (
              <div className="bg-surface-raised border border-border rounded-xl p-4 text-sm text-zinc-600">No agents connected. Start the agent with <code className="text-xs bg-surface px-1.5 py-0.5 rounded">pnpm dev:agent</code></div>
            ) : agents.map(a => (
              <div key={a.id} className="bg-surface-raised border border-border rounded-xl p-4 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${a.status === 'online' ? 'bg-success animate-pulse-glow' : 'bg-zinc-600'}`} />
                <div>
                  <p className="text-sm font-medium text-zinc-200">{a.name}</p>
                  <p className="text-xs text-zinc-500">{a.hostname} · {a.os}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action list */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Action History</h3>
          <div className="space-y-1">
            {actions.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAction(a.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  selectedAction === a.id ? 'bg-tuesday-600/10 border border-tuesday-600/20' : 'hover:bg-surface-raised border border-transparent'
                }`}
              >
                <StatusDot status={a.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate">{a.intent ?? a.toolName}</p>
                  <p className="text-xs text-zinc-600 font-mono">{a.toolName}</p>
                </div>
                <RiskBadge level={a.riskLevel} />
                <span className="text-[10px] text-zinc-700 shrink-0">{timeAgo(a.createdAt)}</span>
              </button>
            ))}
            {actions.length === 0 && (
              <p className="text-center text-sm text-zinc-600 py-12">No actions recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="w-80 shrink-0 border-l border-border bg-surface-raised overflow-y-auto">
        {selected ? (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-300">{selected.intent ?? selected.toolName}</h3>
              <p className="text-xs text-zinc-600 font-mono mt-1">{selected.toolName}</p>
            </div>
            <div className="space-y-2">
              <DetailRow label="Status" value={selected.status} />
              <DetailRow label="Risk" value={selected.riskLevel} />
              <DetailRow label="Time" value={new Date(selected.createdAt).toLocaleString()} />
            </div>
            {selected.output != null && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Output</p>
                <pre className="text-xs text-zinc-400 bg-surface rounded-lg p-3 overflow-auto max-h-64 border border-border-subtle font-mono">
                  {String(JSON.stringify(selected.output, null, 2))}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-600">Select an action to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'succeeded' ? 'bg-success' : status === 'failed' ? 'bg-danger' : status === 'running' ? 'bg-tuesday-500 animate-pulse-glow' : 'bg-zinc-600';
  return <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

function RiskBadge({ level }: { level: string }) {
  const cls = level === 'low' ? 'text-success' : level === 'medium' ? 'text-warning' : level === 'high' ? 'text-orange-400' : 'text-danger';
  return <span className={`text-[10px] ${cls}`}>{level}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs text-zinc-300">{value}</span>
    </div>
  );
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m/60)}h`;
  return `${Math.floor(m/1440)}d`;
}

export const Route = createFileRoute('/agent')({
  component: AgentWorkspacePage,
});

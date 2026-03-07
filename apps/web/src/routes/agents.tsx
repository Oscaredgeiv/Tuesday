import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface AgentEntry {
  id: string;
  name: string;
  hostname: string;
  os: string;
  status: string;
  lastSeenAt: string;
}

function AgentsPage() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAgents().then((data) => {
      setAgents(data as AgentEntry[]);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <p className="text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Connected Agents</h2>

      {agents.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-6 text-center">
          <p className="text-zinc-500">No agents registered.</p>
          <p className="text-xs text-zinc-600 mt-2">Start the agent with: pnpm dev:agent</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((a) => (
            <div key={a.id} className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.name}</p>
                    <span className={`w-2 h-2 rounded-full ${
                      a.status === 'online' ? 'bg-emerald-400' : 'bg-zinc-600'
                    }`} />
                    <span className="text-xs text-zinc-500">{a.status}</span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">{a.hostname} ({a.os})</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Last seen: {new Date(a.lastSeenAt).toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-zinc-600 font-mono">{a.id}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/agents')({
  component: AgentsPage,
});

import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface SessionEntry {
  id: string;
  title?: string;
  type: string;
  status: string;
  summary?: string;
  successScore?: number;
  startedAt: string;
  endedAt?: string;
  _count?: { actions: number; commands: number; artifacts: number };
}

function SessionsPage() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [selected, setSelected] = useState<SessionEntry | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    api.getSessions(20, filter === 'all' ? undefined : filter).then(d => setSessions(d as SessionEntry[])).catch(() => {});
  }, [filter]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Sessions & History</h2>
          <p className="text-sm text-zinc-500 mt-1">Review past interactions, artifacts, and outcomes.</p>
        </div>

        <div className="px-6 pb-3 flex items-center gap-1">
          {(['all', 'active', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-full capitalize ${filter === f ? 'bg-tuesday-600/20 text-tuesday-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6 space-y-2">
          {sessions.length === 0 ? (
            <p className="text-center text-sm text-zinc-600 py-12">No sessions yet. Sessions are created when you interact with Tuesday.</p>
          ) : sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selected?.id === s.id ? 'bg-tuesday-600/5 border-tuesday-600/20' : 'bg-surface-raised border-border hover:border-border-active'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{s.title ?? `Session ${s.id.slice(-6)}`}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={s.status} />
                    <span className="text-[10px] text-zinc-600">{s.type}</span>
                    {s._count && (
                      <>
                        <span className="text-[10px] text-zinc-700">{s._count.commands} cmds</span>
                        <span className="text-[10px] text-zinc-700">{s._count.actions} actions</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {s.successScore != null && <p className="text-xs text-success">{Math.round(s.successScore * 100)}%</p>}
                  <p className="text-[10px] text-zinc-700 mt-0.5">{new Date(s.startedAt).toLocaleString()}</p>
                </div>
              </div>
              {s.summary && <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{s.summary}</p>}
            </button>
          ))}
        </div>
      </div>

      <div className="w-80 shrink-0 border-l border-border bg-surface-raised overflow-y-auto p-4">
        {selected ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">{selected.title ?? 'Session'}</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Type</span><span className="text-zinc-300">{selected.type}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Status</span><StatusBadge status={selected.status} /></div>
              <div className="flex justify-between"><span className="text-zinc-500">Started</span><span className="text-zinc-300">{new Date(selected.startedAt).toLocaleString()}</span></div>
              {selected.endedAt && <div className="flex justify-between"><span className="text-zinc-500">Ended</span><span className="text-zinc-300">{new Date(selected.endedAt).toLocaleString()}</span></div>}
            </div>
            {selected.summary && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Summary</p>
                <p className="text-xs text-zinc-400">{selected.summary}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-600 text-center mt-12">Select a session to view details</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'active' ? 'bg-success/20 text-success' : status === 'completed' ? 'bg-tuesday-600/20 text-tuesday-400' : 'bg-zinc-800 text-zinc-500';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${cls}`}>{status}</span>;
}

export const Route = createFileRoute('/sessions')({
  component: SessionsPage,
});

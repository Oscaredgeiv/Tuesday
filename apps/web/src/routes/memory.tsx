import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface MemoryItem {
  id: string;
  title: string;
  type: string;
  summary: string;
  content: string;
  tags: string[];
  confidence: number;
  status: string;
  scope: string;
  successCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

const TABS = ['suggested', 'approved', 'archived', 'all'] as const;

function MemoryPage() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [tab, setTab] = useState<typeof TABS[number]>('suggested');
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMemoryItems(50, tab === 'all' ? undefined : tab).then(d => {
      setItems(d as MemoryItem[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tab]);

  const handleDecision = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      await api.reviewMemory(id, decision);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {}
  };

  const sel = items.find(i => i.id === selected);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Memory & Learning</h2>
          <p className="text-sm text-zinc-500 mt-1">Review what Tuesday has learned. Approve, reject, or edit insights.</p>
        </div>

        {/* Tabs */}
        <div className="px-6 pb-3 flex items-center gap-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelected(null); }}
              className={`px-3 py-1.5 text-xs rounded-full capitalize ${tab === t ? 'bg-tuesday-600/20 text-tuesday-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-hover'}`}
            >
              {t}
            </button>
          ))}
          <span className="text-xs text-zinc-600 ml-2">{items.length} items</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto px-6 pb-6 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-zinc-600 py-12">Loading...</p>
          ) : items.length === 0 ? (
            <EmptyState tab={tab} />
          ) : items.map(item => (
            <button
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selected === item.id ? 'bg-tuesday-600/5 border-tuesday-600/20' : 'bg-surface-raised border-border hover:border-border-active'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{item.title}</p>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.summary}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <TypeBadge type={item.type} />
                    <span className="text-[10px] text-zinc-600">{item.scope}</span>
                    {item.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <ConfidenceBar value={item.confidence} />
                  {tab === 'suggested' && (
                    <div className="flex gap-1 mt-1">
                      <button onClick={(e) => { e.stopPropagation(); handleDecision(item.id, 'approved'); }} className="px-2 py-1 text-[10px] bg-success/20 text-success rounded hover:bg-success/30">Approve</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDecision(item.id, 'rejected'); }} className="px-2 py-1 text-[10px] bg-danger/20 text-danger rounded hover:bg-danger/30">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="w-96 shrink-0 border-l border-border bg-surface-raised overflow-y-auto">
        {sel ? (
          <div className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">{sel.title}</h3>
            <TypeBadge type={sel.type} />
            <div className="space-y-3">
              <Section label="Summary">{sel.summary}</Section>
              <Section label="Content">
                <div className="text-xs text-zinc-400 whitespace-pre-wrap bg-surface p-3 rounded-lg border border-border-subtle max-h-64 overflow-auto">{sel.content}</div>
              </Section>
              <Section label="Details">
                <div className="space-y-1.5 text-xs">
                  <Row label="Confidence" value={`${(sel.confidence * 100).toFixed(0)}%`} />
                  <Row label="Scope" value={sel.scope} />
                  <Row label="Uses" value={String(sel.successCount)} />
                  <Row label="Created" value={new Date(sel.createdAt).toLocaleDateString()} />
                  {sel.lastUsedAt && <Row label="Last used" value={new Date(sel.lastUsedAt).toLocaleDateString()} />}
                </div>
              </Section>
              {sel.tags.length > 0 && (
                <Section label="Tags">
                  <div className="flex flex-wrap gap-1">
                    {sel.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">{t}</span>)}
                  </div>
                </Section>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-600">Select a memory to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, ' ');
  return <span className="text-[10px] px-1.5 py-0.5 bg-tuesday-600/10 text-tuesday-400 rounded capitalize">{label}</span>;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${pct > 70 ? 'bg-success' : pct > 40 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-zinc-600">{pct}%</span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">{label}</p>
      {typeof children === 'string' ? <p className="text-xs text-zinc-400">{children}</p> : children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-zinc-500">{label}</span><span className="text-zinc-300">{value}</span></div>;
}

function EmptyState({ tab }: { tab: string }) {
  const msgs: Record<string, string> = {
    suggested: 'No pending suggestions. Tuesday will suggest learnings as you work.',
    approved: 'No approved memories yet. Review suggestions to build your knowledge.',
    archived: 'No archived items.',
    all: 'No memories yet. Start using Tuesday to build your learning library.',
  };
  return <p className="text-center text-sm text-zinc-600 py-12">{msgs[tab] ?? 'No items.'}</p>;
}

export const Route = createFileRoute('/memory')({
  component: MemoryPage,
});

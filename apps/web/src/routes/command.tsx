import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface CommandEntry {
  id: string;
  rawText: string;
  mode: string;
  intent?: string;
  toolName?: string;
  status: string;
  output?: unknown;
  confidence?: number;
  pinned: boolean;
  createdAt: string;
}

const SLASH_COMMANDS = [
  { cmd: '/search', desc: 'Search library or Orbit', icon: '🔍' },
  { cmd: '/create', desc: 'Create task, note, or doc', icon: '➕' },
  { cmd: '/run', desc: 'Run a playbook', icon: '▶' },
  { cmd: '/save', desc: 'Save to memory or library', icon: '💾' },
  { cmd: '/open', desc: 'Open app, URL, or file', icon: '📂' },
  { cmd: '/draft', desc: 'Draft email or message', icon: '✉' },
  { cmd: '/summarize', desc: 'Summarize content', icon: '📋' },
  { cmd: '/compare', desc: 'Compare solutions', icon: '⚖' },
];

function CommandCenterPage() {
  const [input, setInput] = useState('');
  const [commands, setCommands] = useState<CommandEntry[]>([]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [filter, setFilter] = useState<'all' | 'command' | 'dictation' | 'pinned'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getRecentCommands(50).then(d => setCommands(d as CommandEntry[])).catch(() => {});
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setShowSlash(input.startsWith('/') && input.length < 15);
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await api.sendCommand(input);
      setResult(r as Record<string, unknown>);
      setInput('');
      api.getRecentCommands(50).then(d => setCommands(d as CommandEntry[])).catch(() => {});
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = commands.filter(c => {
    if (filter === 'pinned') return c.pinned;
    if (filter === 'all') return true;
    return c.mode === filter;
  });

  return (
    <div className="flex h-full">
      {/* Main command area */}
      <div className="flex-1 flex flex-col">
        {/* Command input */}
        <div className="p-6 pb-4">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Command Center</h2>
          <form onSubmit={handleSubmit}>
            <div className="command-glow rounded-xl border border-border bg-surface-raised p-1.5 relative">
              <div className="flex items-center gap-2">
                <span className="text-tuesday-400 text-lg pl-2">⌘</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a command, question, or /slash command..."
                  className="flex-1 px-2 py-2.5 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-tuesday-600 hover:bg-tuesday-500 text-white text-sm rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? '...' : 'Execute'}
                </button>
              </div>

              {/* Slash command suggestions */}
              {showSlash && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-overlay border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  {SLASH_COMMANDS.filter(s => s.cmd.startsWith(input)).map(s => (
                    <button
                      key={s.cmd}
                      type="button"
                      onClick={() => { setInput(s.cmd + ' '); inputRef.current?.focus(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover text-left"
                    >
                      <span>{s.icon}</span>
                      <span className="text-sm text-zinc-200 font-mono">{s.cmd}</span>
                      <span className="text-xs text-zinc-500">{s.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className="px-6 pb-4">
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Result</span>
                <button onClick={() => setResult(null)} className="text-xs text-zinc-600 hover:text-zinc-400">✕</button>
              </div>
              <pre className="text-xs text-zinc-400 overflow-auto max-h-48 font-mono">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-6 pb-3 flex items-center gap-1">
          {(['all', 'command', 'dictation', 'pinned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full ${filter === f ? 'bg-tuesday-600/20 text-tuesday-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-hover'}`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span className="text-xs text-zinc-600 ml-2">{filtered.length} commands</span>
        </div>

        {/* Command history */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="space-y-1">
            {filtered.map(cmd => (
              <div key={cmd.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-raised group">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  cmd.status === 'executed' ? 'bg-success' : cmd.status === 'failed' ? 'bg-danger' : 'bg-zinc-600'
                }`} />
                <span className="text-sm text-zinc-300 truncate flex-1">{cmd.rawText}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                  cmd.mode === 'command' ? 'bg-tuesday-600/20 text-tuesday-400' : 'bg-zinc-800 text-zinc-500'
                }`}>{cmd.mode}</span>
                {cmd.toolName && <span className="text-[10px] text-zinc-600 font-mono shrink-0">{cmd.toolName}</span>}
                <span className="text-[10px] text-zinc-700 shrink-0">{timeAgo(cmd.createdAt)}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-zinc-600 py-12">No commands yet. Start typing above.</p>
            )}
          </div>
        </div>
      </div>

      {/* Right panel: Slash reference */}
      <div className="w-72 shrink-0 border-l border-border bg-surface-raised p-4 overflow-y-auto">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Slash Commands</h3>
        <div className="space-y-2">
          {SLASH_COMMANDS.map(s => (
            <button
              key={s.cmd}
              onClick={() => { setInput(s.cmd + ' '); inputRef.current?.focus(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-hover"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{s.icon}</span>
                <span className="text-xs text-zinc-300 font-mono">{s.cmd}</span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-0.5 pl-6">{s.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border-subtle">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Shortcuts</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-zinc-500">Execute</span><kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-zinc-600">Enter</kbd></div>
            <div className="flex justify-between"><span className="text-zinc-500">Voice input</span><kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-zinc-600">⌘⇧T</kbd></div>
            <div className="flex justify-between"><span className="text-zinc-500">Clear</span><kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-zinc-600">Esc</kbd></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export const Route = createFileRoute('/command')({
  component: CommandCenterPage,
});

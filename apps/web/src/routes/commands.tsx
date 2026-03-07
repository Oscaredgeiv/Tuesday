import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface CommandEntry {
  id: string;
  rawText: string;
  mode: string;
  intent?: string;
  toolName?: string;
  actionId?: string;
  confidence?: number;
  createdAt: string;
}

function CommandsPage() {
  const [commands, setCommands] = useState<CommandEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCommandHistory(100).then((data) => {
      setCommands(data as CommandEntry[]);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <p className="text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Command History</h2>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Text</th>
              <th className="px-4 py-3 font-medium">Mode</th>
              <th className="px-4 py-3 font-medium">Intent / Tool</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {commands.map((cmd) => (
              <tr key={cmd.id} className="border-b border-border-subtle hover:bg-surface-raised">
                <td className="px-4 py-3 max-w-xs truncate">{cmd.rawText}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    cmd.mode === 'dictation'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {cmd.mode}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{cmd.intent ?? cmd.toolName ?? '-'}</td>
                <td className="px-4 py-3 text-zinc-400">
                  {cmd.confidence != null ? `${(cmd.confidence * 100).toFixed(0)}%` : '-'}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {new Date(cmd.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {commands.length === 0 && (
          <p className="p-4 text-zinc-500 text-center">No commands yet.</p>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/commands')({
  component: CommandsPage,
});

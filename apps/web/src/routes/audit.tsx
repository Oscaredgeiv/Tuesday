import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface AuditEntry {
  id: string;
  event: string;
  actionId?: string;
  agentId?: string;
  actor?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditLog(100).then((data) => {
      setLogs(data as AuditEntry[]);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <p className="text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Audit Log</h2>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Details</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border-subtle hover:bg-surface-raised">
                <td className="px-4 py-3 font-mono text-xs">{log.event}</td>
                <td className="px-4 py-3 text-zinc-400">{log.actor ?? '-'}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs max-w-xs truncate">
                  {log.details ? JSON.stringify(log.details) : '-'}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="p-4 text-zinc-500 text-center">No audit logs yet.</p>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/audit')({
  component: AuditPage,
});

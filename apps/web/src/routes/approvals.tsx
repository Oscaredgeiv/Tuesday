import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface PendingApproval {
  id: string;
  actionId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  action: {
    toolName: string;
    intent?: string;
    riskLevel: string;
    input: Record<string, unknown>;
  };
}

function ApprovalsPage() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    try {
      const data = await api.getPendingApprovals();
      setApprovals(data as PendingApproval[]);
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApprovals(); }, []);

  const handleDecide = async (id: string, approved: boolean) => {
    try {
      await api.decideApproval(id, approved);
      fetchApprovals();
    } catch (err) {
      console.error('Decision failed:', err);
    }
  };

  if (loading) return <p className="text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Pending Approvals</h2>

      {approvals.length === 0 ? (
        <p className="text-zinc-500">No pending approvals.</p>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => (
            <div key={a.id} className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{a.action.intent ?? a.action.toolName}</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Tool: {a.action.toolName} &middot; Risk: <RiskBadge level={a.action.riskLevel} />
                  </p>
                  <pre className="mt-2 text-xs text-zinc-500 bg-zinc-900 p-2 rounded">
                    {JSON.stringify(a.action.input, null, 2)}
                  </pre>
                  <p className="text-xs text-zinc-600 mt-2">
                    Expires: {new Date(a.expiresAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => handleDecide(a.id, true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDecide(a.id, false)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };
  return <span className={colors[level] ?? 'text-zinc-400'}>{level}</span>;
}

export const Route = createFileRoute('/approvals')({
  component: ApprovalsPage,
});

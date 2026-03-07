import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface AutomationEntry {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  status: string;
  totalRuns: number;
  failCount: number;
  lastRunAt?: string;
  nextRunAt?: string;
}

function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationEntry[]>([]);

  useEffect(() => {
    api.getAutomations().then(d => setAutomations(d as AutomationEntry[])).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Automations</h2>
          <p className="text-sm text-zinc-500 mt-1">Recurring tasks, scheduled reports, and event-driven routines.</p>
        </div>
        <button className="px-3 py-1.5 text-xs bg-tuesday-600 hover:bg-tuesday-500 text-white rounded-lg">
          + New Automation
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="bg-surface-raised border border-border rounded-xl p-12 text-center">
          <p className="text-zinc-500">No automations configured yet.</p>
          <p className="text-xs text-zinc-600 mt-1">Create recurring tasks, monitoring routines, or scheduled reports.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map(a => (
            <div key={a.id} className="bg-surface-raised border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${a.status === 'active' ? 'bg-success animate-pulse-glow' : a.status === 'error' ? 'bg-danger' : 'bg-zinc-600'}`} />
                    <p className="text-sm font-medium text-zinc-200">{a.name}</p>
                  </div>
                  {a.description && <p className="text-xs text-zinc-500 mt-1 ml-4">{a.description}</p>}
                  <div className="flex items-center gap-3 mt-2 ml-4">
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">{a.trigger}</span>
                    <span className="text-[10px] text-zinc-600">{a.totalRuns} runs</span>
                    {a.failCount > 0 && <span className="text-[10px] text-danger">{a.failCount} failures</span>}
                    {a.nextRunAt && <span className="text-[10px] text-zinc-600">Next: {new Date(a.nextRunAt).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-xs text-zinc-400 bg-surface border border-border rounded-lg hover:bg-surface-hover">
                    {a.status === 'active' ? 'Pause' : 'Resume'}
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

export const Route = createFileRoute('/automations')({
  component: AutomationsPage,
});

import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface WorkflowEntry {
  id: string;
  name: string;
  description?: string;
  triggerPhrase?: string;
  steps: unknown[];
  enabled: boolean;
  source: string;
}

function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [runResult, setRunResult] = useState<string | null>(null);

  useEffect(() => {
    api.getWorkflows().then((data) => {
      setWorkflows(data as WorkflowEntry[]);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleRun = async (id: string) => {
    try {
      const result = await api.runWorkflow(id);
      setRunResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setRunResult(`Error: ${err instanceof Error ? err.message : err}`);
    }
  };

  if (loading) return <p className="text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Workflows</h2>

      <div className="space-y-3">
        {workflows.map((w) => (
          <div key={w.id} className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{w.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    w.source === 'builtin' ? 'bg-zinc-700 text-zinc-400' : 'bg-tuesday-600/20 text-tuesday-400'
                  }`}>
                    {w.source}
                  </span>
                </div>
                {w.description && <p className="text-sm text-zinc-500 mt-1">{w.description}</p>}
                {w.triggerPhrase && (
                  <p className="text-xs text-zinc-600 mt-1">
                    Voice trigger: "{w.triggerPhrase}"
                  </p>
                )}
                <p className="text-xs text-zinc-600 mt-1">{w.steps.length} steps</p>
              </div>
              <button
                onClick={() => handleRun(w.id)}
                disabled={!w.enabled}
                className="px-3 py-1.5 bg-tuesday-600 hover:bg-tuesday-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                Run
              </button>
            </div>
          </div>
        ))}
      </div>

      {runResult && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Run Result</h3>
          <pre className="text-xs text-zinc-400 overflow-auto max-h-48">{runResult}</pre>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/workflows')({
  component: WorkflowsPage,
});

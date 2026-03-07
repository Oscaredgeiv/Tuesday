import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ToolEntry {
  name: string;
  description: string;
  category: string;
  riskLevel: string;
  requiresApproval: boolean;
  requiresAgent: boolean;
}

function SettingsPage() {
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [providers, setProviders] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getTools(), api.getProviders()]).then(([t, p]) => {
      setTools(t as ToolEntry[]);
      setProviders(p);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <p className="text-zinc-500">Loading...</p>;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">Settings</h2>

      {/* Providers */}
      <section>
        <h3 className="text-lg font-medium mb-3">Model Providers</h3>
        <div className="bg-surface rounded-xl border border-border p-4 space-y-2">
          <ProviderRow label="Anthropic (Claude)" active={!!providers.anthropic} />
          <ProviderRow label="OpenAI (GPT)" active={!!providers.openai} />
          <ProviderRow label="Transcription (Whisper)" active={!!providers.transcription} />
          <p className="text-xs text-zinc-600 pt-2">
            Default provider: {(providers.defaultProvider as string) ?? 'none'}
          </p>
        </div>
      </section>

      {/* Tools */}
      <section>
        <h3 className="text-lg font-medium mb-3">Registered Tools</h3>
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">Tool</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Approval</th>
                <th className="px-4 py-3 font-medium">Agent</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => (
                <tr key={t.name} className="border-b border-border-subtle">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.description}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{t.category}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={
                      t.riskLevel === 'low' ? 'text-emerald-400' :
                      t.riskLevel === 'medium' ? 'text-amber-400' :
                      t.riskLevel === 'high' ? 'text-orange-400' : 'text-red-400'
                    }>{t.riskLevel}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{t.requiresApproval ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-xs">{t.requiresAgent ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ProviderRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-300">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-500'
      }`}>
        {active ? 'Configured' : 'Not configured'}
      </span>
    </div>
  );
}

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

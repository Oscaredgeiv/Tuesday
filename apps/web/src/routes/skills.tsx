import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Playbook {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  totalRuns: number;
  successRate: number;
  lastRunAt?: string;
  steps: Array<{ id: string; toolName: string; description: string }>;
  enabled: boolean;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  successRate: number;
  totalRuns: number;
  enabled: boolean;
}

function SkillsPage() {
  const [view, setView] = useState<'playbooks' | 'skills'>('playbooks');
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    api.getPlaybooks().then(d => setPlaybooks(d as Playbook[])).catch(() => {});
    api.getSkills().then(d => setSkills(d as Skill[])).catch(() => {});
  }, []);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Skills & Playbooks</h2>
          <p className="text-sm text-zinc-500 mt-1">Reusable workflows, prompts, and SOPs. Track performance and iterate.</p>
        </div>

        {/* View toggle */}
        <div className="px-6 pb-3 flex items-center gap-1">
          <button onClick={() => setView('playbooks')} className={`px-3 py-1.5 text-xs rounded-full ${view === 'playbooks' ? 'bg-tuesday-600/20 text-tuesday-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            Playbooks
          </button>
          <button onClick={() => setView('skills')} className={`px-3 py-1.5 text-xs rounded-full ${view === 'skills' ? 'bg-tuesday-600/20 text-tuesday-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            Skills
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          {view === 'playbooks' ? (
            <div className="space-y-2">
              {playbooks.length === 0 ? (
                <p className="text-center text-sm text-zinc-600 py-12">No playbooks yet. Create one from a successful session or workflow.</p>
              ) : playbooks.map(pb => (
                <button
                  key={pb.id}
                  onClick={() => setSelected(pb.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selected === pb.id ? 'bg-tuesday-600/5 border-tuesday-600/20' : 'bg-surface-raised border-border hover:border-border-active'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{pb.name}</p>
                      {pb.description && <p className="text-xs text-zinc-500 mt-1">{pb.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {pb.category && <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">{pb.category}</span>}
                        <span className="text-[10px] text-zinc-600">{pb.steps?.length ?? 0} steps</span>
                        <span className="text-[10px] text-zinc-600">·</span>
                        <span className="text-[10px] text-zinc-600">{pb.totalRuns} runs</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <SuccessRate value={pb.successRate} />
                      <button
                        onClick={(e) => { e.stopPropagation(); api.runPlaybook(pb.id); }}
                        className="px-3 py-1.5 text-xs bg-tuesday-600 hover:bg-tuesday-500 text-white rounded-lg"
                      >
                        Run
                      </button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {skills.length === 0 ? (
                <p className="text-center text-sm text-zinc-600 py-12">No skills tracked yet. Skills are logged automatically from command usage.</p>
              ) : skills.map(sk => (
                <div key={sk.id} className="flex items-center justify-between p-4 bg-surface-raised rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{sk.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">{sk.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">{sk.category}</span>
                      <span className="text-[10px] text-zinc-600">{sk.totalRuns} executions</span>
                    </div>
                  </div>
                  <SuccessRate value={sk.successRate} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="w-80 shrink-0 border-l border-border bg-surface-raised overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Details</h3>
        {selected ? (
          <p className="text-xs text-zinc-400">Playbook detail view — select a playbook to see steps, run history, and performance.</p>
        ) : (
          <p className="text-sm text-zinc-600">Select a playbook or skill to view details.</p>
        )}
      </div>
    </div>
  );
}

function SuccessRate({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger';
  return <span className={`text-sm font-semibold ${color}`}>{pct}%</span>;
}

export const Route = createFileRoute('/skills')({
  component: SkillsPage,
});

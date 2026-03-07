import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

// -- Types --

interface ToolEntry {
  name: string;
  description: string;
  category: string;
  riskLevel: string;
  requiresApproval: boolean;
}

interface ProviderInfo {
  anthropic?: boolean;
  openai?: boolean;
  transcription?: boolean;
  defaultProvider?: string;
}

type TabId = 'hotkeys' | 'audio' | 'providers' | 'tools' | 'privacy';

const TABS: { id: TabId; label: string }[] = [
  { id: 'hotkeys', label: 'Hotkeys' },
  { id: 'audio', label: 'Audio' },
  { id: 'providers', label: 'Providers' },
  { id: 'tools', label: 'Tools' },
  { id: 'privacy', label: 'Privacy' },
];

const DEFAULT_HOTKEYS: Record<string, string> = {
  push_to_talk: 'Ctrl+Shift+T',
  execute_command: 'Enter',
  command_palette: 'Ctrl+K',
  save_memory: 'Ctrl+Shift+M',
  open_library: 'Ctrl+Shift+L',
  open_voice: 'Ctrl+Shift+V',
};

const HOTKEY_LABELS: Record<string, string> = {
  push_to_talk: 'Push to Talk',
  execute_command: 'Execute Command',
  command_palette: 'Command Palette',
  save_memory: 'Save Memory',
  open_library: 'Open Library',
  open_voice: 'Open Voice',
};

// -- Components --

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
        enabled
          ? 'bg-tuesday-600 text-white'
          : 'bg-zinc-700 text-zinc-400'
      }`}
    >
      {enabled ? 'On' : 'Off'}
    </button>
  );
}

function ProviderRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-zinc-300">{label}</span>
      <span
        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          active
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-zinc-700 text-zinc-500'
        }`}
      >
        {active ? 'Configured' : 'Not configured'}
      </span>
    </div>
  );
}

// -- Tab Panels --

function HotkeysTab({
  hotkeys,
  onUpdate,
}: {
  hotkeys: Record<string, string>;
  onUpdate: (action: string, binding: string) => void;
}) {
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (action: string, current: string) => {
    setEditingAction(action);
    setEditValue(current);
  };

  const saveEdit = () => {
    if (editingAction && editValue.trim()) {
      onUpdate(editingAction, editValue.trim());
      setEditingAction(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingAction(null);
    setEditValue('');
  };

  const merged = { ...DEFAULT_HOTKEYS, ...hotkeys };

  return (
    <div className="bg-surface-raised border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-zinc-500">
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Binding</th>
            <th className="px-4 py-3 font-medium w-24"></th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(merged).map(([action, binding]) => (
            <tr key={action} className="border-b border-border-subtle">
              <td className="px-4 py-3 text-zinc-100">
                {HOTKEY_LABELS[action] ?? action}
              </td>
              <td className="px-4 py-3">
                {editingAction === action ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                    className="bg-zinc-800 border border-border rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-tuesday-500 w-40"
                  />
                ) : (
                  <kbd className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 font-mono">
                    {binding}
                  </kbd>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {editingAction === action ? (
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={saveEdit}
                      className="text-xs text-tuesday-400 hover:text-tuesday-300"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(action, binding)}
                    className="text-xs text-zinc-500 hover:text-tuesday-400 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AudioTab() {
  const [voiceMode, setVoiceMode] = useState<'mixed' | 'dictation' | 'command'>(
    'mixed'
  );
  const [autoSend, setAutoSend] = useState(false);

  return (
    <div className="space-y-4">
      {/* Input Device */}
      <div className="bg-surface-raised border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-zinc-100 mb-3">Input Device</h3>
        <select
          disabled
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-400 cursor-not-allowed"
        >
          <option>Default Microphone</option>
        </select>
        <p className="text-xs text-zinc-500 mt-2">
          Device selection requires browser permissions
        </p>
      </div>

      {/* Voice Mode */}
      <div className="bg-surface-raised border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-zinc-100 mb-3">Voice Mode</h3>
        <div className="flex gap-2">
          {(['mixed', 'dictation', 'command'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setVoiceMode(mode)}
              className={`px-4 py-2 text-sm rounded-lg font-medium capitalize transition-colors ${
                voiceMode === mode
                  ? 'bg-tuesday-600 text-white'
                  : 'bg-zinc-700 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Mixed: auto-detect intent. Dictation: text only. Command: actions only.
        </p>
      </div>

      {/* Auto-Send */}
      <div className="bg-surface-raised border border-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">Auto-Send</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Automatically send transcribed text after voice input ends
          </p>
        </div>
        <Toggle enabled={autoSend} onToggle={() => setAutoSend(!autoSend)} />
      </div>
    </div>
  );
}

function ProvidersTab({ providers }: { providers: ProviderInfo }) {
  return (
    <div className="space-y-4">
      <div className="bg-surface-raised border border-border rounded-xl p-4 space-y-1">
        <ProviderRow label="Anthropic (Claude)" active={!!providers.anthropic} />
        <ProviderRow label="OpenAI (GPT)" active={!!providers.openai} />
        <ProviderRow
          label="Transcription (Whisper)"
          active={!!providers.transcription}
        />
      </div>
      <div className="bg-surface-raised border border-border rounded-xl p-4">
        <p className="text-xs text-zinc-500">
          Default provider:{' '}
          <span className="text-zinc-300 font-medium">
            {providers.defaultProvider ?? 'none'}
          </span>
        </p>
      </div>
    </div>
  );
}

function ToolsTab({ tools }: { tools: ToolEntry[] }) {
  return (
    <div className="bg-surface-raised border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-zinc-500">
            <th className="px-4 py-3 font-medium">Tool</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Risk</th>
            <th className="px-4 py-3 font-medium">Approval</th>
          </tr>
        </thead>
        <tbody>
          {tools.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                No tools registered
              </td>
            </tr>
          )}
          {tools.map((t) => (
            <tr key={t.name} className="border-b border-border-subtle">
              <td className="px-4 py-3">
                <p className="font-mono text-xs text-zinc-100">{t.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t.description}</p>
              </td>
              <td className="px-4 py-3 text-zinc-400 text-xs">{t.category}</td>
              <td className="px-4 py-3 text-xs">
                <span
                  className={
                    t.riskLevel === 'low'
                      ? 'text-emerald-400'
                      : t.riskLevel === 'medium'
                        ? 'text-amber-400'
                        : t.riskLevel === 'high'
                          ? 'text-orange-400'
                          : 'text-red-400'
                  }
                >
                  {t.riskLevel}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-zinc-400">
                {t.requiresApproval ? 'Yes' : 'No'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrivacyTab() {
  const [saveHistory, setSaveHistory] = useState(true);
  const [saveTranscripts, setSaveTranscripts] = useState(true);
  const [allowLearning, setAllowLearning] = useState(false);

  const items = [
    {
      label: 'Save Command History',
      description: 'Store executed commands for recall and search',
      enabled: saveHistory,
      onToggle: () => setSaveHistory(!saveHistory),
    },
    {
      label: 'Save Voice Transcripts',
      description: 'Retain transcribed voice input in session logs',
      enabled: saveTranscripts,
      onToggle: () => setSaveTranscripts(!saveTranscripts),
    },
    {
      label: 'Allow Learning from Sessions',
      description: 'Let the system learn patterns from your usage',
      enabled: allowLearning,
      onToggle: () => setAllowLearning(!allowLearning),
    },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-surface-raised border border-border rounded-xl p-4 flex items-center justify-between"
        >
          <div>
            <h3 className="text-sm font-medium text-zinc-100">{item.label}</h3>
            <p className="text-xs text-zinc-500 mt-1">{item.description}</p>
          </div>
          <Toggle enabled={item.enabled} onToggle={item.onToggle} />
        </div>
      ))}
    </div>
  );
}

// -- Main Page --

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('hotkeys');
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [providers, setProviders] = useState<ProviderInfo>({});
  const [hotkeys, setHotkeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getTools(), api.getProviders(), api.getHotkeys()])
      .then(([t, p, h]) => {
        setTools(t as ToolEntry[]);
        setProviders(p as ProviderInfo);
        const hotkeyMap: Record<string, string> = {};
        for (const entry of h as Array<{ action: string; binding: string }>) {
          hotkeyMap[entry.action] = entry.binding;
        }
        setHotkeys(hotkeyMap);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        setLoading(false);
      });
  }, []);

  const handleUpdateHotkey = useCallback(
    (action: string, binding: string) => {
      setHotkeys((prev) => ({ ...prev, [action]: binding }));
      api.updateHotkey(action, binding).catch(console.error);
    },
    []
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-zinc-100">Settings</h1>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-tuesday-400 border-b-2 border-tuesday-500'
                : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-500 text-sm">Loading settings...</p>
        </div>
      ) : (
        <>
          {activeTab === 'hotkeys' && (
            <HotkeysTab hotkeys={hotkeys} onUpdate={handleUpdateHotkey} />
          )}
          {activeTab === 'audio' && <AudioTab />}
          {activeTab === 'providers' && <ProvidersTab providers={providers} />}
          {activeTab === 'tools' && <ToolsTab tools={tools} />}
          {activeTab === 'privacy' && <PrivacyTab />}
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

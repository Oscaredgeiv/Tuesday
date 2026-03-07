import { useAuthStore } from './store.js';

const BASE_URL = '/api';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; expiresAt: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Commands
  sendCommand: (text: string, agentId?: string) =>
    request('/commands', { method: 'POST', body: JSON.stringify({ text, agentId }) }),
  getCommandHistory: (limit = 50) =>
    request<unknown[]>(`/commands/history?limit=${limit}`),

  // Actions
  getActions: (limit = 50) => request<unknown[]>(`/actions?limit=${limit}`),
  getAction: (id: string) => request(`/actions/${id}`),
  cancelAction: (id: string) =>
    request(`/actions/${id}/cancel`, { method: 'POST' }),

  // Approvals
  getPendingApprovals: () => request<unknown[]>('/approvals/pending'),
  decideApproval: (id: string, approved: boolean, reason?: string) =>
    request(`/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ approved, reason }),
    }),

  // Agents
  getAgents: () => request<unknown[]>('/agents'),

  // Workflows
  getWorkflows: () => request<unknown[]>('/workflows'),
  runWorkflow: (id: string, variables?: Record<string, string>) =>
    request(`/workflows/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ variables }),
    }),

  // Audit
  getAuditLog: (limit = 50) => request<unknown[]>(`/audit?limit=${limit}`),

  // Settings
  getTools: () => request<unknown[]>('/settings/tools'),
  getProviders: () => request<Record<string, unknown>>('/settings/providers'),
  getHotkeys: () => request<unknown[]>('/settings/hotkeys'),
  updateHotkey: (action: string, binding: string) =>
    request(`/settings/hotkeys/${action}`, {
      method: 'PUT',
      body: JSON.stringify({ binding, enabled: true }),
    }),

  // Dashboard
  getDashboardStats: () => request<Record<string, number>>('/dashboard/stats'),

  // Sessions
  getSessions: (limit = 20, status?: string) =>
    request<unknown[]>(`/sessions?limit=${limit}${status ? `&status=${status}` : ''}`),
  getSession: (id: string) => request(`/sessions/${id}`),

  // Memory
  getMemoryItems: (limit = 50, status?: string, type?: string) =>
    request<unknown[]>(`/memory?limit=${limit}${status ? `&status=${status}` : ''}${type ? `&type=${type}` : ''}`),
  getMemoryItem: (id: string) => request(`/memory/${id}`),
  reviewMemory: (id: string, decision: string, reason?: string) =>
    request(`/memory/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    }),

  // Skills
  getSkills: () => request<unknown[]>('/skills'),
  getSkill: (id: string) => request(`/skills/${id}`),

  // Playbooks
  getPlaybooks: () => request<unknown[]>('/playbooks'),
  getPlaybook: (id: string) => request(`/playbooks/${id}`),
  runPlaybook: (id: string) =>
    request(`/playbooks/${id}/run`, { method: 'POST' }),

  // Library
  getLibraryFolders: () => request<unknown[]>('/library/folders'),
  getLibraryFolder: (id: string) => request(`/library/folders/${id}`),
  getLibraryDoc: (id: string) => request(`/library/docs/${id}`),
  searchLibrary: (q: string) => request<unknown[]>(`/library/search?q=${encodeURIComponent(q)}`),

  // Automations
  getAutomations: () => request<unknown[]>('/automations'),
  getAutomation: (id: string) => request(`/automations/${id}`),

  // Recent commands (for command center)
  getRecentCommands: (limit = 50, mode?: string) =>
    request<unknown[]>(`/commands/history?limit=${limit}${mode ? `&mode=${mode}` : ''}`),
};

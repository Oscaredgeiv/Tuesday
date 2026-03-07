export const ACTION_STATUSES = [
  'requested',
  'planned',
  'awaiting_approval',
  'approved',
  'denied',
  'running',
  'verifying',
  'succeeded',
  'failed',
  'cancelled',
] as const;

export const APPROVAL_STATUSES = ['pending', 'approved', 'denied', 'expired'] as const;

export const AGENT_STATUSES = ['online', 'offline', 'busy'] as const;

export const COMMAND_MODES = ['dictation', 'command'] as const;

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export const TOOL_CATEGORIES = [
  'workstation',
  'browser',
  'orbit',
  'communication',
  'workflow',
  'system',
] as const;

export const MODEL_PROVIDERS = ['anthropic', 'openai'] as const;

export const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

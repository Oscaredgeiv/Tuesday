import { describe, it, expect } from 'vitest';
import {
  ActionSchema,
  ActionStatusSchema,
  ApprovalDecisionSchema,
  AgentRegistrationSchema,
  CommandRequestSchema,
  CreateWorkflowSchema,
  LoginRequestSchema,
  SearchOrbitCustomerInputSchema,
} from '../index.js';

describe('ActionStatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(ActionStatusSchema.parse('requested')).toBe('requested');
    expect(ActionStatusSchema.parse('succeeded')).toBe('succeeded');
  });

  it('rejects invalid statuses', () => {
    expect(() => ActionStatusSchema.parse('invalid')).toThrow();
  });
});

describe('ApprovalDecisionSchema', () => {
  it('accepts valid decision', () => {
    const result = ApprovalDecisionSchema.parse({ approved: true, reason: 'looks good' });
    expect(result.approved).toBe(true);
  });

  it('accepts without reason', () => {
    const result = ApprovalDecisionSchema.parse({ approved: false });
    expect(result.approved).toBe(false);
    expect(result.reason).toBeUndefined();
  });
});

describe('AgentRegistrationSchema', () => {
  it('validates agent registration', () => {
    const result = AgentRegistrationSchema.parse({
      name: 'workstation',
      hostname: 'my-laptop',
      os: 'linux-x64',
    });
    expect(result.name).toBe('workstation');
  });

  it('rejects incomplete registration', () => {
    expect(() => AgentRegistrationSchema.parse({ name: 'test' })).toThrow();
  });
});

describe('CommandRequestSchema', () => {
  it('accepts minimal command', () => {
    const result = CommandRequestSchema.parse({ text: 'open gmail' });
    expect(result.text).toBe('open gmail');
  });

  it('accepts command with context', () => {
    const result = CommandRequestSchema.parse({
      text: 'hello world',
      context: { activeWindow: 'WebStorm', activeTextField: true },
    });
    expect(result.context?.activeTextField).toBe(true);
  });
});

describe('SearchOrbitCustomerInputSchema', () => {
  it('validates search input', () => {
    const result = SearchOrbitCustomerInputSchema.parse({ query: 'Forrest', limit: 5 });
    expect(result.query).toBe('Forrest');
    expect(result.limit).toBe(5);
  });

  it('applies default limit', () => {
    const result = SearchOrbitCustomerInputSchema.parse({ query: 'test' });
    expect(result.limit).toBe(10);
  });
});

describe('LoginRequestSchema', () => {
  it('rejects empty credentials', () => {
    expect(() => LoginRequestSchema.parse({ username: '', password: '' })).toThrow();
  });
});

describe('CreateWorkflowSchema', () => {
  it('validates workflow creation', () => {
    const result = CreateWorkflowSchema.parse({
      name: 'Morning Setup',
      steps: [
        {
          id: 'step-1',
          toolName: 'open_url',
          input: { url: 'https://mail.google.com' },
          description: 'Open Gmail',
        },
      ],
    });
    expect(result.steps).toHaveLength(1);
  });

  it('rejects empty steps', () => {
    expect(() => CreateWorkflowSchema.parse({ name: 'Empty', steps: [] })).toThrow();
  });
});

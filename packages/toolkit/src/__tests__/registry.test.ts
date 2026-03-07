import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from '../registry.js';
import type { ToolDefinition } from '../types.js';

function makeTool(name: string, overrides?: Partial<ToolDefinition>): ToolDefinition {
  return {
    name,
    description: `Test tool: ${name}`,
    category: 'system',
    inputSchema: z.object({ value: z.string() }),
    riskLevel: 'low',
    requiresApproval: false,
    requiresAgent: false,
    execute: async (input) => ({
      success: true,
      message: `Executed ${name}`,
      data: input,
      timestamp: new Date().toISOString(),
    }),
    ...overrides,
  };
}

describe('ToolRegistry', () => {
  it('registers and retrieves tools', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('test_tool'));

    expect(registry.get('test_tool')).toBeDefined();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('throws on duplicate registration', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('dupe'));
    expect(() => registry.register(makeTool('dupe'))).toThrow('already registered');
  });

  it('lists tools', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('a'));
    registry.register(makeTool('b'));
    expect(registry.list()).toHaveLength(2);
  });

  it('filters by category', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('sys', { category: 'system' }));
    registry.register(makeTool('ws', { category: 'workstation' }));
    expect(registry.listByCategory('system')).toHaveLength(1);
  });

  it('returns policy for registered tool', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('safe', { riskLevel: 'low', requiresApproval: false }));
    const policy = registry.getPolicy('safe');
    expect(policy.allowed).toBe(true);
    expect(policy.requiresApproval).toBe(false);
  });

  it('returns denied policy for unknown tool', () => {
    const registry = new ToolRegistry();
    const policy = registry.getPolicy('unknown');
    expect(policy.allowed).toBe(false);
  });

  it('generates tool manifest', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('manifest_test'));
    const manifest = registry.getToolManifest();
    expect(manifest).toHaveLength(1);
    expect(manifest[0].name).toBe('manifest_test');
  });
});

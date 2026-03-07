import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from '../registry.js';
import { ActionExecutor } from '../executor.js';
import type { ToolDefinition } from '../types.js';

describe('ActionExecutor', () => {
  function setup() {
    const registry = new ToolRegistry();
    const tool: ToolDefinition = {
      name: 'echo',
      description: 'Echoes input',
      category: 'system',
      inputSchema: z.object({ message: z.string() }),
      riskLevel: 'low',
      requiresApproval: false,
      requiresAgent: false,
      async execute(input) {
        return {
          success: true,
          message: (input as { message: string }).message,
          timestamp: new Date().toISOString(),
        };
      },
    };
    registry.register(tool);
    return { registry, executor: new ActionExecutor(registry) };
  }

  it('executes a tool successfully', async () => {
    const { executor } = setup();
    const result = await executor.execute('echo', { message: 'hello' }, { actionId: 'test-1' });
    expect(result.success).toBe(true);
    expect(result.message).toBe('hello');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns error for invalid input', async () => {
    const { executor } = setup();
    const result = await executor.execute('echo', { message: 123 }, { actionId: 'test-2' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('throws for unknown tool', async () => {
    const { executor } = setup();
    await expect(executor.execute('nope', {}, { actionId: 'test-3' })).rejects.toThrow();
  });
});

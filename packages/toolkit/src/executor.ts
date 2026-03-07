import type { ActionResult } from '@tuesday/shared';
import type { ToolContext, ToolDefinition } from './types.js';
import { ToolRegistry } from './registry.js';

export class ActionExecutor {
  constructor(private registry: ToolRegistry) {}

  async execute(
    toolName: string,
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ActionResult> {
    const tool = this.registry.getOrThrow(toolName);
    const startTime = Date.now();

    // Validate input
    const parsed = tool.inputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: `Invalid input for tool "${toolName}"`,
        error: parsed.error.message,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }

    // If the tool requires agent execution, delegate to the agent
    if (tool.requiresAgent && context.executeOnAgent) {
      return context.executeOnAgent(toolName, parsed.data as Record<string, unknown>);
    }

    try {
      const result = await tool.execute(parsed.data, context);
      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        message: `Tool "${toolName}" failed`,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

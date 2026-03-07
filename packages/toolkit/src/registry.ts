import type { ToolDefinition, ActionPolicy } from './types.js';
import type { RiskLevel } from '@tuesday/shared';

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getOrThrow(name: string): ToolDefinition {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return tool;
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  listByCategory(category: string): ToolDefinition[] {
    return this.list().filter((t) => t.category === category);
  }

  /** Returns the names and descriptions for LLM tool-selection prompts */
  getToolManifest(): Array<{ name: string; description: string; inputSchema: unknown }> {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }

  /** Check policy for a tool by name */
  getPolicy(toolName: string): ActionPolicy {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        toolName,
        allowed: false,
        requiresApproval: false,
        riskLevel: 'critical' as RiskLevel,
        reason: `Tool "${toolName}" not found in registry`,
      };
    }
    return {
      toolName,
      allowed: true,
      requiresApproval: tool.requiresApproval,
      riskLevel: tool.riskLevel,
    };
  }
}

import type { z } from 'zod';
import type { RiskLevel, ActionResult } from '@tuesday/shared';

export interface ToolDefinition<TInput = Record<string, unknown>> {
  name: string;
  description: string;
  category: 'workstation' | 'browser' | 'orbit' | 'communication' | 'workflow' | 'system';
  inputSchema: z.ZodType<TInput>;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  requiresAgent: boolean; // true if the tool runs on the local agent
  execute: ToolExecutor<TInput>;
}

export type ToolExecutor<TInput = Record<string, unknown>> = (
  input: TInput,
  context: ToolContext,
) => Promise<ActionResult>;

export interface ToolContext {
  actionId: string;
  agentId?: string;
  /** Send a command to the connected agent for local execution */
  executeOnAgent?: (toolName: string, input: Record<string, unknown>) => Promise<ActionResult>;
  /** Orbit API client */
  orbit?: OrbitClient;
}

export interface OrbitClient {
  searchCustomers(query: string, limit?: number): Promise<unknown>;
  getCustomer(id: string): Promise<unknown>;
  createTask(input: Record<string, unknown>): Promise<unknown>;
  createJob(input: Record<string, unknown>): Promise<unknown>;
  moveStage(jobId: string, stageId: string): Promise<unknown>;
  createNote(input: Record<string, unknown>): Promise<unknown>;
}

export interface ActionPolicy {
  toolName: string;
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  reason?: string;
}

import { z } from 'zod';
import { ACTION_STATUSES, RISK_LEVELS } from '../constants.js';

export const ActionStatusSchema = z.enum(ACTION_STATUSES);
export type ActionStatus = z.infer<typeof ActionStatusSchema>;

export const RiskLevelSchema = z.enum(RISK_LEVELS);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const ActionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.string().datetime(),
  durationMs: z.number().optional(),
});
export type ActionResult = z.infer<typeof ActionResultSchema>;

export const ActionSchema = z.object({
  id: z.string(),
  toolName: z.string(),
  intent: z.string().optional(),
  input: z.record(z.unknown()),
  output: ActionResultSchema.optional(),
  status: ActionStatusSchema,
  riskLevel: RiskLevelSchema,
  requiresApproval: z.boolean(),
  agentId: z.string().optional(),
  approvalId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Action = z.infer<typeof ActionSchema>;

export const CreateActionRequestSchema = z.object({
  toolName: z.string(),
  intent: z.string().optional(),
  input: z.record(z.unknown()),
  agentId: z.string().optional(),
});
export type CreateActionRequest = z.infer<typeof CreateActionRequestSchema>;

export const ActionPlanSchema = z.object({
  steps: z.array(
    z.object({
      toolName: z.string(),
      input: z.record(z.unknown()),
      description: z.string(),
      riskLevel: RiskLevelSchema,
    }),
  ),
  reasoning: z.string(),
});
export type ActionPlan = z.infer<typeof ActionPlanSchema>;

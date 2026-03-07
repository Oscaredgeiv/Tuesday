import { z } from 'zod';

export const WorkflowStepSchema = z.object({
  id: z.string(),
  toolName: z.string(),
  input: z.record(z.unknown()),
  description: z.string(),
  continueOnError: z.boolean().optional(),
  condition: z.string().optional(), // simple expression referencing previous step results
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  triggerPhrase: z.string().optional(), // voice trigger like "run my morning setup"
  steps: z.array(WorkflowStepSchema),
  variables: z.record(z.string()).optional(),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const WorkflowRunSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.enum(['running', 'succeeded', 'failed', 'cancelled']),
  currentStepIndex: z.number(),
  stepResults: z.array(
    z.object({
      stepId: z.string(),
      success: z.boolean(),
      message: z.string(),
      data: z.unknown().optional(),
    }),
  ),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerPhrase: z.string().optional(),
  steps: z.array(WorkflowStepSchema).min(1),
  variables: z.record(z.string()).optional(),
});
export type CreateWorkflow = z.infer<typeof CreateWorkflowSchema>;

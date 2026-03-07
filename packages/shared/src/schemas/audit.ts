import { z } from 'zod';

export const AuditEventSchema = z.enum([
  'action.requested',
  'action.planned',
  'action.approval_required',
  'action.approved',
  'action.denied',
  'action.running',
  'action.succeeded',
  'action.failed',
  'action.cancelled',
  'approval.created',
  'approval.decided',
  'approval.expired',
  'agent.registered',
  'agent.connected',
  'agent.disconnected',
  'command.received',
  'command.classified',
  'workflow.started',
  'workflow.completed',
  'workflow.failed',
  'auth.login',
  'auth.logout',
]);
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  event: AuditEventSchema,
  actionId: z.string().optional(),
  agentId: z.string().optional(),
  actor: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

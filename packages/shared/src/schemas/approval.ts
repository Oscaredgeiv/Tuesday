import { z } from 'zod';
import { APPROVAL_STATUSES } from '../constants.js';

export const ApprovalStatusSchema = z.enum(APPROVAL_STATUSES);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalSchema = z.object({
  id: z.string(),
  actionId: z.string(),
  status: ApprovalStatusSchema,
  expiresAt: z.string().datetime(),
  decidedAt: z.string().datetime().optional(),
  decidedBy: z.string().optional(),
  reason: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type Approval = z.infer<typeof ApprovalSchema>;

export const ApprovalDecisionSchema = z.object({
  approved: z.boolean(),
  reason: z.string().optional(),
});
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApprovalDecisionSchema } from '@tuesday/shared';
import { approvalService } from '../services/approval.js';

export const approvalRouter = Router();

approvalRouter.get('/pending', requireAuth, async (_req, res) => {
  const pending = await approvalService.getPending();
  res.json(pending);
});

approvalRouter.post('/:id/decide', requireAuth, validate(ApprovalDecisionSchema), async (req: AuthRequest, res) => {
  try {
    const result = await approvalService.decide(
      req.params.id as string,
      req.body.approved,
      req.user?.sub,
      req.body.reason,
    );
    res.json({ success: true, action: result });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Decision failed' });
  }
});

// Expire stale approvals (call on a timer or cron)
approvalRouter.post('/expire', requireAuth, async (_req, res) => {
  const count = await approvalService.expireStale();
  res.json({ expired: count });
});

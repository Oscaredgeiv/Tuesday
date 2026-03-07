import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { auditService } from '../services/audit.js';

export const auditRouter = Router();

auditRouter.get('/', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const logs = await auditService.getRecent(limit, offset);
  res.json(logs);
});

auditRouter.get('/action/:actionId', requireAuth, async (req, res) => {
  const logs = await auditService.getByAction(req.params.actionId as string);
  res.json(logs);
});

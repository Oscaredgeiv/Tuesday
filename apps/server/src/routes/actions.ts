import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CreateActionRequestSchema } from '@tuesday/shared';
import { actionService } from '../services/action.js';

export const actionRouter = Router();

actionRouter.post('/', requireAuth, validate(CreateActionRequestSchema), async (req, res) => {
  try {
    const action = await actionService.create(req.body);
    res.status(201).json(action);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create action' });
  }
});

actionRouter.get('/', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const actions = await actionService.getRecent(limit, offset);
  res.json(actions);
});

actionRouter.get('/:id', requireAuth, async (req, res) => {
  const action = await actionService.getById(req.params.id as string);
  if (!action) {
    res.status(404).json({ error: 'Action not found' });
    return;
  }
  res.json(action);
});

actionRouter.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    await actionService.cancel(req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Cancel failed' });
  }
});

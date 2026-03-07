import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

export const hotkeyRouter = Router();

// List hotkey preferences
hotkeyRouter.get('/', requireAuth, async (req, res) => {
  try {
    const hotkeys = await prisma.hotkeyPreference.findMany({
      orderBy: { action: 'asc' },
    });

    res.json(hotkeys);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list hotkeys' });
  }
});

// Upsert hotkey preference
hotkeyRouter.put('/:action', requireAuth, async (req, res) => {
  try {
    const action = req.params.action as string;
    const { binding, enabled } = req.body;

    const data: Record<string, any> = {};
    if (binding !== undefined) data.binding = binding;
    if (enabled !== undefined) data.enabled = enabled;

    const hotkey = await prisma.hotkeyPreference.upsert({
      where: { action },
      update: data,
      create: {
        action,
        binding,
        enabled: enabled !== undefined ? enabled : true,
      },
    });

    res.json(hotkey);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to upsert hotkey' });
  }
});

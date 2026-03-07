import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

export const automationRouter = Router();

// List automations
automationRouter.get('/', requireAuth, async (req, res) => {
  try {
    const automations = await prisma.automation.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(automations);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list automations' });
  }
});

// Get automation by id
automationRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const automation = await prisma.automation.findUnique({
      where: { id: req.params.id as string },
    });

    if (!automation) {
      res.status(404).json({ error: 'Automation not found' });
      return;
    }

    res.json(automation);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get automation' });
  }
});

// Create automation
automationRouter.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, trigger, triggerConfig, playbookId, toolName, input } = req.body;

    const automation = await prisma.automation.create({
      data: {
        name,
        description,
        trigger,
        triggerConfig,
        playbookId,
        toolName,
        input,
      },
    });

    res.status(201).json(automation);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create automation' });
  }
});

// Update automation
automationRouter.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { status, name, description, trigger, triggerConfig, playbookId, toolName, input } = req.body;

    const data: Record<string, any> = {};
    if (status !== undefined) data.status = status;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (trigger !== undefined) data.trigger = trigger;
    if (triggerConfig !== undefined) data.triggerConfig = triggerConfig;
    if (playbookId !== undefined) data.playbookId = playbookId;
    if (toolName !== undefined) data.toolName = toolName;
    if (input !== undefined) data.input = input;

    const automation = await prisma.automation.update({
      where: { id: req.params.id as string },
      data,
    });

    res.json(automation);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update automation' });
  }
});

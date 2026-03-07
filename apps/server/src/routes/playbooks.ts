import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

export const playbookRouter = Router();

// List playbooks
playbookRouter.get('/', requireAuth, async (req, res) => {
  try {
    const playbooks = await prisma.playbook.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { steps: true },
        },
      },
    });

    const result = playbooks.map((p) => ({
      ...p,
      stepCount: p._count.steps,
      _count: undefined,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list playbooks' });
  }
});

// Get playbook by id
playbookRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const playbook = await prisma.playbook.findUnique({
      where: { id: req.params.id as string },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!playbook) {
      res.status(404).json({ error: 'Playbook not found' });
      return;
    }

    res.json(playbook);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get playbook' });
  }
});

// Create playbook
playbookRouter.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, category, triggerPhrase, steps } = req.body;

    const playbook = await prisma.playbook.create({
      data: {
        name,
        description,
        category,
        triggerPhrase,
        steps: steps
          ? {
              create: steps.map((step: any, index: number) => ({
                order: index,
                toolName: step.toolName,
                description: step.description,
                input: step.input || {},
                continueOnError: step.continueOnError || false,
                condition: step.condition,
              })),
            }
          : undefined,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json(playbook);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create playbook' });
  }
});

// Run playbook
playbookRouter.post('/:id/run', requireAuth, async (req, res) => {
  try {
    const playbookId = req.params.id as string;

    const playbook = await prisma.playbook.findUnique({
      where: { id: playbookId },
    });

    if (!playbook) {
      res.status(404).json({ error: 'Playbook not found' });
      return;
    }

    const run = await prisma.playbookRun.create({
      data: {
        playbookId,
        triggeredBy: req.body.triggeredBy || 'manual',
      },
    });

    // Increment totalRuns
    await prisma.playbook.update({
      where: { id: playbookId },
      data: {
        totalRuns: { increment: 1 },
        lastRunAt: new Date(),
      },
    });

    res.status(201).json(run);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to run playbook' });
  }
});

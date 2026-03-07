import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

export const skillRouter = Router();

// List skills
skillRouter.get('/', requireAuth, async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { totalRuns: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        successRate: true,
        totalRuns: true,
        lastRunAt: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list skills' });
  }
});

// Get skill by id
skillRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { id: req.params.id as string },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            input: true,
            output: true,
            success: true,
            durationMs: true,
            createdAt: true,
          },
        },
      },
    });

    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }

    res.json(skill);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get skill' });
  }
});

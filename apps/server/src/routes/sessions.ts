import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

export const sessionRouter = Router();

// List sessions
sessionRouter.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const status = req.query.status as string | undefined;

    const where = status ? { status: status as any } : {};

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              actions: true,
              commands: true,
              artifacts: true,
            },
          },
        },
      }),
      prisma.session.count({ where }),
    ]);

    res.json({ sessions, total });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list sessions' });
  }
});

// Get session by id
sessionRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id as string },
      include: {
        artifacts: true,
        _count: {
          select: { commands: true },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get session' });
  }
});

// Create session
sessionRouter.post('/', requireAuth, async (req, res) => {
  try {
    const { title, type } = req.body;

    const session = await prisma.session.create({
      data: {
        title,
        type: type || 'interactive',
      },
    });

    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create session' });
  }
});

// Update session
sessionRouter.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { status, summary, feedback, successScore } = req.body;

    const data: Record<string, any> = {};
    if (status !== undefined) data.status = status;
    if (summary !== undefined) data.summary = summary;
    if (feedback !== undefined) data.feedback = feedback;
    if (successScore !== undefined) data.successScore = successScore;
    if (status === 'completed' || status === 'abandoned') data.endedAt = new Date();

    const session = await prisma.session.update({
      where: { id: req.params.id as string },
      data,
    });

    res.json(session);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update session' });
  }
});

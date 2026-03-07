import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

export const memoryRouter = Router();

// List memory items
memoryRouter.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;

    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      prisma.memoryItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.memoryItem.count({ where }),
    ]);

    res.json({ items, total });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list memory items' });
  }
});

// Get memory item by id
memoryRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const item = await prisma.memoryItem.findUnique({
      where: { id: req.params.id as string },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'Memory item not found' });
      return;
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get memory item' });
  }
});

// Create memory item
memoryRouter.post('/', requireAuth, async (req, res) => {
  try {
    const { title, type, summary, content, tags, scope } = req.body;

    const item = await prisma.memoryItem.create({
      data: {
        title,
        type,
        summary,
        content,
        tags: tags || [],
        scope: scope || 'personal',
      },
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create memory item' });
  }
});

// Review memory item
memoryRouter.post('/:id/review', requireAuth, async (req, res) => {
  try {
    const { decision, reason } = req.body;
    const memoryItemId = req.params.id as string;

    const item = await prisma.memoryItem.findUnique({
      where: { id: memoryItemId },
    });

    if (!item) {
      res.status(404).json({ error: 'Memory item not found' });
      return;
    }

    const review = await prisma.memoryReview.create({
      data: {
        memoryItemId,
        decision,
        reason,
      },
    });

    // Update memory item status based on decision
    if (decision === 'approved' || decision === 'rejected') {
      await prisma.memoryItem.update({
        where: { id: memoryItemId },
        data: { status: decision },
      });
    }

    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to review memory item' });
  }
});

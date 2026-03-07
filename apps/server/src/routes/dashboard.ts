import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

export const dashboardRouter = Router();

// Get aggregate stats
dashboardRouter.get('/stats', requireAuth, async (req, res) => {
  try {
    const [
      totalSessions,
      activeSessions,
      pendingApprovals,
      memoryItemsCount,
      recentCommandsCount,
      agentCount,
      automationCount,
    ] = await Promise.all([
      prisma.session.count(),
      prisma.session.count({ where: { status: 'active' } }),
      prisma.approval.count({ where: { status: 'pending' } }),
      prisma.memoryItem.count(),
      prisma.command.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
          },
        },
      }),
      prisma.agent.count(),
      prisma.automation.count({ where: { status: 'active' } }),
    ]);

    res.json({
      totalSessions,
      activeSessions,
      pendingApprovals,
      memoryItemsCount,
      recentCommandsCount,
      agentCount,
      automationCount,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get dashboard stats' });
  }
});

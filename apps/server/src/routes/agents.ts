import { Router } from 'express';
import { requireAuth, requireAgentAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AgentRegistrationSchema } from '@tuesday/shared';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { auditService } from '../services/audit.js';

export const agentRouter = Router();

// Register a new agent
agentRouter.post('/register', requireAgentAuth, validate(AgentRegistrationSchema), async (req, res) => {
  const agent = await prisma.agent.create({
    data: {
      name: req.body.name,
      hostname: req.body.hostname,
      os: req.body.os,
      apiKey: config.AGENT_API_KEY,
    },
  });

  await auditService.log('agent.registered', {
    agentId: agent.id,
    details: { name: agent.name, hostname: agent.hostname, os: agent.os },
  });

  res.status(201).json({
    id: agent.id,
    name: agent.name,
    hostname: agent.hostname,
    os: agent.os,
    status: agent.status,
  });
});

// List agents
agentRouter.get('/', requireAuth, async (_req, res) => {
  const agents = await prisma.agent.findMany({
    orderBy: { lastSeenAt: 'desc' },
    select: {
      id: true,
      name: true,
      hostname: true,
      os: true,
      status: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
  res.json(agents);
});

// Get agent details
agentRouter.get('/:id', requireAuth, async (req, res) => {
  const agent = await prisma.agent.findUnique({
    where: { id: req.params.id as string },
    select: {
      id: true,
      name: true,
      hostname: true,
      os: true,
      status: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  res.json(agent);
});

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getToolRegistry } from '../setup-tools.js';

export const settingsRouter = Router();

// List available tools
settingsRouter.get('/tools', requireAuth, async (_req, res) => {
  const registry = getToolRegistry();
  const tools = registry.list().map((t) => ({
    name: t.name,
    description: t.description,
    category: t.category,
    riskLevel: t.riskLevel,
    requiresApproval: t.requiresApproval,
    requiresAgent: t.requiresAgent,
  }));
  res.json(tools);
});

// Provider status
settingsRouter.get('/providers', requireAuth, async (_req, res) => {
  const providers = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    defaultProvider: process.env.DEFAULT_MODEL_PROVIDER ?? 'anthropic',
    transcription: !!process.env.OPENAI_API_KEY,
  };
  res.json(providers);
});

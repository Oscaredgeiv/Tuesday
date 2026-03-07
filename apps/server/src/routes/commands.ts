import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CommandRequestSchema } from '@tuesday/shared';
import { commandService } from '../services/command.js';

export const commandRouter = Router();

// Process a text command
commandRouter.post('/', requireAuth, validate(CommandRequestSchema), async (req: AuthRequest, res) => {
  try {
    const result = await commandService.processText(req.body, req.body.agentId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Command processing failed' });
  }
});

// Process audio (multipart form upload)
commandRouter.post('/audio', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Expect raw audio body with content-type header
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const audioBuffer = Buffer.concat(chunks);

    const context = {
      activeWindow: req.headers['x-active-window'] as string | undefined,
      activeTextField: req.headers['x-active-text-field'] === 'true',
    };
    const agentId = req.headers['x-agent-id'] as string | undefined;

    const result = await commandService.processAudio(audioBuffer, context, agentId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Audio processing failed' });
  }
});

// Command history
commandRouter.get('/history', requireAuth, async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const history = await commandService.getHistory(limit, offset);
  res.json(history);
});

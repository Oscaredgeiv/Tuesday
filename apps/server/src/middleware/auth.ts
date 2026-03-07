import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { AuthTokenPayload } from '@tuesday/shared';

export interface AuthRequest extends Request {
  user?: AuthTokenPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthTokenPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAgentAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-agent-api-key'];
  if (apiKey !== config.AGENT_API_KEY) {
    res.status(401).json({ error: 'Invalid agent API key' });
    return;
  }
  next();
}

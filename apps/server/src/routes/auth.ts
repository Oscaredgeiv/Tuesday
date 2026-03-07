import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { validate } from '../middleware/validate.js';
import { LoginRequestSchema } from '@tuesday/shared';
import { auditService } from '../services/audit.js';

export const authRouter = Router();

// Simple single-user auth for MVP. Replace with proper auth provider later.
const ADMIN_USER = { username: 'admin', password: 'tuesday', role: 'admin' as const };

authRouter.post('/login', validate(LoginRequestSchema), async (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER.username || password !== ADMIN_USER.password) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  const token = jwt.sign(
    { sub: username, role: ADMIN_USER.role },
    config.JWT_SECRET,
    { expiresIn: '24h' },
  );

  await auditService.log('auth.login', { actor: username });

  res.json({ token, expiresAt: expiresAt.toISOString() });
});

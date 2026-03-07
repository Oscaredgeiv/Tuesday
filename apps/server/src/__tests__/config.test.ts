import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Test the env schema shape without actually loading config (which calls process.exit)
const envSchema = z.object({
  DATABASE_URL: z.string(),
  SERVER_PORT: z.coerce.number().default(4600),
  SERVER_HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().min(8),
  AGENT_API_KEY: z.string().min(8),
});

describe('Server config schema', () => {
  it('accepts valid config', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://localhost/test',
      JWT_SECRET: 'test-secret-123',
      AGENT_API_KEY: 'test-agent-key',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SERVER_PORT).toBe(4600);
    }
  });

  it('rejects short JWT secret', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://localhost/test',
      JWT_SECRET: 'short',
      AGENT_API_KEY: 'test-agent-key',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing DATABASE_URL', () => {
    const result = envSchema.safeParse({
      JWT_SECRET: 'test-secret-123',
      AGENT_API_KEY: 'test-agent-key',
    });
    expect(result.success).toBe(false);
  });
});

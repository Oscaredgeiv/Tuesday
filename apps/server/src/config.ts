import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  SERVER_PORT: z.coerce.number().default(4600),
  SERVER_HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().min(8),
  AGENT_API_KEY: z.string().min(8),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  DEFAULT_MODEL_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),
  DEFAULT_MODEL: z.string().default('claude-sonnet-4-20250514'),
  TRANSCRIPTION_PROVIDER: z.enum(['openai']).default('openai'),
  ORBIT_API_URL: z.string().optional(),
  ORBIT_API_KEY: z.string().optional(),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof envSchema>;

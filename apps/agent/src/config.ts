import { z } from 'zod';

const envSchema = z.object({
  AGENT_SERVER_URL: z.string().default('ws://localhost:4600'),
  AGENT_API_KEY: z.string().min(8),
  AGENT_NAME: z.string().default('workstation'),
  AGENT_HOTKEY: z.string().default('CommandOrControl+Shift+T'),
  SERVER_HTTP_URL: z.string().default('http://localhost:4600'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Agent config error:', result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const agentConfig = loadConfig();

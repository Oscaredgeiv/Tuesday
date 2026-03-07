import { z } from 'zod';
import type { ToolDefinition } from '../types.js';

const draftEmailTool: ToolDefinition = {
  name: 'draft_email',
  description: 'Draft an email for review before sending',
  category: 'communication',
  inputSchema: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
    cc: z.array(z.string().email()).optional(),
  }),
  riskLevel: 'medium',
  requiresApproval: false, // drafting is safe
  requiresAgent: false,
  async execute(input) {
    // Store draft server-side for review
    return {
      success: true,
      message: `Email draft created: "${input.subject}" to ${input.to}`,
      data: { draft: input },
      timestamp: new Date().toISOString(),
    };
  },
};

const sendEmailTool: ToolDefinition = {
  name: 'send_email',
  description: 'Send an email (requires approval)',
  category: 'communication',
  inputSchema: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
    cc: z.array(z.string().email()).optional(),
  }),
  riskLevel: 'high',
  requiresApproval: true,
  requiresAgent: false,
  async execute(input) {
    // TODO: Wire to actual email provider (SMTP, SendGrid, etc.)
    return {
      success: true,
      message: `Email sent: "${input.subject}" to ${input.to}`,
      data: { sent: true },
      timestamp: new Date().toISOString(),
    };
  },
};

export function defineCommunicationTools(): ToolDefinition[] {
  return [draftEmailTool, sendEmailTool];
}

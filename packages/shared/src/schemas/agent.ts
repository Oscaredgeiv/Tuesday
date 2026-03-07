import { z } from 'zod';
import { AGENT_STATUSES } from '../constants.js';

export const AgentStatusSchema = z.enum(AGENT_STATUSES);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  hostname: z.string(),
  os: z.string(),
  status: AgentStatusSchema,
  lastSeenAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type Agent = z.infer<typeof AgentSchema>;

export const AgentRegistrationSchema = z.object({
  name: z.string(),
  hostname: z.string(),
  os: z.string(),
});
export type AgentRegistration = z.infer<typeof AgentRegistrationSchema>;

// Messages sent over WebSocket between agent and server
export const AgentMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('voice_session'),
    audio: z.string(), // base64 encoded audio
    context: z.object({
      activeWindow: z.string().optional(),
      activeTextField: z.boolean().optional(),
    }),
  }),
  z.object({
    type: z.literal('action_result'),
    actionId: z.string(),
    result: z.object({
      success: z.boolean(),
      message: z.string(),
      data: z.unknown().optional(),
    }),
  }),
  z.object({
    type: z.literal('heartbeat'),
  }),
]);
export type AgentMessage = z.infer<typeof AgentMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('execute_action'),
    actionId: z.string(),
    toolName: z.string(),
    input: z.record(z.unknown()),
  }),
  z.object({
    type: z.literal('transcription_result'),
    text: z.string(),
    mode: z.enum(['dictation', 'command']),
    confidence: z.number(),
  }),
  z.object({
    type: z.literal('action_update'),
    actionId: z.string(),
    status: z.string(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal('approval_request'),
    approvalId: z.string(),
    actionId: z.string(),
    toolName: z.string(),
    description: z.string(),
    riskLevel: z.string(),
    expiresAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('error'),
    message: z.string(),
  }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

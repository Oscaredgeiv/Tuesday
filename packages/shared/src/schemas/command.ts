import { z } from 'zod';
import { COMMAND_MODES } from '../constants.js';

export const CommandModeSchema = z.enum(COMMAND_MODES);
export type CommandMode = z.infer<typeof CommandModeSchema>;

export const CommandIntentSchema = z.enum([
  'open_app',
  'open_url',
  'focus_window',
  'type_text',
  'search_orbit_customer',
  'get_orbit_customer',
  'create_orbit_task',
  'create_orbit_job',
  'move_orbit_stage',
  'create_orbit_note',
  'draft_email',
  'send_email',
  'request_approval',
  'run_workflow',
  'system_command',
  'unknown',
]);
export type CommandIntent = z.infer<typeof CommandIntentSchema>;

export const ClassifiedCommandSchema = z.object({
  mode: CommandModeSchema,
  intent: CommandIntentSchema.optional(),
  confidence: z.number().min(0).max(1),
  text: z.string(),
  toolName: z.string().optional(),
  toolInput: z.record(z.unknown()).optional(),
});
export type ClassifiedCommand = z.infer<typeof ClassifiedCommandSchema>;

export const CommandHistoryEntrySchema = z.object({
  id: z.string(),
  rawText: z.string(),
  mode: CommandModeSchema,
  intent: CommandIntentSchema.optional(),
  toolName: z.string().optional(),
  actionId: z.string().optional(),
  confidence: z.number().optional(),
  createdAt: z.string().datetime(),
});
export type CommandHistoryEntry = z.infer<typeof CommandHistoryEntrySchema>;

export const CommandRequestSchema = z.object({
  text: z.string(),
  context: z.object({
    activeWindow: z.string().optional(),
    activeTextField: z.boolean().optional(),
  }).optional(),
  agentId: z.string().optional(),
});
export type CommandRequest = z.infer<typeof CommandRequestSchema>;

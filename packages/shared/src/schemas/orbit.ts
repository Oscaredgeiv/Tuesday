import { z } from 'zod';

// Orbit integration type contracts.
// These mirror the shapes Tuesday needs from Orbit.
// Wire them to @orbit/shared types when integrating.

export const OrbitCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.string().optional(),
});
export type OrbitCustomer = z.infer<typeof OrbitCustomerSchema>;

export const OrbitTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.string().optional(),
  dueDate: z.string().optional(),
});
export type OrbitTask = z.infer<typeof OrbitTaskSchema>;

export const OrbitJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  customerId: z.string(),
  status: z.string().optional(),
  stageId: z.string().optional(),
});
export type OrbitJob = z.infer<typeof OrbitJobSchema>;

export const OrbitNoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  entityType: z.enum(['customer', 'job', 'task']),
  entityId: z.string(),
});
export type OrbitNote = z.infer<typeof OrbitNoteSchema>;

// Input schemas for Orbit tools
export const SearchOrbitCustomerInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().optional().default(10),
});

export const CreateOrbitTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
});

export const CreateOrbitJobInputSchema = z.object({
  title: z.string().min(1),
  customerId: z.string(),
});

export const CreateOrbitNoteInputSchema = z.object({
  content: z.string().min(1),
  entityType: z.enum(['customer', 'job', 'task']),
  entityId: z.string(),
});

export const MoveOrbitStageInputSchema = z.object({
  jobId: z.string(),
  stageId: z.string(),
});

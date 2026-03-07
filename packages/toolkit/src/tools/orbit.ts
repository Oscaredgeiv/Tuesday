import { z } from 'zod';
import {
  SearchOrbitCustomerInputSchema,
  CreateOrbitTaskInputSchema,
  CreateOrbitJobInputSchema,
  CreateOrbitNoteInputSchema,
  MoveOrbitStageInputSchema,
} from '@tuesday/shared';
import type { ToolDefinition, ToolContext } from '../types.js';

const searchCustomersTool: ToolDefinition = {
  name: 'search_orbit_customer',
  description: 'Search for customers in Orbit by name, email, or company',
  category: 'orbit',
  inputSchema: SearchOrbitCustomerInputSchema,
  riskLevel: 'low',
  requiresApproval: false,
  requiresAgent: false,
  async execute(input, context: ToolContext) {
    if (!context.orbit) {
      return { success: false, message: 'Orbit integration not configured', timestamp: new Date().toISOString() };
    }
    const { query, limit } = input as { query: string; limit: number };
    const results = await context.orbit.searchCustomers(query, limit);
    return { success: true, message: `Found customers matching "${query}"`, data: results, timestamp: new Date().toISOString() };
  },
};

const getCustomerTool: ToolDefinition = {
  name: 'get_orbit_customer',
  description: 'Get detailed information about a specific Orbit customer',
  category: 'orbit',
  inputSchema: z.object({ customerId: z.string() }),
  riskLevel: 'low',
  requiresApproval: false,
  requiresAgent: false,
  async execute(input, context: ToolContext) {
    if (!context.orbit) {
      return { success: false, message: 'Orbit integration not configured', timestamp: new Date().toISOString() };
    }
    const customer = await context.orbit.getCustomer((input as { customerId: string }).customerId);
    return { success: true, message: 'Customer retrieved', data: customer, timestamp: new Date().toISOString() };
  },
};

const createTaskTool: ToolDefinition = {
  name: 'create_orbit_task',
  description: 'Create a new task in Orbit',
  category: 'orbit',
  inputSchema: CreateOrbitTaskInputSchema,
  riskLevel: 'medium',
  requiresApproval: false,
  requiresAgent: false,
  async execute(input, context: ToolContext) {
    if (!context.orbit) {
      return { success: false, message: 'Orbit integration not configured', timestamp: new Date().toISOString() };
    }
    const typed = input as { title: string };
    const task = await context.orbit.createTask(input as Record<string, unknown>);
    return { success: true, message: `Task "${typed.title}" created`, data: task, timestamp: new Date().toISOString() };
  },
};

const createJobTool: ToolDefinition = {
  name: 'create_orbit_job',
  description: 'Create a new job/project in Orbit for a customer',
  category: 'orbit',
  inputSchema: CreateOrbitJobInputSchema,
  riskLevel: 'medium',
  requiresApproval: true,
  requiresAgent: false,
  async execute(input, context: ToolContext) {
    if (!context.orbit) {
      return { success: false, message: 'Orbit integration not configured', timestamp: new Date().toISOString() };
    }
    const typed = input as { title: string };
    const job = await context.orbit.createJob(input as Record<string, unknown>);
    return { success: true, message: `Job "${typed.title}" created`, data: job, timestamp: new Date().toISOString() };
  },
};

const moveStageTool: ToolDefinition = {
  name: 'move_orbit_stage',
  description: 'Move a job to a different pipeline stage in Orbit',
  category: 'orbit',
  inputSchema: MoveOrbitStageInputSchema,
  riskLevel: 'medium',
  requiresApproval: true,
  requiresAgent: false,
  async execute(input, context: ToolContext) {
    if (!context.orbit) {
      return { success: false, message: 'Orbit integration not configured', timestamp: new Date().toISOString() };
    }
    const { jobId, stageId } = input as { jobId: string; stageId: string };
    await context.orbit.moveStage(jobId, stageId);
    return { success: true, message: `Job moved to new stage`, timestamp: new Date().toISOString() };
  },
};

const createNoteTool: ToolDefinition = {
  name: 'create_orbit_note',
  description: 'Create a note on a customer, job, or task in Orbit',
  category: 'orbit',
  inputSchema: CreateOrbitNoteInputSchema,
  riskLevel: 'low',
  requiresApproval: false,
  requiresAgent: false,
  async execute(input, context: ToolContext) {
    if (!context.orbit) {
      return { success: false, message: 'Orbit integration not configured', timestamp: new Date().toISOString() };
    }
    const note = await context.orbit.createNote(input as Record<string, unknown>);
    return { success: true, message: 'Note created', data: note, timestamp: new Date().toISOString() };
  },
};

export function defineOrbitTools(): ToolDefinition[] {
  return [searchCustomersTool, getCustomerTool, createTaskTool, createJobTool, moveStageTool, createNoteTool];
}

import { prisma } from '../db.js';
import { getToolRegistry, getActionExecutor } from '../setup-tools.js';
import { executeOnAgent } from '../ws.js';
import { auditService } from './audit.js';
import { approvalService } from './approval.js';
import { APPROVAL_TIMEOUT_MS } from '@tuesday/shared';
import type { ActionResult } from '@tuesday/shared';

class ActionService {
  async create(opts: {
    toolName: string;
    input: Record<string, unknown>;
    intent?: string;
    agentId?: string;
  }) {
    const registry = getToolRegistry();
    const policy = registry.getPolicy(opts.toolName);

    if (!policy.allowed) {
      throw new Error(policy.reason ?? `Tool "${opts.toolName}" is not allowed`);
    }

    const action = await prisma.action.create({
      data: {
        toolName: opts.toolName,
        intent: opts.intent,
        input: opts.input as object,
        status: 'requested',
        riskLevel: policy.riskLevel,
        requiresApproval: policy.requiresApproval,
        agentId: opts.agentId,
      },
    });

    await auditService.log('action.requested', {
      actionId: action.id,
      agentId: opts.agentId,
      details: { toolName: opts.toolName, intent: opts.intent },
    });

    if (policy.requiresApproval) {
      await prisma.action.update({ where: { id: action.id }, data: { status: 'awaiting_approval' } });
      await approvalService.create(action.id);
      await auditService.log('action.approval_required', { actionId: action.id });
      return action;
    }

    // Execute immediately
    return this.execute(action.id);
  }

  async execute(actionId: string) {
    const action = await prisma.action.findUniqueOrThrow({ where: { id: actionId } });
    const executor = getActionExecutor();
    const tool = getToolRegistry().get(action.toolName);

    await prisma.action.update({ where: { id: actionId }, data: { status: 'running' } });
    await auditService.log('action.running', { actionId });

    let result: ActionResult;

    try {
      if (tool?.requiresAgent && action.agentId) {
        result = await executeOnAgent(
          action.agentId,
          actionId,
          action.toolName,
          action.input as Record<string, unknown>,
        );
      } else {
        result = await executor.execute(
          action.toolName,
          action.input as Record<string, unknown>,
          {
            actionId,
            agentId: action.agentId ?? undefined,
          },
        );
      }
    } catch (err) {
      result = {
        success: false,
        message: `Execution failed: ${err instanceof Error ? err.message : err}`,
        timestamp: new Date().toISOString(),
      };
    }

    const finalStatus = result.success ? 'succeeded' : 'failed';
    await prisma.action.update({
      where: { id: actionId },
      data: { status: finalStatus, output: result as object },
    });

    await auditService.log(result.success ? 'action.succeeded' : 'action.failed', {
      actionId,
      details: { message: result.message },
    });

    return prisma.action.findUniqueOrThrow({
      where: { id: actionId },
      include: { approval: true },
    });
  }

  async cancel(actionId: string) {
    await prisma.action.update({ where: { id: actionId }, data: { status: 'cancelled' } });
    await auditService.log('action.cancelled', { actionId });
  }

  async getById(actionId: string) {
    return prisma.action.findUnique({
      where: { id: actionId },
      include: { approval: true, auditLogs: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async getRecent(limit = 50, offset = 0) {
    return prisma.action.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { approval: true },
    });
  }
}

export const actionService = new ActionService();

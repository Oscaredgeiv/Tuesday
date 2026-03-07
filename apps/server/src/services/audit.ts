import { prisma } from '../db.js';
import type { AuditEvent } from '@tuesday/shared';

class AuditService {
  async log(
    event: AuditEvent,
    opts: {
      actionId?: string;
      agentId?: string;
      actor?: string;
      details?: Record<string, unknown>;
    } = {},
  ) {
    await prisma.auditLog.create({
      data: {
        event,
        actionId: opts.actionId,
        agentId: opts.agentId,
        actor: opts.actor,
        details: (opts.details as object) ?? undefined,
      },
    });
  }

  async getRecent(limit = 50, offset = 0) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getByAction(actionId: string) {
    return prisma.auditLog.findMany({
      where: { actionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const auditService = new AuditService();

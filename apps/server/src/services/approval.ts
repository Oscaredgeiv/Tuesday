import { prisma } from '../db.js';
import { APPROVAL_TIMEOUT_MS } from '@tuesday/shared';
import { auditService } from './audit.js';
import { actionService } from './action.js';
import { broadcastToAgents } from '../ws.js';

class ApprovalService {
  async create(actionId: string) {
    const action = await prisma.action.findUniqueOrThrow({ where: { id: actionId } });

    const approval = await prisma.approval.create({
      data: {
        actionId,
        expiresAt: new Date(Date.now() + APPROVAL_TIMEOUT_MS),
      },
    });

    await auditService.log('approval.created', { actionId });

    // Notify connected agents about the pending approval
    broadcastToAgents({
      type: 'approval_request',
      approvalId: approval.id,
      actionId,
      toolName: action.toolName,
      description: action.intent ?? `Execute ${action.toolName}`,
      riskLevel: action.riskLevel,
      expiresAt: approval.expiresAt.toISOString(),
    });

    return approval;
  }

  async decide(approvalId: string, approved: boolean, decidedBy?: string, reason?: string) {
    const approval = await prisma.approval.findUniqueOrThrow({ where: { id: approvalId } });

    if (approval.status !== 'pending') {
      throw new Error(`Approval already ${approval.status}`);
    }

    if (new Date() > approval.expiresAt) {
      await prisma.approval.update({ where: { id: approvalId }, data: { status: 'expired' } });
      await prisma.action.update({ where: { id: approval.actionId }, data: { status: 'cancelled' } });
      await auditService.log('approval.expired', { actionId: approval.actionId });
      throw new Error('Approval expired');
    }

    await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: approved ? 'approved' : 'denied',
        decidedAt: new Date(),
        decidedBy,
        reason,
      },
    });

    await auditService.log('approval.decided', {
      actionId: approval.actionId,
      actor: decidedBy,
      details: { approved, reason },
    });

    if (approved) {
      await prisma.action.update({ where: { id: approval.actionId }, data: { status: 'approved' } });
      await auditService.log('action.approved', { actionId: approval.actionId });
      // Execute the action now that it's approved
      return actionService.execute(approval.actionId);
    } else {
      await prisma.action.update({ where: { id: approval.actionId }, data: { status: 'denied' } });
      await auditService.log('action.denied', { actionId: approval.actionId });
    }
  }

  async getPending() {
    return prisma.approval.findMany({
      where: { status: 'pending' },
      include: { action: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async expireStale() {
    const stale = await prisma.approval.findMany({
      where: { status: 'pending', expiresAt: { lt: new Date() } },
    });

    for (const approval of stale) {
      await prisma.approval.update({ where: { id: approval.id }, data: { status: 'expired' } });
      await prisma.action.update({ where: { id: approval.actionId }, data: { status: 'cancelled' } });
      await auditService.log('approval.expired', { actionId: approval.actionId });
    }

    return stale.length;
  }
}

export const approvalService = new ApprovalService();

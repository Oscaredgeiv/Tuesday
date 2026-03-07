import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { ServerMessage, AgentMessage, ActionResult } from '@tuesday/shared';
import { AgentMessageSchema } from '@tuesday/shared';
import { config } from './config.js';
import { prisma } from './db.js';
import { auditService } from './services/audit.js';

interface ConnectedAgent {
  ws: WebSocket;
  agentId: string;
  pendingActions: Map<string, (result: ActionResult) => void>;
}

const agents = new Map<string, ConnectedAgent>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const apiKey = url.searchParams.get('apiKey');
    const agentId = url.searchParams.get('agentId');

    if (apiKey !== config.AGENT_API_KEY || !agentId) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      ws.close(4004, 'Agent not found');
      return;
    }

    // Register connection
    const connected: ConnectedAgent = { ws, agentId, pendingActions: new Map() };
    agents.set(agentId, connected);

    await prisma.agent.update({
      where: { id: agentId },
      data: { status: 'online', lastSeenAt: new Date() },
    });
    await auditService.log('agent.connected', { agentId });

    console.log(`Agent "${agent.name}" connected (${agentId})`);

    ws.on('message', async (data) => {
      try {
        const parsed = AgentMessageSchema.parse(JSON.parse(data.toString()));
        await handleAgentMessage(agentId, parsed);
      } catch (err) {
        sendToAgent(agentId, { type: 'error', message: `Invalid message: ${err}` });
      }
    });

    ws.on('close', async () => {
      agents.delete(agentId);
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'offline' },
      });
      await auditService.log('agent.disconnected', { agentId });
      console.log(`Agent "${agent.name}" disconnected`);
    });

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);
    ws.on('close', () => clearInterval(heartbeatInterval));
  });
}

async function handleAgentMessage(agentId: string, message: AgentMessage) {
  switch (message.type) {
    case 'heartbeat':
      await prisma.agent.update({
        where: { id: agentId },
        data: { lastSeenAt: new Date() },
      });
      break;

    case 'action_result': {
      const connected = agents.get(agentId);
      const resolver = connected?.pendingActions.get(message.actionId);
      if (resolver) {
        resolver({
          success: message.result.success,
          message: message.result.message,
          data: message.result.data,
          timestamp: new Date().toISOString(),
        });
        connected!.pendingActions.delete(message.actionId);
      }
      break;
    }

    case 'voice_session':
      // This is handled by the command route via REST, but could also come over WS
      break;
  }
}

export function sendToAgent(agentId: string, message: ServerMessage) {
  const connected = agents.get(agentId);
  if (connected?.ws.readyState === WebSocket.OPEN) {
    connected.ws.send(JSON.stringify(message));
  }
}

export function executeOnAgent(
  agentId: string,
  actionId: string,
  toolName: string,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  return new Promise((resolve, reject) => {
    const connected = agents.get(agentId);
    if (!connected || connected.ws.readyState !== WebSocket.OPEN) {
      reject(new Error(`Agent ${agentId} not connected`));
      return;
    }

    // Set up response handler with timeout
    const timeout = setTimeout(() => {
      connected.pendingActions.delete(actionId);
      reject(new Error('Agent execution timed out'));
    }, 30000);

    connected.pendingActions.set(actionId, (result) => {
      clearTimeout(timeout);
      resolve(result);
    });

    sendToAgent(agentId, { type: 'execute_action', actionId, toolName, input });
  });
}

export function getConnectedAgentIds(): string[] {
  return Array.from(agents.keys());
}

export function broadcastToAgents(message: ServerMessage) {
  for (const [, connected] of agents) {
    if (connected.ws.readyState === WebSocket.OPEN) {
      connected.ws.send(JSON.stringify(message));
    }
  }
}

import WebSocket from 'ws';
import { agentConfig } from './config.js';
import { ServerMessageSchema } from '@tuesday/shared';
import type { AgentRegistration } from '@tuesday/shared';

interface LocalActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

type ExecuteHandler = (
  actionId: string,
  toolName: string,
  input: Record<string, unknown>,
) => Promise<LocalActionResult>;

export class AgentConnection {
  private ws: WebSocket | null = null;
  private agentId: string | null = null;
  private executeHandler: ExecuteHandler | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  async register(registration: AgentRegistration): Promise<string> {
    const res = await fetch(`${agentConfig.SERVER_HTTP_URL}/api/agents/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-API-Key': agentConfig.AGENT_API_KEY,
      },
      body: JSON.stringify(registration),
    });

    if (!res.ok) {
      throw new Error(`Registration failed: ${res.status} ${await res.text()}`);
    }

    const agent = await res.json() as { id: string };
    this.agentId = agent.id;
    return agent.id;
  }

  async connect(agentId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${agentConfig.AGENT_SERVER_URL}/ws?agentId=${agentId}&apiKey=${agentConfig.AGENT_API_KEY}`;
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('WebSocket connected');
        this.startHeartbeat();
        resolve();
      });

      this.ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        reject(err);
      });

      this.ws.on('close', () => {
        console.log('WebSocket disconnected');
        this.stopHeartbeat();
        // Auto-reconnect after 5s
        setTimeout(() => {
          if (this.agentId) this.connect(this.agentId).catch(console.error);
        }, 5000);
      });

      this.ws.on('message', async (data) => {
        try {
          const message = ServerMessageSchema.parse(JSON.parse(data.toString()));

          switch (message.type) {
            case 'execute_action':
              if (this.executeHandler) {
                await this.executeHandler(message.actionId, message.toolName, message.input);
              }
              break;

            case 'transcription_result':
              console.log(`[${message.mode}] ${message.text}`);
              break;

            case 'action_update':
              console.log(`Action ${message.actionId}: ${message.status} ${message.message ?? ''}`);
              break;

            case 'approval_request':
              console.log(`APPROVAL NEEDED: ${message.description} (${message.riskLevel})`);
              console.log(`  Expires: ${message.expiresAt}`);
              // TODO: Desktop notification
              break;

            case 'error':
              console.error('Server error:', message.message);
              break;
          }
        } catch (err) {
          console.error('Failed to parse server message:', err);
        }
      });
    });
  }

  onExecuteAction(handler: ExecuteHandler) {
    this.executeHandler = handler;
  }

  sendActionResult(actionId: string, result: { success: boolean; message: string; data?: unknown }) {
    this.send({ type: 'action_result', actionId, result });
  }

  async sendVoiceSession(audio: Buffer, context: { activeWindow?: string; activeTextField?: boolean }) {
    this.send({
      type: 'voice_session',
      audio: audio.toString('base64'),
      context,
    });
  }

  disconnect() {
    this.stopHeartbeat();
    this.ws?.close();
  }

  private send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

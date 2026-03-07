import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { config } from './config.js';
import { prisma } from './db.js';
import { setupWebSocket } from './ws.js';
import { setupToolRegistry } from './setup-tools.js';
import { setupModelRouter } from './setup-models.js';
import { authRouter } from './routes/auth.js';
import { commandRouter } from './routes/commands.js';
import { actionRouter } from './routes/actions.js';
import { approvalRouter } from './routes/approvals.js';
import { agentRouter } from './routes/agents.js';
import { workflowRouter } from './routes/workflows.js';
import { auditRouter } from './routes/audit.js';
import { settingsRouter } from './routes/settings.js';
import { sessionRouter } from './routes/sessions.js';
import { memoryRouter } from './routes/memory.js';
import { skillRouter } from './routes/skills.js';
import { playbookRouter } from './routes/playbooks.js';
import { libraryRouter } from './routes/library.js';
import { automationRouter } from './routes/automations.js';
import { hotkeyRouter } from './routes/hotkeys.js';
import { dashboardRouter } from './routes/dashboard.js';
import { errorHandler } from './middleware/error.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('short'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/commands', commandRouter);
app.use('/api/actions', actionRouter);
app.use('/api/approvals', approvalRouter);
app.use('/api/agents', agentRouter);
app.use('/api/workflows', workflowRouter);
app.use('/api/audit', auditRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/skills', skillRouter);
app.use('/api/playbooks', playbookRouter);
app.use('/api/library', libraryRouter);
app.use('/api/automations', automationRouter);
app.use('/api/settings/hotkeys', hotkeyRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handler
app.use(errorHandler);

// Initialize
async function start() {
  // Set up tool registry (global singleton)
  setupToolRegistry();

  // Set up model providers
  setupModelRouter();

  // Set up WebSocket for agent communication
  setupWebSocket(server);

  server.listen(config.SERVER_PORT, config.SERVER_HOST, () => {
    console.log(`Tuesday server listening on ${config.SERVER_HOST}:${config.SERVER_PORT}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

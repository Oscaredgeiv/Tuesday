import { z } from 'zod';
import type { ToolDefinition } from '../types.js';

const openAppTool: ToolDefinition = {
  name: 'open_app',
  description: 'Open a desktop application by name',
  category: 'workstation',
  inputSchema: z.object({
    appName: z.string().describe('Name of the application to open'),
    args: z.array(z.string()).optional().describe('Optional command-line arguments'),
  }),
  riskLevel: 'low',
  requiresApproval: false,
  requiresAgent: true,
  async execute() {
    // Delegated to agent
    throw new Error('Must execute on agent');
  },
};

const openUrlTool: ToolDefinition = {
  name: 'open_url',
  description: 'Open a URL in the default browser',
  category: 'workstation',
  inputSchema: z.object({
    url: z.string().url().describe('URL to open'),
  }),
  riskLevel: 'low',
  requiresApproval: false,
  requiresAgent: true,
  async execute() {
    throw new Error('Must execute on agent');
  },
};

const typeTextTool: ToolDefinition = {
  name: 'type_text',
  description: 'Type/insert text into the currently focused text field',
  category: 'workstation',
  inputSchema: z.object({
    text: z.string().describe('Text to type into the active field'),
  }),
  riskLevel: 'low',
  requiresApproval: false,
  requiresAgent: true,
  async execute() {
    throw new Error('Must execute on agent');
  },
};

const focusWindowTool: ToolDefinition = {
  name: 'focus_window',
  description: 'Focus/bring to front a window by title or app name',
  category: 'workstation',
  inputSchema: z.object({
    windowTitle: z.string().optional().describe('Window title substring to match'),
    appName: z.string().optional().describe('Application name to focus'),
  }),
  riskLevel: 'low',
  requiresApproval: false,
  requiresAgent: true,
  async execute() {
    throw new Error('Must execute on agent');
  },
};

export function defineWorkstationTools(): ToolDefinition[] {
  return [openAppTool, openUrlTool, typeTextTool, focusWindowTool];
}

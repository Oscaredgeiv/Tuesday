import { z } from 'zod';
import type { ToolDefinition } from '../types.js';

const navigateTool: ToolDefinition = {
  name: 'browser_navigate',
  description: 'Navigate to a URL in a Playwright-controlled browser',
  category: 'browser',
  inputSchema: z.object({
    url: z.string().url(),
  }),
  riskLevel: 'low',
  requiresApproval: false,
  requiresAgent: true,
  async execute() {
    throw new Error('Must execute on agent');
  },
};

const clickTool: ToolDefinition = {
  name: 'browser_click',
  description: 'Click an element in the Playwright-controlled browser by selector',
  category: 'browser',
  inputSchema: z.object({
    selector: z.string().describe('CSS selector of the element to click'),
    waitForNavigation: z.boolean().optional(),
  }),
  riskLevel: 'medium',
  requiresApproval: false,
  requiresAgent: true,
  async execute() {
    throw new Error('Must execute on agent');
  },
};

const typeBrowserTool: ToolDefinition = {
  name: 'browser_type',
  description: 'Type text into a field in the Playwright-controlled browser',
  category: 'browser',
  inputSchema: z.object({
    selector: z.string().describe('CSS selector of the input field'),
    text: z.string(),
  }),
  riskLevel: 'medium',
  requiresApproval: false,
  requiresAgent: true,
  async execute() {
    throw new Error('Must execute on agent');
  },
};

const screenshotTool: ToolDefinition = {
  name: 'browser_screenshot',
  description: 'Take a screenshot of the current Playwright browser page',
  category: 'browser',
  inputSchema: z.object({
    fullPage: z.boolean().optional(),
  }),
  riskLevel: 'low',
  requiresApproval: false,
  requiresAgent: true,
  async execute() {
    throw new Error('Must execute on agent');
  },
};

export function defineBrowserTools(): ToolDefinition[] {
  return [navigateTool, clickTool, typeBrowserTool, screenshotTool];
}

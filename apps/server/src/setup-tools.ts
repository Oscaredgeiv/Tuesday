import {
  ToolRegistry,
  ActionExecutor,
  defineWorkstationTools,
  defineOrbitTools,
  defineBrowserTools,
  defineCommunicationTools,
} from '@tuesday/toolkit';

let registry: ToolRegistry;
let executor: ActionExecutor;

export function setupToolRegistry() {
  registry = new ToolRegistry();

  for (const tool of defineWorkstationTools()) registry.register(tool);
  for (const tool of defineOrbitTools()) registry.register(tool);
  for (const tool of defineBrowserTools()) registry.register(tool);
  for (const tool of defineCommunicationTools()) registry.register(tool);

  executor = new ActionExecutor(registry);
}

export function getToolRegistry(): ToolRegistry {
  if (!registry) throw new Error('Tool registry not initialized');
  return registry;
}

export function getActionExecutor(): ActionExecutor {
  if (!executor) throw new Error('Action executor not initialized');
  return executor;
}

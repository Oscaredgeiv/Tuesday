import type { ModelProvider } from './types.js';

export type TaskType = 'classify' | 'tool_select' | 'chat' | 'transcription';

interface RouterConfig {
  providers: Map<string, ModelProvider>;
  defaultProvider: string;
  /** Override provider for specific task types */
  taskRoutes?: Partial<Record<TaskType, string>>;
}

export class ModelRouter {
  private providers: Map<string, ModelProvider>;
  private defaultProvider: string;
  private taskRoutes: Partial<Record<TaskType, string>>;

  constructor(config: RouterConfig) {
    this.providers = config.providers;
    this.defaultProvider = config.defaultProvider;
    this.taskRoutes = config.taskRoutes ?? {};

    if (!this.providers.has(this.defaultProvider)) {
      throw new Error(`Default provider "${this.defaultProvider}" not registered`);
    }
  }

  getProvider(taskType?: TaskType): ModelProvider {
    const providerName = (taskType && this.taskRoutes[taskType]) ?? this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider "${providerName}" not found`);
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

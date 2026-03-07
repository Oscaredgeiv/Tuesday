import {
  AnthropicProvider,
  OpenAIProvider,
  ModelRouter,
  TranscriptionService,
} from '@tuesday/model-providers';
import type { ModelProvider } from '@tuesday/model-providers';
import { config } from './config.js';

let router: ModelRouter;
let transcription: TranscriptionService;

export function setupModelRouter() {
  const providers = new Map<string, ModelProvider>();

  if (config.ANTHROPIC_API_KEY) {
    providers.set('anthropic', new AnthropicProvider(config.ANTHROPIC_API_KEY, config.DEFAULT_MODEL));
  }

  if (config.OPENAI_API_KEY) {
    providers.set('openai', new OpenAIProvider(config.OPENAI_API_KEY));
  }

  if (providers.size === 0) {
    console.warn('No model providers configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
    return;
  }

  const defaultProvider = providers.has(config.DEFAULT_MODEL_PROVIDER)
    ? config.DEFAULT_MODEL_PROVIDER
    : providers.keys().next().value!;

  router = new ModelRouter({ providers, defaultProvider });

  // Transcription always uses OpenAI Whisper
  if (config.OPENAI_API_KEY) {
    transcription = new TranscriptionService(config.OPENAI_API_KEY);
  }
}

export function getModelRouter(): ModelRouter {
  if (!router) throw new Error('Model router not initialized. Configure API keys.');
  return router;
}

export function getTranscription(): TranscriptionService {
  if (!transcription) throw new Error('Transcription not initialized. Set OPENAI_API_KEY.');
  return transcription;
}

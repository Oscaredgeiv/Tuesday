export interface ModelProvider {
  name: string;

  /** Classify user text as dictation vs command, extract intent */
  classify(text: string, context?: ClassifyContext): Promise<ClassifyResult>;

  /** Given a command, select the best tool and generate input */
  selectTool(
    text: string,
    availableTools: ToolManifestEntry[],
    context?: string,
  ): Promise<ToolSelection>;

  /** Generate a natural language response */
  chat(messages: ChatMessage[]): Promise<ModelResponse>;
}

export interface ClassifyContext {
  activeWindow?: string;
  activeTextField?: boolean;
}

export interface ClassifyResult {
  mode: 'dictation' | 'command';
  confidence: number;
  cleanedText: string;
  intent?: string;
}

export interface ToolSelection {
  toolName: string;
  input: Record<string, unknown>;
  reasoning: string;
  confidence: number;
}

export interface ToolManifestEntry {
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelResponse {
  content: string;
  usage?: { inputTokens: number; outputTokens: number };
}

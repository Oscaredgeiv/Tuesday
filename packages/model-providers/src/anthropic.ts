import Anthropic from '@anthropic-ai/sdk';
import type {
  ModelProvider,
  ClassifyContext,
  ClassifyResult,
  ToolSelection,
  ToolManifestEntry,
  ChatMessage,
  ModelResponse,
} from './types.js';

const CLASSIFY_PROMPT = `You are Tuesday, an AI assistant. Classify the user's speech as either "dictation" (they want text inserted) or "command" (they want an action performed).

Consider:
- If the user is focused in a text field and the speech sounds like prose/content, it's dictation.
- If the speech starts with an action verb or clearly requests something to be done, it's a command.
- Clean up the text: fix punctuation, capitalize sentences, remove filler words.

Respond in JSON: { "mode": "dictation" | "command", "confidence": 0-1, "cleanedText": "...", "intent": "..." }`;

const TOOL_SELECT_PROMPT = `You are Tuesday, an AI assistant. Given the user's command and available tools, select the best tool and generate the input.

Respond in JSON: { "toolName": "...", "input": {...}, "reasoning": "...", "confidence": 0-1 }

If no tool matches, use toolName "unknown".`;

export class AnthropicProvider implements ModelProvider {
  name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async classify(text: string, context?: ClassifyContext): Promise<ClassifyResult> {
    const contextInfo = context
      ? `\nContext: Active window: "${context.activeWindow ?? 'unknown'}", Text field focused: ${context.activeTextField ?? false}`
      : '';

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 256,
      system: CLASSIFY_PROMPT,
      messages: [{ role: 'user', content: `Speech: "${text}"${contextInfo}` }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    return JSON.parse(content.text) as ClassifyResult;
  }

  async selectTool(
    text: string,
    availableTools: ToolManifestEntry[],
    context?: string,
  ): Promise<ToolSelection> {
    const toolList = availableTools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: TOOL_SELECT_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Command: "${text}"\n\nAvailable tools:\n${toolList}${context ? `\n\nAdditional context: ${context}` : ''}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    return JSON.parse(content.text) as ToolSelection;
  }

  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    const systemMsg = messages.find((m) => m.role === 'system')?.content;
    const chatMsgs = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      ...(systemMsg ? { system: systemMsg } : {}),
      messages: chatMsgs,
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    return {
      content: content.text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}

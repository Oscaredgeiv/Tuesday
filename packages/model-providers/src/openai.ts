import OpenAI from 'openai';
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

Respond in JSON only: { "mode": "dictation" | "command", "confidence": 0-1, "cleanedText": "...", "intent": "..." }`;

const TOOL_SELECT_PROMPT = `You are Tuesday, an AI assistant. Given the user's command and available tools, select the best tool and generate the input.

Respond in JSON only: { "toolName": "...", "input": {...}, "reasoning": "...", "confidence": 0-1 }

If no tool matches, use toolName "unknown".`;

export class OpenAIProvider implements ModelProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async classify(text: string, context?: ClassifyContext): Promise<ClassifyResult> {
    const contextInfo = context
      ? `\nContext: Active window: "${context.activeWindow ?? 'unknown'}", Text field focused: ${context.activeTextField ?? false}`
      : '';

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 256,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CLASSIFY_PROMPT },
        { role: 'user', content: `Speech: "${text}"${contextInfo}` },
      ],
    });

    return JSON.parse(response.choices[0].message.content!) as ClassifyResult;
  }

  async selectTool(
    text: string,
    availableTools: ToolManifestEntry[],
    context?: string,
  ): Promise<ToolSelection> {
    const toolList = availableTools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 512,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: TOOL_SELECT_PROMPT },
        {
          role: 'user',
          content: `Command: "${text}"\n\nAvailable tools:\n${toolList}${context ? `\n\nAdditional context: ${context}` : ''}`,
        },
      ],
    });

    return JSON.parse(response.choices[0].message.content!) as ToolSelection;
  }

  async chat(messages: ChatMessage[]): Promise<ModelResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    return {
      content: response.choices[0].message.content!,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
        : undefined,
    };
  }
}

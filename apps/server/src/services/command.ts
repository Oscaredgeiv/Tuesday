import { prisma } from '../db.js';
import { getModelRouter, getTranscription } from '../setup-models.js';
import { getToolRegistry } from '../setup-tools.js';
import { actionService } from './action.js';
import { auditService } from './audit.js';
import type { ClassifiedCommand, CommandRequest } from '@tuesday/shared';

class CommandService {
  /** Process raw text (already transcribed) through classification and tool selection */
  async processText(request: CommandRequest, agentId?: string): Promise<ClassifiedCommand & { actionId?: string }> {
    const router = getModelRouter();
    const provider = router.getProvider('classify');

    // Step 1: Classify as dictation or command
    const classification = await provider.classify(request.text, request.context);

    await auditService.log('command.classified', {
      agentId,
      details: { mode: classification.mode, intent: classification.intent, confidence: classification.confidence },
    });

    if (classification.mode === 'dictation') {
      await prisma.command.create({
        data: {
          rawText: request.text,
          mode: 'dictation',
          confidence: classification.confidence,
          agentId,
        },
      });

      return {
        mode: 'dictation',
        text: classification.cleanedText,
        confidence: classification.confidence,
        intent: undefined,
        toolName: 'type_text',
        toolInput: { text: classification.cleanedText },
      };
    }

    // Step 2: Select tool for the command
    const registry = getToolRegistry();
    const toolProvider = router.getProvider('tool_select');
    const toolSelection = await toolProvider.selectTool(
      classification.cleanedText,
      registry.getToolManifest(),
    );

    // Step 3: Create and potentially execute the action
    let actionId: string | undefined;

    if (toolSelection.toolName !== 'unknown') {
      const action = await actionService.create({
        toolName: toolSelection.toolName,
        input: toolSelection.input,
        intent: classification.cleanedText,
        agentId,
      });
      actionId = action.id;
    }

    await prisma.command.create({
      data: {
        rawText: request.text,
        mode: 'command',
        intent: classification.intent ?? toolSelection.toolName,
        toolName: toolSelection.toolName,
        actionId,
        confidence: toolSelection.confidence,
        agentId,
      },
    });

    return {
      mode: 'command',
      text: classification.cleanedText,
      confidence: toolSelection.confidence,
      intent: toolSelection.toolName as any,
      toolName: toolSelection.toolName,
      toolInput: toolSelection.input,
      actionId,
    };
  }

  /** Transcribe audio and then process */
  async processAudio(
    audioBuffer: Buffer,
    context?: { activeWindow?: string; activeTextField?: boolean },
    agentId?: string,
  ) {
    const transcription = getTranscription();
    const text = await transcription.transcribe(audioBuffer);

    await auditService.log('command.received', {
      agentId,
      details: { transcribedText: text },
    });

    return this.processText({ text, context }, agentId);
  }

  async getHistory(limit = 50, offset = 0) {
    return prisma.command.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}

export const commandService = new CommandService();

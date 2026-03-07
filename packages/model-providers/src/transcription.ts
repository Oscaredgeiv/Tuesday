import OpenAI from 'openai';

export class TranscriptionService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'whisper-1') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async transcribe(audioBuffer: Buffer, format: string = 'webm'): Promise<string> {
    const file = new File([audioBuffer], `audio.${format}`, {
      type: `audio/${format}`,
    });

    const response = await this.client.audio.transcriptions.create({
      model: this.model,
      file,
      language: 'en',
    });

    return response.text;
  }
}

import { spawn, type ChildProcess } from 'child_process';

/**
 * Voice capture using system audio tools.
 * Linux: arecord, macOS: rec (sox), Windows: not yet supported.
 * Records as WAV for maximum compatibility.
 */
export class VoiceCapture {
  private process: ChildProcess | null = null;
  private chunks: Buffer[] = [];

  start() {
    this.chunks = [];
    const platform = process.platform;

    if (platform === 'linux') {
      // Record PCM audio via arecord
      this.process = spawn('arecord', [
        '-f', 'S16_LE', // 16-bit signed little-endian
        '-r', '16000',   // 16kHz sample rate
        '-c', '1',       // mono
        '-t', 'wav',     // WAV format
        '-q',            // quiet
        '-',             // stdout
      ]);
    } else if (platform === 'darwin') {
      // macOS: use sox/rec
      this.process = spawn('rec', [
        '-q',            // quiet
        '-r', '16000',   // 16kHz
        '-c', '1',       // mono
        '-b', '16',      // 16-bit
        '-t', 'wav',     // WAV format
        '-',             // stdout
      ]);
    } else {
      console.warn(`Voice capture not yet supported on ${platform}`);
      return;
    }

    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.chunks.push(chunk);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      // Suppress normal stderr output from audio tools
      const msg = data.toString().trim();
      if (msg) console.debug('[audio]', msg);
    });
  }

  async stop(): Promise<Buffer> {
    return new Promise((resolve) => {
      if (!this.process) {
        resolve(Buffer.alloc(0));
        return;
      }

      this.process.on('close', () => {
        const audioBuffer = Buffer.concat(this.chunks);
        this.process = null;
        this.chunks = [];
        resolve(audioBuffer);
      });

      this.process.kill('SIGTERM');
    });
  }
}

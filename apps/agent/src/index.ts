import os from 'os';
import { agentConfig } from './config.js';
import { AgentConnection } from './connection.js';
import { HotkeyListener } from './hotkey.js';
import { VoiceCapture } from './voice.js';
import { LocalActionHandler } from './actions/handler.js';

async function main() {
  console.log('Tuesday Agent starting...');

  // Register with server
  const connection = new AgentConnection();
  const agentId = await connection.register({
    name: agentConfig.AGENT_NAME,
    hostname: os.hostname(),
    os: `${os.platform()}-${os.arch()}`,
  });

  console.log(`Registered as agent: ${agentId}`);

  // Connect WebSocket
  await connection.connect(agentId);

  // Set up local action handler
  const actionHandler = new LocalActionHandler();
  connection.onExecuteAction(async (actionId, toolName, input) => {
    console.log(`Executing: ${toolName}`);
    const result = await actionHandler.execute(toolName, input);
    connection.sendActionResult(actionId, result);
    return result;
  });

  // Set up voice capture
  const voice = new VoiceCapture();

  // Set up hotkey listener
  const hotkey = new HotkeyListener(agentConfig.AGENT_HOTKEY);
  let recording = false;

  hotkey.onPress(async () => {
    if (recording) {
      recording = false;
      console.log('Stopping recording...');
      const audioBuffer = await voice.stop();
      if (audioBuffer && audioBuffer.length > 0) {
        console.log(`Captured ${audioBuffer.length} bytes, sending to server...`);
        await connection.sendVoiceSession(audioBuffer, {
          activeWindow: await actionHandler.getActiveWindow(),
          activeTextField: false, // TODO: detect text field focus
        });
      }
    } else {
      recording = true;
      console.log('Recording... (press hotkey again to stop)');
      voice.start();
    }
  });

  hotkey.start();
  console.log(`Tuesday Agent ready. Hotkey: ${agentConfig.AGENT_HOTKEY}`);

  // Keep alive
  process.on('SIGINT', () => {
    console.log('Shutting down agent...');
    hotkey.stop();
    connection.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Agent failed:', err);
  process.exit(1);
});

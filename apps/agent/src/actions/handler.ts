import { exec } from 'child_process';
import { promisify } from 'util';
import open, { openApp } from 'open';

const execAsync = promisify(exec);

interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

type LocalToolHandler = (input: Record<string, unknown>) => Promise<ActionResult>;

export class LocalActionHandler {
  private handlers = new Map<string, LocalToolHandler>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.handlers.set('open_app', async (input) => {
      const appName = input.appName as string;
      try {
        await openApp(appName);
        return { success: true, message: `Opened ${appName}` };
      } catch (err) {
        // Fallback: try launching directly
        try {
          const platform = process.platform;
          if (platform === 'linux') {
            await execAsync(`gtk-launch ${appName} || ${appName.toLowerCase()} &`);
          } else if (platform === 'darwin') {
            await execAsync(`open -a "${appName}"`);
          } else {
            await execAsync(`start "" "${appName}"`);
          }
          return { success: true, message: `Opened ${appName}` };
        } catch (e) {
          return { success: false, message: `Failed to open ${appName}: ${e}` };
        }
      }
    });

    this.handlers.set('open_url', async (input) => {
      const url = input.url as string;
      try {
        await open(url);
        return { success: true, message: `Opened ${url}` };
      } catch (err) {
        return { success: false, message: `Failed to open URL: ${err}` };
      }
    });

    this.handlers.set('type_text', async (input) => {
      const text = input.text as string;
      const platform = process.platform;

      try {
        if (platform === 'linux') {
          // Use xdotool for text insertion
          await execAsync(`xdotool type --clearmodifiers "${text.replace(/"/g, '\\"')}"`);
        } else if (platform === 'darwin') {
          // Use AppleScript for text insertion
          const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escaped}"'`);
        } else {
          return { success: false, message: 'Text insertion not yet supported on this platform' };
        }
        return { success: true, message: `Typed ${text.length} characters` };
      } catch (err) {
        return { success: false, message: `Failed to type text: ${err}` };
      }
    });

    this.handlers.set('focus_window', async (input) => {
      const windowTitle = (input.windowTitle ?? input.appName ?? '') as string;
      const platform = process.platform;

      try {
        if (platform === 'linux') {
          await execAsync(`wmctrl -a "${windowTitle}"`);
        } else if (platform === 'darwin') {
          await execAsync(
            `osascript -e 'tell application "${windowTitle}" to activate'`,
          );
        }
        return { success: true, message: `Focused window: ${windowTitle}` };
      } catch (err) {
        return { success: false, message: `Failed to focus window: ${err}` };
      }
    });

    // Browser automation tools delegate to Playwright (Phase 3)
    this.handlers.set('browser_navigate', async (input) => {
      // TODO: Implement with Playwright in Phase 3
      const url = input.url as string;
      await open(url);
      return { success: true, message: `Navigated to ${url} (opened in default browser)` };
    });
  }

  async execute(toolName: string, input: Record<string, unknown>): Promise<ActionResult> {
    const handler = this.handlers.get(toolName);
    if (!handler) {
      return { success: false, message: `Unknown local tool: ${toolName}` };
    }
    return handler(input);
  }

  async getActiveWindow(): Promise<string | undefined> {
    try {
      if (process.platform === 'linux') {
        const { stdout } = await execAsync('xdotool getactivewindow getwindowname');
        return stdout.trim();
      } else if (process.platform === 'darwin') {
        const { stdout } = await execAsync(
          `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
        );
        return stdout.trim();
      }
    } catch {
      return undefined;
    }
  }
}

import { GlobalKeyboardListener } from 'node-global-key-listener';

export class HotkeyListener {
  private listener: GlobalKeyboardListener | null = null;
  private handler: (() => void) | null = null;
  private hotkeyParts: string[];
  private pressedKeys = new Set<string>();

  constructor(hotkey: string) {
    // Parse "CommandOrControl+Shift+T" into individual keys
    this.hotkeyParts = hotkey
      .replace('CommandOrControl', process.platform === 'darwin' ? 'LEFT META' : 'LEFT CTRL')
      .split('+')
      .map((k) => k.trim().toUpperCase());
  }

  onPress(handler: () => void) {
    this.handler = handler;
  }

  start() {
    this.listener = new GlobalKeyboardListener();

    this.listener.addListener((e) => {
      const keyName = e.name?.toUpperCase() ?? '';

      if (e.state === 'DOWN') {
        this.pressedKeys.add(keyName);
      } else if (e.state === 'UP') {
        // Check if all hotkey parts were pressed
        const allPressed = this.hotkeyParts.every((part) => this.pressedKeys.has(part));
        if (allPressed && this.handler) {
          this.handler();
        }
        this.pressedKeys.delete(keyName);
      }
    });
  }

  stop() {
    this.listener?.kill();
    this.listener = null;
  }
}

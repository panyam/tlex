/**
 * EventHub.ts - Simple event emitter for playground communication
 */

export type EventCallback = (...args: any[]) => void;

export class EventHub {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => {
        try {
          callback(...args);
        } catch (e) {
          console.error(`Error in event handler for ${event}:`, e);
        }
      });
    }
  }
}

export const Events = {
  LEXER_CHANGED: "lexerChanged",
  LEXER_COMPILED: "lexerCompiled",
  INPUT_CHANGED: "inputChanged",
  TOKENS_GENERATED: "tokensGenerated",
  CONSOLE_LOG: "consoleLog",
  CONSOLE_ERROR: "consoleError",
};

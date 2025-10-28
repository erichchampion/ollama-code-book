class EventEmitter {
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  once(event: string, handler: EventHandler): void;
  emit(event: string, ...args: any[]): void;
  removeAllListeners(event?: string): void;
}

type EventHandler = (...args: any[]) => void;
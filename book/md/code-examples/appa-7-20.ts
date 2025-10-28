interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;

  // Structured logging
  log(level: LogLevel, message: string, metadata?: Record<string, any>): void;

  // Child loggers
  child(context: Record<string, any>): Logger;
}
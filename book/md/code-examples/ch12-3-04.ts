import winston from 'winston';

/**
 * Structured logger with context
 */
export class StructuredLogger {
  private logger: winston.Logger;

  constructor(options: LoggerOptions = {}) {
    this.logger = winston.createLogger({
      level: options.level || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: options.service || 'ollama-code',
        environment: process.env.NODE_ENV || 'development',
        version: options.version || '1.0.0'
      },
      transports: [
        // Console (for development)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),

        // File (for production)
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ]
    });
  }

  /**
   * Log with context
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.enrichContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.enrichContext(context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, {
      ...this.enrichContext(context),
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.enrichContext(context));
  }

  /**
   * Enrich context with metadata
   */
  private enrichContext(context?: LogContext): Record<string, any> {
    return {
      ...context,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: require('os').hostname()
    };
  }

  /**
   * Create child logger with fixed context
   */
  child(context: LogContext): StructuredLogger {
    const child = new StructuredLogger({
      service: this.logger.defaultMeta?.service,
      level: this.logger.level
    });

    // Add fixed context to all logs
    child.logger.defaultMeta = {
      ...child.logger.defaultMeta,
      ...context
    };

    return child;
  }
}

interface LoggerOptions {
  service?: string;
  level?: string;
  version?: string;
}

interface LogContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}
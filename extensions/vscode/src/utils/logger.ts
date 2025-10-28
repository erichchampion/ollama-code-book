/**
 * Extension Logger
 */

import * as vscode from 'vscode';

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel;

  constructor(name: string) {
    this.outputChannel = vscode.window.createOutputChannel(name);
    this.logLevel = LogLevel.INFO;
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log('WARN', message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log('ERROR', message, ...args);
    }
  }

  show(): void {
    this.outputChannel.show();
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = args.length > 0
      ? `${message} ${args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')}`
      : message;

    this.outputChannel.appendLine(`[${timestamp}] ${level}: ${formattedMessage}`);
  }
}

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}
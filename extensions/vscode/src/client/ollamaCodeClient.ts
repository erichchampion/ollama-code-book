/**
 * Ollama Code WebSocket Client
 *
 * Handles communication with the Ollama Code CLI backend server
 */

import WebSocket from 'ws';
import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export interface OllamaCodeConfig {
  port: number;
  autoStart: boolean;
  connectionTimeout: number;
  logLevel: string;
}

export interface WorkspaceContext {
  rootPath?: string;
  activeFile?: string;
  selection?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  cursorPosition?: { line: number; character: number };
  openFiles?: string[];
  gitBranch?: string;
  projectType?: string;
  language?: string;
}

export interface AIRequest {
  prompt: string;
  context?: WorkspaceContext;
  type: 'completion' | 'explanation' | 'refactor' | 'fix' | 'generate';
  language?: string;
  includeDependencies?: boolean;
}

export interface IDERequest {
  id: string;
  type: 'ai_request' | 'command' | 'context_update' | 'workspace_analysis';
  payload: any;
  timestamp: number;
}

export interface IDEResponse {
  id: string;
  type: 'success' | 'error' | 'progress' | 'stream';
  payload: any;
  timestamp: number;
}

export class OllamaCodeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: OllamaCodeConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private context: WorkspaceContext = {};
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(config: OllamaCodeConfig) {
    super();
    this.config = config;
    this.setupWorkspaceContext();
  }

  /**
   * Connect to the Ollama Code CLI backend
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      try {
        this.ws = new WebSocket(`ws://localhost:${this.config.port}`);

        this.ws?.on('open', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.ws?.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws?.on('close', (code: number, reason: Buffer) => {
          this.handleDisconnection(code, reason);
        });

        this.ws?.on('error', (error: Error) => {
          clearTimeout(timeout);
          this.emit('error', error);
          if (!this.isConnected) {
            reject(error);
          }
        });

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the backend
   */
  async disconnect(): Promise<void> {
    if (this.ws && this.isConnected) {
      this.ws.close(1000, 'Extension disconnecting'); // WS_CLOSE_CODES.NORMAL
    }
    this.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Send AI request to backend
   */
  async sendAIRequest(request: AIRequest): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to Ollama Code backend');
    }

    const requestId = this.generateRequestId();
    const ideRequest: IDERequest = {
      id: requestId,
      type: 'ai_request',
      payload: {
        ...request,
        context: { ...this.context, ...request.context }
      },
      timestamp: Date.now()
    };

    return this.sendRequest(ideRequest);
  }

  /**
   * Execute CLI command through backend
   */
  async executeCommand(command: string, args: string[] = []): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to Ollama Code backend');
    }

    const requestId = this.generateRequestId();
    const ideRequest: IDERequest = {
      id: requestId,
      type: 'command',
      payload: { command, args },
      timestamp: Date.now()
    };

    return this.sendRequest(ideRequest);
  }

  /**
   * Analyze workspace
   */
  async analyzeWorkspace(analysisType: string, files: string[] = []): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to Ollama Code backend');
    }

    const requestId = this.generateRequestId();
    const ideRequest: IDERequest = {
      id: requestId,
      type: 'workspace_analysis',
      payload: { analysisType, files },
      timestamp: Date.now()
    };

    return this.sendRequest(ideRequest);
  }

  /**
   * Update workspace context
   */
  updateContext(context: Partial<WorkspaceContext>): void {
    this.context = { ...this.context, ...context };

    if (this.isConnected) {
      const requestId = this.generateRequestId();
      const ideRequest: IDERequest = {
        id: requestId,
        type: 'context_update',
        payload: this.context,
        timestamp: Date.now()
      };

      this.sendRequestNoResponse(ideRequest);
    }
  }

  /**
   * Update client configuration
   */
  async updateConfig(config: Partial<OllamaCodeConfig>): Promise<void> {
    const wasConnected = this.isConnected;

    // Update configuration
    this.config = { ...this.config, ...config };

    // Reconnect if port changed and was connected
    if (config.port && wasConnected) {
      await this.disconnect();
      await this.connect();
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; config: OllamaCodeConfig } {
    return {
      connected: this.isConnected,
      config: { ...this.config }
    };
  }

  /**
   * Handle incoming message from backend
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const response: IDEResponse = JSON.parse(data.toString());

      const pending = this.pendingRequests.get(response.id);
      if (!pending) {
        // Handle unsolicited messages (notifications, etc.)
        this.emit('notification', response);
        return;
      }

      switch (response.type) {
        case 'success':
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);
          pending.resolve(response.payload);
          break;

        case 'error':
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);
          pending.reject(new Error(response.payload.error || 'Unknown error'));
          break;

        case 'progress':
          this.emit('progress', response.id, response.payload);
          break;

        case 'stream':
          this.emit('stream', response.id, response.payload);
          break;
      }

    } catch (error) {
      this.emit('error', new Error('Failed to parse response from backend'));
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnection(code: number, reason: Buffer): void {
    this.isConnected = false;
    this.emit('disconnected', code, reason);

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection lost'));
    }
    this.pendingRequests.clear();

    // Attempt reconnection if appropriate
    if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.attemptReconnection();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  /**
   * Attempt to reconnect to backend
   */
  private async attemptReconnection(): Promise<void> {
    if (this.isConnected) return;

    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);

    try {
      await this.connect();
      vscode.window.showInformationMessage('Reconnected to Ollama Code backend');
    } catch (error) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        vscode.window.showErrorMessage('Failed to reconnect to Ollama Code backend. Please restart the extension or check the server.');
        this.emit('reconnectionFailed');
      }
    }
  }

  /**
   * Send request and wait for response
   */
  private sendRequest(request: IDERequest): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.isConnected) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error('Request timeout'));
      }, this.config.connectionTimeout);

      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        timeout
      });

      try {
        this.ws.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(request.id);
        reject(error);
      }
    });
  }

  /**
   * Send request without waiting for response
   */
  private sendRequestNoResponse(request: IDERequest): void {
    if (this.ws && this.isConnected) {
      try {
        this.ws.send(JSON.stringify(request));
      } catch (error) {
        this.emit('error', error);
      }
    }
  }

  /**
   * Set up initial workspace context
   */
  private setupWorkspaceContext(): void {
    // Get workspace information
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      this.context.rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }

    // Get active editor information
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      this.context.activeFile = activeEditor.document.uri.fsPath;
      this.context.language = activeEditor.document.languageId;
      this.context.cursorPosition = {
        line: activeEditor.selection.active.line,
        character: activeEditor.selection.active.character
      };

      if (!activeEditor.selection.isEmpty) {
        this.context.selection = {
          start: {
            line: activeEditor.selection.start.line,
            character: activeEditor.selection.start.character
          },
          end: {
            line: activeEditor.selection.end.line,
            character: activeEditor.selection.end.character
          }
        };
      }
    }

    // Get open files
    this.context.openFiles = vscode.workspace.textDocuments.map(doc => doc.uri.fsPath);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
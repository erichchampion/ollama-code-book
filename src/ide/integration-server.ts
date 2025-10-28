/**
 * IDE Integration Server
 *
 * WebSocket-based server for IDE extensions to communicate with ollama-code CLI.
 * Provides real-time AI assistance, code analysis, and project intelligence.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { normalizeError } from '../utils/error-utils.js';
import { createServer, Server } from 'http';
import { logger } from '../utils/logger.js';
import { commandRegistry, executeCommand } from '../commands/index.js';
import { MCPServer } from '../mcp/server.js';
import { EventEmitter } from 'events';
import { generateClientId } from '../utils/id-generator.js';
import { getErrorMessage, wrapError } from '../utils/error-utils.js';
import { IDE_TIMEOUTS } from '../constants/timeouts.js';
import { WS_CLOSE_CODES, IDE_CLOSE_REASONS, IDE_SERVER_DEFAULTS } from '../constants/websocket.js';

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

export interface WorkspaceContext {
  rootPath: string;
  activeFile?: string;
  selection?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  cursorPosition?: { line: number; character: number };
  openFiles: string[];
  gitBranch?: string;
  projectType?: string;
}

export interface AIRequest {
  prompt: string;
  context?: WorkspaceContext;
  type: 'completion' | 'explanation' | 'refactor' | 'fix' | 'generate';
  language?: string;
  includeDependencies?: boolean;
}

export interface ExtensionClient {
  id: string;
  ws: WebSocket;
  context?: WorkspaceContext;
  lastActivity: number;
  authenticated: boolean;
}

export class IDEIntegrationServer extends EventEmitter {
  private server: Server;
  private wss: WebSocketServer;
  private clients = new Map<string, ExtensionClient>();
  private mcpServer: MCPServer;
  private isRunning = false;
  private port: number;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private startTime: number | null = null;

  constructor(port: number = IDE_SERVER_DEFAULTS.PORT) {
    super();
    this.port = port;
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.mcpServer = new MCPServer();
    this.setupWebSocketHandlers();
  }

  /**
   * Start the IDE integration server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('IDE integration server is already running');
      return;
    }

    try {
      // Start MCP server first
      try {
        await this.mcpServer.start(this.port + IDE_SERVER_DEFAULTS.MCP_PORT_OFFSET);
        logger.info(`MCP server started on port ${this.port + IDE_SERVER_DEFAULTS.MCP_PORT_OFFSET}`);
      } catch (mcpError) {
        logger.warn('Failed to start MCP server, continuing without it:', mcpError);
        // Continue without MCP server - IDE integration can work without it
      }

      // Start HTTP server for WebSocket connections
      await new Promise<void>((resolve, reject) => {
        this.server.listen(this.port, () => {
          this.isRunning = true;
          this.startTime = Date.now();
          logger.info(`IDE Integration Server started on port ${this.port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error('Failed to start IDE Integration Server:', error);
          reject(error);
        });
      });

      // Start client heartbeat monitoring
      this.startHeartbeat();

      this.emit('server_started', { port: this.port });

    } catch (error) {
      logger.error('Failed to start IDE Integration Server:', error);
      // Clean up any partially started services
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Stop the IDE integration server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('Stopping IDE Integration Server...');

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      try {
        client.ws.close(WS_CLOSE_CODES.NORMAL, IDE_CLOSE_REASONS.SERVER_SHUTDOWN);
      } catch (error) {
        logger.debug(`Error closing client ${clientId}:`, error);
      }
    }
    this.clients.clear();

    // Close WebSocket server
    this.wss.close();

    // Stop HTTP server
    await new Promise<void>((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        this.startTime = null;
        logger.info('IDE Integration Server stopped');
        resolve();
      });
    });

    // Stop MCP server
    await this.mcpServer.stop();

    this.emit('server_stopped');
  }

  /**
   * Setup WebSocket connection handlers
   */
  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws, request) => {
      const clientId = generateClientId();
      const client: ExtensionClient = {
        id: clientId,
        ws,
        lastActivity: Date.now(),
        authenticated: false
      };

      this.clients.set(clientId, client);
      logger.info(`IDE client connected: ${clientId}`);

      // Send welcome message
      this.sendResponse(client, {
        id: 'welcome',
        type: 'success',
        payload: {
          message: 'Connected to ollama-code IDE Integration Server',
          clientId,
          capabilities: this.getServerCapabilities()
        },
        timestamp: Date.now()
      });

      // Handle messages
      ws.on('message', async (data) => {
        try {
          const request: IDERequest = JSON.parse(data.toString());
          await this.handleRequest(client, request);
        } catch (error) {
          logger.error(`Error handling message from ${clientId}:`, error);
          this.sendError(client, 'invalid_request', 'Invalid request format');
        }
      });

      // Handle disconnection
      ws.on('close', (code, reason) => {
        logger.info(`IDE client disconnected: ${clientId} (${code}: ${reason})`);
        this.clients.delete(clientId);
        this.emit('client_disconnected', { clientId, code, reason });
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      this.emit('client_connected', { clientId, client });
    });
  }

  /**
   * Handle incoming request from IDE extension
   */
  private async handleRequest(client: ExtensionClient, request: IDERequest): Promise<void> {
    client.lastActivity = Date.now();
    logger.debug(`Handling request ${request.type} from client ${client.id}`);

    try {
      switch (request.type) {
        case 'ai_request':
          await this.handleAIRequest(client, request);
          break;

        case 'command':
          await this.handleCommandRequest(client, request);
          break;

        case 'context_update':
          await this.handleContextUpdate(client, request);
          break;

        case 'workspace_analysis':
          await this.handleWorkspaceAnalysis(client, request);
          break;

        default:
          this.sendError(client, request.id, `Unknown request type: ${request.type}`);
      }

    } catch (error) {
      logger.error(`Error handling request ${request.type}:`, error);
      this.sendError(
        client,
        request.id,
        normalizeError(error).message
      );
    }
  }

  /**
   * Handle AI assistance requests (completions, explanations, etc.)
   */
  private async handleAIRequest(client: ExtensionClient, request: IDERequest): Promise<void> {
    const aiRequest: AIRequest = request.payload;

    // Send progress update
    this.sendProgress(client, request.id, 'Processing AI request...', 0);

    try {
      // Prepare command based on AI request type
      let command: string;
      const args: string[] = [];

      switch (aiRequest.type) {
        case 'completion':
          command = 'complete';
          args.push('--prompt', aiRequest.prompt);
          if (aiRequest.language) args.push('--language', aiRequest.language);
          break;

        case 'explanation':
          command = 'explain';
          args.push('--code', aiRequest.prompt);
          break;

        case 'refactor':
          command = 'refactor';
          args.push('--code', aiRequest.prompt);
          break;

        case 'fix':
          command = 'fix';
          args.push('--code', aiRequest.prompt);
          break;

        case 'generate':
          command = 'generate';
          args.push('--description', aiRequest.prompt);
          if (aiRequest.language) args.push('--language', aiRequest.language);
          break;

        default:
          throw new Error(`Unknown AI request type: ${aiRequest.type}`);
      }

      // Add context information if available
      if (client.context) {
        args.push('--context', JSON.stringify(client.context));
      }

      // Send progress update
      this.sendProgress(client, request.id, 'Executing command...', 50);

      // Execute command using existing command registry
      const result = await executeCommand(command, args);

      // Send successful response
      this.sendResponse(client, {
        id: request.id,
        type: 'success',
        payload: {
          result,
          type: aiRequest.type,
          metadata: {
            language: aiRequest.language,
            processingTime: Date.now() - request.timestamp
          }
        },
        timestamp: Date.now()
      });

    } catch (error) {
      this.sendError(
        client,
        request.id,
        getErrorMessage(error)
      );
    }
  }

  /**
   * Handle direct command execution requests
   */
  private async handleCommandRequest(client: ExtensionClient, request: IDERequest): Promise<void> {
    const { command, args } = request.payload;

    try {
      const result = await executeCommand(command, args || []);

      this.sendResponse(client, {
        id: request.id,
        type: 'success',
        payload: {
          command,
          args,
          result,
          executionTime: Date.now() - request.timestamp
        },
        timestamp: Date.now()
      });

    } catch (error) {
      this.sendError(
        client,
        request.id,
        `Command execution failed: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Handle workspace context updates from IDE
   */
  private async handleContextUpdate(client: ExtensionClient, request: IDERequest): Promise<void> {
    const context: WorkspaceContext = request.payload;

    // Update client context
    client.context = { ...client.context, ...context };

    logger.debug(`Updated context for client ${client.id}:`, {
      rootPath: context.rootPath,
      activeFile: context.activeFile,
      openFiles: context.openFiles?.length || 0
    });

    // Acknowledge context update
    this.sendResponse(client, {
      id: request.id,
      type: 'success',
      payload: {
        message: 'Context updated successfully',
        context: client.context
      },
      timestamp: Date.now()
    });

    this.emit('context_updated', { clientId: client.id, context: client.context });
  }

  /**
   * Handle workspace analysis requests
   */
  private async handleWorkspaceAnalysis(client: ExtensionClient, request: IDERequest): Promise<void> {
    const { analysisType, files } = request.payload;

    try {
      this.sendProgress(client, request.id, 'Analyzing workspace...', 0);

      // Use existing analysis commands
      let result: any;

      switch (analysisType) {
        case 'security':
          result = await executeCommand('analyze', ['--security', '--files', ...files]);
          break;

        case 'performance':
          result = await executeCommand('analyze', ['--performance', '--files', ...files]);
          break;

        case 'quality':
          result = await executeCommand('analyze', ['--quality', '--files', ...files]);
          break;

        case 'dependencies':
          result = await executeCommand('analyze', ['--dependencies']);
          break;

        default:
          result = await executeCommand('analyze', ['--files', ...files]);
      }

      this.sendResponse(client, {
        id: request.id,
        type: 'success',
        payload: {
          analysisType,
          files,
          result,
          analysisTime: Date.now() - request.timestamp
        },
        timestamp: Date.now()
      });

    } catch (error) {
      this.sendError(
        client,
        request.id,
        `Workspace analysis failed: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Send response to client
   */
  private sendResponse(client: ExtensionClient, response: IDEResponse): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(response));
    }
  }

  /**
   * Send error response to client
   */
  private sendError(client: ExtensionClient, requestId: string, message: string): void {
    this.sendResponse(client, {
      id: requestId,
      type: 'error',
      payload: { error: message },
      timestamp: Date.now()
    });
  }

  /**
   * Send progress update to client
   */
  private sendProgress(client: ExtensionClient, requestId: string, message: string, progress: number): void {
    this.sendResponse(client, {
      id: requestId,
      type: 'progress',
      payload: { message, progress },
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: IDEResponse): void {
    for (const client of this.clients.values()) {
      this.sendResponse(client, message);
    }
  }

  /**
   * Get server capabilities
   */
  private getServerCapabilities(): any {
    return {
      aiRequests: ['completion', 'explanation', 'refactor', 'fix', 'generate'],
      analysis: ['security', 'performance', 'quality', 'dependencies'],
      commands: commandRegistry.list().map(cmd => cmd.name),
      features: {
        realTimeUpdates: true,
        contextAware: true,
        streaming: true,
        fileWatching: true
      }
    };
  }


  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      // Create snapshot of clients to avoid concurrent modification
      const clientEntries = Array.from(this.clients.entries());

      for (const [clientId, client] of clientEntries) {
        if (now - client.lastActivity > IDE_TIMEOUTS.CLIENT_TIMEOUT) {
          logger.warn(`Client ${clientId} timed out, closing connection`);
          client.ws.close(WS_CLOSE_CODES.GOING_AWAY, IDE_CLOSE_REASONS.CLIENT_TIMEOUT);
          this.clients.delete(clientId);
        } else {
          // Send ping
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.ping();
          }
        }
      }
    }, IDE_TIMEOUTS.HEARTBEAT_INTERVAL);
  }

  /**
   * Get connected clients info
   */
  getConnectedClients(): Array<{ id: string; lastActivity: number; authenticated: boolean }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      lastActivity: client.lastActivity,
      authenticated: client.authenticated
    }));
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    port: number;
    clientCount: number;
    uptime?: number;
  } {
    return {
      isRunning: this.isRunning,
      port: this.port,
      clientCount: this.clients.size,
      uptime: this.isRunning && this.startTime ? Date.now() - this.startTime : undefined
    };
  }

  /**
   * Clean up partially started services
   */
  private async cleanup(): Promise<void> {
    try {
      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Close client connections
      for (const [clientId, client] of this.clients) {
        try {
          client.ws.close(WS_CLOSE_CODES.GOING_AWAY, IDE_CLOSE_REASONS.STARTUP_FAILED);
        } catch (error) {
          logger.debug(`Error closing client ${clientId} during cleanup:`, error);
        }
      }
      this.clients.clear();

      // Close servers
      if (this.wss) {
        this.wss.close();
      }

      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => resolve());
        });
      }

      // Stop MCP server
      try {
        await this.mcpServer.stop();
      } catch (error) {
        logger.debug('Error stopping MCP server during cleanup:', error);
      }

      this.isRunning = false;
      this.startTime = null;

    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Dispose of the server and clean up resources
   */
  async dispose(): Promise<void> {
    await this.stop();
    await this.mcpServer.dispose();
    this.removeAllListeners();
  }
}

/**
 * Global IDE integration server instance
 */
let ideIntegrationServer: IDEIntegrationServer | null = null;

/**
 * Get or create IDE integration server instance
 */
export function getIDEIntegrationServer(port?: number): IDEIntegrationServer {
  if (!ideIntegrationServer) {
    ideIntegrationServer = new IDEIntegrationServer(port);
  }
  return ideIntegrationServer;
}

/**
 * Start IDE integration server as a service
 */
export async function startIDEIntegrationService(port?: number): Promise<IDEIntegrationServer> {
  const server = getIDEIntegrationServer(port);
  await server.start();
  return server;
}

/**
 * Stop IDE integration server service
 */
export async function stopIDEIntegrationService(): Promise<void> {
  if (ideIntegrationServer) {
    await ideIntegrationServer.stop();
    ideIntegrationServer = null;
  }
}

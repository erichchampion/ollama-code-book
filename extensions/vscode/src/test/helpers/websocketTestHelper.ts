/**
 * WebSocket Test Helpers
 * Utilities for testing WebSocket server functionality
 */

import WebSocket from 'ws';
import {
  WEBSOCKET_TEST_CONSTANTS,
  MCP_TEST_CONSTANTS,
  JSONRPC_ERROR_CODES,
} from './test-constants.js';
import { sleep } from './test-utils.js';

export interface WebSocketTestClient {
  ws: WebSocket;
  messages: any[];
  errors: Error[];
  isConnected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(data: any): Promise<void>;
  waitForMessage(timeout?: number): Promise<any>;
  clearMessages(): void;
}

/**
 * Options for creating test WebSocket client
 */
export interface WebSocketClientOptions {
  /** Authentication token */
  authToken?: string;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Create a test WebSocket client
 */
export function createTestWebSocketClient(
  url: string,
  options: WebSocketClientOptions = {}
): WebSocketTestClient {
  const messages: any[] = [];
  const errors: Error[] = [];
  let ws: WebSocket;

  return {
    get ws() {
      return ws;
    },
    get isConnected() {
      return ws && ws.readyState === WebSocket.OPEN;
    },
    messages,
    errors,

    async connect(): Promise<void> {
      return new Promise((resolve, reject) => {
        const headers: Record<string, string> = { ...options.headers };

        // Add authentication token if provided
        if (options.authToken) {
          headers['Authorization'] = `Bearer ${options.authToken}`;
        }

        ws = new WebSocket(url, { headers });

        const timeout = options.timeout || WEBSOCKET_TEST_CONSTANTS.CONNECTION_TIMEOUT;
        const timer = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.terminate();
            reject(new Error('Connection timeout'));
          }
        }, timeout);

        ws.on('open', () => {
          clearTimeout(timer);
          resolve();
        });

        ws.on('message', (data: WebSocket.Data) => {
          try {
            const parsed = JSON.parse(data.toString());
            messages.push(parsed);
          } catch (error) {
            messages.push(data.toString());
          }
        });

        ws.on('error', (error: Error) => {
          errors.push(error);
          // Only reject if connection hasn't been established yet
          if (ws.readyState !== WebSocket.OPEN) {
            clearTimeout(timer);
            reject(error);
          }
        });
      });
    },

    async disconnect(): Promise<void> {
      return new Promise((resolve) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.once('close', () => {
            resolve();
          });
          ws.close();
        } else {
          resolve();
        }
      });
    },

    async send(data: any): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket is not connected'));
          return;
        }

        const message = typeof data === 'string' ? data : JSON.stringify(data);
        ws.send(message, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    },

    async waitForMessage(timeout: number = WEBSOCKET_TEST_CONSTANTS.MESSAGE_TIMEOUT): Promise<any> {
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        if (messages.length > 0) {
          return messages.shift();
        }
        await sleep(WEBSOCKET_TEST_CONSTANTS.MESSAGE_POLL_INTERVAL);
      }

      throw new Error('Timeout waiting for WebSocket message');
    },

    clearMessages(): void {
      messages.length = 0;
      errors.length = 0;
    }
  };
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Input schema */
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  /** Tool handler function */
  handler?: (input: any) => Promise<any> | any;
}

/**
 * Mock MCP server options
 */
export interface MockMCPServerOptions {
  /** Require authentication token */
  requireAuth?: boolean;
  /** Valid authentication token */
  validAuthToken?: string;
  /** Maximum number of concurrent connections */
  maxConnections?: number;
  /** Enable heartbeat/ping-pong */
  enableHeartbeat?: boolean;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
  /** Enable MCP protocol support */
  enableMCP?: boolean;
  /** Simulate MCP initialization delay */
  mcpInitDelay?: number;
}

/**
 * Mock MCP server for testing
 */
export interface MockMCPServer {
  start(port: number, options?: MockMCPServerOptions): Promise<void>;
  stop(): Promise<void>;
  getConnectedClients(): number;
  broadcastMessage(data: any): void;
  getReceivedMessages(): any[];
  getRejectedConnections(): number;
  clearMessages(): void;
  registerTool(tool: MCPTool): void;
  getRegisteredTools(): MCPTool[];
  isInitialized(): boolean;
  simulateRestart(): Promise<void>;
}

export function createMockMCPServer(): MockMCPServer {
  let wss: WebSocket.Server | null = null;
  const clients: Set<WebSocket> = new Set();
  const receivedMessages: any[] = [];
  let rejectedConnections = 0;
  let serverOptions: MockMCPServerOptions = {};
  const heartbeatTimers: Map<WebSocket, NodeJS.Timeout> = new Map();
  const registeredTools: MCPTool[] = [];
  let initialized = false;
  let currentPort = 0;

  /**
   * Handle MCP protocol messages
   */
  async function handleMCPMessage(
    ws: WebSocket,
    parsed: any,
    options: MockMCPServerOptions
  ): Promise<void> {
    if (parsed.method === 'initialize') {
      // Simulate MCP initialization
      if (options.mcpInitDelay) {
        await sleep(options.mcpInitDelay);
      }
      initialized = true;
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          protocolVersion: MCP_TEST_CONSTANTS.PROTOCOL_VERSION,
          capabilities: {
            tools: {},
            prompts: {}
          },
          serverInfo: {
            name: MCP_TEST_CONSTANTS.SERVER_NAME,
            version: MCP_TEST_CONSTANTS.SERVER_VERSION
          }
        }
      }));
    } else if (parsed.method === 'tools/list') {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          tools: registeredTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }))
        }
      }));
    } else if (parsed.method === 'tools/call') {
      const toolName = parsed.params?.name;
      const tool = registeredTools.find(t => t.name === toolName);

      if (tool && tool.handler) {
        try {
          const result = await tool.handler(parsed.params?.arguments);
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: parsed.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result)
                }
              ]
            }
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: parsed.id,
            error: {
              code: JSONRPC_ERROR_CODES.INTERNAL_ERROR,
              message: errorMessage
            }
          }));
        }
      } else {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: parsed.id,
          error: {
            code: JSONRPC_ERROR_CODES.METHOD_NOT_FOUND,
            message: `Tool not found: ${toolName}`
          }
        }));
      }
    }
  }

  return {
    async start(port: number, options: MockMCPServerOptions = {}): Promise<void> {
      serverOptions = options;
      currentPort = port;
      return new Promise((resolve, reject) => {
        try {
          wss = new WebSocket.Server({
            port,
            verifyClient: (info, callback) => {
              // Check authentication if required
              if (options.requireAuth) {
                const authHeader = info.req.headers['authorization'];
                const expectedToken = `Bearer ${
                  options.validAuthToken || WEBSOCKET_TEST_CONSTANTS.AUTH.VALID_TOKEN
                }`;

                if (authHeader !== expectedToken) {
                  rejectedConnections++;
                  callback(false, 401, 'Unauthorized');
                  return;
                }
              }

              // Check connection limit
              if (options.maxConnections && clients.size >= options.maxConnections) {
                rejectedConnections++;
                callback(false, 503, 'Connection limit reached');
                return;
              }

              callback(true);
            }
          });

          wss.on('connection', (ws: WebSocket) => {
            clients.add(ws);

            // Start heartbeat if enabled
            if (options.enableHeartbeat) {
              const interval = options.heartbeatInterval ||
                MCP_TEST_CONSTANTS.DEFAULT_HEARTBEAT_INTERVAL;
              const timer = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.ping();
                }
              }, interval);
              heartbeatTimers.set(ws, timer);

              ws.on('pong', () => {
                // Client is alive
              });
            }

            ws.on('message', async (data: WebSocket.Data) => {
              // Try to parse as JSON
              let parsed: any;
              try {
                parsed = JSON.parse(data.toString());
                receivedMessages.push(parsed);
              } catch (parseError) {
                // Not JSON - store as string
                receivedMessages.push(data.toString());
                return;
              }

              // Auto-respond to ping messages
              if (parsed.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              }

              // Handle MCP protocol messages if enabled
              if (options.enableMCP && parsed.method) {
                try {
                  await handleMCPMessage(ws, parsed, options);
                } catch (mcpError) {
                  // Log MCP handling errors but don't crash
                  console.error('[Mock MCP Server] Handler error:', mcpError);
                }
              }
            });

            ws.on('close', () => {
              clients.delete(ws);
              const timer = heartbeatTimers.get(ws);
              if (timer) {
                clearInterval(timer);
                heartbeatTimers.delete(ws);
              }
            });

            ws.on('error', (error) => {
              console.error('WebSocket client error:', error);
            });
          });

          wss.on('listening', () => {
            resolve();
          });

          wss.on('error', (error) => {
            reject(error);
          });
        } catch (error) {
          reject(error);
        }
      });
    },

    async stop(): Promise<void> {
      return new Promise((resolve) => {
        if (wss) {
          // Clear all heartbeat timers
          heartbeatTimers.forEach(timer => clearInterval(timer));
          heartbeatTimers.clear();

          // Close all client connections
          clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.close();
            }
          });

          wss.close(() => {
            wss = null;
            clients.clear();
            resolve();
          });
        } else {
          resolve();
        }
      });
    },

    getConnectedClients(): number {
      return clients.size;
    },

    broadcastMessage(data: any): void {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },

    getReceivedMessages(): any[] {
      return [...receivedMessages];
    },

    getRejectedConnections(): number {
      return rejectedConnections;
    },

    clearMessages(): void {
      receivedMessages.length = 0;
      rejectedConnections = 0;
    },

    registerTool(tool: MCPTool): void {
      // Validate required fields
      if (!tool.name || !tool.description || !tool.inputSchema) {
        throw new Error('Tool missing required fields (name, description, inputSchema)');
      }

      // Validate name is not empty string
      if (tool.name.trim().length === 0) {
        throw new Error('Tool name cannot be empty');
      }

      // Check for duplicate tool names
      if (registeredTools.some(t => t.name === tool.name)) {
        throw new Error(`Tool '${tool.name}' is already registered`);
      }

      registeredTools.push(tool);
    },

    getRegisteredTools(): MCPTool[] {
      return [...registeredTools];
    },

    isInitialized(): boolean {
      return initialized;
    },

    async simulateRestart(): Promise<void> {
      // Simulate server restart
      initialized = false;
      await sleep(100);

      // Re-initialize if clients are connected
      if (clients.size > 0 && serverOptions.enableMCP) {
        await sleep(serverOptions.mcpInitDelay || 0);
        initialized = true;
      }
    }
  };
}

/**
 * Wait for WebSocket connection
 */
export async function waitForConnection(
  ws: WebSocket,
  timeout: number = WEBSOCKET_TEST_CONSTANTS.CONNECTION_TIMEOUT
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, timeout);

    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });

    ws.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// sleep is now imported from shared utilities

/**
 * Assert WebSocket is connected
 */
export function assertConnected(ws: WebSocket): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket is not connected');
  }
}

/**
 * Assert WebSocket is disconnected
 */
export function assertDisconnected(ws: WebSocket): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    throw new Error('WebSocket is still connected');
  }
}

/**
 * Send and wait for response
 */
export async function sendAndWaitForResponse(
  client: WebSocketTestClient,
  request: any,
  timeout: number = WEBSOCKET_TEST_CONSTANTS.MESSAGE_TIMEOUT
): Promise<any> {
  client.clearMessages();
  await client.send(request);
  return await client.waitForMessage(timeout);
}

/**
 * Test connection heartbeat
 */
export async function testHeartbeat(
  client: WebSocketTestClient,
  interval: number = WEBSOCKET_TEST_CONSTANTS.HEARTBEAT_INTERVAL,
  count: number = WEBSOCKET_TEST_CONSTANTS.HEARTBEAT_COUNT
): Promise<boolean> {
  for (let i = 0; i < count; i++) {
    await client.send({ type: 'ping' });
    await sleep(interval);
  }

  return client.errors.length === 0;
}

/**
 * Model Context Protocol (MCP) Client
 *
 * Connects to external MCP servers to use their tools and resources
 * as part of the ollama-code workflow
 */

import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger.js';
import { ConfigType } from '../config/schema.js';
import { DELAY_CONSTANTS } from '../config/constants.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPConnection {
  name: string;
  tools: MCPTool[];
  resources: MCPResource[];
  capabilities: {
    tools?: { listChanged?: boolean };
    resources?: { subscribe?: boolean; listChanged?: boolean };
    prompts?: { listChanged?: boolean };
    logging?: {};
  };
}

export interface MCPToolCallResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    resource?: string;
  }>;
  isError?: boolean;
}

export interface MCPResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
  }>;
}

export class MCPClient {
  private connections = new Map<string, MCPClientConnection>();
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  /**
   * Initialize all configured MCP connections
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.debug('MCP client is disabled');
      return;
    }

    logger.info('Initializing MCP client connections...');

    const connectionPromises = this.config.connections
      .filter((conn: any) => conn.enabled)
      .map((conn: any) => this.connectToServer(conn));

    const results = await Promise.allSettled(connectionPromises);

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result: any, index: number) => {
      const connectionConfig = this.config.connections[index];
      if (result.status === 'fulfilled') {
        successCount++;
        logger.info(`Successfully connected to MCP server: ${connectionConfig.name}`);
      } else {
        failureCount++;
        logger.error(`Failed to connect to MCP server ${connectionConfig.name}:`, result.reason);
      }
    });

    logger.info(`MCP client initialized: ${successCount} successful, ${failureCount} failed connections`);
  }

  /**
   * Connect to a single MCP server
   */
  private async connectToServer(config: any): Promise<void> {
    try {
      const connection = new MCPClientConnection(config, this.config);
      await connection.connect();
      this.connections.set(config.name, connection);
    } catch (error) {
      logger.error(`Failed to connect to MCP server ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Get all available tools from all connections
   */
  getAvailableTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const connection of this.connections.values()) {
      tools.push(...connection.getTools());
    }
    return tools;
  }

  /**
   * Get all available resources from all connections
   */
  getAvailableResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    for (const connection of this.connections.values()) {
      resources.push(...connection.getResources());
    }
    return resources;
  }

  /**
   * Call a tool on the appropriate MCP server
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<MCPToolCallResult> {
    for (const connection of this.connections.values()) {
      const tools = connection.getTools();
      if (tools.some(tool => tool.name === toolName)) {
        return await connection.callTool(toolName, args);
      }
    }

    throw new Error(`Tool '${toolName}' not found in any connected MCP server`);
  }

  /**
   * Get a resource from the appropriate MCP server
   */
  async getResource(uri: string): Promise<MCPResourceResult> {
    for (const connection of this.connections.values()) {
      const resources = connection.getResources();
      if (resources.some(resource => resource.uri === uri)) {
        return await connection.getResource(uri);
      }
    }

    throw new Error(`Resource '${uri}' not found in any connected MCP server`);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Array<{
    name: string;
    connected: boolean;
    toolCount: number;
    resourceCount: number;
  }> {
    return Array.from(this.connections.entries()).map(([name, connection]) => ({
      name,
      connected: connection.isConnected(),
      toolCount: connection.getTools().length,
      resourceCount: connection.getResources().length
    }));
  }

  /**
   * Reconnect to a specific server
   */
  async reconnect(serverName: string): Promise<void> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`Connection '${serverName}' not found`);
    }

    await connection.reconnect();
  }

  /**
   * Disconnect from all servers
   */
  async disconnect(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.values()).map(conn => conn.disconnect());
    await Promise.allSettled(disconnectPromises);
    this.connections.clear();
    logger.info('MCP client disconnected from all servers');
  }

  /**
   * Dispose of the client and clean up resources
   */
  async dispose(): Promise<void> {
    await this.disconnect();
  }
}

/**
 * Individual MCP server connection
 */
class MCPClientConnection {
  private process: ChildProcess | null = null;
  private connected = false;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];
  private capabilities: MCPConnection['capabilities'] = {};
  private messageId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  constructor(
    private config: any,
    private globalConfig: any
  ) {}

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Spawn the MCP server process
      this.process = spawn(this.config.command, this.config.args, {
        cwd: this.config.cwd || process.cwd(),
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Setup process event handlers
      this.setupProcessHandlers();

      // Wait for connection to be established
      await this.waitForConnection();

      // Initialize the connection
      await this.initialize();

      this.connected = true;
      logger.debug(`Connected to MCP server: ${this.config.name}`);

    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.on('error', (error) => {
      logger.error(`MCP server process error (${this.config.name}):`, error);
      this.connected = false;
    });

    this.process.on('exit', (code, signal) => {
      logger.warn(`MCP server process exited (${this.config.name}): code=${code}, signal=${signal}`);
      this.connected = false;
    });

    this.process.stdout?.on('data', (data) => {
      this.handleMessage(data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      if (this.globalConfig.logging.enabled) {
        logger.debug(`MCP server stderr (${this.config.name}):`, data.toString());
      }
    });
  }

  /**
   * Handle incoming messages from the MCP server
   */
  private handleMessage(data: string): void {
    try {
      const lines = data.trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const message = JSON.parse(line);
          this.processMessage(message);
        }
      }
    } catch (error) {
      logger.error(`Error parsing MCP message from ${this.config.name}:`, error);
    }
  }

  /**
   * Process a parsed message
   */
  private processMessage(message: any): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        request.reject(new Error(message.error.message || 'MCP request failed'));
      } else {
        request.resolve(message.result);
      }
    }
  }

  /**
   * Send a request to the MCP server
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process || !this.connected) {
      throw new Error(`Not connected to MCP server: ${this.config.name}`);
    }

    const id = ++this.messageId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for ${method} on ${this.config.name}`));
      }, this.config.timeout);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * Wait for connection to be established
   */
  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout for MCP server: ${this.config.name}`));
      }, this.config.timeout);

      const checkConnection = () => {
        if (this.process && this.process.stdout?.readable) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkConnection, DELAY_CONSTANTS.BRIEF_PAUSE);
        }
      };

      checkConnection();
    });
  }

  /**
   * Initialize the MCP connection
   */
  private async initialize(): Promise<void> {
    try {
      // Get server capabilities
      const capabilities = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {}
        },
        clientInfo: {
          name: 'ollama-code',
          version: '1.0.0'
        }
      });

      this.capabilities = capabilities.capabilities || {};

      // List available tools
      if (this.capabilities.tools) {
        const toolsResult = await this.sendRequest('tools/list');
        this.tools = toolsResult.tools || [];
      }

      // List available resources
      if (this.capabilities.resources) {
        const resourcesResult = await this.sendRequest('resources/list');
        this.resources = resourcesResult.resources || [];
      }

    } catch (error) {
      logger.error(`Failed to initialize MCP connection ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Call a tool on this MCP server
   */
  async callTool(name: string, arguments_: Record<string, any>): Promise<MCPToolCallResult> {
    const result = await this.sendRequest('tools/call', {
      name,
      arguments: arguments_
    });

    return result;
  }

  /**
   * Get a resource from this MCP server
   */
  async getResource(uri: string): Promise<MCPResourceResult> {
    const result = await this.sendRequest('resources/read', {
      uri
    });

    return result;
  }

  /**
   * Get available tools
   */
  getTools(): MCPTool[] {
    return [...this.tools];
  }

  /**
   * Get available resources
   */
  getResources(): MCPResource[] {
    return [...this.resources];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.process !== null && !this.process.killed;
  }

  /**
   * Reconnect to the server
   */
  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    await this.cleanup();
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    if (this.process) {
      if (!this.process.killed) {
        this.process.kill();
      }
      this.process = null;
    }

    // Reject all pending requests
    for (const request of this.pendingRequests.values()) {
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    this.tools = [];
    this.resources = [];
    this.capabilities = {};
  }
}

/**
 * Create MCP client from configuration
 */
export function createMCPClient(config: any): MCPClient {
  return new MCPClient(config);
}
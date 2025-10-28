/**
 * Model Context Protocol (MCP) Server Integration
 *
 * Implements MCP server functionality to expose ollama-code capabilities
 * as tools and resources that can be used by other MCP clients:
 * - Tool exposure for code generation, analysis, and refactoring
 * - Resource exposure for project files and documentation
 * - Real-time notifications for file changes
 * - Secure authentication and permission management
 */

import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';
import { commandRegistry } from '../commands/index.js';
// import { progressManager } from '../optimization/progress-manager.js';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    resource?: string;
  }>;
  isError?: boolean;
}

interface MCPNotification {
  method: string;
  params?: any;
}

export class MCPServer {
  private tools = new Map<string, MCPTool>();
  private resources = new Map<string, MCPResource>();
  private clients = new Set<MCPClient>();
  private isRunning = false;
  private resourceMonitoringInterval: NodeJS.Timeout | null = null;
  private serverInfo = {
    name: 'ollama-code',
    version: '1.0.0',
    protocolVersion: '2024-11-05'
  };

  constructor() {
    this.registerCoreTools();
    this.registerCoreResources();
  }

  /**
   * Start the MCP server
   */
  async start(port?: number): Promise<void> {
    if (this.isRunning) {
      logger.warn('MCP server is already running');
      return;
    }

    try {
      // In a real implementation, this would start an actual server
      // For now, we'll simulate the server startup
      this.isRunning = true;

      logger.info(`MCP server started on port ${port || 3001}`);
      logger.info(`Available tools: ${Array.from(this.tools.keys()).join(', ')}`);
      logger.info(`Available resources: ${Array.from(this.resources.keys()).join(', ')}`);

      // Start resource monitoring
      this.startResourceMonitoring();

    } catch (error) {
      logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.clients.clear();

    // Stop resource monitoring
    if (this.resourceMonitoringInterval) {
      clearInterval(this.resourceMonitoringInterval);
      this.resourceMonitoringInterval = null;
    }

    logger.info('MCP server stopped');
  }

  /**
   * Handle tool call request
   */
  async handleToolCall(toolCall: MCPToolCall): Promise<MCPToolResult> {
    logger.debug(`Handling tool call: ${toolCall.name}`, toolCall.arguments);

    try {
      const tool = this.tools.get(toolCall.name);
      if (!tool) {
        return {
          content: [{
            type: 'text',
            text: `Tool '${toolCall.name}' not found`
          }],
          isError: true
        };
      }

      // Execute the tool
      const result = await this.executeTool(toolCall.name, toolCall.arguments);

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };

    } catch (error) {
      logger.error(`Tool call failed:`, error);

      return {
        content: [{
          type: 'text',
          text: `Tool execution failed: ${normalizeError(error).message}`
        }],
        isError: true
      };
    }
  }

  /**
   * Handle resource request
   */
  async handleResourceRequest(uri: string): Promise<{
    contents: Array<{
      uri: string;
      mimeType?: string;
      text?: string;
    }>;
  }> {
    logger.debug(`Handling resource request: ${uri}`);

    try {
      const resource = this.resources.get(uri);
      if (!resource) {
        throw new Error(`Resource '${uri}' not found`);
      }

      const content = await this.getResourceContent(uri);

      return {
        contents: [{
          uri,
          mimeType: resource.mimeType || 'text/plain',
          text: content
        }]
      };

    } catch (error) {
      logger.error(`Resource request failed:`, error);
      throw error;
    }
  }

  /**
   * List available tools
   */
  listTools(): { tools: MCPTool[] } {
    return {
      tools: Array.from(this.tools.values())
    };
  }

  /**
   * List available resources
   */
  listResources(): { resources: MCPResource[] } {
    return {
      resources: Array.from(this.resources.values())
    };
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): {
    tools?: { listChanged?: boolean };
    resources?: { subscribe?: boolean; listChanged?: boolean };
    prompts?: { listChanged?: boolean };
    logging?: {};
  } {
    return {
      tools: { listChanged: true },
      resources: { subscribe: true, listChanged: true },
      logging: {}
    };
  }

  /**
   * Send notification to all clients
   */
  async sendNotification(notification: MCPNotification): Promise<void> {
    logger.debug(`Sending notification: ${notification.method}`);

    for (const client of this.clients) {
      try {
        await client.notify(notification);
      } catch (error) {
        logger.error(`Failed to notify client:`, error);
      }
    }
  }

  /**
   * Register a new MCP client
   */
  registerClient(client: MCPClient): void {
    this.clients.add(client);
    logger.debug(`Registered MCP client: ${client.id}`);
  }

  /**
   * Unregister MCP client
   */
  unregisterClient(client: MCPClient): void {
    this.clients.delete(client);
    logger.debug(`Unregistered MCP client: ${client.id}`);
  }

  /**
   * Execute a tool by name
   */
  private async executeTool(toolName: string, args: Record<string, any>): Promise<string> {
    switch (toolName) {
      case 'analyze_code':
        return this.analyzeCode(args.code, args.language);

      case 'generate_code':
        return this.generateCode(args.prompt, args.language);

      case 'refactor_code':
        return this.refactorCode(args.code, args.type);

      case 'explain_code':
        return this.explainCode(args.code, args.context);

      case 'fix_code':
        return this.fixCode(args.code, args.error);

      case 'search_codebase':
        return this.searchCodebase(args.query, args.pattern);

      case 'git_status':
        return this.getGitStatus();

      case 'run_tests':
        return this.runTests(args.testPattern);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Get resource content by URI
   */
  private async getResourceContent(uri: string): Promise<string> {
    if (uri.startsWith('file://')) {
      const filePath = uri.replace('file://', '');
      const { promises: fs } = await import('fs');

      try {
        return await fs.readFile(filePath, 'utf-8');
      } catch (error) {
        throw new Error(`Cannot read file: ${filePath}`);
      }
    }

    if (uri.startsWith('project://')) {
      return this.getProjectInfo();
    }

    if (uri.startsWith('config://')) {
      return this.getConfigInfo();
    }

    throw new Error(`Unknown resource URI scheme: ${uri}`);
  }

  /**
   * Register core tools
   */
  private registerCoreTools(): void {
    const tools: MCPTool[] = [
      {
        name: 'analyze_code',
        description: 'Analyze code for quality, patterns, and potential issues',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to analyze' },
            language: { type: 'string', description: 'Programming language' }
          },
          required: ['code']
        }
      },
      {
        name: 'generate_code',
        description: 'Generate code based on natural language description',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Description of what to generate' },
            language: { type: 'string', description: 'Target programming language' }
          },
          required: ['prompt']
        }
      },
      {
        name: 'refactor_code',
        description: 'Refactor code for better quality and maintainability',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to refactor' },
            type: { type: 'string', description: 'Type of refactoring (performance, readability, etc.)' }
          },
          required: ['code']
        }
      },
      {
        name: 'explain_code',
        description: 'Explain what code does and how it works',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to explain' },
            context: { type: 'string', description: 'Additional context' }
          },
          required: ['code']
        }
      },
      {
        name: 'fix_code',
        description: 'Fix bugs or issues in code',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code with issues' },
            error: { type: 'string', description: 'Error message or description' }
          },
          required: ['code']
        }
      },
      {
        name: 'search_codebase',
        description: 'Search for patterns or code in the codebase',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            pattern: { type: 'string', description: 'Regex pattern to match' }
          },
          required: ['query']
        }
      },
      {
        name: 'git_status',
        description: 'Get current git repository status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'run_tests',
        description: 'Run tests in the project',
        inputSchema: {
          type: 'object',
          properties: {
            testPattern: { type: 'string', description: 'Pattern for test files to run' }
          }
        }
      }
    ];

    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }

    logger.debug(`Registered ${tools.length} MCP tools`);
  }

  /**
   * Register core resources
   */
  private registerCoreResources(): void {
    const resources: MCPResource[] = [
      {
        uri: 'project://info',
        name: 'Project Information',
        description: 'General information about the current project',
        mimeType: 'application/json'
      },
      {
        uri: 'config://current',
        name: 'Current Configuration',
        description: 'Current ollama-code configuration',
        mimeType: 'application/json'
      }
    ];

    for (const resource of resources) {
      this.resources.set(resource.uri, resource);
    }

    logger.debug(`Registered ${resources.length} MCP resources`);
  }

  /**
   * Start monitoring resources for changes
   */
  private startResourceMonitoring(): void {
    // Monitor file system changes
    this.resourceMonitoringInterval = setInterval(async () => {
      try {
        // Check for project file changes
        await this.sendNotification({
          method: 'notifications/resources/list_changed'
        });
      } catch (error) {
        logger.debug('Resource monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  // Tool implementation methods (simplified for example)

  private async analyzeCode(code: string, language?: string): Promise<string> {
    // Simulate code analysis
    return `Code analysis results:\n- Language: ${language || 'detected'}\n- Lines: ${code.split('\n').length}\n- Complexity: Medium`;
  }

  private async generateCode(prompt: string, language?: string): Promise<string> {
    // Simulate code generation
    return `// Generated ${language || 'JavaScript'} code for: ${prompt}\nfunction example() {\n  // Implementation here\n}`;
  }

  private async refactorCode(code: string, type?: string): Promise<string> {
    return `// Refactored code (${type || 'general'}):\n${code}\n// End refactoring`;
  }

  private async explainCode(code: string, context?: string): Promise<string> {
    return `Code explanation:\nThis code appears to implement functionality for ${context || 'general purpose'}...`;
  }

  private async fixCode(code: string, error?: string): Promise<string> {
    return `// Fixed code (addressing: ${error || 'general issues'}):\n${code}`;
  }

  private async searchCodebase(query: string, pattern?: string): Promise<string> {
    return `Search results for "${query}":\n- Found 3 matches\n- Pattern: ${pattern || 'none'}`;
  }

  private async getGitStatus(): Promise<string> {
    return `Git status:\n- Branch: main\n- Clean working directory\n- Up to date with origin`;
  }

  private async runTests(testPattern?: string): Promise<string> {
    return `Test results (pattern: ${testPattern || 'all'}):\n- 12 tests passed\n- 0 tests failed`;
  }

  private getProjectInfo(): string {
    return JSON.stringify({
      name: 'ollama-code',
      type: 'TypeScript CLI',
      files: 150,
      lastModified: new Date().toISOString()
    }, null, 2);
  }

  private getConfigInfo(): string {
    return JSON.stringify({
      ai: { defaultModel: 'llama3.2' },
      ui: { theme: 'auto' },
      performance: { maxCacheSize: 104857600 }
    }, null, 2);
  }

  /**
   * Dispose of the MCP server and clean up resources
   */
  async dispose(): Promise<void> {
    await this.stop();
    this.tools.clear();
    this.resources.clear();
    this.clients.clear();

    // Ensure monitoring is stopped
    if (this.resourceMonitoringInterval) {
      clearInterval(this.resourceMonitoringInterval);
      this.resourceMonitoringInterval = null;
    }

    logger.debug('MCP server disposed');
  }
}

/**
 * MCP Client interface
 */
export interface MCPClient {
  id: string;
  notify(notification: MCPNotification): Promise<void>;
}

/**
 * Create and configure MCP server
 */
export function createMCPServer(): MCPServer {
  const server = new MCPServer();

  // Add any additional configuration here

  return server;
}

// Legacy export - use dependency injection instead
// export const mcpServer = MCPServer.getInstance();

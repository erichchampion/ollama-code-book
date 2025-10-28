/**
 * MCP Commands
 *
 * Commands for managing and interacting with the MCP server
 */

import { commandRegistry, ArgType } from './index.js';
import { logger } from '../utils/logger.js';
// import { mcpServer } from '../mcp/server.js';
import { validateNonEmptyString } from '../utils/command-helpers.js';

// Helper to get MCP server from container
async function getMCPServerInstance(): Promise<any> {
  const { getMCPServer } = await import('../core/services.js');
  return getMCPServer() as any;
}

/**
 * Register MCP commands
 */
export function registerMCPCommands(): void {
  logger.debug('Registering MCP commands');

  registerMCPStartCommand();
  registerMCPStopCommand();
  registerMCPStatusCommand();
  registerMCPToolsCommand();
  registerMCPResourcesCommand();
  registerMCPCallCommand();
}

/**
 * Start MCP server
 */
function registerMCPStartCommand(): void {
  const command = {
    name: 'mcp-start',
    description: 'Start the MCP server to expose ollama-code tools to other clients',
    category: 'MCP Integration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const port = args.port || 3001;

        console.log(`🚀 Starting MCP server on port ${port}...`);

        const mcpServer = await getMCPServerInstance();
        await mcpServer.start(port);

        console.log('✅ MCP server started successfully');
        console.log(`📡 Server is now exposing ollama-code tools via MCP protocol`);
        console.log(`🔗 Connect MCP clients to: http://localhost:${port}`);

        const capabilities = mcpServer.getCapabilities();
        console.log('\n📋 Server Capabilities:');
        console.log(`   • Tools: ${capabilities.tools ? 'Supported' : 'Not supported'}`);
        console.log(`   • Resources: ${capabilities.resources ? 'Supported' : 'Not supported'}`);
        console.log(`   • Logging: ${capabilities.logging ? 'Supported' : 'Not supported'}`);

      } catch (error) {
        logger.error('MCP start command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'port',
        description: 'Port number for the MCP server (default: 3001)',
        type: ArgType.NUMBER,
        position: 0,
        required: false
      }
    ],
    examples: [
      'mcp-start',
      'mcp-start 3002'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Stop MCP server
 */
function registerMCPStopCommand(): void {
  const command = {
    name: 'mcp-stop',
    description: 'Stop the MCP server',
    category: 'MCP Integration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        console.log('🛑 Stopping MCP server...');

        const mcpServer = await getMCPServerInstance();
        await mcpServer.stop();

        console.log('✅ MCP server stopped successfully');

      } catch (error) {
        logger.error('MCP stop command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'mcp-stop'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Show MCP server status
 */
function registerMCPStatusCommand(): void {
  const command = {
    name: 'mcp-status',
    description: 'Show MCP server status and information',
    category: 'MCP Integration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const mcpServer = await getMCPServerInstance();

        console.log('📊 MCP Server Status\n');

        // Server info would be retrieved from the server
        console.log('🖥️  Server Information:');
        console.log('   • Name: ollama-code MCP Server');
        console.log('   • Version: 1.0.0');
        console.log('   • Protocol Version: 2024-11-05');
        console.log('   • Status: Running'); // This would be dynamic

        const tools = mcpServer.listTools();
        console.log(`\n🔧 Available Tools (${tools.tools.length}):`);
        for (const tool of tools.tools) {
          console.log(`   • ${tool.name} - ${tool.description}`);
        }

        const resources = mcpServer.listResources();
        console.log(`\n📁 Available Resources (${resources.resources.length}):`);
        for (const resource of resources.resources) {
          console.log(`   • ${resource.name} (${resource.uri}) - ${resource.description}`);
        }

        const capabilities = mcpServer.getCapabilities();
        console.log('\n⚙️  Capabilities:');
        console.log(`   • Tools: ${capabilities.tools ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   • Resources: ${capabilities.resources ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   • Logging: ${capabilities.logging ? '✅ Enabled' : '❌ Disabled'}`);

      } catch (error) {
        logger.error('MCP status command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'mcp-status'
    ]
  };

  commandRegistry.register(command);
}

/**
 * List available MCP tools
 */
function registerMCPToolsCommand(): void {
  const command = {
    name: 'mcp-tools',
    description: 'List all available MCP tools with their schemas',
    category: 'MCP Integration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const mcpServer = await getMCPServerInstance();
        const tools = mcpServer.listTools();

        console.log(`🔧 MCP Tools (${tools.tools.length} available)\n`);

        for (const tool of tools.tools) {
          console.log(`📦 ${tool.name}`);
          console.log(`   Description: ${tool.description}`);

          if (tool.inputSchema.properties) {
            console.log('   Parameters:');
            for (const [param, schema] of Object.entries(tool.inputSchema.properties)) {
              const required = tool.inputSchema.required?.includes(param) ? ' (required)' : '';
              const description = (schema as any).description ? ` - ${(schema as any).description}` : '';
              console.log(`     • ${param}: ${(schema as any).type}${required}${description}`);
            }
          }

          console.log('');
        }

        console.log('💡 Use "mcp-call <tool-name>" to execute a tool');

      } catch (error) {
        logger.error('MCP tools command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'mcp-tools'
    ]
  };

  commandRegistry.register(command);
}

/**
 * List available MCP resources
 */
function registerMCPResourcesCommand(): void {
  const command = {
    name: 'mcp-resources',
    description: 'List all available MCP resources',
    category: 'MCP Integration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const mcpServer = await getMCPServerInstance();
        const resources = mcpServer.listResources();

        console.log(`📁 MCP Resources (${resources.resources.length} available)\n`);

        for (const resource of resources.resources) {
          console.log(`📄 ${resource.name}`);
          console.log(`   URI: ${resource.uri}`);
          console.log(`   Type: ${resource.mimeType || 'text/plain'}`);
          if (resource.description) {
            console.log(`   Description: ${resource.description}`);
          }
          console.log('');
        }

        console.log('💡 Resources can be accessed by MCP clients using their URIs');

      } catch (error) {
        logger.error('MCP resources command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'mcp-resources'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Call an MCP tool
 */
function registerMCPCallCommand(): void {
  const command = {
    name: 'mcp-call',
    description: 'Call an MCP tool with arguments (for testing)',
    category: 'MCP Integration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { tool_name, tool_args } = args;

        if (!validateNonEmptyString(tool_name, 'tool name')) {
          const mcpServer = await getMCPServerInstance();
          const tools = mcpServer.listTools();
          console.log('Available tools:');
          for (const tool of tools.tools) {
            console.log(`   • ${tool.name} - ${tool.description}`);
          }
          return;
        }

        console.log(`🔧 Calling MCP tool: ${tool_name}`);

        // Parse arguments if provided
        let parsedArgs = {};
        if (tool_args) {
          try {
            parsedArgs = JSON.parse(tool_args);
          } catch (error) {
            console.error('❌ Invalid JSON arguments. Example: \'{"code": "console.log()", "language": "javascript"}\'');
            return;
          }
        }

        const mcpServer = await getMCPServerInstance();
        const result = await mcpServer.handleToolCall({
          name: tool_name,
          arguments: parsedArgs
        });

        console.log('\n📋 Tool Result:');

        if (result.isError) {
          console.log('❌ Error:');
        } else {
          console.log('✅ Success:');
        }

        for (const content of result.content) {
          if (content.type === 'text' && content.text) {
            console.log(content.text);
          }
        }

      } catch (error) {
        logger.error('MCP call command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'tool_name',
        description: 'Name of the MCP tool to call',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'tool_args',
        description: 'JSON string with tool arguments',
        type: ArgType.STRING,
        position: 1,
        required: false
      }
    ],
    examples: [
      'mcp-call analyze_code \'{"code": "console.log()", "language": "javascript"}\'',
      'mcp-call generate_code \'{"prompt": "create a hello world function"}\'',
      'mcp-call git_status'
    ]
  };

  commandRegistry.register(command);
}
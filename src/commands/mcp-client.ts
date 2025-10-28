/**
 * MCP Client Commands
 *
 * Commands for managing external MCP server connections
 */

import { Command } from '../types/command.js';
import { normalizeError } from '../utils/error-utils.js';
import { logger } from '../utils/logger.js';
import { UserError } from '../errors/types.js';
import { ArgType } from './types.js';
import { loadConfig, saveConfig } from '../config/loader.js';
import { MCPClientConnectionSchema } from '../config/schema.js';

export const mcpClientStatusCommand: Command = {
  name: 'mcp-client-status',
  description: 'Show status of MCP client connections',
  category: 'MCP',
  handler: async () => {
    try {
      const { getMCPClient } = await import('../core/services.js');
      const mcpClient = await getMCPClient() as any;

      const status = mcpClient.getConnectionStatus();

      if (status.length === 0) {
        console.log('No MCP client connections configured');
        return;
      }

      console.log('MCP Client Connection Status:');
      console.log('================================');

      for (const conn of status) {
        const statusIcon = conn.connected ? '✅' : '❌';
        console.log(`${statusIcon} ${conn.name}`);
        console.log(`   Connected: ${conn.connected ? 'Yes' : 'No'}`);
        console.log(`   Tools: ${conn.toolCount}`);
        console.log(`   Resources: ${conn.resourceCount}`);
        console.log('');
      }

    } catch (error) {
      logger.error('Failed to get MCP client status:', error);
      throw new UserError('Failed to get MCP client status');
    }
  }
};

export const mcpClientListToolsCommand: Command = {
  name: 'mcp-client-tools',
  description: 'List all available tools from connected MCP servers',
  category: 'MCP',
  handler: async () => {
    try {
      const { getMCPClient } = await import('../core/services.js');
      const mcpClient = await getMCPClient() as any;

      const tools = mcpClient.getAvailableTools();

      if (tools.length === 0) {
        console.log('No tools available from connected MCP servers');
        return;
      }

      console.log('Available MCP Tools:');
      console.log('===================');

      for (const tool of tools) {
        console.log(`🔧 ${tool.name}`);
        console.log(`   Description: ${tool.description}`);
        if (tool.inputSchema.required && tool.inputSchema.required.length > 0) {
          console.log(`   Required params: ${tool.inputSchema.required.join(', ')}`);
        }
        console.log('');
      }

    } catch (error) {
      logger.error('Failed to list MCP tools:', error);
      throw new UserError('Failed to list MCP tools');
    }
  }
};

export const mcpClientListResourcesCommand: Command = {
  name: 'mcp-client-resources',
  description: 'List all available resources from connected MCP servers',
  category: 'MCP',
  handler: async () => {
    try {
      const { getMCPClient } = await import('../core/services.js');
      const mcpClient = await getMCPClient() as any;

      const resources = mcpClient.getAvailableResources();

      if (resources.length === 0) {
        console.log('No resources available from connected MCP servers');
        return;
      }

      console.log('Available MCP Resources:');
      console.log('=======================');

      for (const resource of resources) {
        console.log(`📄 ${resource.name}`);
        console.log(`   URI: ${resource.uri}`);
        if (resource.description) {
          console.log(`   Description: ${resource.description}`);
        }
        if (resource.mimeType) {
          console.log(`   Type: ${resource.mimeType}`);
        }
        console.log('');
      }

    } catch (error) {
      logger.error('Failed to list MCP resources:', error);
      throw new UserError('Failed to list MCP resources');
    }
  }
};

export const mcpClientCallToolCommand: Command = {
  name: 'mcp-call-tool',
  description: 'Call a tool from a connected MCP server',
  examples: ['mcp-call-tool <tool-name> [args-json]'],
  category: 'MCP',
  handler: async (args: Record<string, any>) => {
    const { toolName, argsJson } = args;

    if (!toolName) {
      throw new UserError('Please provide a tool name to call');
    }

    let toolArgs: Record<string, any> = {};

    if (argsJson) {
      try {
        toolArgs = JSON.parse(argsJson);
      } catch (error) {
        throw new UserError('Invalid JSON for tool arguments');
      }
    }

    try {
      const { getMCPClient } = await import('../core/services.js');
      const mcpClient = await getMCPClient() as any;

      console.log(`Calling tool: ${toolName}`);
      if (Object.keys(toolArgs).length > 0) {
        console.log(`Arguments: ${JSON.stringify(toolArgs, null, 2)}`);
      }
      console.log('');

      const result = await mcpClient.callTool(toolName, toolArgs);

      if (result.isError) {
        console.log('❌ Tool call failed:');
      } else {
        console.log('✅ Tool call successful:');
      }

      for (const content of result.content) {
        if (content.type === 'text' && content.text) {
          console.log(content.text);
        } else if (content.type === 'resource' && content.resource) {
          console.log(`Resource: ${content.resource}`);
        } else if (content.type === 'image' && content.data) {
          console.log(`Image data: ${content.data.length} bytes`);
        }
      }

    } catch (error) {
      logger.error('Failed to call MCP tool:', error);
      throw new UserError(`Failed to call MCP tool: ${normalizeError(error).message}`);
    }
  },
  args: [
    {
      name: 'toolName',
      description: 'Name of the tool to call',
      type: ArgType.STRING,
      position: 0,
      required: true
    },
    {
      name: 'argsJson',
      description: 'JSON string containing tool arguments',
      type: ArgType.STRING,
      position: 1,
      required: false
    }
  ]
};

export const mcpClientGetResourceCommand: Command = {
  name: 'mcp-get-resource',
  description: 'Get a resource from a connected MCP server',
  examples: ['mcp-get-resource <resource-uri>'],
  category: 'MCP',
  handler: async (args: Record<string, any>) => {
    const { resourceUri } = args;

    if (!resourceUri) {
      throw new UserError('Please provide a resource URI');
    }

    try {
      const { getMCPClient } = await import('../core/services.js');
      const mcpClient = await getMCPClient() as any;

      console.log(`Getting resource: ${resourceUri}`);
      console.log('');

      const result = await mcpClient.getResource(resourceUri);

      for (const content of result.contents) {
        console.log(`📄 ${content.uri}`);
        if (content.mimeType) {
          console.log(`Type: ${content.mimeType}`);
        }
        if (content.text) {
          console.log('Content:');
          console.log(content.text);
        }
        console.log('');
      }

    } catch (error) {
      logger.error('Failed to get MCP resource:', error);
      throw new UserError(`Failed to get MCP resource: ${normalizeError(error).message}`);
    }
  },
  args: [
    {
      name: 'resourceUri',
      description: 'URI of the resource to get',
      type: ArgType.STRING,
      position: 0,
      required: true
    }
  ]
};

export const mcpClientAddConnectionCommand: Command = {
  name: 'mcp-add-connection',
  description: 'Add a new MCP server connection',
  examples: ['mcp-add-connection <name> <command> [args...]'],
  category: 'MCP',
  handler: async (args: Record<string, any>) => {
    const { name, command, commandArgs } = args;

    if (!name || !command) {
      throw new UserError('Please provide connection name and command');
    }

    // Parse commandArgs if it's a string (space-separated) or use as array
    const parsedCommandArgs = typeof commandArgs === 'string' ?
      commandArgs.split(' ').filter(arg => arg.length > 0) :
      (Array.isArray(commandArgs) ? commandArgs : []);

    try {
      // Validate the connection configuration
      const connectionConfig = {
        name,
        command,
        args: parsedCommandArgs,
        enabled: true
      };

      MCPClientConnectionSchema.parse(connectionConfig);

      // Load current config
      const config = await loadConfig();

      // Check if connection already exists
      const existingIndex = config.mcp.client.connections.findIndex((conn: any) => conn.name === name);
      if (existingIndex !== -1) {
        throw new UserError(`MCP connection '${name}' already exists`);
      }

      // Add the new connection
      config.mcp.client.connections.push(connectionConfig);

      // Save the config
      await saveConfig(config);

      console.log(`✅ Added MCP connection: ${name}`);
      console.log(`Command: ${command} ${commandArgs.join(' ')}`);
      console.log('');
      console.log('To enable MCP client functionality, run:');
      console.log('ollama-code config mcp.client.enabled true');

    } catch (error) {
      logger.error('Failed to add MCP connection:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        throw error;
      }
      throw new UserError('Failed to add MCP connection');
    }
  }
};

export const mcpClientRemoveConnectionCommand: Command = {
  name: 'mcp-remove-connection',
  description: 'Remove an MCP server connection',
  examples: ['mcp-remove-connection <name>'],
  category: 'MCP',
  handler: async (args: Record<string, any>) => {
    if (args.length < 1) {
      throw new UserError('Please provide connection name to remove');
    }

    const name = args[0];

    try {
      // Load current config
      const config = await loadConfig();

      // Find the connection
      const connectionIndex = config.mcp.client.connections.findIndex((conn: any) => conn.name === name);
      if (connectionIndex === -1) {
        throw new UserError(`MCP connection '${name}' not found`);
      }

      // Remove the connection
      config.mcp.client.connections.splice(connectionIndex, 1);

      // Save the config
      await saveConfig(config);

      console.log(`✅ Removed MCP connection: ${name}`);

    } catch (error) {
      logger.error('Failed to remove MCP connection:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new UserError('Failed to remove MCP connection');
    }
  }
};

export const mcpClientReconnectCommand: Command = {
  name: 'mcp-reconnect',
  description: 'Reconnect to a specific MCP server',
  examples: ['mcp-reconnect <connection-name>'],
  category: 'MCP',
  handler: async (args: Record<string, any>) => {
    if (args.length < 1) {
      throw new UserError('Please provide connection name to reconnect');
    }

    const connectionName = args[0];

    try {
      const { getMCPClient } = await import('../core/services.js');
      const mcpClient = await getMCPClient() as any;

      console.log(`Reconnecting to MCP server: ${connectionName}...`);

      await mcpClient.reconnect(connectionName);

      console.log(`✅ Successfully reconnected to: ${connectionName}`);

    } catch (error) {
      logger.error('Failed to reconnect to MCP server:', error);
      throw new UserError(`Failed to reconnect to MCP server: ${normalizeError(error).message}`);
    }
  }
};

export const mcpClientListConnectionsCommand: Command = {
  name: 'mcp-list-connections',
  description: 'List all configured MCP client connections',
  category: 'MCP',
  handler: async () => {
    try {
      const config = await loadConfig();
      const connections = config.mcp.client.connections;

      if (connections.length === 0) {
        console.log('No MCP client connections configured');
        console.log('');
        console.log('To add a connection, use:');
        console.log('ollama-code mcp-add-connection <name> <command> [args...]');
        return;
      }

      console.log('Configured MCP Client Connections:');
      console.log('=================================');

      for (const conn of connections) {
        const statusIcon = conn.enabled ? '✅' : '⭕';
        console.log(`${statusIcon} ${conn.name}`);
        console.log(`   Command: ${conn.command} ${conn.args.join(' ')}`);
        console.log(`   Enabled: ${conn.enabled ? 'Yes' : 'No'}`);
        if (conn.cwd) {
          console.log(`   Working Directory: ${conn.cwd}`);
        }
        if (Object.keys(conn.env).length > 0) {
          console.log(`   Environment: ${Object.keys(conn.env).join(', ')}`);
        }
        console.log('');
      }

      console.log(`MCP Client Status: ${config.mcp.client.enabled ? 'Enabled' : 'Disabled'}`);

    } catch (error) {
      logger.error('Failed to list MCP connections:', error);
      throw new UserError('Failed to list MCP connections');
    }
  }
};

/**
 * MCP Client Commands Registration
 *
 * Registers all MCP client-related commands
 */

import { commandRegistry } from './index.js';
import {
  mcpClientStatusCommand,
  mcpClientListToolsCommand,
  mcpClientListResourcesCommand,
  mcpClientCallToolCommand,
  mcpClientGetResourceCommand,
  mcpClientAddConnectionCommand,
  mcpClientRemoveConnectionCommand,
  mcpClientReconnectCommand,
  mcpClientListConnectionsCommand
} from './mcp-client.js';

/**
 * Register all MCP client commands
 */
export function registerMCPClientCommands(): void {
  // Connection management commands
  commandRegistry.register(mcpClientListConnectionsCommand);
  commandRegistry.register(mcpClientAddConnectionCommand);
  commandRegistry.register(mcpClientRemoveConnectionCommand);
  commandRegistry.register(mcpClientStatusCommand);
  commandRegistry.register(mcpClientReconnectCommand);

  // Tool and resource interaction commands
  commandRegistry.register(mcpClientListToolsCommand);
  commandRegistry.register(mcpClientListResourcesCommand);
  commandRegistry.register(mcpClientCallToolCommand);
  commandRegistry.register(mcpClientGetResourceCommand);
}
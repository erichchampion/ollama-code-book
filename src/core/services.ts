/**
 * Service Registration
 *
 * Registers all services with the dependency injection container,
 * replacing singleton patterns with proper dependency injection.
 */

import { globalContainer } from './container.js';
import { logger } from '../utils/logger.js';

/**
 * Register all core services
 */
export async function registerServices(): Promise<void> {
  logger.debug('Registering core services...');

  // Register logger as a singleton
  globalContainer.instance('logger', logger);

  // Register command registry
  globalContainer.singleton('commandRegistry', async () => {
    const { commandRegistry } = await import('../commands/index.js');
    return commandRegistry;
  });

  // Register tool registry
  globalContainer.singleton('toolRegistry', async () => {
    const { toolRegistry } = await import('../tools/index.js');
    return toolRegistry;
  });

  // Register memory manager
  globalContainer.singleton('memoryManager', async () => {
    const { MemoryManager } = await import('../optimization/memory-manager.js');
    return new MemoryManager();
  });

  // Register AI cache manager
  globalContainer.singleton('aiCacheManager', async (container) => {
    const { AICacheManager } = await import('../optimization/ai-cache.js');
    const memoryManager = await container.resolve('memoryManager');
    return new AICacheManager(memoryManager);
  }, ['memoryManager']);

  // Register progress manager
  globalContainer.singleton('progressManager', async () => {
    const { ProgressManager } = await import('../optimization/progress-manager.js');
    return new ProgressManager();
  });

  // Register error recovery manager
  globalContainer.singleton('errorRecoveryManager', async () => {
    const { ErrorRecoveryManager } = await import('../optimization/error-recovery.js');
    return new ErrorRecoveryManager();
  });

  // Register config validator
  globalContainer.singleton('configValidator', async () => {
    const { ConfigValidator } = await import('../optimization/config-validator.js');
    return new ConfigValidator();
  });

  // Register lazy loader
  globalContainer.singleton('lazyLoader', async () => {
    const { LazyLoader } = await import('../optimization/lazy-loader.js');
    return new LazyLoader();
  });

  // Register MCP server
  globalContainer.singleton('mcpServer', async () => {
    const { MCPServer } = await import('../mcp/server.js');
    return new MCPServer();
  });

  // Register MCP client with error handling
  globalContainer.singleton('mcpClient', async () => {
    try {
      const { createMCPClient } = await import('../mcp/client.js');
      const { loadConfig } = await import('../config/loader.js');
      const config = await loadConfig();

      // Provide default MCP client config if not present
      const mcpClientConfig = config.mcp?.client || {
        enabled: false,
        connections: [],
        globalTimeout: 60000,
        maxConcurrentConnections: 3,
        logging: { enabled: false, level: 'info', logFile: 'mcp-client.log' }
      };

      const client = createMCPClient(mcpClientConfig);

      // Initialize with timeout and error handling
      const INIT_TIMEOUT = 30000; // 30 seconds
      const initPromise = client.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('MCP client initialization timed out')), INIT_TIMEOUT);
      });

      await Promise.race([initPromise, timeoutPromise]);

      logger.info('MCP client initialized successfully');
      return client;
    } catch (error) {
      logger.error('Failed to initialize MCP client:', error);
      // Return a null client or stub to prevent cascade failures
      logger.warn('MCP client will be unavailable - returning stub');
      return {
        initialize: async () => {},
        dispose: async () => {},
        isConnected: () => false
      };
    }
  });

  // Register IDE Integration Server
  globalContainer.singleton('ideIntegrationServer', async () => {
    const { IDEIntegrationServer } = await import('../ide/integration-server.js');
    const { IDE_SERVER_DEFAULTS } = await import('../constants/websocket.js');
    const { loadConfig } = await import('../config/loader.js');
    const config = await loadConfig();
    const port = config.ide?.port || IDE_SERVER_DEFAULTS.PORT;
    return new IDEIntegrationServer(port);
  });

  // Register AI client
  globalContainer.singleton('aiClient', async () => {
    const { OllamaClient } = await import('../ai/ollama-client.js');
    return new OllamaClient();
  });

  // Register enhanced AI client
  globalContainer.singleton('enhancedClient', async (container) => {
    const { EnhancedClient } = await import('../ai/enhanced-client.js');
    const aiClient = await container.resolve('aiClient') as any;
    return new EnhancedClient(aiClient);
  }, ['aiClient']);

  // Register project context
  globalContainer.transient('projectContext', async () => {
    const { ProjectContext } = await import('../ai/context.js');
    return new ProjectContext(process.cwd());
  });

  // Register terminal
  globalContainer.singleton('terminal', async () => {
    const { initTerminal } = await import('../terminal/index.js');
    const { getMinimalConfig } = await import('../utils/config-helpers.js');
    return await initTerminal(getMinimalConfig());
  });

  logger.debug('Core services registered successfully');
}

/**
 * Service accessor functions for backward compatibility
 */
export async function getCommandRegistry() {
  return globalContainer.resolve('commandRegistry');
}

export async function getToolRegistry() {
  return globalContainer.resolve('toolRegistry');
}

export async function getMemoryManager() {
  return globalContainer.resolve('memoryManager');
}

export async function getAICacheManager() {
  return globalContainer.resolve('aiCacheManager');
}

export async function getProgressManager() {
  return globalContainer.resolve('progressManager');
}

export async function getErrorRecoveryManager() {
  return globalContainer.resolve('errorRecoveryManager');
}

export async function getConfigValidator() {
  return globalContainer.resolve('configValidator');
}

export async function getLazyLoader() {
  return globalContainer.resolve('lazyLoader');
}

export async function getMCPServer() {
  return globalContainer.resolve('mcpServer');
}

export async function getMCPClient() {
  return globalContainer.resolve('mcpClient');
}

export async function getAIClient() {
  return globalContainer.resolve('aiClient');
}

export async function getEnhancedClient() {
  return globalContainer.resolve('enhancedClient');
}

export async function getProjectContext() {
  return globalContainer.resolve('projectContext');
}

export async function getTerminal() {
  return globalContainer.resolve('terminal');
}

export async function getIDEIntegrationServer() {
  return globalContainer.resolve('ideIntegrationServer');
}

/**
 * Initialize all services needed for a specific operation
 */
export async function initializeServicesForOperation(operation: 'ai' | 'tools' | 'mcp' | 'all'): Promise<void> {
  switch (operation) {
    case 'ai':
      await Promise.all([
        globalContainer.resolve('aiClient'),
        globalContainer.resolve('enhancedClient'),
        globalContainer.resolve('aiCacheManager'),
        globalContainer.resolve('memoryManager')
      ]);
      break;

    case 'tools':
      await Promise.all([
        globalContainer.resolve('toolRegistry'),
        globalContainer.resolve('progressManager')
      ]);
      break;

    case 'mcp':
      await Promise.all([
        globalContainer.resolve('mcpServer'),
        globalContainer.resolve('mcpClient')
      ]);
      break;

    case 'all':
      await Promise.all([
        globalContainer.resolve('commandRegistry'),
        globalContainer.resolve('toolRegistry'),
        globalContainer.resolve('aiClient'),
        globalContainer.resolve('enhancedClient'),
        globalContainer.resolve('memoryManager'),
        globalContainer.resolve('aiCacheManager'),
        globalContainer.resolve('progressManager'),
        globalContainer.resolve('errorRecoveryManager'),
        globalContainer.resolve('configValidator'),
        globalContainer.resolve('mcpServer'),
        globalContainer.resolve('mcpClient')
      ]);
      break;
  }
}

/**
 * Clean up all services
 */
export async function disposeServices(): Promise<void> {
  logger.debug('Disposing all services...');
  await globalContainer.dispose();
  logger.debug('All services disposed');
}
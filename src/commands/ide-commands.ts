/**
 * IDE Integration Commands
 *
 * Commands for managing IDE extensions and integrations
 */

import { commandRegistry } from './index.js';
import { logger } from '../utils/logger.js';
import { ideServerCommand } from './ide-server.js';

/**
 * Register IDE-related commands
 */
export function registerIDECommands(): void {
  logger.debug('Registering IDE commands...');

  try {
    // Register IDE server command
    commandRegistry.register(ideServerCommand);

    logger.debug('IDE commands registered successfully');
  } catch (error) {
    logger.error('Failed to register IDE commands:', error);
    throw error;
  }
}
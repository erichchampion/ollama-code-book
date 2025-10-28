/**
 * Configuration Loader
 *
 * Simple loader interface for configuration management
 */

import { loadConfig as internalLoadConfig } from './index.js';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Load configuration from file or defaults
 */
export async function loadConfig(options: any = {}): Promise<any> {
  return await internalLoadConfig(options);
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: any, configPath?: string): Promise<void> {
  try {
    const targetPath = configPath || path.join(process.cwd(), '.ollama-code.json');

    // Ensure directory exists
    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });

    // Write config file
    await fs.writeFile(targetPath, JSON.stringify(config, null, 2), 'utf-8');

    logger.debug('Configuration saved', { path: targetPath });
  } catch (error) {
    logger.error('Failed to save configuration:', error);
    throw error;
  }
}
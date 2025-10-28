/**
 * Configuration Module
 * 
 * Handles loading, validating, and providing access to application configuration.
 * Supports multiple sources like environment variables, config files, and CLI arguments.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { AI_CONSTANTS, TIMEOUT_CONSTANTS } from './constants.js';
import type { AppConfig, InitializationOptions } from '../types/app-interfaces.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AppConfig = {
  // API configuration
  api: {
    baseUrl: 'http://localhost:11434',
    version: 'v1',
    timeout: TIMEOUT_CONSTANTS.GIT_OPERATION
  },

  // AI configuration
  ai: {
    model: 'qwen2.5-coder:latest',
    temperature: AI_CONSTANTS.DEFAULT_TEMPERATURE,
    maxTokens: 4096,
    maxHistoryLength: 20
  },


  // Terminal configuration
  terminal: {
    theme: 'system' as const,
    useColors: true,
    showProgressIndicators: true,
    codeHighlighting: true
  },

  // Telemetry configuration
  telemetry: {
    enabled: true,
    submissionInterval: 30 * 60 * 1000, // 30 minutes
    maxQueueSize: 100,
    autoSubmit: true
  },

  // File operation configuration
  fileOps: {
    maxReadSizeBytes: 10 * 1024 * 1024 // 10MB
  },

  // Execution configuration
  execution: {
    shell: process.env.SHELL || 'bash'
  },

  // Logger configuration
  logger: {
    level: 'info' as const,
    timestamps: true,
    colors: true
  },

  // App information
  version: '0.2.29'
};

/**
 * Configuration file paths to check
 */
const CONFIG_PATHS = [
  // Current directory
  path.join(process.cwd(), '.ollama-code.json'),
  path.join(process.cwd(), '.ollama-code.js'),
  
  // User home directory
  path.join(os.homedir(), '.ollama-code', 'config.json'),
  path.join(os.homedir(), '.ollama-code.json'),
  
  // XDG config directory (Linux/macOS)
  process.env.XDG_CONFIG_HOME 
    ? path.join(process.env.XDG_CONFIG_HOME, 'ollama-code', 'config.json')
    : path.join(os.homedir(), '.config', 'ollama-code', 'config.json'),
  
  // AppData directory (Windows)
  process.env.APPDATA
    ? path.join(process.env.APPDATA, 'ollama-code', 'config.json')
    : null
].filter(Boolean) as string[];

/**
 * Load configuration from a file (async)
 */
async function loadConfigFromFile(configPath: string): Promise<Partial<AppConfig> | null> {
  try {
    // Use async access check instead of existsSync
    try {
      await fs.promises.access(configPath, fs.constants.F_OK);
    } catch {
      return null; // File doesn't exist
    }

    logger.debug(`Loading configuration from ${configPath}`);

    if (configPath.endsWith('.js')) {
      // Load JavaScript module using dynamic import
      const configModule = await import(configPath);
      return configModule.default || configModule;
    } else {
      // Load JSON file asynchronously
      const configContent = await fs.promises.readFile(configPath, 'utf8');
      return JSON.parse(configContent);
    }
  } catch (error) {
    logger.warn(`Error loading configuration from ${configPath}`, error);
    return null;
  }
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): Partial<AppConfig> {
  const envConfig: Record<string, unknown> = {};

  // Check for API URL
  if (process.env.OLLAMA_API_URL) {
    envConfig.api = {
      ...(envConfig.api as Record<string, unknown> || {}),
      baseUrl: process.env.OLLAMA_API_URL
    };
  }

  // Check for log level
  if (process.env.OLLAMA_LOG_LEVEL) {
    const level = process.env.OLLAMA_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error';
    envConfig.logger = {
      ...(envConfig.logger as Record<string, unknown> || {}),
      level
    };
  }

  // Check for telemetry opt-out
  if (process.env.OLLAMA_TELEMETRY === '0' || process.env.OLLAMA_TELEMETRY === 'false') {
    envConfig.telemetry = {
      ...(envConfig.telemetry as Record<string, unknown> || {}),
      enabled: false
    };
  }

  // Check for model override
  if (process.env.OLLAMA_MODEL) {
    envConfig.ai = {
      ...(envConfig.ai as Record<string, unknown> || {}),
      model: process.env.OLLAMA_MODEL
    };
  }

  return envConfig as Partial<AppConfig>;
}

/**
 * Merge configuration objects
 */
function mergeConfigs(...configs: Array<Partial<AppConfig> | null | undefined>): Partial<AppConfig> {
  const result: Record<string, unknown> = {};

  for (const config of configs) {
    if (!config) continue;

    for (const key of Object.keys(config)) {
      const value = (config as Record<string, unknown>)[key];

      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        // Recursively merge objects
        result[key] = { ...((result[key] as Record<string, unknown>) || {}), ...(value as Record<string, unknown>) };
      } else {
        // Overwrite primitives, arrays, etc.
        result[key] = value;
      }
    }
  }

  return result as Partial<AppConfig>;
}

/**
 * Validate critical configuration
 */
function validateConfig(config: Partial<AppConfig>): void {
  // Validate API configuration
  if (!config.api?.baseUrl) {
    throw createUserError('API base URL is not configured', {
      category: ErrorCategory.CONFIGURATION,
      resolution: 'Provide a valid API base URL in your configuration'
    });
  }


  // Validate AI model
  if (!config.ai?.model) {
    throw createUserError('AI model is not configured', {
      category: ErrorCategory.CONFIGURATION,
      resolution: 'Specify a valid Ollama model in your configuration'
    });
  }
}

/**
 * Load configuration
 */
export async function loadConfig(options: InitializationOptions = {}): Promise<AppConfig> {
  logger.debug('Loading configuration', { options });

  // Initialize with defaults - start as Partial to allow merging
  let config: Partial<AppConfig> = { ...DEFAULT_CONFIG };
  
  // Load configuration from files (async)
  for (const configPath of CONFIG_PATHS) {
    const fileConfig = await loadConfigFromFile(configPath);
    if (fileConfig) {
      config = mergeConfigs(config, fileConfig);
      logger.debug(`Loaded configuration from ${configPath}`);
      break; // Stop after first successful load
    }
  }
  
  // Load configuration from environment variables
  const envConfig = loadConfigFromEnv();
  config = mergeConfigs(config, envConfig);
  
  // Override with command line options
  if (options) {
    const cliConfig: Record<string, unknown> = {};

    // Map CLI flags to configuration
    if (options.verbose) {
      cliConfig.logger = {
        level: 'debug' as const,
        timestamps: true,
        colors: true
      };
    }

    if (options.quiet) {
      cliConfig.logger = {
        level: 'error' as const,
        timestamps: true,
        colors: true
      };
    }

    if (options.debug) {
      cliConfig.logger = {
        level: 'debug' as const,
        timestamps: true,
        colors: true
      };
    }
    
    if (options.config) {
      // Load from specified config file (async)
      const customConfig = await loadConfigFromFile(options.config);
      if (customConfig) {
        config = mergeConfigs(config, customConfig);
      } else {
        throw createUserError(`Could not load configuration from ${options.config}`, {
          category: ErrorCategory.CONFIGURATION,
          resolution: 'Check that the file exists and is valid JSON or JavaScript'
        });
      }
    }


    // Merge CLI options
    config = mergeConfigs(config, cliConfig as Partial<AppConfig>);
  }
  
  // Validate the configuration
  validateConfig(config);

  // Logger configuration is handled by the logger itself

  // After validation, we know all required fields are present
  return config as AppConfig;
}

export default { loadConfig }; 
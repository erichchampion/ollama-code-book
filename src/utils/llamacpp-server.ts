/**
 * llama.cpp Server Manager
 *
 * Handles automatic startup and management of the llama-server.
 */

import { spawn, exec } from 'child_process';
import { normalizeError } from '../utils/error-utils.js';
import { logger } from './logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import {
  DEFAULT_LLAMACPP_URL,
  SERVER_HEALTH_TIMEOUT,
  HEALTH_CHECK_INTERVAL,
  LLAMACPP_MODEL_STARTUP_TIMEOUT
} from '../constants.js';
import { DELAY_CONSTANTS } from '../config/constants.js';

/**
 * Configuration options for llama-server startup
 */
export interface LlamaCppServerConfig {
  /** Base URL for the server */
  baseUrl?: string;
  /** Path to llama-server executable */
  executablePath?: string;
  /** Path to GGUF model file */
  modelPath?: string;
  /** Number of GPU layers to offload */
  gpuLayers?: number;
  /** Context window size */
  contextSize?: number;
  /** Enable flash attention */
  flashAttention?: boolean;
  /** Number of threads */
  threads?: number;
  /** Number of parallel sequences */
  parallel?: number;
  /** Additional server arguments */
  serverArgs?: string[];
  /** Health check interval in ms */
  healthCheckInterval?: number;
  /** Startup timeout in ms */
  startupTimeout?: number;
  /** Max health check retries */
  maxHealthCheckRetries?: number;
}

/**
 * Check if llama-server is running
 */
export async function isLlamaCppServerRunning(baseUrl: string = DEFAULT_LLAMACPP_URL): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(SERVER_HEALTH_TIMEOUT)
    });

    return response.ok;
  } catch (error) {
    logger.debug('llama-server check failed', { error: normalizeError(error).message });
    return false;
  }
}

/**
 * Find llama-server executable in common locations
 */
export async function findLlamaCppExecutable(): Promise<string | null> {
  const possibleNames = [
    'llama-server',
    'llama.cpp-server',
    'server' // Sometimes just called 'server' in llama.cpp builds
  ];

  const possiblePaths = [
    // User-specific paths
    `${process.env.HOME}/.local/bin`,
    `${process.env.HOME}/llama.cpp`,
    `${process.env.HOME}/llama.cpp/build/bin`,
    // System paths
    '/usr/local/bin',
    '/usr/bin',
    '/opt/llama.cpp/bin',
    // Homebrew paths (macOS)
    '/opt/homebrew/bin',
    '/usr/local/opt/llama.cpp/bin'
  ];

  return new Promise((resolve) => {
    // First try using 'which' command
    for (const name of possibleNames) {
      exec(`which ${name}`, (error, stdout) => {
        if (!error && stdout.trim()) {
          resolve(stdout.trim());
          return;
        }
      });
    }

    // Then check specific paths
    const fs = require('fs');
    for (const basePath of possiblePaths) {
      for (const name of possibleNames) {
        const fullPath = `${basePath}/${name}`;
        if (fs.existsSync(fullPath)) {
          // Verify it's executable
          try {
            fs.accessSync(fullPath, fs.constants.X_OK);
            resolve(fullPath);
            return;
          } catch {
            // Not executable, continue searching
          }
        }
      }
    }

    // Not found
    setTimeout(() => resolve(null), 1000);
  });
}

/**
 * Check if llama-server is installed
 */
export async function isLlamaCppInstalled(): Promise<boolean> {
  const execPath = await findLlamaCppExecutable();
  return execPath !== null;
}

/**
 * Start llama-server in the background
 */
export async function startLlamaCppServer(config: LlamaCppServerConfig = {}): Promise<void> {
  logger.info('Starting llama-server in the background...');

  const {
    executablePath,
    modelPath,
    gpuLayers = -1,
    contextSize = 4096,
    flashAttention = false,
    threads,
    parallel = 1,
    serverArgs = [],
    healthCheckInterval = HEALTH_CHECK_INTERVAL,
    startupTimeout = LLAMACPP_MODEL_STARTUP_TIMEOUT,
    maxHealthCheckRetries = 30 // More retries for model loading
  } = config;

  // Find executable
  let serverPath: string | undefined = executablePath;
  if (!serverPath) {
    const foundPath = await findLlamaCppExecutable();
    if (foundPath) {
      serverPath = foundPath;
    }
  }

  if (!serverPath) {
    throw createUserError('llama-server executable not found', {
      category: ErrorCategory.SERVER,
      resolution: 'Install llama.cpp from https://github.com/ggerganov/llama.cpp or set LLAMACPP_EXECUTABLE'
    });
  }

  // TypeScript narrowing: serverPath is now definitely a string
  const execPath: string = serverPath;

  // Validate model path
  if (!modelPath) {
    throw createUserError('No model path specified', {
      category: ErrorCategory.CONFIGURATION,
      resolution: 'Set LLAMACPP_MODEL_PATH environment variable or specify modelPath in config'
    });
  }

  // Build command arguments
  const args: string[] = [
    '-m', modelPath,
    '-c', contextSize.toString(),
    '-ngl', gpuLayers.toString(),
    '-np', parallel.toString()
  ];

  if (flashAttention) {
    args.push('-fa');
  }

  if (threads) {
    args.push('-t', threads.toString());
  }

  // Add custom server args
  args.push(...serverArgs);

  return new Promise((resolve, reject) => {
    logger.debug(`Starting llama-server: ${execPath} ${args.join(' ')}`);

    const serverProcess = spawn(execPath, args, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;
    let startupTimeoutHandle: NodeJS.Timeout | null = null;
    let healthCheckIntervalHandle: NodeJS.Timeout | null = null;
    let healthCheckRetries = 0;

    const cleanup = () => {
      if (startupTimeoutHandle) {
        clearTimeout(startupTimeoutHandle);
        startupTimeoutHandle = null;
      }
      if (healthCheckIntervalHandle) {
        clearInterval(healthCheckIntervalHandle);
        healthCheckIntervalHandle = null;
      }
      logger.debug('llama-server startup timers cleaned up');
    };

    const resolveOnce = (message: string) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        logger.info(message);
        resolve();
      }
    };

    const rejectOnce = (error: Error) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        serverProcess.kill();
        reject(error);
      }
    };

    // Set up timeout for server startup
    startupTimeoutHandle = setTimeout(() => {
      rejectOnce(createUserError(`llama-server failed to start within ${startupTimeout / 1000} seconds`, {
        category: ErrorCategory.SERVER,
        resolution: 'The model may be too large or the server failed to start. Try starting it manually.'
      }));
    }, startupTimeout);

    // Start periodic health checks
    healthCheckIntervalHandle = setInterval(async () => {
      if (resolved) {
        return;
      }

      healthCheckRetries++;
      logger.debug(`llama-server health check attempt ${healthCheckRetries}/${maxHealthCheckRetries}`);

      try {
        const isRunning = await isLlamaCppServerRunning(config.baseUrl);
        if (isRunning) {
          resolveOnce('llama-server started successfully (health check)');
        } else if (healthCheckRetries >= maxHealthCheckRetries) {
          rejectOnce(createUserError(`llama-server failed to respond after ${maxHealthCheckRetries} health checks`, {
            category: ErrorCategory.SERVER,
            resolution: 'Check if the model path is correct and try starting the server manually.'
          }));
        }
      } catch (error) {
        logger.debug(`Health check ${healthCheckRetries} failed:`, error);
        if (healthCheckRetries >= maxHealthCheckRetries) {
          rejectOnce(createUserError(`llama-server health checks failed after ${maxHealthCheckRetries} attempts`, {
            category: ErrorCategory.SERVER,
            resolution: 'Check your network connection and llama.cpp installation.'
          }));
        }
      }
    }, healthCheckInterval);

    // Monitor server output for startup confirmation
    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      logger.debug('llama-server output:', output);

      // Look for server startup indicators
      if (output.includes('HTTP server listening') || output.includes('server listening on')) {
        resolveOnce('llama-server started successfully (output detection)');
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      logger.debug('llama-server error:', error);

      // Some errors are not fatal
      if (error.includes('address already in use')) {
        resolveOnce('llama-server already running');
      }
    });

    serverProcess.on('error', (error) => {
      rejectOnce(createUserError(`Failed to start llama-server: ${error.message}`, {
        cause: error,
        category: ErrorCategory.SERVER,
        resolution: 'Make sure llama-server is installed and try running it manually.'
      }));
    });

    serverProcess.on('exit', (code) => {
      if (!resolved) {
        rejectOnce(createUserError(`llama-server exited with code ${code}`, {
          category: ErrorCategory.SERVER,
          resolution: 'Check llama-server logs and try running it manually.'
        }));
      }
    });

    // Detach the process so it continues running
    serverProcess.unref();
  });
}

/**
 * Ensure llama-server is running, start it if necessary
 */
export async function ensureLlamaCppServerRunning(config: LlamaCppServerConfig = {}): Promise<void> {
  const baseUrl = config.baseUrl || DEFAULT_LLAMACPP_URL;

  logger.debug('Checking if llama-server is running...');

  // First check if server is already running
  const isRunning = await isLlamaCppServerRunning(baseUrl);
  if (isRunning) {
    logger.debug('llama-server is already running');
    return;
  }

  logger.info('llama-server is not running, attempting to start it...');

  // Check if llama-server is installed
  const isInstalled = await isLlamaCppInstalled();
  if (!isInstalled && !config.executablePath) {
    throw createUserError('llama-server is not installed', {
      category: ErrorCategory.SERVER,
      resolution: 'Install llama.cpp from https://github.com/ggerganov/llama.cpp or set LLAMACPP_EXECUTABLE'
    });
  }

  // Start the server
  await startLlamaCppServer(config);

  // Wait a moment for the server to fully initialize
  await new Promise(resolve => setTimeout(resolve, DELAY_CONSTANTS.LONG_DELAY));

  // Verify the server is now running
  const isNowRunning = await isLlamaCppServerRunning(baseUrl);
  if (!isNowRunning) {
    throw createUserError('Failed to start llama-server', {
      category: ErrorCategory.SERVER,
      resolution: 'Please start llama-server manually and try again.'
    });
  }

  logger.info('llama-server is now running and ready');
}

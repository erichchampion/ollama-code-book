/**
 * Ollama Server Manager
 * 
 * Handles automatic startup and management of the Ollama server.
 */

import { spawn, exec } from 'child_process';
import { normalizeError } from '../utils/error-utils.js';
import { logger } from './logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { SERVER_HEALTH_TIMEOUT, SERVER_STARTUP_TIMEOUT, HEALTH_CHECK_INTERVAL } from '../constants.js';
import { DELAY_CONSTANTS } from '../config/constants.js';

/**
 * Check if Ollama server is running
 */
export async function isOllamaServerRunning(baseUrl: string = 'http://localhost:11434'): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(SERVER_HEALTH_TIMEOUT)
    });
    
    return response.ok;
  } catch (error) {
    logger.debug('Ollama server check failed', { error: normalizeError(error).message });
    return false;
  }
}

/**
 * Check if Ollama is installed
 */
export async function isOllamaInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('ollama --version', (error) => {
      resolve(!error);
    });
  });
}

/**
 * Configuration options for Ollama server startup
 */
export interface OllamaServerStartupConfig {
  healthCheckInterval?: number;
  startupTimeout?: number;
  maxHealthCheckRetries?: number;
}

/**
 * Start Ollama server in the background
 */
export async function startOllamaServer(config: OllamaServerStartupConfig = {}): Promise<void> {
  logger.info('Starting Ollama server in the background...');

  // Apply configuration defaults
  const {
    healthCheckInterval = HEALTH_CHECK_INTERVAL,
    startupTimeout = SERVER_STARTUP_TIMEOUT,
    maxHealthCheckRetries = 15
  } = config;

  return new Promise((resolve, reject) => {
    const ollamaProcess = spawn('ollama', ['serve'], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;
    let startupTimeoutHandle: NodeJS.Timeout | null = null;
    let healthCheckIntervalHandle: NodeJS.Timeout | null = null;
    let healthCheckRetries = 0;

    // Cleanup function to prevent memory leaks and race conditions
    const cleanup = () => {
      if (startupTimeoutHandle) {
        clearTimeout(startupTimeoutHandle);
        startupTimeoutHandle = null;
      }
      if (healthCheckIntervalHandle) {
        clearInterval(healthCheckIntervalHandle);
        healthCheckIntervalHandle = null;
      }
    };

    // Safe resolve function that can only be called once
    const resolveOnce = (message: string) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        logger.info(message);
        resolve();
      }
    };

    // Safe reject function that can only be called once
    const rejectOnce = (error: any) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        ollamaProcess.kill();
        reject(error);
      }
    };

    // Set up timeout for server startup
    startupTimeoutHandle = setTimeout(() => {
      rejectOnce(createUserError(`Ollama server failed to start within ${startupTimeout / 1000} seconds`, {
        category: ErrorCategory.SERVER,
        resolution: 'Please start Ollama manually with "ollama serve" and try again.'
      }));
    }, startupTimeout);

    // Start periodic health checks instead of relying on output parsing
    healthCheckIntervalHandle = setInterval(async () => {
      if (resolved) {
        return;
      }

      healthCheckRetries++;
      logger.debug(`Health check attempt ${healthCheckRetries}/${maxHealthCheckRetries}`);

      try {
        const isRunning = await isOllamaServerRunning();
        if (isRunning) {
          resolveOnce('Ollama server started successfully (health check)');
        } else if (healthCheckRetries >= maxHealthCheckRetries) {
          rejectOnce(createUserError(`Ollama server failed to respond after ${maxHealthCheckRetries} health checks`, {
            category: ErrorCategory.SERVER,
            resolution: 'Please check if Ollama is properly installed and try starting it manually.'
          }));
        }
      } catch (error) {
        logger.debug(`Health check ${healthCheckRetries} failed:`, error);
        if (healthCheckRetries >= maxHealthCheckRetries) {
          rejectOnce(createUserError(`Ollama server health checks failed after ${maxHealthCheckRetries} attempts`, {
            category: ErrorCategory.SERVER,
            resolution: 'Please check your network connection and Ollama installation.'
          }));
        }
      }
    }, healthCheckInterval);

    // Monitor server output for startup confirmation (fallback)
    ollamaProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      logger.debug('Ollama server output:', output);

      // Look for server startup indicators
      if (output.includes('Listening on') || output.includes('server started') || output.includes('127.0.0.1:11434')) {
        resolveOnce('Ollama server started successfully (output detection)');
      }
    });

    ollamaProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      logger.debug('Ollama server error:', error);

      // Some errors are not fatal (like port already in use)
      if (error.includes('address already in use') || error.includes('port 11434')) {
        resolveOnce('Ollama server already running');
      }
    });

    ollamaProcess.on('error', (error) => {
      rejectOnce(createUserError(`Failed to start Ollama server: ${error.message}`, {
        cause: error,
        category: ErrorCategory.SERVER,
        resolution: 'Make sure Ollama is installed and try running "ollama serve" manually.'
      }));
    });

    ollamaProcess.on('exit', (code) => {
      if (!resolved) {
        rejectOnce(createUserError(`Ollama server exited with code ${code}`, {
          category: ErrorCategory.SERVER,
          resolution: 'Check Ollama installation and try running "ollama serve" manually.'
        }));
      }
    });

    // Detach the process so it continues running after this process exits
    ollamaProcess.unref();
  });
}

/**
 * Ensure Ollama server is running, start it if necessary
 */
export async function ensureOllamaServerRunning(baseUrl: string = 'http://localhost:11434'): Promise<void> {
  logger.debug('Checking if Ollama server is running...');
  
  // First check if server is already running
  const isRunning = await isOllamaServerRunning(baseUrl);
  if (isRunning) {
    logger.debug('Ollama server is already running');
    return;
  }
  
  logger.info('Ollama server is not running, attempting to start it...');
  
  // Check if Ollama is installed
  const isInstalled = await isOllamaInstalled();
  if (!isInstalled) {
    throw createUserError('Ollama is not installed', {
      category: ErrorCategory.SERVER,
      resolution: 'Please install Ollama from https://ollama.ai and try again.'
    });
  }
  
  // Start the server
  await startOllamaServer();
  
  // Wait a moment for the server to fully initialize
  await new Promise(resolve => setTimeout(resolve, DELAY_CONSTANTS.LONG_DELAY));
  
  // Verify the server is now running
  const isNowRunning = await isOllamaServerRunning(baseUrl);
  if (!isNowRunning) {
    throw createUserError('Failed to start Ollama server', {
      category: ErrorCategory.SERVER,
      resolution: 'Please start Ollama manually with "ollama serve" and try again.'
    });
  }
  
  logger.info('Ollama server is now running and ready');
}

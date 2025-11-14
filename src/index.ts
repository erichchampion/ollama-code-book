/**
 * Ollama Code CLI
 * 
 * Main entry point for the application.
 * This module bootstraps the application and manages the lifecycle.
 */

import { loadConfig } from './config/index.js';
import { initTerminal } from './terminal/index.js';
import { initAI } from './ai/index.js';
import { initCodebaseAnalysis } from './codebase/index.js';
import { initCommandProcessor } from './commands/index.js';
import { initFileOperations } from './fileops/index.js';
import { initExecutionEnvironment } from './execution/index.js';
import { initErrorHandling } from './errors/index.js';
import { initTelemetry } from './telemetry/index.js';
import { logger } from './utils/logger.js';
import type { AppInstance, InitializationOptions } from './types/app-interfaces.js';

// Re-export the types for external use
export type { AppInstance, InitializationOptions } from './types/app-interfaces.js';

/**
 * Initialize all application subsystems
 */
export async function initialize(options: InitializationOptions = {}): Promise<AppInstance> {
  // Set up error handling first
  const errors = initErrorHandling();
  
  try {
    logger.info('Starting Ollama Code CLI...');
    
    // Load configuration
    const config = await loadConfig(options);
    
    // Initialize terminal interface
    const terminal = await initTerminal(config);
    
    // Initialize AI client
    const ai = await initAI(config);
    
    // Initialize codebase analysis
    const codebase = await initCodebaseAnalysis(config);
    
    // Initialize file operations
    const fileOps = await initFileOperations(config);
    
    // Initialize execution environment
    const execution = await initExecutionEnvironment(config);
    
    // Initialize command processor
    const commands = await initCommandProcessor(config, {
      terminal,
      ai: ai as any,
      codebase: codebase as any,
      fileOps: fileOps as any,
      execution: execution as any,
      errors: errors as any
    });
    
    // Initialize telemetry if enabled
    const telemetry = config.telemetry.enabled 
      ? await initTelemetry(config) 
      : null;
    
    logger.info('Ollama Code CLI initialized successfully');
    
    return {
      config,
      terminal,
      ai: ai as any, // Type assertion: implementation has additional properties
      codebase: codebase as any, // Type assertion: implementation has additional properties
      commands,
      fileOps: fileOps as any, // Type assertion: implementation has additional properties
      execution: execution as any, // Type assertion: implementation has additional properties
      errors: errors as any, // Type assertion: implementation has additional properties
      telemetry
    };
  } catch (error) {
    errors.handleFatalError(error);
    // This is just to satisfy TypeScript since handleFatalError will exit the process
    throw error;
  }
}

/**
 * Run the application main loop
 */
export async function run(app: AppInstance): Promise<void> {
  try {
    // Display welcome message
    app.terminal.displayWelcome();
    
    // Start codebase analysis in the background
    app.codebase.startBackgroundAnalysis();
    
    // Enter the main command loop
    await app.commands.startCommandLoop();
    
    // Clean shutdown
    await shutdown(app);
  } catch (error) {
    app.errors.handleFatalError(error);
  }
}

/**
 * Gracefully shut down the application
 */
export async function shutdown(app: AppInstance): Promise<void> {
  logger.info('Shutting down Ollama Code CLI...');
  
  // Stop background tasks and release resources
  await app.codebase.stopBackgroundAnalysis();
  
  // Submit telemetry if enabled
  if (app.telemetry) {
    await app.telemetry.submitTelemetry();
  }
  
  // Disconnect from services
  await app.ai.disconnect();
  
  logger.info('Ollama Code CLI shutdown complete');
}

/**
 * Handle process signals for clean shutdown
 *
 * CRITICAL: Signal handlers must NOT be async functions that call process.exit()
 * immediately after await, as the process will terminate before async cleanup completes.
 * Instead, we call shutdown().then().catch() to ensure cleanup finishes before exit.
 */
function setupProcessHandlers(app: AppInstance): void {
  // Track if shutdown is already in progress to prevent double cleanup
  let shutdownInProgress = false;

  // Cleanup timeout to force exit if cleanup hangs (5 seconds)
  const CLEANUP_TIMEOUT_MS = 5000;

  /**
   * Perform graceful shutdown with timeout protection
   */
  const performGracefulShutdown = (signal: string, exitCode: number = 0): void => {
    // Prevent double cleanup on multiple signals
    if (shutdownInProgress) {
      logger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    shutdownInProgress = true;
    logger.info(`Received ${signal} signal, initiating graceful shutdown...`);

    // Create cleanup timeout to force exit if cleanup hangs
    const cleanupTimeout = setTimeout(() => {
      logger.error(`Cleanup timeout exceeded (${CLEANUP_TIMEOUT_MS}ms), forcing exit`);
      process.exit(exitCode);
    }, CLEANUP_TIMEOUT_MS);

    // Perform async cleanup, then exit
    shutdown(app)
      .then(() => {
        clearTimeout(cleanupTimeout);
        logger.info(`Graceful shutdown complete, exiting with code ${exitCode}`);
        process.exit(exitCode);
      })
      .catch((error) => {
        clearTimeout(cleanupTimeout);
        logger.error('Error during shutdown:', error);
        process.exit(1);
      });
  };

  // SIGINT (Ctrl+C) - graceful shutdown
  process.on('SIGINT', () => {
    performGracefulShutdown('SIGINT', 0);
  });

  // SIGTERM (kill command) - graceful shutdown
  process.on('SIGTERM', () => {
    performGracefulShutdown('SIGTERM', 0);
  });

  // Unhandled promise rejection - log but don't exit
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', reason);
    app.errors.handleUnhandledRejection(reason, promise);
  });

  // Uncaught exception - log and exit
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    app.errors.handleUncaughtException(error);
    process.exit(1);
  });
}

/**
 * Main entry point function
 */
export async function main(options: InitializationOptions = {}): Promise<void> {
  const app = await initialize(options);
  setupProcessHandlers(app);
  await run(app);
} 
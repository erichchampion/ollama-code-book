#!/usr/bin/env node
/**
 * CLI Selector
 *
 * Allows users to choose between different CLI modes:
 * - simple: Basic commands (ask, list-models, pull-model)
 * - advanced: Full command registry with all features
 * - interactive: Interactive mode with command loop
 */

// Load environment variables from .env file (must be first)
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Look for .env in multiple locations (in order of precedence):
// 1. Current working directory (allows per-project override)
// 2. Package installation directory (global config)
const packageRoot = join(__dirname, '..', '..');

// Security: A05:2021 - Security Misconfiguration
// Suppress dotenv/dotenvx output in production to prevent information disclosure
const isProduction = process.env.NODE_ENV === 'production';
const dotenvOptions = isProduction ? { debug: false } : {};

if (isProduction) {
  // Temporarily suppress console output during dotenv loading in production
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => { };
  console.error = () => { };

  try {
    // Try current directory first (for per-project overrides)
    dotenvConfig({ ...dotenvOptions, path: join(process.cwd(), '.env') });

    // Then load package .env (won't override existing vars)
    dotenvConfig({ ...dotenvOptions, path: join(packageRoot, '.env') });
  } finally {
    // Restore console methods
    console.log = originalLog;
    console.error = originalError;
  }
} else {
  // Normal loading in non-production environments
  // Try current directory first (for per-project overrides)
  dotenvConfig({ ...dotenvOptions, path: join(process.cwd(), '.env') });

  // Then load package .env (won't override existing vars)
  dotenvConfig({ ...dotenvOptions, path: join(packageRoot, '.env') });
}

import { commandRegistry, executeCommand, generateCommandHelp } from './commands/index.js';
import { logger, configureLoggerFromEnv } from './utils/logger.js';
import { formatErrorForDisplay } from './errors/formatter.js';
import { initAI, cleanupAI } from './ai/index.js';
import { registerCommands } from './commands/register.js';
import { UserError } from './errors/types.js';
import { ensureOllamaServerRunning } from './utils/ollama-server.js';
import { initTerminal } from './terminal/index.js';
import { parseCommandInput } from './utils/command-parser.js';
import { initializeToolSystem } from './tools/index.js';
import {
  initializeLazyLoading,
  executeCommandOptimized,
  preloadCommonComponents,
  initializeEnhancedStartupOptimizer,
  executeEnhancedStartup
} from './optimization/startup-optimizer.js';
import { registerServices, disposeServices } from './core/services.js';
import {
  HELP_OUTPUT_WIDTH,
  INTERACTIVE_MODE_HELP,
  HELP_COMMAND_SUGGESTION,
  EXIT_COMMANDS,
  SAFETY_MODE_ENV_VAR
} from './constants.js';
import { OptimizedEnhancedMode } from './interactive/optimized-enhanced-mode.js';
import { SafetyEnhancedMode } from './interactive/safety-enhanced-mode.js';
import { runSimpleMode } from './simple-mode.js';
import pkg from '../package.json' with { type: 'json' };

// Configure logger from environment variables (must be after dotenv.config())
configureLoggerFromEnv();

// Get version from package.json
const version = pkg.version;

/**
 * Global cleanup function
 */
async function cleanup(): Promise<void> {
  logger.debug('Performing global cleanup');
  try {
    cleanupAI();
    await disposeServices();
    // Close logger LAST, after all other cleanup operations that may log
    logger.close();
  } catch (error) {
    logger.error('Error during cleanup:', error);
    // Close logger after error logging too
    logger.close();
  }
}

/**
 * Setup process exit handlers
 */
function setupExitHandlers(): void {
  // Handle normal process exit
  process.on('exit', () => {
    // Note: Can't use await in exit handler, cleanup should already be done
    logger.debug('Process exiting');
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    logger.debug('Received SIGINT signal');
    await cleanup();
    process.exit(0);
  });

  // Handle SIGTERM
  process.on('SIGTERM', async () => {
    logger.debug('Received SIGTERM signal');
    await cleanup();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception:', error);
    await cleanup();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason) => {
    logger.error('Unhandled promise rejection:', reason);
    await cleanup();
    process.exit(1);
  });
}



/**
 * Display help information
 */
function displayHelp(commandName?: string): void {
  // Register commands first so we can show them
  registerCommands();

  if (commandName && commandName !== 'help') {
    // Display help for a specific command
    const command = commandRegistry.get(commandName);

    if (!command) {
      console.error(`Unknown command: ${commandName}`);
      console.error('Use "ollama-code help" to see available commands.');
      process.exit(1);
    }

    console.log(generateCommandHelp(command));
    return;
  }

  // Display general help
  console.log(`
Ollama Code CLI v${version}

A command-line interface for interacting with Ollama AI for local code assistance,
generation, refactoring, and more.

Usage:
  ollama-code                                               (shows help)
  ollama-code <command> [arguments] [options]              (runs command in advanced mode)
  ollama-code --mode <mode> [command] [arguments] [options]

Modes:
  --mode simple      Simple mode - Basic commands only
  --mode advanced    Advanced mode (default) - Full command registry
  --mode interactive Interactive mode - Command loop interface with safety features

Available Commands:`);

  // Group commands by category
  const categories = commandRegistry.getCategories();

  // Commands without a category
  const uncategorizedCommands = commandRegistry.list()
    .filter(cmd => !cmd.category && !cmd.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (uncategorizedCommands.length > 0) {
    for (const command of uncategorizedCommands) {
      console.log(`  ${command.name.padEnd(15)} ${command.description}`);
    }
    console.log('');
  }

  // Commands with categories
  for (const category of categories) {
    console.log(`${category}:`);

    const commands = commandRegistry.getByCategory(category)
      .filter(cmd => !cmd.hidden)
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const command of commands) {
      console.log(`  ${command.name.padEnd(15)} ${command.description}`);
    }

    console.log('');
  }

  console.log(`For more information on a specific command, use:
  ollama-code help <command>

Examples:
  $ ollama-code ask "How do I implement a binary search tree in TypeScript?"
  $ ollama-code explain path/to/file.js
  $ ollama-code --mode interactive
  $ ollama-code list-models
  $ ollama-code pull-model llama3.2
`);
}

/**
 * Display version information
 */
function displayVersion(): void {
  console.log(`Ollama Code CLI v${version}`);
}

/**
 * Parse command-line arguments
 */
function parseCommandLineArgs(): {
  mode: 'simple' | 'advanced' | 'interactive';
  commandName: string;
  args: string[]
} {
  // Get arguments, excluding node and script path
  const args = process.argv.slice(2);

  // Handle help and version flags first
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    displayHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    displayVersion();
    process.exit(0);
  }

  // Check for mode flag (default to advanced)
  let mode: 'simple' | 'advanced' | 'interactive' = 'advanced';
  let commandIndex = 0;

  if (args[0] === '--mode' && args.length > 1) {
    const modeArg = args[1].toLowerCase();
    if (['simple', 'advanced', 'interactive'].includes(modeArg)) {
      mode = modeArg as 'simple' | 'advanced' | 'interactive';
      commandIndex = 2;
    } else {
      console.error(`Invalid mode: ${modeArg}`);
      console.error('Valid modes: simple, advanced, interactive');
      process.exit(1);
    }
  }

  // Handle case where no command is provided after mode
  if (commandIndex >= args.length) {
    if (mode === 'interactive') {
      return { mode, commandName: 'interactive', args: [] };
    } else {
      displayHelp();
      process.exit(0);
    }
  }

  // Extract command name
  const commandName = args[commandIndex].toLowerCase();

  // Handle help command
  if (commandName === 'help') {
    displayHelp(args[commandIndex + 1]);
    process.exit(0);
  }

  // Handle version command
  if (commandName === 'version' || commandName === '--version' || commandName === '-v') {
    displayVersion();
    process.exit(0);
  }

  return {
    mode,
    commandName,
    args: args.slice(commandIndex + 1)
  };
}

// This function is now imported from simple-mode.js


/**
 * Run advanced mode (full command registry) with Phase 4 enhanced startup optimization
 */
async function runAdvancedMode(commandName: string, args: string[]): Promise<void> {
  // Register all services with dependency injection container
  await registerServices();

  try {
    // Use Phase 4 enhanced startup optimization
    if (process.env.OLLAMA_SKIP_ENHANCED_INIT) {
      // Fallback to legacy execution for tests
      logger.info('Using legacy execution mode for testing');
      await runAdvancedModeLegacy(commandName, args);
    } else {
      // Phase 4: Enhanced startup optimization with comprehensive monitoring
      logger.info('Starting Phase 4 enhanced startup optimization');

      // Initialize enhanced startup optimizer
      await initializeEnhancedStartupOptimizer();

      // Initialize lazy loading system (maintains backward compatibility)
      await initializeLazyLoading();

      // Start background preloading of common components
      preloadCommonComponents();

      // Execute command with optimized loading
      await executeCommandOptimized(commandName, args);
    }
  } finally {
    // Cleanup resources after standalone command execution
    await cleanup();
  }
}

/**
 * Legacy advanced mode for backward compatibility (tests)
 */
async function runAdvancedModeLegacy(commandName: string, args: string[]): Promise<void> {
  // Register all services with dependency injection container
  await registerServices();

  // Initialize tool system
  initializeToolSystem();

  // Register commands
  registerCommands();

  // Get the command
  const command = commandRegistry.get(commandName);

  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    console.error(HELP_COMMAND_SUGGESTION);
    process.exit(1);
  }

  // Ensure Ollama server is running before initializing AI
  logger.info('Ensuring Ollama server is running...');
  await ensureOllamaServerRunning();

  // Initialize basic AI client for commands that need it
  logger.info('Initializing basic AI client (test mode)');
  await initAI();

  // Execute the command
  await executeCommand(commandName, args);
}

// Note: The old runInteractiveMode function has been replaced with EnhancedInteractiveMode
// which provides better task plan handling and natural language processing

/**
 * Initialize the CLI
 */
async function initCLI(): Promise<void> {
  try {
    // Setup process exit handlers for cleanup
    setupExitHandlers();

    // Parse command-line arguments
    const { mode, commandName, args } = parseCommandLineArgs();

    // Route to appropriate mode
    switch (mode) {
      case 'simple':
        await runSimpleMode(commandName, args);
        // Explicitly exit after successful command execution
        process.exit(0);
        break;
      case 'advanced':
        await runAdvancedMode(commandName, args);
        // Explicitly exit after successful command execution
        process.exit(0);
        break;
      case 'interactive':
        if (process.env.OLLAMA_SKIP_ENHANCED_INIT) {
          // Fallback to legacy interactive mode for testing
          logger.info('Using legacy interactive mode for testing');
          // Since there's no legacy interactive mode, just exit gracefully for tests
          console.log('Legacy interactive mode (test mode)');
          process.exit(0);
        } else {
          // Use safety-enhanced mode by default for interactive sessions
          // This can be controlled via environment variable for compatibility
          const useSafetyMode = process.env[SAFETY_MODE_ENV_VAR] !== 'false';

          if (useSafetyMode) {
            logger.info('Starting interactive mode with safety features');
            const safetyEnhancedMode = new SafetyEnhancedMode();
            await safetyEnhancedMode.start();
          } else {
            logger.info('Starting interactive mode without safety features');
            const optimizedMode = new OptimizedEnhancedMode();
            await optimizedMode.start();
          }
          // Interactive mode exits naturally when user quits
          // No need to explicitly call process.exit(0) here
        }
        break;
      default:
        console.error(`Unknown mode: ${mode}`);
        process.exit(1);
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Handle errors
 */
function handleError(error: unknown): void {
  const formattedError = formatErrorForDisplay(error);

  console.error(formattedError);

  // Exit with error code
  if (error instanceof UserError) {
    process.exit(1);
  } else {
    // Unexpected error, use a different exit code
    process.exit(2);
  }
}

// Run the CLI
initCLI().catch(handleError);

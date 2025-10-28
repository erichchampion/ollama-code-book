#!/usr/bin/env node
/**
 * Ollama Code CLI
 * 
 * Main entry point for the Ollama Code CLI tool. Handles command-line
 * argument parsing, command dispatching, and error handling.
 */

import { commandRegistry, executeCommand, generateCommandHelp } from './commands/index.js';
import { logger } from './utils/logger.js';
import { formatErrorForDisplay } from './errors/formatter.js';
import { initAI } from './ai/index.js';
import { registerCommands } from './commands/register.js';
import { UserError } from './errors/types.js';
import { ensureOllamaServerRunning } from './utils/ollama-server.js';
import {
  initializeLazyLoading,
  executeCommandOptimized,
  preloadCommonComponents
} from './optimization/startup-optimizer.js';
import { registerServices, disposeServices } from './core/services.js';
import pkg from '../package.json' with { type: 'json' };

// Get version from package.json
const version = pkg.version;

// Maximum width of the help output
const HELP_WIDTH = 100;

/**
 * Display help information
 */
function displayHelp(commandName?: string): void {
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
  ollama-code <command> [arguments] [options]

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
function parseCommandLineArgs(): { commandName: string; args: string[] } {
  // Get arguments, excluding node and script path
  const args = process.argv.slice(2);
  
  // Handle empty command
  if (args.length === 0) {
    displayHelp();
    process.exit(0);
  }
  
  // Extract command name
  const commandName = args[0].toLowerCase();
  
  // Handle help command
  if (commandName === 'help') {
    displayHelp(args[1]);
    process.exit(0);
  }
  
  // Handle version command
  if (commandName === 'version' || commandName === '--version' || commandName === '-v') {
    displayVersion();
    process.exit(0);
  }
  
  return { commandName, args: args.slice(1) };
}

/**
 * Global cleanup function
 */
async function cleanup(): Promise<void> {
  logger.debug('Performing global cleanup');
  try {
    await disposeServices();
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }
}

/**
 * Initialize the CLI with optimized startup
 */
async function initCLI(): Promise<void> {
  try {
    // Register all services with dependency injection container
    await registerServices();

    // Parse command-line arguments
    const { commandName, args } = parseCommandLineArgs();

    // Initialize lazy loading system
    await initializeLazyLoading();

    // Start background preloading of common components
    preloadCommonComponents();

    // Use optimized execution that only loads what's needed
    if (process.env.OLLAMA_SKIP_ENHANCED_INIT) {
      // Fallback to original method for tests
      logger.info('Using legacy execution mode for testing');
      await initCLILegacy(commandName, args);
    } else {
      await executeCommandOptimized(commandName, args);
    }
  } catch (error) {
    handleError(error);
  } finally {
    // Cleanup resources after standalone command execution
    await cleanup();
  }
}

/**
 * Legacy CLI initialization for backward compatibility (tests)
 */
async function initCLILegacy(commandName: string, args: string[]): Promise<void> {
  // Register commands
  registerCommands();

  // Get the command
  const command = commandRegistry.get(commandName);

  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    console.error('Use "ollama-code help" to see available commands.');
    process.exit(1);
  }

  // Ensure Ollama server is running before initializing AI
  logger.info('Ensuring Ollama server is running...');
  await ensureOllamaServerRunning();
  await initAI();

  // Execute the command
  await executeCommand(commandName, args);
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
/**
 * Command System
 * 
 * Provides a framework for registering, managing, and executing
 * CLI commands. Handles argument parsing, validation, and help text.
 */

import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { logger } from '../utils/logger.js';
import { isNonEmptyString } from '../utils/validation.js';
import { parseCommandInput } from '../utils/command-parser.js';
import { registerCommands } from './register.js';
import { ArgType, CommandArgDef } from './types.js';

// Re-export types from types.ts to maintain compatibility
export { ArgType } from './types.js';
export type { CommandArgDef } from './types.js';

/**
 * Command definition
 */
export interface CommandDef {
  /**
   * Command name
   */
  name: string;
  
  /**
   * Command description
   */
  description: string;
  
  /**
   * Command usage examples
   */
  examples?: string[];
  
  /**
   * Command arguments
   */
  args?: CommandArgDef[];
  
  /**
   * Command handler function
   */
  handler: (args: Record<string, any>) => Promise<any>;
  
  /**
   * Command aliases
   */
  aliases?: string[];
  
  /**
   * Command category for grouping in help
   */
  category?: string;
  
  
  /**
   * Whether the command can be used in interactive mode
   */
  interactive?: boolean;
  
  /**
   * Whether to hide from help
   */
  hidden?: boolean;
}

/**
 * Command registry
 */
class CommandRegistry {
  private commands: Map<string, CommandDef> = new Map();
  private aliases: Map<string, string> = new Map();
  private initialized: boolean = false;
  
  /**
   * Register a command
   */
  register(command: CommandDef): void {
    // Validate command definition
    if (!isNonEmptyString(command.name)) {
      throw new Error('Command name is required');
    }
    
    if (!isNonEmptyString(command.description)) {
      throw new Error(`Command ${command.name} requires a description`);
    }
    
    if (!command.handler || typeof command.handler !== 'function') {
      throw new Error(`Command ${command.name} requires a handler function`);
    }
    
    // Check for duplicate command names (warn instead of error for re-registration)
    if (this.commands.has(command.name) || this.aliases.has(command.name)) {
      logger.warn(`Command or alias '${command.name}' is already registered, skipping`);
      return;
    }
    
    // Register the command
    this.commands.set(command.name, command);
    logger.debug(`Registered command: ${command.name}`);
    
    // Register aliases
    if (command.aliases && Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        if (this.commands.has(alias) || this.aliases.has(alias)) {
          logger.warn(`Skipping duplicate alias '${alias}' for command '${command.name}'`);
          continue;
        }

        this.aliases.set(alias, command.name);
        logger.debug(`Registered alias '${alias}' for command '${command.name}'`);
      }
    }
  }
  
  /**
   * Get a command by name or alias
   */
  get(nameOrAlias: string): CommandDef | undefined {
    // Check if it's a direct command name
    if (this.commands.has(nameOrAlias)) {
      return this.commands.get(nameOrAlias);
    }
    
    // Check if it's an alias
    const commandName = this.aliases.get(nameOrAlias);
    if (commandName) {
      return this.commands.get(commandName);
    }
    
    return undefined;
  }
  
  /**
   * List all commands
   */
  list(options: { includeHidden?: boolean } = {}): CommandDef[] {
    const { includeHidden = false } = options;
    
    return Array.from(this.commands.values())
      .filter(cmd => includeHidden || !cmd.hidden);
  }
  
  /**
   * Check if a command exists
   */
  exists(nameOrAlias: string): boolean {
    return this.commands.has(nameOrAlias) || this.aliases.has(nameOrAlias);
  }
  
  /**
   * Get command categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    
    for (const command of this.commands.values()) {
      if (command.category) {
        categories.add(command.category);
      }
    }
    
    return Array.from(categories).sort();
  }
  
  /**
   * Get commands by category
   */
  getByCategory(category: string, options: { includeHidden?: boolean } = {}): CommandDef[] {
    const { includeHidden = false } = options;

    return Array.from(this.commands.values())
      .filter(cmd => (includeHidden || !cmd.hidden) && cmd.category === category);
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Mark registry as initialized
   */
  markInitialized(): void {
    this.initialized = true;
  }

  /**
   * Reset registry (for testing)
   */
  reset(): void {
    this.commands.clear();
    this.aliases.clear();
    this.initialized = false;
  }
}

// Create a singleton command registry
export const commandRegistry = new CommandRegistry();


/**
 * Parse command-line arguments
 */
export function parseArgs(
  args: string[],
  command: CommandDef
): Record<string, any> {
  const result: Record<string, any> = {};
  const positionalArgs: string[] = [];
  const flagArgs: Map<string, CommandArgDef> = new Map();
  const errors: string[] = [];
  
  // Initialize defaults
  if (command.args) {
    for (const arg of command.args) {
      if (arg.default !== undefined) {
        result[arg.name] = arg.default;
      }
      
      // Map flags to arg definitions
      if (arg.position === undefined) {
        // Flag argument (--name or -n)
        flagArgs.set(`--${arg.name}`, arg);
        if (arg.shortFlag) {
          flagArgs.set(`-${arg.shortFlag}`, arg);
        }
      }
    }
  }
  
  // Parse args
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--') || (arg.startsWith('-') && arg.length === 2)) {
      // Flag argument
      const argDef = flagArgs.get(arg);
      
      if (!argDef) {
        errors.push(`Unknown argument: ${arg}`);
        continue;
      }
      
      if (argDef.type === ArgType.BOOLEAN) {
        // Boolean flags don't need a value
        result[argDef.name] = true;
      } else {
        // Other flags need a value
        if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
          errors.push(`Missing value for argument: ${arg}`);
          continue;
        }
        
        const value = args[++i];
        
        // Convert value based on type
        result[argDef.name] = convertArgValue(value, argDef);
        
        // Validate choices
        if (argDef.choices && !argDef.choices.includes(String(result[argDef.name]))) {
          errors.push(`Invalid value for ${argDef.name}: ${value}. Valid values are: ${argDef.choices.join(', ')}`);
        }
      }
    } else {
      // Positional argument
      positionalArgs.push(arg);
    }
  }
  
  // Process positional args
  if (command.args) {
    const positionalArgDefs = command.args
      .filter(arg => arg.position !== undefined)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    for (let i = 0; i < positionalArgDefs.length; i++) {
      const argDef = positionalArgDefs[i];
      
      if (i < positionalArgs.length) {
        // Value provided
        result[argDef.name] = convertArgValue(positionalArgs[i], argDef);
        
        // Validate choices
        if (argDef.choices && !argDef.choices.includes(String(result[argDef.name]))) {
          errors.push(`Invalid value for ${argDef.name}: ${positionalArgs[i]}. Valid values are: ${argDef.choices.join(', ')}`);
        }
      } else if (argDef.required) {
        // Required value not provided
        errors.push(`Missing required argument: ${argDef.name}`);
      }
    }
  }
  
  // Check for missing required flag args
  if (command.args) {
    for (const arg of command.args) {
      if (arg.required && arg.position === undefined && result[arg.name] === undefined) {
        errors.push(`Missing required argument: ${arg.name}`);
      }
    }
  }
  
  // Throw if there are errors
  if (errors.length > 0) {
    throw createUserError(`Invalid arguments: ${errors.join('; ')}`, {
      category: ErrorCategory.VALIDATION,
      resolution: `Use 'ollama-code help ${command.name}' to see usage information.`
    });
  }
  
  return result;
}

/**
 * Convert an argument value based on its type
 */
function convertArgValue(value: string, argDef: CommandArgDef): any {
  switch (argDef.type) {
    case ArgType.NUMBER:
      const num = Number(value);
      if (isNaN(num)) {
        throw createUserError(`Invalid number: ${value}`, {
          category: ErrorCategory.VALIDATION
        });
      }
      return num;
      
    case ArgType.BOOLEAN:
      return value.toLowerCase() === 'true';
      
    case ArgType.ARRAY:
      return value.split(',').map(v => v.trim());
      
    case ArgType.STRING:
    default:
      return value;
  }
}

/**
 * Generate help text for a command
 */
export function generateCommandHelp(command: CommandDef): string {
  let help = `\n${command.name} - ${command.description}\n\n`;
  
  // Usage
  help += 'Usage:\n';
  help += `  ollama-code ${command.name}`;
  
  // Add positional args to usage
  if (command.args) {
    const positionalArgs = command.args
      .filter(arg => arg.position !== undefined)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    for (const arg of positionalArgs) {
      const argDisplay = arg.required
        ? `<${arg.name}>`
        : `[${arg.name}]`;
      
      help += ` ${argDisplay}`;
    }
  }
  
  // Add flag options to usage
  if (command.args) {
    const flagArgs = command.args.filter(arg => arg.position === undefined);
    
    if (flagArgs.length > 0) {
      help += ' [options]';
    }
  }
  
  help += '\n\n';
  
  // Arguments section
  if (command.args && command.args.length > 0) {
    // List positional args
    const positionalArgs = command.args
      .filter(arg => arg.position !== undefined && !arg.hidden)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    if (positionalArgs.length > 0) {
      help += 'Arguments:\n';
      
      for (const arg of positionalArgs) {
        help += `  ${arg.name.padEnd(20)} ${arg.description}`;
        
        if (arg.default !== undefined) {
          help += ` (default: ${arg.default})`;
        }
        
        if (arg.choices) {
          help += ` (choices: ${arg.choices.join(', ')})`;
        }
        
        help += '\n';
      }
      
      help += '\n';
    }
    
    // List flag options
    const flagArgs = command.args.filter(arg => 
      arg.position === undefined && !arg.hidden
    );
    
    if (flagArgs.length > 0) {
      help += 'Options:\n';
      
      for (const arg of flagArgs) {
        let flag = `--${arg.name}`;
        
        if (arg.shortFlag) {
          flag = `-${arg.shortFlag}, ${flag}`;
        }
        
        help += `  ${flag.padEnd(20)} ${arg.description}`;
        
        if (arg.default !== undefined) {
          help += ` (default: ${arg.default})`;
        }
        
        if (arg.choices) {
          help += ` (choices: ${arg.choices.join(', ')})`;
        }
        
        help += '\n';
      }
      
      help += '\n';
    }
  }
  
  // Examples
  if (command.examples && command.examples.length > 0) {
    help += 'Examples:\n';
    
    for (const example of command.examples) {
      help += `  $ ollama-code ${example}\n`;
    }
    
    help += '\n';
  }
  
  // Aliases
  if (command.aliases && command.aliases.length > 0) {
    help += `Aliases: ${command.aliases.join(', ')}\n\n`;
  }
  
  return help;
}

/**
 * Execute a command
 */
export async function executeCommand(
  commandName: string,
  args: string[]
): Promise<any> {
  const command = commandRegistry.get(commandName);
  
  if (!command) {
    throw createUserError(`Unknown command: ${commandName}`, {
      category: ErrorCategory.COMMAND,
      resolution: 'Use "ollama-code help" to see available commands.'
    });
  }
  
  try {
    // Parse arguments
    const parsedArgs = parseArgs(args, command);
    
    // Log command execution
    logger.debug(`Executing command: ${command.name}`, { args: parsedArgs });
    
    // Execute the command
    return await command.handler(parsedArgs);
  } catch (error) {
    logger.error(`Command ${command.name} failed:`, error);
    throw error;
  }
}

import type {
  AppConfig,
  AIClient,
  CodebaseAnalysis,
  ErrorHandler,
  ExecutionEnvironment,
  FileOperations,
  CommandProcessor as ICommandProcessor
} from '../types/app-interfaces.js';
import type { TerminalInterface } from '../terminal/types.js';

/**
 * Initialize the command processor
 *
 * @param config Configuration options
 * @param dependencies Application dependencies needed by commands
 */
export async function initCommandProcessor(
  config: AppConfig,
  dependencies: {
    terminal: TerminalInterface;
    ai: AIClient;
    codebase: CodebaseAnalysis;
    fileOps: FileOperations;
    execution: ExecutionEnvironment;
    errors: ErrorHandler;
  }
): Promise<ICommandProcessor> {
  logger.info('Initializing command processor');
  
  try {
    // Register all commands
    registerCommands();
    
    // Return the command processor interface
    return {
      /**
       * Execute a command with the given arguments
       */
      executeCommand: async (commandName: string, args: string[]): Promise<any> => {
        return executeCommand(commandName, args);
      },
      
      /**
       * Start the interactive command loop
       */
      startCommandLoop: async (): Promise<void> => {
        const { terminal } = dependencies;
        let running = true;
        
        // Command loop
        while (running) {
          try {
            // Get command input from user
            const result = await terminal.prompt<{ command: string }>({
              type: 'input',
              name: 'command',
              message: 'ollama-code>'
            });

            if (!result.command || result.command.trim() === '') {
              continue;
            }

            // Handle special exit commands
            if (['exit', 'quit', 'q', '.exit'].includes(result.command.toLowerCase())) {
              running = false;
              continue;
            }

            // Parse input into command and args, respecting quoted strings
            const parts = parseCommandInput(result.command.trim());
            const commandName = parts[0];
            const commandArgs = parts.slice(1);
            
            // Check if command exists
            if (!commandRegistry.exists(commandName)) {
              terminal.error(`Unknown command: ${commandName}`);
              terminal.info('Type "help" to see available commands.');
              continue;
            }
            
            // Execute the command
            await executeCommand(commandName, commandArgs);
          } catch (error) {
            dependencies.errors.handleError(error);
          }
        }
      },
      
      /**
       * Register a new command
       */
      registerCommand: (command: CommandDef): void => {
        commandRegistry.register(command);
      },
      
      /**
       * Get a command by name or alias
       */
      getCommand: (nameOrAlias: string): CommandDef | undefined => {
        return commandRegistry.get(nameOrAlias);
      },
      
      /**
       * List all registered commands
       */
      listCommands: (options: { includeHidden?: boolean } = {}): CommandDef[] => {
        return commandRegistry.list(options);
      },
      
      /**
       * Get available command categories
       */
      getCategories: (): string[] => {
        return commandRegistry.getCategories();
      },
      
      /**
       * Get commands by category
       */
      getCommandsByCategory: (category: string, options: { includeHidden?: boolean } = {}): CommandDef[] => {
        return commandRegistry.getByCategory(category, options);
      },
      
      /**
       * Generate help text for a command
       */
      generateCommandHelp: (command: CommandDef): string => {
        return generateCommandHelp(command);
      }
    };
  } catch (error) {
    logger.error('Failed to initialize command processor', error);
    throw error;
  }
}

// Export main symbols
export default {
  commandRegistry,
  parseArgs,
  executeCommand,
  generateCommandHelp
}; 
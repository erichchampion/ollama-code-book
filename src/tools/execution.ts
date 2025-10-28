/**
 * Execution Tool
 *
 * Provides secure command execution capabilities with timeout handling,
 * output capture, and environment management.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { normalizeError } from '../utils/error-utils.js';
import { BaseTool, ToolMetadata, ToolResult, ToolExecutionContext } from './types.js';
import { logger } from '../utils/logger.js';
import { TIMEOUT_CONSTANTS } from '../config/constants.js';
import { isPathSafe } from '../utils/path-security.js';
import { TOOL_EXECUTION_CONSTANTS } from '../constants/tool-orchestration.js';
import { DANGEROUS_COMMANDS } from '../constants/security.js';

interface ExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number;
  timedOut: boolean;
}

export class ExecutionTool extends BaseTool {
  metadata: ToolMetadata = {
    name: 'execution',
    description: 'Execute system commands like npm, git, pytest, cargo build, etc. NEVER EVER use this tool with echo, cat, or printf to create files - that will fail. For ANY file creation (code files, config files, text files), you MUST use the filesystem tool with operation="write". This tool is ONLY for running executable commands, not for creating or modifying file content.',
    category: 'core',
    version: '1.0.0',
    displayOutput: true,
    parameters: [
      {
        name: 'command',
        type: 'string',
        description: 'The command to execute',
        required: true
      },
      {
        name: 'args',
        type: 'array',
        description: 'Command arguments',
        required: false,
        default: []
      },
      {
        name: 'cwd',
        type: 'string',
        description: 'Working directory for command execution',
        required: false
      },
      {
        name: 'timeout',
        type: 'number',
        description: 'Execution timeout in milliseconds',
        required: false,
        default: 30000
      },
      {
        name: 'env',
        type: 'object',
        description: 'Additional environment variables',
        required: false,
        default: {}
      },
      {
        name: 'shell',
        type: 'boolean',
        description: 'Whether to run command in shell',
        required: false,
        default: false
      },
      {
        name: 'captureOutput',
        type: 'boolean',
        description: 'Whether to capture stdout/stderr',
        required: false,
        default: true
      },
      {
        name: 'allowedCommands',
        type: 'array',
        description: 'Whitelist of allowed commands (security)',
        required: false
      }
    ],
    examples: [
      {
        description: 'Run npm install',
        parameters: {
          command: 'npm',
          args: ['install'],
          timeout: TIMEOUT_CONSTANTS.GIT_OPERATION
        }
      },
      {
        description: 'Execute TypeScript compiler',
        parameters: {
          command: 'tsc',
          args: ['--noEmit'],
          cwd: 'src'
        }
      },
      {
        description: 'Run tests with custom environment',
        parameters: {
          command: 'npm',
          args: ['test'],
          env: { NODE_ENV: 'test' },
          timeout: TIMEOUT_CONSTANTS.LONG
        }
      }
    ]
  };

  async execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    // Declare needsShell at function scope so it's accessible in catch block
    let needsShell = false;

    try {
      if (!this.validateParameters(parameters)) {
        return {
          success: false,
          error: 'Invalid parameters provided'
        };
      }

      const {
        command,
        args = [],
        cwd,
        timeout = 30000,
        env = {},
        shell,
        captureOutput = true,
        allowedCommands
      } = parameters;

      // Auto-enable shell for common commands that need PATH resolution
      // This fixes ENOENT errors when trying to run node, npm, etc.
      const commonShellCommands = ['node', 'npm', 'yarn', 'git', 'echo', 'cat', 'ls', 'cd', 'mkdir', 'rm', 'cp', 'mv'];
      needsShell = shell ?? commonShellCommands.includes(command);

      logger.debug(`Execution tool: command="${command}", shell=${needsShell} (explicit: ${shell !== undefined})`);

      // Security check: validate allowed commands
      if (allowedCommands && !allowedCommands.includes(command)) {
        return {
          success: false,
          error: `Command '${command}' is not in the allowed commands list`
        };
      }

      // Additional security checks
      if (!this.isCommandSafe(command)) {
        return {
          success: false,
          error: `Command '${command}' is not allowed for security reasons`
        };
      }

      // Check for commands that are likely trying to write files
      // These should use the filesystem tool instead
      // IMPORTANT: Check the command parameter itself, not just args
      // because AI often puts everything in command parameter
      const commandLower = command.toLowerCase();
      const isFileWriteCommand = commandLower.startsWith('echo ') ||
                                  commandLower.startsWith('cat ') ||
                                  commandLower.startsWith('printf ') ||
                                  command === 'echo' ||
                                  command === 'cat' ||
                                  command === 'printf';

      if (isFileWriteCommand) {
        const fullCommand = `${command} ${args.join(' ')}`;

        // Check if command parameter contains redirection (common mistake)
        if (command.includes('>') || command.includes('>>')) {
          logger.warn('Detected file write attempt via echo/cat with redirection in command parameter');
          return {
            success: false,
            error: 'Use the filesystem tool with "write" operation to create or modify files, not echo/cat redirection. The filesystem tool can handle files of any size and is the correct way to create code files.'
          };
        }

        if (fullCommand.length > 1000) {
          return {
            success: false,
            error: `Command too long (${fullCommand.length} chars). Use the filesystem tool with "write" operation to create files instead of echo/cat commands.`
          };
        }

        // Check if it looks like trying to write a file
        if (fullCommand.includes('>') || fullCommand.includes('>>')) {
          logger.warn('Detected file write attempt via echo/cat - should use filesystem tool');
          return {
            success: false,
            error: 'Use the filesystem tool with "write" operation to create or modify files, not echo/cat redirection.'
          };
        }
      }

      const workingDir = cwd
        ? this.resolvePath(cwd, context.workingDirectory)
        : context.workingDirectory;

      // Security check: ensure working directory is within project boundaries
      if (!isPathSafe(workingDir, context.projectRoot)) {
        return {
          success: false,
          error: 'Working directory is outside project boundaries'
        };
      }

      const result = await this.executeCommand({
        command,
        args,
        cwd: workingDir,
        timeout,
        env: { ...context.environment, ...env },
        shell: needsShell,
        captureOutput,
        abortSignal: context.abortSignal
      });

      return {
        success: result.exitCode === 0,
        data: result,
        error: result.exitCode !== 0 ? `Command failed with exit code ${result.exitCode}` : undefined,
        metadata: {
          executionTime: result.executionTime,
          resourcesUsed: {
            command: result.command,
            exitCode: result.exitCode,
            timedOut: result.timedOut
          }
        }
      };

    } catch (error) {
      logger.error(`Execution tool error: ${error}`);

      // Improve ENOENT errors to be actionable for AI
      let errorMessage = normalizeError(error).message;
      if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
        const { command, shell } = parameters;
        if (!shell && !needsShell) {
          errorMessage = `Command '${command}' not found. This command needs shell mode enabled. Add shell:true parameter or verify the command path.`;
        } else {
          errorMessage = `Command '${command}' not found in system PATH. The command may not be installed or available. Consider documenting this as a manual setup requirement instead of attempting to install it.`;
        }
      }

      return {
        success: false,
        error: errorMessage,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  private async executeCommand(options: {
    command: string;
    args: string[];
    cwd: string;
    timeout: number;
    env: Record<string, string>;
    shell: boolean;
    captureOutput: boolean;
    abortSignal?: AbortSignal;
  }): Promise<ExecutionResult> {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn(options.command, options.args, {
        cwd: options.cwd,
        env: options.env,
        shell: options.shell,
        stdio: options.captureOutput ? 'pipe' : 'inherit'
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');

        // Force kill if process doesn't terminate
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, TOOL_EXECUTION_CONSTANTS.FORCE_KILL_GRACE_PERIOD);
      }, options.timeout);

      // Handle abort signal with cleanup
      let abortHandler: (() => void) | undefined;
      if (options.abortSignal) {
        abortHandler = () => {
          clearTimeout(timeoutId);
          child.kill('SIGTERM');
        };
        options.abortSignal.addEventListener('abort', abortHandler);
      }

      // Capture output if requested
      if (options.captureOutput && child.stdout && child.stderr) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        // Clean up abort listener
        if (abortHandler && options.abortSignal) {
          options.abortSignal.removeEventListener('abort', abortHandler);
        }
        reject(error);
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);

        // Clean up abort listener
        if (abortHandler && options.abortSignal) {
          options.abortSignal.removeEventListener('abort', abortHandler);
        }

        const result: ExecutionResult = {
          command: `${options.command} ${options.args.join(' ')}`.trim(),
          exitCode: code || 0,
          stdout,
          stderr,
          executionTime: Date.now() - startTime,
          timedOut
        };

        resolve(result);
      });
    });
  }

  private isCommandSafe(command: string): boolean {
    const commandName = command.toLowerCase().split(/[/\\]/).pop() || command;
    return !DANGEROUS_COMMANDS.includes(commandName as any);
  }

  private resolvePath(targetPath: string, basePath: string): string {
    if (path.isAbsolute(targetPath)) {
      return targetPath;
    }
    return path.resolve(basePath, targetPath);
  }
}

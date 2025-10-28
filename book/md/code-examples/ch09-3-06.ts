import { spawn } from 'child_process';

/**
 * Sandboxed command execution with resource limits
 */
export class SandboxedExecutor {
  private validator: SandboxValidator;
  private logger: Logger;

  constructor(
    private config: SandboxConfig,
    logger: Logger
  ) {
    this.validator = new SandboxValidator(config);
    this.logger = logger;
  }

  /**
   * Execute command with sandbox restrictions
   */
  async execute(command: string, cwd?: string): Promise<ExecutionResult> {
    // Validate command
    const validation = this.validator.isCommandAllowed(command);

    if (!validation.allowed) {
      this.logger.warn('Blocked command execution:', {
        command,
        reason: validation.reason
      });

      throw new SecurityError(
        `Command denied: ${validation.reason}`,
        validation.severity || 'high'
      );
    }

    // Validate working directory
    if (cwd) {
      const cwdValidation = this.validator.isPathAllowed(cwd);

      if (!cwdValidation.allowed) {
        throw new SecurityError(
          `Working directory denied: ${cwdValidation.reason}`,
          cwdValidation.severity || 'medium'
        );
      }
    }

    this.logger.info('Executing command:', { command, cwd });

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Parse command
      const args = command.split(/\s+/);
      const cmd = args[0];
      const cmdArgs = args.slice(1);

      // Spawn process
      const proc = spawn(cmd, cmdArgs, {
        cwd: cwd || this.config.workingDirectory,
        env: this.getFilteredEnv(),
        timeout: this.config.maxExecutionTime,
        maxBuffer: this.config.maxMemory
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', data => {
        stdout += data.toString();
      });

      proc.stderr.on('data', data => {
        stderr += data.toString();
      });

      proc.on('error', error => {
        this.logger.error('Command execution error:', {
          command,
          error
        });

        reject(new SecurityError(
          `Execution failed: ${error.message}`,
          'medium'
        ));
      });

      proc.on('exit', (code, signal) => {
        const duration = Date.now() - startTime;

        this.logger.info('Command completed:', {
          command,
          code,
          signal,
          duration
        });

        resolve({
          success: code === 0,
          exitCode: code || 0,
          stdout,
          stderr,
          duration
        });
      });

      // Timeout handler
      if (this.config.maxExecutionTime) {
        setTimeout(() => {
          proc.kill('SIGTERM');

          setTimeout(() => {
            proc.kill('SIGKILL');
          }, 5000); // Force kill after 5s

        }, this.config.maxExecutionTime);
      }
    });
  }

  /**
   * Get filtered environment variables
   */
  private getFilteredEnv(): NodeJS.ProcessEnv {
    if (!this.config.allowedEnvVars) {
      return {};
    }

    const filtered: NodeJS.ProcessEnv = {};

    for (const key of this.config.allowedEnvVars) {
      if (process.env[key] !== undefined) {
        filtered[key] = process.env[key];
      }
    }

    return filtered;
  }
}

export interface ExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}
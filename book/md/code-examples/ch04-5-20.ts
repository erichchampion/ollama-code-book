import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitStatusTool implements Tool {
  readonly name = 'git_status';
  readonly description = 'Get git repository status';
  readonly requiresApproval = false;
  readonly cacheable = true; // Can cache for a few seconds
  readonly retryable = true;

  readonly parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Repository path (default: current directory)'
      },
      includeUntracked: {
        type: 'boolean',
        description: 'Include untracked files (default: true)'
      }
    }
  };

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const repoPath = path.resolve(
      context.workingDirectory,
      params.path || '.'
    );

    try {
      // Get git status in porcelain format (machine-readable)
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: repoPath
      });

      // Parse status
      const status = this.parseGitStatus(stdout, params.includeUntracked !== false);

      context.logger.debug(`Git status: ${status.modified.length} modified, ${status.staged.length} staged`);

      return {
        callId: params.callId,
        toolName: this.name,
        success: true,
        data: status,
        metadata: {
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date()
        }
      };
    } catch (error: any) {
      // Check if this is a git repository
      if (error.message.includes('not a git repository')) {
        return {
          callId: params.callId,
          toolName: this.name,
          success: false,
          error: {
            message: `Not a git repository: ${params.path || '.'}`,
            code: 'NOT_A_GIT_REPO',
            recoverable: false,
            suggestion: 'Run git init to initialize a repository'
          },
          metadata: {
            durationMs: Date.now() - startTime,
            cached: false,
            timestamp: new Date()
          }
        };
      }

      return {
        callId: params.callId,
        toolName: this.name,
        success: false,
        error: {
          message: error.message,
          code: 'GIT_ERROR',
          recoverable: true
        },
        metadata: {
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date()
        }
      };
    }
  }

  private parseGitStatus(output: string, includeUntracked: boolean) {
    const lines = output.split('\n').filter(line => line.trim());

    const status = {
      staged: [] as string[],
      modified: [] as string[],
      untracked: [] as string[],
      deleted: [] as string[],
      clean: lines.length === 0
    };

    for (const line of lines) {
      const statusCode = line.substring(0, 2);
      const file = line.substring(3);

      // First character is staged status
      if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
        status.staged.push(file);
      }

      // Second character is working tree status
      if (statusCode[1] === 'M') {
        status.modified.push(file);
      } else if (statusCode[1] === 'D') {
        status.deleted.push(file);
      } else if (statusCode === '??') {
        if (includeUntracked) {
          status.untracked.push(file);
        }
      }
    }

    return status;
  }
}
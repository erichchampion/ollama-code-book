export class GitCommitTool implements Tool {
  readonly name = 'git_commit';
  readonly description = 'Create a git commit';
  readonly requiresApproval = true; // Commits require approval
  readonly cacheable = false;
  readonly retryable = false;
  readonly dependencies = ['git_status']; // Should check status first

  readonly parameters: ToolParameters = {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Commit message'
      },
      files: {
        type: 'array',
        description: 'Files to stage (default: all modified files)'
      },
      path: {
        type: 'string',
        description: 'Repository path (default: current directory)'
      }
    },
    required: ['message']
  };

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const repoPath = path.resolve(
      context.workingDirectory,
      params.path || '.'
    );

    try {
      // Stage files
      if (params.files && params.files.length > 0) {
        // Stage specific files
        const files = params.files.join(' ');
        await execAsync(`git add ${files}`, { cwd: repoPath });
      } else {
        // Stage all modified files
        await execAsync('git add -u', { cwd: repoPath });
      }

      // Create commit
      const { stdout } = await execAsync(
        `git commit -m "${params.message.replace(/"/g, '\\"')}"`,
        { cwd: repoPath }
      );

      // Extract commit hash
      const match = stdout.match(/\[.+?\s+([a-f0-9]+)\]/);
      const commitHash = match ? match[1] : 'unknown';

      context.logger.info(`Created commit: ${commitHash}`);

      return {
        callId: params.callId,
        toolName: this.name,
        success: true,
        data: {
          commitHash,
          message: params.message,
          output: stdout
        },
        metadata: {
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date(),
          approvalGranted: true
        }
      };
    } catch (error: any) {
      // Parse common git commit errors
      if (error.message.includes('nothing to commit')) {
        return {
          callId: params.callId,
          toolName: this.name,
          success: false,
          error: {
            message: 'Nothing to commit (working tree clean)',
            code: 'NOTHING_TO_COMMIT',
            recoverable: false,
            suggestion: 'Make changes to files before committing'
          },
          metadata: {
            durationMs: Date.now() - startTime,
            cached: false,
            timestamp: new Date()
          }
        };
      } else if (error.message.includes('Please tell me who you are')) {
        return {
          callId: params.callId,
          toolName: this.name,
          success: false,
          error: {
            message: 'Git user not configured',
            code: 'GIT_USER_NOT_CONFIGURED',
            recoverable: true,
            suggestion: 'Configure git user: git config user.name "Name" && git config user.email "email@example.com"'
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
}
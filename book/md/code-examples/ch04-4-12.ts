export class GitCommitTool implements Tool {
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    try {
      await git.commit(params.message);
      return { success: true, data: { commitHash: '...' } };
    } catch (error) {
      // Detect specific error conditions
      if (error.message.includes('nothing to commit')) {
        return {
          success: false,
          error: {
            message: 'No changes to commit',
            code: 'NOTHING_TO_COMMIT',
            recoverable: false,
            suggestion: 'Make changes to files before committing, or check git status'
          }
        };
      } else if (error.message.includes('Please tell me who you are')) {
        return {
          success: false,
          error: {
            message: 'Git user not configured',
            code: 'GIT_USER_NOT_CONFIGURED',
            recoverable: true,
            suggestion: 'Run: git config --global user.name "Your Name" && git config --global user.email "your@email.com"'
          }
        };
      }

      // Unknown error
      return {
        success: false,
        error: {
          message: error.message,
          code: 'UNKNOWN_ERROR',
          recoverable: true,
          stack: error.stack
        }
      };
    }
  }
}
/**
 * Pre-commit hook: Run linting and formatting
 */
export class PreCommitLintHandler implements HookHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async execute(context: HookContext): Promise<HookResult> {
    this.logger.info('Running pre-commit checks...');

    const stagedFiles = context.stagedFiles || [];
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check TypeScript files
    const tsFiles = stagedFiles.filter(f => f.endsWith('.ts'));
    if (tsFiles.length > 0) {
      const lintIssues = await this.lintTypeScript(tsFiles, context.repoPath);
      issues.push(...lintIssues);
    }

    // Check formatting
    const formattingIssues = await this.checkFormatting(stagedFiles, context.repoPath);
    if (formattingIssues.length > 0) {
      suggestions.push('Run: npm run format');
      issues.push(...formattingIssues);
    }

    if (issues.length > 0) {
      return {
        success: false,
        proceed: false,
        message: `Found ${issues.length} issues:\n${issues.join('\n')}`,
        suggestions
      };
    }

    return {
      success: true,
      proceed: true,
      message: '✓ Pre-commit checks passed'
    };
  }

  private async lintTypeScript(files: string[], repoPath: string): Promise<string[]> {
    // Run ESLint on TypeScript files
    try {
      const { stdout } = await execAsync(
        `npx eslint ${files.join(' ')} --format json`,
        { cwd: repoPath }
      );

      const results = JSON.parse(stdout);
      const issues: string[] = [];

      for (const result of results) {
        for (const message of result.messages) {
          issues.push(
            `${result.filePath}:${message.line}:${message.column} - ${message.message}`
          );
        }
      }

      return issues;
    } catch (error: any) {
      // ESLint exits with code 1 if there are linting errors
      if (error.stdout) {
        const results = JSON.parse(error.stdout);
        const issues: string[] = [];

        for (const result of results) {
          for (const message of result.messages) {
            issues.push(
              `${result.filePath}:${message.line}:${message.column} - ${message.message}`
            );
          }
        }

        return issues;
      }

      return [`Linting failed: ${error.message}`];
    }
  }

  private async checkFormatting(files: string[], repoPath: string): Promise<string[]> {
    try {
      await execAsync(
        `npx prettier --check ${files.join(' ')}`,
        { cwd: repoPath }
      );

      return [];
    } catch (error: any) {
      return ['Code is not formatted correctly'];
    }
  }
}
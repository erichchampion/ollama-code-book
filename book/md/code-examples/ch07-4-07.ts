/**
 * Manages git hooks integration
 */
export class GitHooksManager {
  private handlers = new Map<GitHook, HookHandler[]>();
  private repoPath: string;
  private logger: Logger;

  constructor(repoPath: string, logger: Logger) {
    this.repoPath = repoPath;
    this.logger = logger;
  }

  /**
   * Register a hook handler
   */
  registerHook(hook: GitHook, handler: HookHandler): void {
    if (!this.handlers.has(hook)) {
      this.handlers.set(hook, []);
    }

    this.handlers.get(hook)!.push(handler);
    this.logger.debug(`Registered handler for ${hook}`);
  }

  /**
   * Install git hooks in repository
   */
  async install(): Promise<void> {
    const hooksDir = path.join(this.repoPath, '.git', 'hooks');

    // Ensure hooks directory exists
    await fs.mkdir(hooksDir, { recursive: true });

    // Install each hook
    for (const hook of this.handlers.keys()) {
      await this.installHook(hook, hooksDir);
    }

    this.logger.info('Git hooks installed successfully');
  }

  /**
   * Execute a hook
   */
  async executeHook(context: HookContext): Promise<HookResult> {
    const handlers = this.handlers.get(context.hook);

    if (!handlers || handlers.length === 0) {
      return { success: true, proceed: true };
    }

    this.logger.debug(`Executing ${handlers.length} handlers for ${context.hook}`);

    let finalResult: HookResult = { success: true, proceed: true };

    // Execute handlers in sequence
    for (const handler of handlers) {
      try {
        const result = await handler.execute(context);

        // Update context with result (for chaining)
        if (result.commitMessage) {
          context.commitMessage = result.commitMessage;
        }

        // If any handler says don't proceed, stop
        if (!result.proceed) {
          finalResult = result;
          break;
        }

        // Merge results
        finalResult = {
          ...finalResult,
          ...result,
          suggestions: [
            ...(finalResult.suggestions || []),
            ...(result.suggestions || [])
          ]
        };
      } catch (error: any) {
        this.logger.error(`Hook handler failed: ${error.message}`);
        return {
          success: false,
          proceed: false,
          message: `Hook failed: ${error.message}`
        };
      }
    }

    return finalResult;
  }

  /**
   * Install a specific git hook
   */
  private async installHook(hook: GitHook, hooksDir: string): Promise<void> {
    const hookPath = path.join(hooksDir, hook);

    // Create hook script that calls our system
    const script = this.generateHookScript(hook);

    await fs.writeFile(hookPath, script, { mode: 0o755 });

    this.logger.debug(`Installed hook: ${hook}`);
  }

  /**
   * Generate hook script
   */
  private generateHookScript(hook: GitHook): string {
    // Script that calls our Node.js hook handler
    return `#!/bin/sh
# Auto-generated git hook for ollama-code
# Do not edit manually

# Get repository root
REPO_PATH=$(git rev-parse --show-toplevel)

# Call our hook handler
node "$REPO_PATH/node_modules/ollama-code/dist/hooks/${hook}.js" "$@"

# Exit with the handler's exit code
exit $?
`;
  }
}
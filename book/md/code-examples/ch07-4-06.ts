/**
 * Git hooks we'll integrate with
 */
export enum GitHook {
  // Before commit is created
  PRE_COMMIT = 'pre-commit',

  // Before commit message is finalized
  PREPARE_COMMIT_MSG = 'prepare-commit-msg',

  // After commit is created
  POST_COMMIT = 'post-commit',

  // Before push to remote
  PRE_PUSH = 'pre-push',

  // After merge
  POST_MERGE = 'post-merge'
}

/**
 * Hook handler interface
 */
export interface HookHandler {
  execute(context: HookContext): Promise<HookResult>;
}

/**
 * Hook execution context
 */
export interface HookContext {
  hook: GitHook;
  repoPath: string;

  // Commit-specific
  commitMessage?: string;
  stagedFiles?: string[];

  // Push-specific
  remoteName?: string;
  remoteBranch?: string;
  commits?: Commit[];

  // Additional data
  metadata?: Record<string, any>;
}

/**
 * Hook execution result
 */
export interface HookResult {
  success: boolean;

  // Updated commit message (for prepare-commit-msg)
  commitMessage?: string;

  // Whether to proceed with git operation
  proceed: boolean;

  // Message to display to user
  message?: string;

  // Suggestions for user
  suggestions?: string[];
}
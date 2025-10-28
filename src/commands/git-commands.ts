/**
 * Enhanced Git Commands
 *
 * Intelligent git operations with AI-powered features
 */

import { commandRegistry, ArgType } from './index.js';
import { logger } from '../utils/logger.js';
import { gitManager, CommitSuggestion } from '../git/index.js';
import { validateNonEmptyString, executeWithSpinner } from '../utils/command-helpers.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';

/**
 * Register enhanced git commands
 */
export function registerGitCommands(): void {
  logger.debug('Registering enhanced git commands');

  registerGitStatusCommand();
  registerGitCommitCommand();
  registerGitBranchCommand();
  registerGitPRCommand();
  registerGitConflictCommand();
  registerGitInitCommand();
}

/**
 * Enhanced git status with intelligent analysis
 */
function registerGitStatusCommand(): void {
  const command = {
    name: 'git-status',
    description: 'Show detailed git status with intelligent analysis',
    category: 'Git',
    async handler(): Promise<void> {
      try {
        if (!await gitManager.isGitRepo()) {
          throw createUserError('Not a git repository', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Initialize a git repository with "git-init" or navigate to a git repository'
          });
        }

        const status = await gitManager.getStatus();

        console.log(`📍 Current branch: ${status.branch}`);

        if (status.ahead > 0 || status.behind > 0) {
          console.log(`🔄 Sync status: ${status.ahead} ahead, ${status.behind} behind`);
        }

        if (status.conflicted.length > 0) {
          console.log(`\n⚠️  Conflicted files (${status.conflicted.length}):`);
          status.conflicted.forEach(file => console.log(`   ❌ ${file}`));
        }

        if (status.staged.length > 0) {
          console.log(`\n✅ Staged changes (${status.staged.length}):`);
          status.staged.forEach(file => console.log(`   📝 ${file}`));
        }

        if (status.unstaged.length > 0) {
          console.log(`\n📝 Unstaged changes (${status.unstaged.length}):`);
          status.unstaged.forEach(file => console.log(`   🔧 ${file}`));
        }

        if (status.untracked.length > 0) {
          console.log(`\n❓ Untracked files (${status.untracked.length}):`);
          status.untracked.forEach(file => console.log(`   📄 ${file}`));
        }

        // Show suggestions
        const suggestions: string[] = [];

        if (status.unstaged.length > 0 || status.untracked.length > 0) {
          suggestions.push('💡 Use "git add ." to stage all changes');
        }

        if (status.staged.length > 0) {
          suggestions.push('💡 Use "git-commit" to create an intelligent commit');
        }

        if (status.behind > 0) {
          suggestions.push('💡 Use "git pull" to get latest changes');
        }

        if (status.ahead > 0) {
          suggestions.push('💡 Use "git push" to publish your changes');
        }

        if (status.conflicted.length > 0) {
          suggestions.push('💡 Use "git-conflicts" to analyze merge conflicts');
        }

        if (suggestions.length > 0) {
          console.log('\n🤖 Suggestions:');
          suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
        }

      } catch (error) {
        logger.error('Git status command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'git-status'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Smart commit with AI-generated messages
 */
function registerGitCommitCommand(): void {
  const command = {
    name: 'git-commit',
    description: 'Create intelligent commits with AI-generated messages',
    category: 'Git',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        if (!await gitManager.isGitRepo()) {
          throw createUserError('Not a git repository', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Initialize a git repository with "git-init"'
          });
        }

        const { message, interactive } = args;

        if (message) {
          // Use provided message
          await gitManager.smartCommit(message);
        } else if (interactive) {
          // Interactive mode - show suggestions and let user choose
          const suggestions = await gitManager.generateCommitMessage();

          console.log('\n🤖 AI-Generated Commit Message Suggestions:\n');

          suggestions.forEach((suggestion, index) => {
            const formattedMessage = formatCommitSuggestionDisplay(suggestion);
            console.log(`${index + 1}. ${formattedMessage}`);
            console.log(`   Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
            if (suggestion.body) {
              console.log(`   Body: ${suggestion.body}`);
            }
            console.log('');
          });

          // In a real implementation, you'd prompt the user for selection
          // For now, use the highest confidence suggestion
          const bestSuggestion = suggestions.reduce((best, current) =>
            current.confidence > best.confidence ? current : best
          );

          console.log(`Using suggestion: ${formatCommitSuggestionDisplay(bestSuggestion)}`);
          await gitManager.smartCommit();
        } else {
          // Auto mode - use best AI suggestion
          await gitManager.smartCommit();
        }

      } catch (error) {
        logger.error('Git commit command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'message',
        description: 'Commit message (optional, AI-generated if not provided)',
        type: ArgType.STRING,
        position: 0,
        required: false
      },
      {
        name: 'interactive',
        description: 'Show AI suggestions and choose interactively',
        type: ArgType.BOOLEAN,
        flag: '--interactive',
        required: false
      }
    ],
    examples: [
      'git-commit',
      'git-commit "fix: resolve login issue"',
      'git-commit --interactive'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Branch analysis and management
 */
function registerGitBranchCommand(): void {
  const command = {
    name: 'git-branch',
    description: 'Analyze and manage git branches with intelligent insights',
    category: 'Git',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        if (!await gitManager.isGitRepo()) {
          throw createUserError('Not a git repository', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Initialize a git repository with "git-init"'
          });
        }

        const { action, name } = args;

        if (action === 'list' || !action) {
          // List and analyze branches
          const branches = await gitManager.getBranches();

          console.log('\n🌿 Branch Analysis:\n');

          branches.forEach(branch => {
            const indicator = branch.current ? '→' : ' ';
            const upstreamInfo = branch.upstream ? ` (tracks ${branch.upstream})` : '';

            console.log(`${indicator} ${branch.name} [${branch.lastCommit}]${upstreamInfo}`);
          });

          // Show current branch details
          const currentBranch = branches.find(b => b.current);
          if (currentBranch) {
            console.log(`\n📍 Current: ${currentBranch.name}`);

            const recentCommits = await gitManager.getRecentCommits(5);
            if (recentCommits.length > 0) {
              console.log('\n📚 Recent commits:');
              recentCommits.forEach(commit => {
                console.log(`   ${commit.hash} ${commit.message} (${commit.author})`);
              });
            }
          }

        } else if (action === 'create') {
          if (!validateNonEmptyString(name, 'branch name')) {
            return;
          }

          await executeWithSpinner(
            `Creating branch: ${name}`,
            async () => {
              const { exec } = await import('child_process');
              const { promisify } = await import('util');
              const execAsync = promisify(exec);

              await execAsync(`git checkout -b ${name}`);
            },
            `Branch '${name}' created and checked out`
          );

        } else if (action === 'switch') {
          if (!validateNonEmptyString(name, 'branch name')) {
            return;
          }

          await executeWithSpinner(
            `Switching to branch: ${name}`,
            async () => {
              const { exec } = await import('child_process');
              const { promisify } = await import('util');
              const execAsync = promisify(exec);

              await execAsync(`git checkout ${name}`);
            },
            `Switched to branch '${name}'`
          );
        }

      } catch (error) {
        logger.error('Git branch command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'action',
        description: 'Action to perform (list, create, switch)',
        type: ArgType.STRING,
        position: 0,
        required: false
      },
      {
        name: 'name',
        description: 'Branch name (for create/switch actions)',
        type: ArgType.STRING,
        position: 1,
        required: false
      }
    ],
    examples: [
      'git-branch',
      'git-branch list',
      'git-branch create feature/new-feature',
      'git-branch switch main'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Pull request description generation
 */
function registerGitPRCommand(): void {
  const command = {
    name: 'git-pr',
    description: 'Generate intelligent pull request descriptions',
    category: 'Git',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        if (!await gitManager.isGitRepo()) {
          throw createUserError('Not a git repository', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Initialize a git repository with "git-init"'
          });
        }

        const { target = 'main' } = args;

        const description = await gitManager.generatePRDescription(target);

        console.log('\n📝 Generated Pull Request Description:\n');
        console.log('=' .repeat(60));
        console.log(description);
        console.log('=' .repeat(60));

        console.log('\n💡 Copy this description for your pull request!');

      } catch (error) {
        logger.error('Git PR command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'target',
        description: 'Target branch for PR (default: main)',
        type: ArgType.STRING,
        position: 0,
        required: false
      }
    ],
    examples: [
      'git-pr',
      'git-pr develop',
      'git-pr main'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Conflict analysis and resolution assistance
 */
function registerGitConflictCommand(): void {
  const command = {
    name: 'git-conflicts',
    description: 'Analyze merge conflicts and suggest resolutions',
    category: 'Git',
    async handler(): Promise<void> {
      try {
        if (!await gitManager.isGitRepo()) {
          throw createUserError('Not a git repository', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Initialize a git repository with "git-init"'
          });
        }

        const suggestions = await gitManager.analyzeConflicts();

        if (suggestions.length === 0) {
          console.log('✅ No merge conflicts detected!');
          return;
        }

        console.log('\n⚠️  Merge Conflict Analysis:\n');

        suggestions.forEach((suggestion, index) => {
          console.log(`${index + 1}. ${suggestion}`);
          console.log('-'.repeat(60));
        });

        console.log('\n💡 After resolving conflicts:');
        console.log('   1. Edit the files to resolve conflicts');
        console.log('   2. Run "git add <filename>" for each resolved file');
        console.log('   3. Run "git commit" to complete the merge');

      } catch (error) {
        logger.error('Git conflicts command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'git-conflicts'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Initialize git repository
 */
function registerGitInitCommand(): void {
  const command = {
    name: 'git-init',
    description: 'Initialize git repository with intelligent setup',
    category: 'Git',
    async handler(): Promise<void> {
      try {
        await gitManager.initRepo();

        // Add basic .gitignore if it doesn't exist
        const { promises: fs } = await import('fs');
        const path = await import('path');

        const gitignorePath = path.join(process.cwd(), '.gitignore');

        try {
          await fs.access(gitignorePath);
        } catch {
          // .gitignore doesn't exist, create a basic one
          const basicGitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
*.tgz

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log
`;

          await fs.writeFile(gitignorePath, basicGitignore);
          console.log('📝 Created basic .gitignore file');
        }

        console.log('\n🎉 Git repository initialized successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Add files: git add .');
        console.log('   2. Create first commit: git-commit');

      } catch (error) {
        logger.error('Git init command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'git-init'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Format commit suggestion for display
 */
function formatCommitSuggestionDisplay(suggestion: CommitSuggestion): string {
  let message = suggestion.type;

  if (suggestion.scope) {
    message += `(${suggestion.scope})`;
  }

  if (suggestion.breaking) {
    message += '!';
  }

  message += `: ${suggestion.description}`;

  return message;
}
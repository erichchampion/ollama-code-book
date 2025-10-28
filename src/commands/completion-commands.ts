/**
 * Shell Completion Commands
 *
 * Commands for managing shell integration and auto-completion
 */

import { commandRegistry, ArgType } from './index.js';
import { logger } from '../utils/logger.js';
import { shellCompletion, CompletionContext } from '../shell/completion.js';
import { validateNonEmptyString } from '../utils/command-helpers.js';

/**
 * Register completion commands
 */
export function registerCompletionCommands(): void {
  logger.debug('Registering completion commands');

  registerCompletionInstallCommand();
  registerCompletionGenerateCommand();
  registerCompletionCompleteCommand();
}

/**
 * Install shell completion
 */
function registerCompletionInstallCommand(): void {
  const command = {
    name: 'completion-install',
    description: 'Install shell completion for your shell',
    category: 'Shell Integration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { shell } = args;

        let targetShell = shell;

        if (!targetShell) {
          // Auto-detect shell
          const shellEnv = process.env.SHELL;
          if (shellEnv?.includes('bash')) {
            targetShell = 'bash';
          } else if (shellEnv?.includes('zsh')) {
            targetShell = 'zsh';
          } else if (shellEnv?.includes('fish')) {
            targetShell = 'fish';
          } else {
            console.log('❓ Could not auto-detect shell');
            console.log('\n🐚 Supported shells:');
            console.log('   • bash: completion-install bash');
            console.log('   • zsh: completion-install zsh');
            console.log('   • fish: completion-install fish');
            return;
          }
        }

        if (!['bash', 'zsh', 'fish'].includes(targetShell)) {
          console.log(`❌ Unsupported shell: ${targetShell}`);
          console.log('\n🐚 Supported shells: bash, zsh, fish');
          return;
        }

        const installPath = await shellCompletion.installCompletion(targetShell as 'bash' | 'zsh' | 'fish');

        console.log(`✅ ${targetShell} completion installed!`);
        console.log(`📁 Installed to: ${installPath}`);

        console.log('\n🔄 To activate completion, add this to your shell config:');

        switch (targetShell) {
          case 'bash':
            console.log(`   echo 'source ${installPath}' >> ~/.bashrc`);
            console.log('   source ~/.bashrc');
            break;
          case 'zsh':
            console.log(`   echo 'source ${installPath}' >> ~/.zshrc`);
            console.log('   source ~/.zshrc');
            break;
          case 'fish':
            console.log('   # Fish completion is automatically loaded');
            console.log('   # Restart your shell or run: exec fish');
            break;
        }

        console.log('\n💡 Features enabled:');
        console.log('   • Command name completion');
        console.log('   • Argument and option completion');
        console.log('   • File path completion');
        console.log('   • Context-aware suggestions');

      } catch (error) {
        logger.error('Completion install command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'shell',
        description: 'Shell to install completion for (bash, zsh, fish). Auto-detected if not specified.',
        type: ArgType.STRING,
        position: 0,
        required: false
      }
    ],
    examples: [
      'completion-install',
      'completion-install bash',
      'completion-install zsh',
      'completion-install fish'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Generate completion scripts
 */
function registerCompletionGenerateCommand(): void {
  const command = {
    name: 'completion',
    description: 'Generate shell completion scripts',
    category: 'Shell Integration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { shell } = args;

        if (!validateNonEmptyString(shell, 'shell type')) {
          console.log('🐚 Available shell completion scripts:');
          console.log('   • bash: completion bash');
          console.log('   • zsh: completion zsh');
          console.log('   • fish: completion fish');
          return;
        }

        let script: string;

        switch (shell.toLowerCase()) {
          case 'bash':
            script = shellCompletion.generateBashCompletion();
            break;
          case 'zsh':
            script = shellCompletion.generateZshCompletion();
            break;
          case 'fish':
            script = shellCompletion.generateFishCompletion();
            break;
          default:
            console.log(`❌ Unsupported shell: ${shell}`);
            console.log('🐚 Supported: bash, zsh, fish');
            return;
        }

        console.log(script);

      } catch (error) {
        logger.error('Completion generate command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'shell',
        description: 'Shell type (bash, zsh, fish)',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ],
    examples: [
      'completion bash > ~/.ollama-code-completion.bash',
      'completion zsh > ~/.ollama-code-completion.zsh',
      'completion fish > ~/.config/fish/completions/ollama-code.fish'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Internal completion handler (called by shell)
 */
function registerCompletionCompleteCommand(): void {
  const command = {
    name: '__complete',
    description: 'Internal completion handler for shells',
    category: 'Shell Integration',
    hidden: true,
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { line, point } = args;

        if (!line) return;

        // Parse completion context
        const pointNum = parseInt(point) || line.length;
        const beforeCursor = line.substring(0, pointNum);
        const words = beforeCursor.trim().split(/\s+/);

        // Remove 'ollama-code' from words
        if (words[0] === 'ollama-code') {
          words.shift();
        }

        const currentWord = words[words.length - 1] || '';
        const previousWord = words[words.length - 2] || '';
        const commandName = words[0];

        const context: CompletionContext = {
          line: beforeCursor,
          point: pointNum,
          words,
          currentWord,
          previousWord,
          commandName: commandRegistry.exists(commandName) ? commandName : undefined
        };

        // Get completions
        const completions = await shellCompletion.getCompletions(context);

        // Output completions for shell
        const output = shellCompletion.formatForShell(completions);
        console.log(output);

      } catch (error) {
        // Silent failure for completion - don't break shell
        logger.debug('Completion error:', error);
      }
    },
    args: [
      {
        name: 'line',
        description: 'Command line being completed',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'point',
        description: 'Cursor position in line',
        type: ArgType.STRING,
        position: 1,
        required: false
      }
    ],
    examples: []
  };

  commandRegistry.register(command);
}
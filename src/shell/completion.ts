/**
 * Shell Completion System
 *
 * Provides shell integration and auto-completion for:
 * - Command names and arguments
 * - File paths and project structure
 * - Git branches and commit references
 * - Configuration keys and values
 * - Context-aware suggestions
 */

import { promises as fs } from 'fs';
import path from 'path';
import { commandRegistry, ArgType } from '../commands/index.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';

export interface CompletionItem {
  word: string;
  description?: string;
  type: 'command' | 'argument' | 'file' | 'option' | 'value';
  category?: string;
}

export interface CompletionContext {
  line: string;
  point: number;
  words: string[];
  currentWord: string;
  previousWord: string;
  commandName?: string;
}

export class ShellCompletion {
  /**
   * Generate completions for the current context
   */
  async getCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];

    try {
      // Determine what we're completing
      if (this.isCompletingCommand(context)) {
        completions.push(...await this.getCommandCompletions(context));
      } else if (this.isCompletingArgument(context)) {
        completions.push(...await this.getArgumentCompletions(context));
      } else if (this.isCompletingOption(context)) {
        completions.push(...await this.getOptionCompletions(context));
      } else if (this.isCompletingFile(context)) {
        completions.push(...await this.getFileCompletions(context));
      }

      // Add context-aware suggestions
      completions.push(...await this.getContextualCompletions(context));

    } catch (error) {
      logger.error('Completion generation error:', error);
    }

    return this.deduplicateCompletions(completions);
  }

  /**
   * Generate bash completion script
   */
  generateBashCompletion(): string {
    return `#!/bin/bash

# Ollama Code CLI Bash Completion
# Add this to your ~/.bashrc or ~/.bash_profile:
# source <(ollama-code completion bash)

_ollama_code_completion() {
    local cur prev words cword
    _init_completion || return

    # Get current completion context
    local line="\${COMP_LINE}"
    local point="\${COMP_POINT}"

    # Call ollama-code to get completions
    local completions
    completions=\$(ollama-code __complete "\${line}" "\${point}" 2>/dev/null)

    if [[ \${completions} ]]; then
        COMPREPLY=( \$(compgen -W "\${completions}" -- "\${cur}") )
    else
        # Fallback to file completion
        _filedir
    fi
}

# Register the completion function
complete -F _ollama_code_completion ollama-code

# Also register for common aliases
complete -F _ollama_code_completion oc
complete -F _ollama_code_completion ollama
`;
  }

  /**
   * Generate zsh completion script
   */
  generateZshCompletion(): string {
    return `#compdef ollama-code

# Ollama Code CLI Zsh Completion
# Add this to your ~/.zshrc:
# source <(ollama-code completion zsh)

_ollama_code() {
    local context curcontext="$curcontext" state line
    local -A opt_args

    # Get completion context
    local words=("\${(@)words}")
    local current="\${words[CURRENT]}"
    local line="\${BUFFER}"
    local point="\${CURSOR}"

    # Call ollama-code for completions
    local completions
    completions=(\${(f)"\$(ollama-code __complete "\${line}" "\${point}" 2>/dev/null)"})

    if (( \${#completions[@]} > 0 )); then
        _describe 'ollama-code commands' completions
    else
        # Fallback to file completion
        _files
    fi
}

# Register the completion function
compdef _ollama_code ollama-code

# Also register for common aliases
compdef _ollama_code oc
compdef _ollama_code ollama
`;
  }

  /**
   * Generate fish completion script
   */
  generateFishCompletion(): string {
    return `# Ollama Code CLI Fish Completion
# Add this to ~/.config/fish/completions/ollama-code.fish

function __ollama_code_complete
    set -l cmd (commandline -cp)
    set -l cursor (commandline -C)

    # Call ollama-code for completions
    ollama-code __complete "$cmd" "$cursor" 2>/dev/null
end

# Register completions
complete -c ollama-code -f -a "(__ollama_code_complete)"

# Also register for common aliases
complete -c oc -f -a "(__ollama_code_complete)"
complete -c ollama -f -a "(__ollama_code_complete)"
`;
  }

  /**
   * Get command name completions
   */
  private async getCommandCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const commands = commandRegistry.list()
      .filter(cmd => !cmd.hidden)
      .filter(cmd => cmd.name.startsWith(context.currentWord));

    return commands.map(cmd => ({
      word: cmd.name,
      description: cmd.description,
      type: 'command' as const,
      category: cmd.category
    }));
  }

  /**
   * Get argument completions for current command
   */
  private async getArgumentCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    if (!context.commandName) return [];

    const command = commandRegistry.get(context.commandName);
    if (!command || !command.args) return [];

    const completions: CompletionItem[] = [];

    // Find which argument we're completing
    const argIndex = context.words.length - 2; // -1 for current word, -1 for command
    const arg = command.args.find(a => a.position === argIndex);

    if (arg) {
      // Add specific completions based on argument type
      switch (arg.type) {
        case ArgType.STRING:
          // For string types, check if it's a specific string type
          if (arg.name.includes('file') || arg.name.includes('path')) {
            completions.push(...await this.getFileCompletions(context));
          } else if (arg.name.includes('model')) {
            completions.push(...await this.getModelCompletions(context));
          } else if (arg.name.includes('branch')) {
            completions.push(...await this.getBranchCompletions(context));
          }
          break;
      }
    }

    return completions;
  }

  /**
   * Get option completions (flags)
   */
  private async getOptionCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    if (!context.commandName) return [];

    const command = commandRegistry.get(context.commandName);
    if (!command || !command.args) return [];

    const completions: CompletionItem[] = [];

    // Add flag completions
    for (const arg of command.args) {
      if (arg.flag && arg.flag.startsWith(context.currentWord)) {
        completions.push({
          word: arg.flag,
          description: arg.description,
          type: 'option'
        });
      }
    }

    return completions;
  }

  /**
   * Get file path completions
   */
  private async getFileCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];

    try {
      const currentDir = path.dirname(context.currentWord) || '.';
      const baseName = path.basename(context.currentWord);

      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith(baseName)) {
          const fullPath = path.join(currentDir, entry.name);

          completions.push({
            word: fullPath + (entry.isDirectory() ? '/' : ''),
            description: entry.isDirectory() ? 'directory' : 'file',
            type: 'file'
          });
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }

    return completions;
  }

  /**
   * Get model name completions
   */
  private async getModelCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    // This would integrate with Ollama API to get available models
    const commonModels = [
      'qwen2.5-coder:latest',
      'llama3.2',
      'codellama',
      'mistral',
      'gemma2'
    ];

    return commonModels
      .filter(model => model.startsWith(context.currentWord))
      .map(model => ({
        word: model,
        description: 'Ollama model',
        type: 'value' as const
      }));
  }

  /**
   * Get git branch completions
   */
  private async getBranchCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('git branch --all --format="%(refname:short)"');
      const branches = stdout.trim().split('\n').filter(b => b.length > 0);

      for (const branch of branches) {
        if (branch.startsWith(context.currentWord)) {
          completions.push({
            word: branch,
            description: 'git branch',
            type: 'value'
          });
        }
      }
    } catch (error) {
      // Not in a git repository or git not available
    }

    return completions;
  }

  /**
   * Get contextual completions based on current command and environment
   */
  private async getContextualCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];

    // Add recent commands if completing command name
    if (this.isCompletingCommand(context)) {
      // Would integrate with command history
      const recentCommands = ['ask', 'explain', 'generate', 'git-status'];

      for (const cmd of recentCommands) {
        if (cmd.startsWith(context.currentWord)) {
          completions.push({
            word: cmd,
            description: 'recent command',
            type: 'command'
          });
        }
      }
    }

    // Add project-specific completions
    if (context.commandName?.startsWith('git-')) {
      // Add git-specific completions like file names from git status
      completions.push(...await this.getGitFileCompletions(context));
    }

    return completions;
  }

  /**
   * Get git file completions (modified, staged, etc.)
   */
  private async getGitFileCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('git status --porcelain');
      const lines = stdout.trim().split('\n').filter(l => l.length > 0);

      for (const line of lines) {
        const filePath = line.substring(3); // Remove status prefix

        if (filePath.startsWith(context.currentWord)) {
          completions.push({
            word: filePath,
            description: 'modified file',
            type: 'file'
          });
        }
      }
    } catch (error) {
      // Not in a git repository
    }

    return completions;
  }

  /**
   * Check if we're completing a command name
   */
  private isCompletingCommand(context: CompletionContext): boolean {
    return context.words.length <= 1 ||
           (context.words.length === 2 && !context.currentWord.startsWith('-'));
  }

  /**
   * Check if we're completing an argument
   */
  private isCompletingArgument(context: CompletionContext): boolean {
    return context.words.length > 1 &&
           !context.currentWord.startsWith('-') &&
           !context.previousWord.startsWith('-');
  }

  /**
   * Check if we're completing an option/flag
   */
  private isCompletingOption(context: CompletionContext): boolean {
    return context.currentWord.startsWith('-');
  }

  /**
   * Check if we're completing a file path
   */
  private isCompletingFile(context: CompletionContext): boolean {
    return context.currentWord.includes('/') ||
           context.currentWord.includes('\\') ||
           context.previousWord === '--file' ||
           context.previousWord === '--path';
  }

  /**
   * Remove duplicate completions
   */
  private deduplicateCompletions(completions: CompletionItem[]): CompletionItem[] {
    const seen = new Set<string>();
    return completions.filter(item => {
      if (seen.has(item.word)) {
        return false;
      }
      seen.add(item.word);
      return true;
    });
  }

  /**
   * Format completions for shell output
   */
  formatForShell(completions: CompletionItem[]): string {
    return completions
      .map(item => item.word)
      .join('\n');
  }

  /**
   * Install shell completion for current shell
   */
  async installCompletion(shell: 'bash' | 'zsh' | 'fish'): Promise<string> {
    const spinner = createSpinner(`Installing ${shell} completion...`);
    spinner.start();

    try {
      let script: string;
      let installPath: string;

      switch (shell) {
        case 'bash':
          script = this.generateBashCompletion();
          installPath = path.join(process.env.HOME || '~', '.ollama-code-completion.bash');
          break;
        case 'zsh':
          script = this.generateZshCompletion();
          installPath = path.join(process.env.HOME || '~', '.ollama-code-completion.zsh');
          break;
        case 'fish':
          script = this.generateFishCompletion();
          const fishDir = path.join(process.env.HOME || '~', '.config/fish/completions');
          await fs.mkdir(fishDir, { recursive: true });
          installPath = path.join(fishDir, 'ollama-code.fish');
          break;
        default:
          throw new Error(`Unsupported shell: ${shell}`);
      }

      await fs.writeFile(installPath, script);

      spinner.succeed(`${shell} completion installed`);
      return installPath;
    } catch (error) {
      spinner.fail(`Failed to install ${shell} completion`);
      throw error;
    }
  }
}

/**
 * Default shell completion instance
 */
export const shellCompletion = new ShellCompletion();
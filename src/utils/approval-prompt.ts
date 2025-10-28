/**
 * Approval Prompt Utilities
 *
 * Provides interactive user approval prompts for dangerous operations
 */

import * as readline from 'readline';

export interface ApprovalPromptOptions {
  /** The tool name requesting approval */
  toolName: string;
  /** The category of the tool */
  category: string;
  /** Description of what the tool will do */
  description?: string;
  /** Parameters being passed to the tool */
  parameters?: Record<string, any>;
  /** Default response (yes/no) */
  defaultResponse?: 'yes' | 'no';
}

export interface ApprovalResult {
  /** Whether the user approved */
  approved: boolean;
  /** Whether to remember this choice for the session */
  rememberChoice?: boolean;
}

/**
 * Prompt the user for approval to execute a tool
 */
export async function promptForApproval(
  options: ApprovalPromptOptions
): Promise<ApprovalResult> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const defaultChar = options.defaultResponse === 'yes' ? 'Y/n' : 'y/N';
    const paramStr = options.parameters
      ? `\n  Parameters: ${JSON.stringify(options.parameters, null, 2)}`
      : '';

    const message = `
⚠️  Approval Required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tool:     ${options.toolName}
  Category: ${options.category}${options.description ? `\n  Action:   ${options.description}` : ''}${paramStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This operation may modify your codebase or system.
Do you want to proceed? (${defaultChar}): `;

    rl.question(message, (answer) => {
      rl.close();

      const input = answer.trim().toLowerCase();
      let approved: boolean;

      if (input === '') {
        // Use default
        approved = options.defaultResponse === 'yes';
      } else if (input === 'y' || input === 'yes') {
        approved = true;
      } else if (input === 'n' || input === 'no') {
        approved = false;
      } else {
        // Invalid input, use default
        approved = options.defaultResponse === 'yes';
      }

      resolve({
        approved,
        rememberChoice: false // Could be extended to support this
      });
    });
  });
}

/**
 * Format tool parameters for display
 */
export function formatToolParameters(params: Record<string, any>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    let displayValue: string;

    if (typeof value === 'string' && value.length > 100) {
      displayValue = `"${value.substring(0, 100)}..."`;
    } else if (typeof value === 'object') {
      displayValue = JSON.stringify(value);
      if (displayValue.length > 100) {
        displayValue = displayValue.substring(0, 100) + '...';
      }
    } else {
      displayValue = String(value);
    }

    lines.push(`    ${key}: ${displayValue}`);
  }

  return lines.join('\n');
}

/**
 * Session-based approval cache to remember user choices
 */
export class ApprovalCache {
  private cache: Map<string, boolean> = new Map();
  private wildcards: Map<string, boolean> = new Map();

  /**
   * Check if approval is cached for a tool
   */
  isApproved(toolName: string, category: string): boolean | undefined {
    // Check specific tool approval
    const toolKey = `${category}:${toolName}`;
    if (this.cache.has(toolKey)) {
      return this.cache.get(toolKey);
    }

    // Check category-wide approval
    if (this.wildcards.has(category)) {
      return this.wildcards.get(category);
    }

    return undefined;
  }

  /**
   * Cache an approval decision
   */
  setApproval(toolName: string, category: string, approved: boolean): void {
    const toolKey = `${category}:${toolName}`;
    this.cache.set(toolKey, approved);
  }

  /**
   * Cache a category-wide approval decision
   */
  setCategoryApproval(category: string, approved: boolean): void {
    this.wildcards.set(category, approved);
  }

  /**
   * Clear all cached approvals
   */
  clear(): void {
    this.cache.clear();
    this.wildcards.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalApprovals: number; categoryApprovals: number } {
    return {
      totalApprovals: this.cache.size,
      categoryApprovals: this.wildcards.size
    };
  }
}

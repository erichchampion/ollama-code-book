/**
 * Plan Approval Helper
 *
 * Determines whether to prompt for plan approval and handles user approval/rejection
 * before plan execution in the streaming flow.
 */

import * as readline from 'readline';
import { formatPlanForTerminal } from './plan-display.js';
import type { TaskPlan } from '../ai/task-planner.js';

export interface PlanApprovalOptions {
  /** Whether plan approval is required (e.g. disabled in E2E or non-interactive) */
  requirePlanApproval: boolean;
  /** When true, skip prompting (e2e / non-interactive) */
  nonInteractive?: boolean;
}

export interface RequestPlanApprovalOptions {
  plan: TaskPlan;
  terminal?: {
    info: (text: string) => void;
    success?: (text: string) => void;
    error?: (text: string) => void;
  };
}

/**
 * Whether we should prompt for approval before executing a plan.
 */
export function shouldPromptForPlanApproval(options: PlanApprovalOptions): boolean {
  if (!options.requirePlanApproval) return false;
  if (options.nonInteractive === true) return false;
  if (process.env.OLLAMA_CODE_E2E_TEST === 'true') return false;
  return true;
}

/**
 * Present the plan and prompt the user to approve or reject execution.
 * Returns true if the user approved, false if rejected.
 */
export async function requestPlanApproval(options: RequestPlanApprovalOptions): Promise<boolean> {
  const { plan, terminal } = options;

  const formatted = formatPlanForTerminal(plan);
  if (terminal?.info) {
    terminal.info('\n📋 Plan ready for approval:\n');
    terminal.info(formatted);
    terminal.info('\nExecute this plan? (y/n): ');
  } else {
    process.stdout.write('\n📋 Plan ready for approval:\n\n');
    process.stdout.write(formatted);
    process.stdout.write('\nExecute this plan? (y/n): ');
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    rl.question('', (answer) => {
      rl.close();
      const input = answer.trim().toLowerCase();
      const approved = input === 'y' || input === 'yes' || input === '';
      if (terminal && !approved && terminal.error) {
        terminal.error('Plan execution declined.\n');
      } else if (terminal && approved && terminal.success) {
        terminal.success('Plan approved. Executing...\n');
      }
      resolve(approved);
    });
  });
}

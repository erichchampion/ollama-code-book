/**
 * Tutorial Commands
 *
 * Commands for managing onboarding and interactive tutorials
 */

import { commandRegistry, ArgType } from './index.js';
import { logger } from '../utils/logger.js';
import { tutorialSystem } from '../onboarding/tutorial.js';
import { validateNonEmptyString } from '../utils/command-helpers.js';
import { initTerminal } from '../terminal/index.js';
import { getMinimalConfig } from '../utils/config-helpers.js';

/**
 * Ensure tutorial system has a terminal interface for interactive tutorials
 */
async function ensureTutorialTerminal(): Promise<void> {
  try {
    const terminal = await initTerminal(getMinimalConfig());
    tutorialSystem.setTerminal(terminal);
  } catch (error) {
    logger.warn('Could not initialize terminal for tutorials:', error);
  }
}

/**
 * Register tutorial commands
 */
export function registerTutorialCommands(): void {
  logger.debug('Registering tutorial commands');

  registerOnboardingCommand();
  registerTutorialListCommand();
  registerTutorialStartCommand();
  registerTutorialContinueCommand();
  registerTutorialProgressCommand();
  registerTutorialSkipCommand();
  registerTutorialResetCommand();
}

/**
 * Start onboarding process
 */
function registerOnboardingCommand(): void {
  const command = {
    name: 'onboarding',
    description: 'Start the guided onboarding process for new users',
    category: 'Getting Started',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        await ensureTutorialTerminal();
        await tutorialSystem.initialize();
        await tutorialSystem.startOnboarding();

      } catch (error) {
        logger.error('Onboarding command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'onboarding'
    ]
  };

  commandRegistry.register(command);
}

/**
 * List available tutorials
 */
function registerTutorialListCommand(): void {
  const command = {
    name: 'tutorial-list',
    description: 'Show all available tutorials and their status',
    category: 'Getting Started',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        await tutorialSystem.initialize();
        await tutorialSystem.showTutorials();

      } catch (error) {
        logger.error('Tutorial list command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'tutorial-list'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Start a specific tutorial
 */
function registerTutorialStartCommand(): void {
  const command = {
    name: 'tutorial-start',
    description: 'Start a specific tutorial by ID',
    category: 'Getting Started',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { tutorial_id } = args;

        if (!validateNonEmptyString(tutorial_id, 'tutorial ID')) {
          console.log('\\n📚 Available tutorials:');
          console.log('   • getting-started     - Learn the basics');
          console.log('   • configuration       - Customize your setup');
          console.log('   • git-workflow        - Master Git integration');
          console.log('   • code-generation     - Generate and explain code');
          console.log('   • advanced-features   - Explore advanced tools');
          console.log('\\n💡 Example: tutorial-start getting-started');
          return;
        }

        await ensureTutorialTerminal();
        await tutorialSystem.initialize();
        await tutorialSystem.startTutorial(tutorial_id);

      } catch (error) {
        logger.error('Tutorial start command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'tutorial_id',
        description: 'Tutorial ID to start (e.g., getting-started, configuration)',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ],
    examples: [
      'tutorial-start getting-started',
      'tutorial-start configuration',
      'tutorial-start git-workflow'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Continue current tutorial
 */
function registerTutorialContinueCommand(): void {
  const command = {
    name: 'tutorial-continue',
    description: 'Continue the current tutorial in progress',
    category: 'Getting Started',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        await ensureTutorialTerminal();
        await tutorialSystem.initialize();
        await tutorialSystem.continueTutorial();

      } catch (error) {
        logger.error('Tutorial continue command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'tutorial-continue'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Show tutorial progress
 */
function registerTutorialProgressCommand(): void {
  const command = {
    name: 'tutorial-progress',
    description: 'Show your learning progress and achievements',
    category: 'Getting Started',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        await tutorialSystem.initialize();
        await tutorialSystem.showProgress();

      } catch (error) {
        logger.error('Tutorial progress command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'tutorial-progress'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Skip current tutorial
 */
function registerTutorialSkipCommand(): void {
  const command = {
    name: 'tutorial-skip',
    description: 'Skip the current tutorial or a specific tutorial',
    category: 'Getting Started',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { tutorial_id } = args;

        await tutorialSystem.initialize();
        await tutorialSystem.skipTutorial(tutorial_id);

        console.log('\\n💡 You can always restart tutorials with: tutorial-start <tutorial-id>');

      } catch (error) {
        logger.error('Tutorial skip command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'tutorial_id',
        description: 'Tutorial ID to skip (optional - skips current if not specified)',
        type: ArgType.STRING,
        position: 0,
        required: false
      }
    ],
    examples: [
      'tutorial-skip',
      'tutorial-skip configuration'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Reset tutorial progress
 */
function registerTutorialResetCommand(): void {
  const command = {
    name: 'tutorial-reset',
    description: 'Reset tutorial progress and start fresh',
    category: 'Getting Started',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { tutorial_id, confirm = false } = args;

        if (!confirm) {
          if (tutorial_id) {
            console.log(`⚠️  This will reset progress for tutorial '${tutorial_id}'!`);
          } else {
            console.log('⚠️  This will reset ALL tutorial progress and achievements!');
          }
          console.log('\\nThis action cannot be undone.');
          console.log('\\n💡 To proceed, add --confirm flag');
          return;
        }

        await tutorialSystem.initialize();
        await tutorialSystem.resetProgress(tutorial_id);

        if (tutorial_id) {
          console.log(`\\n💡 Restart with: tutorial-start ${tutorial_id}`);
        } else {
          console.log('\\n💡 Start fresh with: onboarding');
        }

      } catch (error) {
        logger.error('Tutorial reset command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'tutorial_id',
        description: 'Tutorial ID to reset (optional - resets all if not specified)',
        type: ArgType.STRING,
        position: 0,
        required: false
      },
      {
        name: 'confirm',
        description: 'Confirm the reset operation',
        type: ArgType.BOOLEAN,
        flag: '--confirm',
        required: false
      }
    ],
    examples: [
      'tutorial-reset',
      'tutorial-reset getting-started',
      'tutorial-reset --confirm',
      'tutorial-reset configuration --confirm'
    ]
  };

  commandRegistry.register(command);
}
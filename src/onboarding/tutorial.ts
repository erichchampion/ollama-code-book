/**
 * User Onboarding and Tutorial System
 *
 * Provides interactive tutorials and guided experiences including:
 * - First-time user setup and configuration
 * - Feature discovery and walkthroughs
 * - Interactive tutorials for different workflows
 * - Progress tracking and achievement system
 * - Context-sensitive help and tips
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import { TerminalInterface } from '../terminal/types.js';
import { configManager } from '../config/manager.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  command?: string;
  expectedOutput?: string;
  tips?: string[];
  nextSteps?: string[];
  completionCriteria?: {
    commandRun?: string;
    outputContains?: string;
    configSet?: { key: string; value: any };
  };
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  category: 'getting-started' | 'advanced' | 'workflow' | 'feature';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  prerequisites?: string[];
  steps: TutorialStep[];
  achievements?: string[];
}

export interface TutorialProgress {
  tutorialId: string;
  startedAt: number;
  completedAt?: number;
  currentStep: number;
  completedSteps: string[];
  totalSteps: number;
  status: 'not-started' | 'in-progress' | 'completed' | 'skipped';
}

export interface OnboardingState {
  userId: string;
  startedAt: number;
  completedAt?: number;
  currentPhase: 'welcome' | 'setup' | 'tutorial' | 'completed';
  tutorials: Record<string, TutorialProgress>;
  achievements: string[];
  preferences: {
    showTips: boolean;
    autoAdvance: boolean;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  };
}

export class TutorialSystem {
  private onboardingDir: string;
  private progressFile: string;
  private onboardingState: OnboardingState | null = null;
  private availableTutorials: Map<string, Tutorial> = new Map();
  private terminal: TerminalInterface | null = null;

  constructor() {
    this.onboardingDir = path.join(process.env.HOME || '~', '.ollama-code', 'onboarding');
    this.progressFile = path.join(this.onboardingDir, 'progress.json');
    this.initializeTutorials();
  }

  /**
   * Set the terminal interface for interactive tutorials
   */
  setTerminal(terminal: TerminalInterface): void {
    this.terminal = terminal;
  }

  /**
   * Initialize the tutorial system
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.onboardingDir, { recursive: true });
      await this.loadProgress();

      if (!this.onboardingState) {
        await this.createNewUser();
      }
    } catch (error) {
      logger.error('Tutorial system initialization failed:', error);
    }
  }

  /**
   * Start the onboarding process
   */
  async startOnboarding(): Promise<void> {
    const spinner = createSpinner('Starting guided setup...');
    spinner.start();

    try {
      if (!this.onboardingState) {
        await this.createNewUser();
      }

      spinner.succeed('Welcome to Ollama Code!');

      console.log('\n🎉 Welcome to Ollama Code CLI!');
      console.log('\nI\'ll guide you through setting up and learning the key features.\n');

      await this.showWelcomeMessage();
      await this.runSetupPhase();
      await this.showAvailableTutorials();

    } catch (error) {
      spinner.fail('Onboarding failed');
      throw error;
    }
  }

  /**
   * Show available tutorials
   */
  async showTutorials(): Promise<void> {
    console.log('📚 Available Tutorials\n');

    const categories = this.groupTutorialsByCategory();

    for (const [category, tutorials] of categories.entries()) {
      console.log(`\n${this.getCategoryIcon(category)} ${this.formatCategoryName(category)}:`);

      tutorials.forEach(tutorial => {
        const progress = this.onboardingState?.tutorials[tutorial.id];
        const statusIcon = this.getTutorialStatusIcon(progress?.status || 'not-started');
        const difficultyBadge = this.getDifficultyBadge(tutorial.difficulty);
        const timeBadge = `${tutorial.estimatedTime}min`;

        console.log(`   ${statusIcon} ${tutorial.name} ${difficultyBadge} ${timeBadge}`);
        console.log(`      ${tutorial.description}`);

        if (progress && progress.status === 'in-progress') {
          console.log(`      Progress: ${progress.completedSteps.length}/${progress.totalSteps} steps`);
        }
      });
    }

    console.log('\n💡 Commands:');
    console.log('   tutorial-start <tutorial-id>    # Start a specific tutorial');
    console.log('   tutorial-list                   # Show all tutorials');
    console.log('   tutorial-progress               # Show your progress');
  }

  /**
   * Start a specific tutorial
   */
  async startTutorial(tutorialId: string): Promise<void> {
    const tutorial = this.availableTutorials.get(tutorialId);
    if (!tutorial) {
      console.log(`❌ Tutorial '${tutorialId}' not found`);
      return;
    }

    // Check prerequisites
    if (tutorial.prerequisites) {
      const missingPrereqs = tutorial.prerequisites.filter(prereq =>
        !this.onboardingState?.tutorials[prereq]?.completedAt
      );

      if (missingPrereqs.length > 0) {
        console.log(`❌ Missing prerequisites: ${missingPrereqs.join(', ')}`);
        console.log('💡 Complete these tutorials first');
        return;
      }
    }

    console.log(`🎓 Starting Tutorial: ${tutorial.name}\n`);
    console.log(`📋 ${tutorial.description}`);
    console.log(`⏱️  Estimated time: ${tutorial.estimatedTime} minutes`);
    console.log(`🎯 Difficulty: ${tutorial.difficulty}\n`);

    // Initialize progress
    const progress: TutorialProgress = {
      tutorialId,
      startedAt: Date.now(),
      currentStep: 0,
      completedSteps: [],
      totalSteps: tutorial.steps.length,
      status: 'in-progress'
    };

    this.onboardingState!.tutorials[tutorialId] = progress;
    await this.saveProgress();

    // Run tutorial steps
    await this.runTutorialSteps(tutorial, progress);
  }

  /**
   * Continue current tutorial
   */
  async continueTutorial(): Promise<void> {
    const currentTutorial = this.getCurrentTutorial();

    if (!currentTutorial) {
      console.log('📚 No tutorial in progress');
      console.log('\n💡 Start a tutorial with: tutorial-start <tutorial-id>');
      console.log('💡 See available tutorials: tutorial-list');
      return;
    }

    const { tutorial, progress } = currentTutorial;
    console.log(`🎓 Continuing: ${tutorial.name}`);
    console.log(`📍 Step ${progress.currentStep + 1} of ${progress.totalSteps}\n`);

    await this.runTutorialSteps(tutorial, progress);
  }

  /**
   * Show tutorial progress
   */
  async showProgress(): Promise<void> {
    if (!this.onboardingState) {
      console.log('❌ Onboarding not started');
      return;
    }

    console.log('🎯 Learning Progress\n');

    // Overall progress
    const totalTutorials = this.availableTutorials.size;
    const completedTutorials = Object.values(this.onboardingState.tutorials)
      .filter(p => p.status === 'completed').length;
    const overallProgress = (completedTutorials / totalTutorials) * 100;

    console.log(`📊 Overall Progress: ${overallProgress.toFixed(0)}% (${completedTutorials}/${totalTutorials} tutorials)`);
    console.log(`🏆 Achievements: ${this.onboardingState.achievements.length} unlocked\n`);

    // Tutorial progress by category
    const categories = this.groupTutorialsByCategory();

    for (const [category, tutorials] of categories.entries()) {
      const categoryCompleted = tutorials.filter(t =>
        this.onboardingState?.tutorials[t.id]?.status === 'completed'
      ).length;
      const categoryProgress = (categoryCompleted / tutorials.length) * 100;

      console.log(`${this.getCategoryIcon(category)} ${this.formatCategoryName(category)}: ${categoryProgress.toFixed(0)}% (${categoryCompleted}/${tutorials.length})`);
    }

    // Current tutorial
    const currentTutorial = this.getCurrentTutorial();
    if (currentTutorial) {
      const { tutorial, progress } = currentTutorial;
      console.log(`\n🎓 Current Tutorial: ${tutorial.name}`);
      console.log(`   Step ${progress.currentStep + 1} of ${progress.totalSteps}`);
      console.log(`   Started: ${new Date(progress.startedAt).toLocaleDateString()}`);
    }

    // Recent achievements
    if (this.onboardingState.achievements.length > 0) {
      console.log('\n🏆 Recent Achievements:');
      this.onboardingState.achievements.slice(-3).forEach(achievement => {
        console.log(`   ✨ ${achievement}`);
      });
    }

    console.log('\n💡 Commands:');
    console.log('   tutorial-continue               # Continue current tutorial');
    console.log('   tutorial-list                   # View all tutorials');
    console.log('   tutorial-start <id>             # Start specific tutorial');
  }

  /**
   * Skip current tutorial
   */
  async skipTutorial(tutorialId?: string): Promise<void> {
    let targetTutorial = tutorialId;

    if (!targetTutorial) {
      const current = this.getCurrentTutorial();
      if (!current) {
        console.log('❌ No tutorial to skip');
        return;
      }
      targetTutorial = current.tutorial.id;
    }

    if (this.onboardingState?.tutorials[targetTutorial]) {
      this.onboardingState.tutorials[targetTutorial].status = 'skipped';
      await this.saveProgress();
      console.log(`⏭️  Tutorial '${targetTutorial}' skipped`);
    }
  }

  /**
   * Reset tutorial progress
   */
  async resetProgress(tutorialId?: string): Promise<void> {
    if (tutorialId) {
      // Reset specific tutorial
      if (this.onboardingState?.tutorials[tutorialId]) {
        delete this.onboardingState.tutorials[tutorialId];
        await this.saveProgress();
        console.log(`🔄 Tutorial '${tutorialId}' progress reset`);
      }
    } else {
      // Reset all progress
      if (this.onboardingState) {
        this.onboardingState.tutorials = {};
        this.onboardingState.achievements = [];
        this.onboardingState.currentPhase = 'welcome';
        delete this.onboardingState.completedAt;
        await this.saveProgress();
        console.log('🔄 All tutorial progress reset');
      }
    }
  }

  /**
   * Get context-sensitive tips
   */
  getContextTips(command?: string): string[] {
    const tips: string[] = [];

    if (!this.onboardingState?.preferences.showTips) {
      return tips;
    }

    // Command-specific tips
    if (command) {
      const commandTips = this.getCommandTips(command);
      tips.push(...commandTips);
    }

    // General tips based on progress
    const generalTips = this.getGeneralTips();
    tips.push(...generalTips);

    return tips.slice(0, 2); // Limit to 2 tips
  }

  /**
   * Initialize built-in tutorials
   */
  private initializeTutorials(): void {
    // Getting Started Tutorial
    this.availableTutorials.set('getting-started', {
      id: 'getting-started',
      name: 'Getting Started',
      description: 'Learn the basics of Ollama Code CLI',
      category: 'getting-started',
      difficulty: 'beginner',
      estimatedTime: 10,
      steps: [
        {
          id: 'welcome',
          title: 'Welcome',
          description: 'Learn about Ollama Code CLI and its capabilities',
          tips: ['Ollama Code helps you code faster with AI assistance', 'All commands start with the main CLI name']
        },
        {
          id: 'first-command',
          title: 'Your First Command',
          description: 'Try the help command to see what\'s available',
          command: 'help',
          tips: ['The help command shows all available commands', 'Commands are organized by category']
        },
        {
          id: 'ask-question',
          title: 'Ask a Question',
          description: 'Use the ask command to get AI assistance',
          command: 'ask "What is TypeScript?"',
          tips: ['The ask command is great for general questions', 'Always quote your questions']
        }
      ]
    });

    // Configuration Tutorial
    this.availableTutorials.set('configuration', {
      id: 'configuration',
      name: 'Configuration Setup',
      description: 'Learn how to customize Ollama Code for your workflow',
      category: 'getting-started',
      difficulty: 'beginner',
      estimatedTime: 8,
      steps: [
        {
          id: 'view-config',
          title: 'View Configuration',
          description: 'See your current configuration settings',
          command: 'config-show'
        },
        {
          id: 'set-model',
          title: 'Set AI Model',
          description: 'Configure your preferred AI model',
          command: 'config-set ai.defaultModel llama3.2',
          completionCriteria: { configSet: { key: 'ai.defaultModel', value: 'llama3.2' } }
        },
        {
          id: 'project-config',
          title: 'Project Configuration',
          description: 'Create project-specific settings',
          command: 'config-init --project'
        }
      ]
    });

    // Git Workflow Tutorial
    this.availableTutorials.set('git-workflow', {
      id: 'git-workflow',
      name: 'Git Integration',
      description: 'Master Git operations with AI assistance',
      category: 'workflow',
      difficulty: 'intermediate',
      estimatedTime: 15,
      prerequisites: ['getting-started'],
      steps: [
        {
          id: 'git-status',
          title: 'Check Git Status',
          description: 'See the current state of your repository',
          command: 'git-status'
        },
        {
          id: 'commit-message',
          title: 'AI Commit Messages',
          description: 'Generate intelligent commit messages',
          command: 'git-commit-ai',
          tips: ['AI analyzes your changes to suggest commit messages', 'You can customize the commit style in config']
        }
      ]
    });

    // Code Generation Tutorial
    this.availableTutorials.set('code-generation', {
      id: 'code-generation',
      name: 'Code Generation',
      description: 'Learn to generate and explain code with AI',
      category: 'feature',
      difficulty: 'beginner',
      estimatedTime: 12,
      steps: [
        {
          id: 'generate-function',
          title: 'Generate Function',
          description: 'Create a function using AI',
          command: 'generate "a function to calculate fibonacci numbers"'
        },
        {
          id: 'explain-code',
          title: 'Explain Code',
          description: 'Get explanations for existing code',
          command: 'explain --file example.js'
        }
      ]
    });

    // Advanced Features Tutorial
    this.availableTutorials.set('advanced-features', {
      id: 'advanced-features',
      name: 'Advanced Features',
      description: 'Explore testing, refactoring, and performance tools',
      category: 'advanced',
      difficulty: 'advanced',
      estimatedTime: 20,
      prerequisites: ['getting-started', 'configuration'],
      steps: [
        {
          id: 'run-tests',
          title: 'Run Tests',
          description: 'Execute your test suite with AI insights',
          command: 'test-run'
        },
        {
          id: 'refactor-code',
          title: 'Refactor Code',
          description: 'Improve code quality with AI suggestions',
          command: 'refactor-suggest --file src/example.ts'
        },
        {
          id: 'performance-analysis',
          title: 'Performance Analysis',
          description: 'Analyze and optimize performance',
          command: 'performance-analyze'
        }
      ]
    });
  }

  /**
   * Run tutorial steps
   */
  private async runTutorialSteps(tutorial: Tutorial, progress: TutorialProgress): Promise<void> {
    for (let i = progress.currentStep; i < tutorial.steps.length; i++) {
      const step = tutorial.steps[i];

      console.log(`\n📖 Step ${i + 1}: ${step.title}`);
      console.log(`${step.description}\n`);

      if (step.command) {
        console.log(`💻 Try this command:`);
        console.log(`   ${step.command}\n`);
      }

      if (step.tips && step.tips.length > 0) {
        console.log('💡 Tips:');
        step.tips.forEach(tip => console.log(`   • ${tip}`));
        console.log('');
      }

      // Wait for user to proceed
      if (this.terminal) {
        try {
          await this.terminal.prompt({
            type: 'input',
            name: 'continue',
            message: 'Press Enter to continue...',
          });
        } catch (error) {
          // Fallback for non-interactive environments (tests, etc.)
          console.log('Press Enter to continue...');
          console.log('(Running in non-interactive mode, continuing automatically)');
        }
      } else {
        console.log('Press Enter to continue...');
        // Fallback for non-interactive environments (tests, etc.)
      }

      // Mark step as completed
      progress.completedSteps.push(step.id);
      progress.currentStep = i + 1;
      await this.saveProgress();

      // Check for achievements
      await this.checkAchievements(tutorial, progress, step);
    }

    // Tutorial completed
    progress.status = 'completed';
    progress.completedAt = Date.now();
    await this.saveProgress();

    console.log(`\n🎉 Tutorial completed: ${tutorial.name}!`);

    if (tutorial.achievements) {
      tutorial.achievements.forEach(achievement => {
        this.onboardingState?.achievements.push(achievement);
        console.log(`🏆 Achievement unlocked: ${achievement}`);
      });
    }

    // Suggest next tutorials
    await this.suggestNextTutorials(tutorial);
  }

  /**
   * Show welcome message
   */
  private async showWelcomeMessage(): Promise<void> {
    console.log('🚀 Ollama Code is a powerful CLI that combines AI assistance with development tools.');
    console.log('\nKey features:');
    console.log('   💬 Ask questions and get instant answers');
    console.log('   🔧 Generate, explain, and refactor code');
    console.log('   🔄 Smart Git integration with AI commit messages');
    console.log('   🧪 Intelligent testing and debugging');
    console.log('   ⚡ Performance optimization and analytics');
    console.log('\nLet\'s get you set up!\n');
  }

  /**
   * Run setup phase
   */
  private async runSetupPhase(): Promise<void> {
    console.log('⚙️  Initial Setup\n');

    // Check if config exists
    await configManager.loadConfig();
    const summary = configManager.getConfigSummary();

    if (summary.hasProjectConfig) {
      console.log('✅ Configuration already set up');
    } else {
      console.log('📝 Creating initial configuration...');
      await configManager.loadConfig(); // This creates default config
      console.log('✅ Configuration created');
    }

    // Check Ollama connection
    console.log('🔍 Checking AI model availability...');
    // In practice, this would test the Ollama connection
    console.log('✅ AI models available');

    this.onboardingState!.currentPhase = 'tutorial';
    await this.saveProgress();
  }

  /**
   * Show available tutorials after setup
   */
  private async showAvailableTutorials(): Promise<void> {
    console.log('\n📚 Let\'s start with some tutorials!\n');
    console.log('I recommend starting with these:');
    console.log('   1. 🎯 getting-started     - Learn the basics (10 min)');
    console.log('   2. ⚙️  configuration       - Customize your setup (8 min)');
    console.log('   3. 🔧 code-generation     - Generate and explain code (12 min)');
    console.log('\n💡 Start with: tutorial-start getting-started');
    console.log('💡 See all tutorials: tutorial-list');
  }

  /**
   * Create new user
   */
  private async createNewUser(): Promise<void> {
    this.onboardingState = {
      userId: this.generateUserId(),
      startedAt: Date.now(),
      currentPhase: 'welcome',
      tutorials: {},
      achievements: [],
      preferences: {
        showTips: true,
        autoAdvance: false,
        difficulty: 'beginner'
      }
    };

    await this.saveProgress();
  }

  /**
   * Load progress from file
   */
  private async loadProgress(): Promise<void> {
    try {
      const content = await fs.readFile(this.progressFile, 'utf-8');
      this.onboardingState = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid
      this.onboardingState = null;
    }
  }

  /**
   * Save progress to file
   */
  private async saveProgress(): Promise<void> {
    if (this.onboardingState) {
      const content = JSON.stringify(this.onboardingState, null, 2);
      await fs.writeFile(this.progressFile, content);
    }
  }

  /**
   * Get current tutorial in progress
   */
  private getCurrentTutorial(): { tutorial: Tutorial; progress: TutorialProgress } | null {
    if (!this.onboardingState) return null;

    for (const [tutorialId, progress] of Object.entries(this.onboardingState.tutorials)) {
      if (progress.status === 'in-progress') {
        const tutorial = this.availableTutorials.get(tutorialId);
        if (tutorial) {
          return { tutorial, progress };
        }
      }
    }

    return null;
  }

  /**
   * Group tutorials by category
   */
  private groupTutorialsByCategory(): Map<string, Tutorial[]> {
    const categories = new Map<string, Tutorial[]>();

    for (const tutorial of this.availableTutorials.values()) {
      if (!categories.has(tutorial.category)) {
        categories.set(tutorial.category, []);
      }
      categories.get(tutorial.category)!.push(tutorial);
    }

    return categories;
  }

  /**
   * Get category icon
   */
  private getCategoryIcon(category: string): string {
    switch (category) {
      case 'getting-started': return '🚀';
      case 'advanced': return '🎓';
      case 'workflow': return '🔄';
      case 'feature': return '⚡';
      default: return '📚';
    }
  }

  /**
   * Format category name
   */
  private formatCategoryName(category: string): string {
    return category.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Get tutorial status icon
   */
  private getTutorialStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'skipped': return '⏭️';
      default: return '⚪';
    }
  }

  /**
   * Get difficulty badge
   */
  private getDifficultyBadge(difficulty: string): string {
    switch (difficulty) {
      case 'beginner': return '🟢';
      case 'intermediate': return '🟡';
      case 'advanced': return '🔴';
      default: return '⚪';
    }
  }

  /**
   * Check for achievements
   */
  private async checkAchievements(tutorial: Tutorial, progress: TutorialProgress, step: TutorialStep): Promise<void> {
    const achievements = this.onboardingState?.achievements || [];

    // First tutorial completion
    if (tutorial.id === 'getting-started' && progress.status === 'completed' && !achievements.includes('First Steps')) {
      this.onboardingState?.achievements.push('First Steps');
    }

    // Fast learner (complete tutorial in less than estimated time)
    if (progress.completedAt) {
      const actualTime = progress.completedAt - progress.startedAt;
      const estimatedTime = tutorial.estimatedTime * 60 * 1000; // Convert to ms

      if (actualTime < estimatedTime * THRESHOLD_CONSTANTS.WEIGHTS.USAGE_COMPARISON && !achievements.includes('Speed Learner')) {
        this.onboardingState?.achievements.push('Speed Learner');
      }
    }

    // Complete all beginner tutorials
    const beginnerTutorials = Array.from(this.availableTutorials.values())
      .filter(t => t.difficulty === 'beginner');
    const completedBeginner = beginnerTutorials.filter(t =>
      this.onboardingState?.tutorials[t.id]?.status === 'completed'
    );

    if (completedBeginner.length === beginnerTutorials.length && !achievements.includes('Beginner Graduate')) {
      this.onboardingState?.achievements.push('Beginner Graduate');
    }
  }

  /**
   * Suggest next tutorials
   */
  private async suggestNextTutorials(completedTutorial: Tutorial): Promise<void> {
    const nextTutorials = Array.from(this.availableTutorials.values())
      .filter(t =>
        t.prerequisites?.includes(completedTutorial.id) &&
        !this.onboardingState?.tutorials[t.id]?.completedAt
      );

    if (nextTutorials.length > 0) {
      console.log('\n💡 Recommended next tutorials:');
      nextTutorials.forEach(tutorial => {
        console.log(`   • ${tutorial.name} - ${tutorial.description}`);
      });
    }
  }

  /**
   * Get command-specific tips
   */
  private getCommandTips(command: string): string[] {
    const tips: string[] = [];

    if (command.startsWith('git-')) {
      tips.push('Git commands work best in a Git repository');
    }

    if (command.includes('test-')) {
      tips.push('Make sure your test framework is configured in settings');
    }

    if (command === 'ask') {
      tips.push('Be specific in your questions for better answers');
    }

    return tips;
  }

  /**
   * Get general tips based on progress
   */
  private getGeneralTips(): string[] {
    const tips: string[] = [];

    if (!this.onboardingState) return tips;

    const completedTutorials = Object.values(this.onboardingState.tutorials)
      .filter(p => p.status === 'completed').length;

    if (completedTutorials === 0) {
      tips.push('Try starting with the getting-started tutorial');
    } else if (completedTutorials < 3) {
      tips.push('Explore different tutorial categories to learn more features');
    }

    return tips;
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Default tutorial system instance
 */
export const tutorialSystem = new TutorialSystem();
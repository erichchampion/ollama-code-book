/**
 * Natural Language Router
 *
 * Routes user requests between command execution, task planning, and conversation
 * based on intent analysis and context.
 */

import { logger } from '../utils/logger.js';
import { UserIntent, IntentAnalyzer, AnalysisContext } from '../ai/intent-analyzer.js';
import { EnhancedIntentAnalyzer } from '../ai/enhanced-intent-analyzer.js';
import { ConversationManager, ConversationTurn } from '../ai/conversation-manager.js';
import { commandRegistry, executeCommand } from '../commands/index.js';
import { TaskPlanner, Task } from '../ai/task-planner.js';
import { ProjectContext } from '../ai/context.js';
import { EnhancedFastPathRouter, FastPathResult } from './enhanced-fast-path-router.js';
import { FAST_PATH_CONFIG_DEFAULTS } from '../constants/streaming.js';
import { globalContainer } from '../core/container.js';
import { AICacheManager } from '../optimization/ai-cache.js';
import { FileOperationClassifier } from './file-operation-classifier.js';
import { FileOperationIntent, FileOperationContext } from './file-operation-types.js';
import { FILE_OPERATION_CONSTANTS } from '../constants/file-operations.js';
import { DELAY_CONSTANTS } from '../config/constants.js';

export interface RoutingResult {
  type: 'command' | 'task_plan' | 'conversation' | 'clarification' | 'tool' | 'file_operation';
  action: string;
  data: any;
  requiresConfirmation: boolean;
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  enhancedContext?: any; // Enhanced context from AdvancedContextManager
  fileOperation?: FileOperationIntent; // Phase 2.2: File operation classification
}

export interface RoutingContext {
  projectContext?: ProjectContext;
  conversationManager: ConversationManager;
  workingDirectory: string;
  userPreferences: {
    autoApprove: boolean;
    confirmHighRisk: boolean;
    preferredApproach: 'conservative' | 'balanced' | 'aggressive';
  };
  enhancedContext?: any; // Enhanced context from AdvancedContextManager
}

export interface NLRouterConfig {
  commandConfidenceThreshold?: number;
  taskConfidenceThreshold?: number;
  healthCheckInterval?: number;
  patterns?: {
    gitStatus?: string[];
    gitCommit?: string[];
    gitBranch?: string[];
  };
}

export interface ClarificationRequest {
  questions: string[];
  options?: Array<{
    label: string;
    value: string;
    description: string;
  }>;
  context: string;
  required: boolean;
}

export class NaturalLanguageRouter {
  private intentAnalyzer: IntentAnalyzer | EnhancedIntentAnalyzer;
  private taskPlanner?: TaskPlanner;
  private commandConfidenceThreshold: number;
  private taskConfidenceThreshold: number;
  private healthCheckInterval: number;
  private config: NLRouterConfig;
  private enhancedFastPathRouter: EnhancedFastPathRouter;
  private cacheManager: AICacheManager | false | null = null;
  private fileOperationClassifier?: FileOperationClassifier; // Phase 2.2: File operation classification

  constructor(
    intentAnalyzer: IntentAnalyzer | EnhancedIntentAnalyzer,
    taskPlanner?: TaskPlanner,
    config: NLRouterConfig = {}
  ) {
    this.intentAnalyzer = intentAnalyzer;
    this.taskPlanner = taskPlanner;
    this.config = config;

    // Set configurable thresholds with defaults
    this.commandConfidenceThreshold = config.commandConfidenceThreshold ?? FILE_OPERATION_CONSTANTS.COMMAND_CONFIDENCE_THRESHOLD;
    this.taskConfidenceThreshold = config.taskConfidenceThreshold ?? FILE_OPERATION_CONSTANTS.TASK_CONFIDENCE_THRESHOLD;
    this.healthCheckInterval = config.healthCheckInterval ?? 2000;

    // Initialize enhanced fast-path router
    this.enhancedFastPathRouter = new EnhancedFastPathRouter({
      ...FAST_PATH_CONFIG_DEFAULTS,
      fuzzyThreshold: FILE_OPERATION_CONSTANTS.FUZZY_THRESHOLD
    });

    // Initialize cache manager lazily
    this.cacheManager = null;
  }

  private async ensureCacheManager(): Promise<void> {
    if (this.cacheManager !== null) {
      return; // Already initialized or failed to initialize
    }

    try {
      // Try to get cache manager from DI container
      if (globalContainer.has('aiCacheManager')) {
        this.cacheManager = await globalContainer.resolve('aiCacheManager') as any;
        logger.debug('AI cache manager initialized for router');
      } else {
        this.cacheManager = false; // Mark as unavailable
      }
    } catch (error) {
      logger.debug('AI cache manager not available:', error);
      this.cacheManager = false; // Mark as unavailable
    }
  }

  /**
   * Route user input to appropriate handler
   */
  async route(input: string, context: RoutingContext): Promise<RoutingResult> {
    const startTime = performance.now();

    try {
      logger.debug('Routing user input', { input: input.substring(0, 100) });

      // Ensure cache manager is initialized and check cache first for repeated queries
      await this.ensureCacheManager();
      if (this.cacheManager !== null && this.cacheManager !== false) {
        const cacheContext = {
          workingDirectory: context.workingDirectory,
          projectPath: context.workingDirectory,
          hasEnhancedContext: !!context.enhancedContext
        };

        const cachedResponse = await this.cacheManager.getCachedResponse(
          input,
          cacheContext,
          'router'
        );

        if (cachedResponse) {
          logger.info('Cache hit for routing query', { input: input.substring(0, 50) });
          try {
            const cachedResult = JSON.parse(cachedResponse) as RoutingResult;
            // Add enhanced context if available
            if (context.enhancedContext) {
              cachedResult.enhancedContext = context.enhancedContext;
            }
            return cachedResult;
          } catch (error) {
            logger.warn('Failed to parse cached routing result:', error);
          }
        }
      }

      // Enhanced fast-path: Use comprehensive pattern matching first
      const enhancedFastPathResult = await this.enhancedFastPathRouter.checkFastPath(input);
      if (enhancedFastPathResult) {
        logger.info('Enhanced fast-path match found - bypassing AI analysis', {
          command: enhancedFastPathResult.commandName,
          method: enhancedFastPathResult.method,
          confidence: enhancedFastPathResult.confidence
        });

        const fastPathRoutingResult = {
          type: 'command' as const,
          action: enhancedFastPathResult.commandName,
          data: {
            commandName: enhancedFastPathResult.commandName,
            args: enhancedFastPathResult.args,
            intent: this.createSimpleIntent(input, enhancedFastPathResult.commandName, enhancedFastPathResult.confidence)
          },
          requiresConfirmation: false,
          estimatedTime: 2, // Very fast execution
          riskLevel: 'low' as const
        };

        // Cache fast-path results too (with timeout protection)
        if (this.cacheManager !== null && this.cacheManager !== false) {
          try {
            const cacheContext = {
              workingDirectory: context.workingDirectory,
              projectPath: context.workingDirectory,
              hasEnhancedContext: !!context.enhancedContext
            };

            // Add timeout to prevent hanging on cache operations
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Cache operation timeout')), DELAY_CONSTANTS.CACHE_TIMEOUT_DELAY);
            });

            await Promise.race([
              this.cacheManager.cacheResponse(
                input,
                JSON.stringify(fastPathRoutingResult),
                cacheContext,
                'router'
              ),
              timeoutPromise
            ]);
          } catch (error) {
            logger.debug('Cache operation failed or timed out:', error);
            // Continue without caching - don't fail the entire request
          }
        }

        return fastPathRoutingResult;
      }

      // Fallback to original fast-path for backward compatibility
      const fastCommandCheck = this.checkFastCommandMapping(input);
      logger.debug('Fallback fast command check result:', { input: input.substring(0, 50), fastCommandCheck });
      if (fastCommandCheck) {
        logger.info('Fallback fast command mapping found', { command: fastCommandCheck.commandName });
        return {
          type: 'command',
          action: fastCommandCheck.commandName,
          data: {
            commandName: fastCommandCheck.commandName,
            args: fastCommandCheck.args,
            intent: this.createSimpleIntent(input, fastCommandCheck.commandName, 0.8)
          },
          requiresConfirmation: false,
          estimatedTime: 5,
          riskLevel: 'low'
        };
      }

      // Build analysis context
      const analysisContext: AnalysisContext = {
        conversationHistory: this.getConversationHistory(context.conversationManager),
        projectContext: context.projectContext,
        workingDirectory: context.workingDirectory,
        recentFiles: await this.getRecentFiles(context.workingDirectory),
        lastIntent: this.getLastIntent(context.conversationManager)
      };

      // Analyze intent
      const intent = await this.intentAnalyzer.analyze(input, analysisContext);

      // Record conversation turn
      const turn = await context.conversationManager.addTurn(
        input,
        intent,
        '', // Response will be filled later
        []  // Actions will be added later
      );

      // Route based on intent and confidence
      const routingResult = await this.determineRoute(intent, context, turn);

      // Cache the routing result for repeated queries
      if (this.cacheManager !== null && this.cacheManager !== false && routingResult.type !== 'clarification') {
        const cacheContext = {
          workingDirectory: context.workingDirectory,
          projectPath: context.workingDirectory,
          hasEnhancedContext: !!context.enhancedContext
        };

        // Don't cache the enhanced context itself, just the routing result
        const resultToCache = { ...routingResult };
        delete resultToCache.enhancedContext;

        await this.cacheManager.cacheResponse(
          input,
          JSON.stringify(resultToCache),
          cacheContext,
          'router'
        );

        logger.debug('Cached routing result for query', { input: input.substring(0, 50) });
      }

      const duration = performance.now() - startTime;
      logger.debug('Routing completed', {
        duration: `${duration.toFixed(2)}ms`,
        type: routingResult.type,
        action: routingResult.action
      });

      return routingResult;

    } catch (error) {
      logger.error('Routing failed:', error);
      throw error;
    }
  }

  /**
   * Handle clarification requests
   */
  async handleClarification(
    originalInput: string,
    clarificationResponse: string,
    context: RoutingContext
  ): Promise<RoutingResult> {
    // Combine original input with clarification
    const combinedInput = `${originalInput} ${clarificationResponse}`;

    // Re-route with additional context
    return this.route(combinedInput, context);
  }

  /**
   * Generate clarification request for ambiguous input
   */
  generateClarificationRequest(intent: UserIntent): ClarificationRequest {
    const questions: string[] = [];
    const options: Array<{ label: string; value: string; description: string }> = [];

    // Add suggested clarifications from intent analysis
    questions.push(...intent.suggestedClarifications);

    // Add specific clarification questions based on intent type
    if (intent.type === 'task_request' && intent.entities.files.length === 0) {
      questions.push('Which files or components should I work with?');

      // Add file options if we have project context
      // This would be populated from project context
      options.push(
        { label: 'Current file', value: 'current', description: 'Work with the currently open file' },
        { label: 'New file', value: 'new', description: 'Create a new file' },
        { label: 'Specify path', value: 'specify', description: 'Let me specify the exact file path' }
      );
    }

    if (intent.type === 'task_request' && intent.complexity === 'complex') {
      questions.push('Would you like me to break this down into smaller steps?');
      options.push(
        { label: 'Yes, step by step', value: 'breakdown', description: 'Break into manageable steps' },
        { label: 'No, do it all at once', value: 'all', description: 'Complete the entire task' }
      );
    }

    if (intent.riskLevel === 'high') {
      questions.push('This operation has potential risks. How should I proceed?');
      options.push(
        { label: 'Proceed with caution', value: 'cautious', description: 'Create backups and validate each step' },
        { label: 'Show me the plan first', value: 'plan', description: 'Let me review before execution' },
        { label: 'Cancel', value: 'cancel', description: 'Don\'t perform this operation' }
      );
    }

    return {
      questions,
      options: options.length > 0 ? options : undefined,
      context: `Intent: ${intent.type}, Action: ${intent.action}, Complexity: ${intent.complexity}`,
      required: intent.requiresClarification
    };
  }

  /**
   * Check if user input maps to an existing command
   */
  async checkCommandMapping(intent: UserIntent): Promise<{ isCommand: boolean; commandName?: string; args?: string[] }> {
    // Direct command mapping
    const directCommand = this.mapDirectCommand(intent);
    if (directCommand) {
      return { isCommand: true, ...directCommand };
    }

    // AI-assisted command mapping for natural language
    const aiCommand = await this.mapCommandWithAI(intent);
    if (aiCommand && aiCommand.confidence > this.commandConfidenceThreshold) {
      return { isCommand: true, commandName: aiCommand.command, args: aiCommand.args };
    }

    return { isCommand: false };
  }

  /**
   * Determine the appropriate route for the given intent
   */
  private async determineRoute(
    intent: UserIntent,
    context: RoutingContext,
    turn: ConversationTurn
  ): Promise<RoutingResult> {
    // Handle clarification needs first
    if (intent.requiresClarification) {
      return {
        type: 'clarification',
        action: 'request_clarification',
        data: this.generateClarificationRequest(intent),
        requiresConfirmation: false,
        estimatedTime: 1,
        riskLevel: 'low'
      };
    }

    // Phase 2.2: Check for file operations first
    const fileOperation = await this.classifyFileOperation(intent, context);
    if (fileOperation) {
      return {
        type: 'file_operation',
        action: `file_${fileOperation.operation}`,
        data: {
          intent,
          fileOperation
        },
        requiresConfirmation: fileOperation.requiresApproval,
        estimatedTime: this.estimateFileOperationTime(fileOperation),
        riskLevel: this.mapSafetyToRisk(fileOperation.safetyLevel),
        fileOperation
      };
    }

    // Check for direct command mapping
    const commandMapping = await this.checkCommandMapping(intent);
    if (commandMapping.isCommand) {
      // For pattern-based command mappings, override confidence requirements
      const isPatternBasedCommand = this.isPatternBasedCommand(intent.action.toLowerCase());

      if (isPatternBasedCommand || intent.confidence > this.commandConfidenceThreshold) {
        return {
          type: 'command',
          action: commandMapping.commandName!,
          data: {
            commandName: commandMapping.commandName,
            args: commandMapping.args || [],
            intent
          },
          requiresConfirmation: this.shouldRequireConfirmation(intent, context),
          estimatedTime: intent.estimatedDuration,
          riskLevel: intent.riskLevel
        };
      }
    }

    // Route to task planning for complex tasks
    if (intent.type === 'task_request' && this.taskPlanner) {
      if (intent.confidence > this.taskConfidenceThreshold) {
        return {
          type: 'task_plan',
          action: 'create_and_execute_plan',
          data: {
            intent,
            context: context.projectContext
          },
          requiresConfirmation: this.shouldRequireConfirmation(intent, context),
          estimatedTime: intent.estimatedDuration,
          riskLevel: intent.riskLevel
        };
      }
    }

    // Default to conversation for questions and unclear intents
    return {
      type: 'conversation',
      action: 'respond',
      data: {
        intent,
        contextualPrompt: context.conversationManager.generateContextualPrompt(
          turn.userInput,
          intent
        )
      },
      requiresConfirmation: false,
      estimatedTime: 2,
      riskLevel: 'low'
    };
  }

  /**
   * Map direct commands from natural language
   */
  private mapDirectCommand(intent: UserIntent): { commandName: string; args: string[] } | null {
    const action = intent.action.toLowerCase();

    // Direct action mappings (only for actions that don't need context checking)
    const actionMappings: Record<string, string> = {
      'list': 'list-models',
      'show': 'list-models',
      'search': 'search',
      'find': 'search',
      'help': 'help',
      'run': 'run',
      'execute': 'run',
      'test': 'run',
      'build': 'run',
      'status': 'git-status',
      // Phase 2.1: File operation commands (when context is clear)
      'generate': 'generate-code',
      'create': 'create-file'
    };

    // Skip direct mapping for 'explain' - it needs context checking for files
    const commandName = actionMappings[action];
    if (commandName && commandRegistry.exists(commandName)) {
      return {
        commandName,
        args: this.extractCommandArgs(intent, commandName)
      };
    }

    // Git-specific pattern-based mappings
    if (this.isGitStatusRequest(action)) {
      return { commandName: 'git-status', args: [] };
    }

    if (this.isGitCommitRequest(action)) {
      return { commandName: 'git-commit', args: [] };
    }

    if (this.isGitBranchRequest(action)) {
      return { commandName: 'git-branch', args: [] };
    }

    // General pattern-based mappings
    if (action.includes('model') && (action.includes('list') || action.includes('show'))) {
      return { commandName: 'list-models', args: [] };
    }

    if (action.includes('pull') && action.includes('model')) {
      return {
        commandName: 'pull-model',
        args: intent.entities.technologies.length > 0 ? [intent.entities.technologies[0]] : []
      };
    }

    if (action.includes('explain') && intent.entities.files.length > 0) {
      return {
        commandName: 'explain',
        args: [intent.entities.files[0]]
      };
    }

    return null;
  }

  /**
   * Check if the action is a git status request
   */
  private isGitStatusRequest(action: string): boolean {
    const defaultStatusPatterns = [
      'check status',
      'check the status',
      'git status',
      'repo status',
      'repository status',
      'status of repo',
      'status of repository',
      'status of this repo',
      'status of the repo',
      'show status',
      'show git status',
      'show me status',
      'show me git status',
      'show me the status',
      'show me the git status',
      'display status',
      'display git status',
      'display the status',
      'get status',
      'get git status',
      'get the status',
      'what is the status',
      'what is the git status',
      'current status',
      'current git status'
    ];

    const statusPatterns = this.config.patterns?.gitStatus ?? defaultStatusPatterns;
    return statusPatterns.some(pattern => action.includes(pattern));
  }

  /**
   * Check if the action is a git commit request
   */
  private isGitCommitRequest(action: string): boolean {
    const defaultCommitPatterns = [
      'git commit',
      'create commit',
      'make commit',
      'commit changes',
      'commit the changes'
    ];

    const commitPatterns = this.config.patterns?.gitCommit ?? defaultCommitPatterns;
    return commitPatterns.some(pattern => action.includes(pattern));
  }

  /**
   * Check if the action is a git branch request
   */
  private isGitBranchRequest(action: string): boolean {
    const defaultBranchPatterns = [
      'git branch',
      'list branch',
      'show branch',
      'branch info',
      'current branch'
    ];

    const branchPatterns = this.config.patterns?.gitBranch ?? defaultBranchPatterns;
    return branchPatterns.some(pattern => action.includes(pattern));
  }

  /**
   * Check if the action is detected by pattern-based command mapping
   */
  private isPatternBasedCommand(action: string): boolean {
    return this.isGitStatusRequest(action) ||
           this.isGitCommitRequest(action) ||
           this.isGitBranchRequest(action);
  }

  /**
   * Fast command mapping that bypasses AI analysis for obvious commands
   */
  private checkFastCommandMapping(input: string): { commandName: string; args: string[] } | null {
    const action = input.toLowerCase();

    // Git commands (most common)
    if (this.isGitStatusRequest(action)) {
      return { commandName: 'git-status', args: [] };
    }

    if (this.isGitCommitRequest(action)) {
      return { commandName: 'git-commit', args: [] };
    }

    if (this.isGitBranchRequest(action)) {
      return { commandName: 'git-branch', args: [] };
    }

    // Simple direct mappings
    const simpleMappings: Record<string, string> = {
      'help': 'help',
      'list models': 'list-models',
      'show models': 'list-models'
    };

    for (const [pattern, command] of Object.entries(simpleMappings)) {
      if (action.includes(pattern) && commandRegistry.exists(command)) {
        return { commandName: command, args: [] };
      }
    }

    return null;
  }

  /**
   * Create a simple intent object for fast-path commands
   */
  private createSimpleIntent(input: string, commandName: string, confidence: number = 1.0): UserIntent {
    return {
      type: 'command',
      action: input,
      entities: {
        files: [],
        directories: [],
        functions: [],
        classes: [],
        technologies: [],
        concepts: [],
        variables: []
      },
      confidence, // Use provided confidence score
      complexity: 'simple',
      multiStep: false,
      riskLevel: 'low',
      requiresClarification: false,
      suggestedClarifications: [],
      estimatedDuration: confidence > 0.9 ? 2 : 5, // Higher confidence = faster execution
      context: {
        projectAware: false,
        fileSpecific: false,
        followUp: false,
        references: []
      }
    };
  }

  /**
   * Use AI to map natural language to commands
   */
  private async mapCommandWithAI(intent: UserIntent): Promise<{ command: string; args: string[]; confidence: number } | null> {
    try {
      const availableCommands = commandRegistry.list().map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        args: cmd.args?.map(arg => arg.name) || []
      }));

      const prompt = `
Map this natural language request to a specific command:

Request: "${intent.action}"
Intent type: ${intent.type}
Entities: ${JSON.stringify(intent.entities)}

Available commands:
${availableCommands.map(cmd => `- ${cmd.name}: ${cmd.description}`).join('\n')}

If this request maps to a command, respond with JSON:
{
  "command": "command-name",
  "args": ["arg1", "arg2"],
  "confidence": 0.0-1.0
}

If no command matches, respond with:
{
  "command": null,
  "confidence": 0.0
}`;

      // This would use the AI client to analyze the mapping
      // For now, return null to indicate no AI mapping
      return null;

    } catch (error) {
      logger.debug('AI command mapping failed:', error);
      return null;
    }
  }

  /**
   * Extract command arguments from intent
   */
  private extractCommandArgs(intent: UserIntent, commandName: string): string[] {
    const args: string[] = [];

    switch (commandName) {
      case 'ask':
        // For ask command, extract the question from the original action
        // Handle both "ask question" and "ask 'quoted question'" formats
        const askMatch = intent.action.match(/^ask\s+(.+)$/i);
        if (askMatch) {
          let question = askMatch[1].trim();
          // Remove surrounding quotes if present
          if ((question.startsWith('"') && question.endsWith('"')) ||
              (question.startsWith("'") && question.endsWith("'"))) {
            question = question.slice(1, -1);
          }
          args.push(question);
        }
        break;

      case 'explain':
        if (intent.entities.files.length > 0) {
          args.push(intent.entities.files[0]);
        }
        break;

      case 'search':
        if (intent.entities.concepts.length > 0) {
          args.push(intent.entities.concepts[0]);
        } else if (intent.entities.functions.length > 0) {
          args.push(intent.entities.functions[0]);
        }
        break;

      case 'run':
        // Extract the command to run from the action
        const runMatch = intent.action.match(/run\s+(.+)/);
        if (runMatch) {
          args.push(runMatch[1]);
        }
        break;

      case 'pull-model':
        if (intent.entities.technologies.length > 0) {
          args.push(intent.entities.technologies[0]);
        }
        break;
    }

    return args;
  }

  /**
   * Determine if confirmation is required
   */
  private shouldRequireConfirmation(intent: UserIntent, context: RoutingContext): boolean {
    // Always require confirmation for high-risk operations
    if (intent.riskLevel === 'high' && context.userPreferences.confirmHighRisk) {
      return true;
    }

    // Require confirmation for complex multi-step tasks
    if (intent.multiStep && intent.complexity === 'complex') {
      return true;
    }

    // Require confirmation for destructive operations
    const destructiveActions = ['delete', 'remove', 'drop', 'truncate', 'reset'];
    if (destructiveActions.some(action => intent.action.toLowerCase().includes(action))) {
      return true;
    }

    // Check user preferences
    if (!context.userPreferences.autoApprove && intent.type === 'task_request') {
      return true;
    }

    return false;
  }

  /**
   * Helper methods
   */
  private getConversationHistory(conversationManager: ConversationManager): string[] {
    return conversationManager.getRecentHistory(5).map(turn => turn.userInput);
  }

  private async getRecentFiles(workingDirectory: string): Promise<string[]> {
    // This would scan for recently modified files
    // For now, return empty array
    return [];
  }

  private getLastIntent(conversationManager: ConversationManager): UserIntent | undefined {
    const recentHistory = conversationManager.getRecentHistory(1);
    return recentHistory.length > 0 ? recentHistory[0].intent : undefined;
  }

  /**
   * Phase 2.2: Classify file operation intent
   */
  private async classifyFileOperation(intent: UserIntent, context: RoutingContext): Promise<FileOperationIntent | null> {
    try {
      // Initialize file operation classifier lazily
      if (!this.fileOperationClassifier) {
        this.fileOperationClassifier = new FileOperationClassifier(context.workingDirectory);
        await this.fileOperationClassifier.initialize();
      }

      // Build file operation context
      const fileContext: FileOperationContext = {
        workingDirectory: context.workingDirectory,
        projectFiles: context.projectContext?.allFiles.map(f => f.path) || [],
        recentFiles: await this.getRecentFiles(context.workingDirectory),
        gitStatus: undefined, // TODO: Add git status if available
        dependencies: undefined // TODO: Add dependency graph if available
      };

      // Classify the file operation
      return await this.fileOperationClassifier.classifyFileOperation(intent, fileContext);

    } catch (error) {
      logger.error('Failed to classify file operation:', error);
      return null;
    }
  }

  /**
   * Phase 2.2: Estimate file operation time
   */
  private estimateFileOperationTime(fileOperation: FileOperationIntent): number {
    const baseTime = {
      'create': 5,
      'edit': 10,
      'delete': 2,
      'move': 5,
      'copy': 5,
      'refactor': 20,
      'generate': 15,
      'test': 10
    };

    const operationTime = baseTime[fileOperation.operation] || 10;
    const fileCountMultiplier = Math.min(fileOperation.targets.length * 0.5, 3);
    const complexityMultiplier = fileOperation.safetyLevel === 'dangerous' ? 2 : 1;

    return Math.ceil(operationTime * (1 + fileCountMultiplier) * complexityMultiplier);
  }

  /**
   * Phase 2.2: Map safety level to risk level
   */
  private mapSafetyToRisk(safetyLevel: FileOperationIntent['safetyLevel']): RoutingResult['riskLevel'] {
    switch (safetyLevel) {
      case 'safe':
      case 'cautious':
        return 'low';
      case 'risky':
        return 'medium';
      case 'dangerous':
        return 'high';
      default:
        return 'medium';
    }
  }
}
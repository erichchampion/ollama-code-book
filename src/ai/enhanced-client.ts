/**
 * Enhanced AI Client
 *
 * Integrates all phases into a comprehensive AI-powered development assistant
 * with natural language understanding, autonomous code modification, and
 * intelligent task planning and execution.
 */

import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';
import { OllamaClient } from './ollama-client.js';
import { ProjectContext } from './context.js';
import { EnhancedIntentAnalyzer } from './enhanced-intent-analyzer.js';
import { UserIntent } from './intent-analyzer.js';
import { ConversationManager } from './conversation-manager.js';
import { TaskPlanner } from './task-planner.js';
import { TaskPlan } from './task-planner.js';
import { AutonomousModifier } from '../core/autonomous-modifier.js';
import { NaturalLanguageRouter, NLRouterConfig } from '../routing/nl-router.js';
import { StreamingProcessor, ProcessingUpdate } from '../streaming/streaming-processor.js';
import { STREAMING_CONFIG_DEFAULTS } from '../constants/streaming.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../constants/messages.js';
import { API_REQUEST_TIMEOUT, DEFAULT_TEMPERATURE } from '../constants.js';
import { AsyncMutex } from '../utils/async-mutex.js';
import { UserIntentFactory } from '../utils/user-intent-factory.js';

export interface EnhancedClientConfig {
  model: string;
  baseUrl?: string;
  contextWindow?: number;
  temperature?: number;
  enableTaskPlanning: boolean;
  enableConversationHistory: boolean;
  enableContextAwareness: boolean;
  maxConversationHistory: number;
  autoSaveConversations: boolean;
  enableAutonomousModification?: boolean;
  executionPreferences?: {
    parallelism: number;
    riskTolerance: 'conservative' | 'balanced' | 'aggressive';
    autoExecute: boolean;
  };
}

export interface ProcessingResult {
  success: boolean;
  intent: UserIntent;
  response: string;
  executionPlan?: TaskPlan;
  conversationId: string;
  processingTime: number;
  error?: string;
  streamingUpdates?: ProcessingUpdate[];
}

export interface SessionState {
  conversationId: string;
  activeTaskPlan?: TaskPlan;
  pendingTasks: string[];
  executionHistory: ExecutionSummary[];
  preferences: UserPreferences;
}

export interface ExecutionSummary {
  planId: string;
  title: string;
  completedAt: Date;
  totalTasks: number;
  successfulTasks: number;
  duration: number;
}

export interface UserPreferences {
  verbosity: 'minimal' | 'standard' | 'detailed';
  autoConfirm: boolean;
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  preferredExecutionMode: 'manual' | 'assisted' | 'autonomous';
}

export class EnhancedClient {
  private ollamaClient: OllamaClient;
  private projectContext: ProjectContext;
  private intentAnalyzer: EnhancedIntentAnalyzer;
  private conversationManager: ConversationManager;
  private taskPlanner: TaskPlanner;
  private autonomousModifier: AutonomousModifier;
  private nlRouter: NaturalLanguageRouter;
  private streamingProcessor: StreamingProcessor;
  private config: EnhancedClientConfig;
  private sessionState: SessionState;
  private sessionMetrics: Map<string, number> = new Map();
  private responseCache: Map<string, string> = new Map();
  private sessionStateMutex: AsyncMutex = new AsyncMutex();

  constructor(
    ollamaClient: any,
    projectContext?: ProjectContext,
    config?: Partial<EnhancedClientConfig>
  ) {
    this.ollamaClient = ollamaClient;
    this.projectContext = projectContext || new ProjectContext(process.cwd());
    this.config = {
      model: 'qwen2.5-coder:latest',
      temperature: DEFAULT_TEMPERATURE,
      enableTaskPlanning: true,
      enableConversationHistory: true,
      enableContextAwareness: true,
      maxConversationHistory: 50,
      autoSaveConversations: true,
      ...config
    };

    // Initialize core components
    // Use the provided ollamaClient
    this.intentAnalyzer = new EnhancedIntentAnalyzer(this.ollamaClient);
    this.conversationManager = new ConversationManager();
    this.autonomousModifier = new AutonomousModifier();
    this.taskPlanner = new TaskPlanner(this.ollamaClient, this.projectContext);

    // Configure NL Router with optimized settings for fast command detection
    const nlRouterConfig = {
      commandConfidenceThreshold: 0.7, // Slightly lower threshold for better detection
      taskConfidenceThreshold: 0.6,
      healthCheckInterval: 2000
    };
    this.nlRouter = new NaturalLanguageRouter(this.intentAnalyzer, this.taskPlanner, nlRouterConfig);

    // Initialize streaming processor with default settings
    this.streamingProcessor = new StreamingProcessor(STREAMING_CONFIG_DEFAULTS);

    // Initialize session state
    this.sessionState = {
      conversationId: this.conversationManager.getConversationContext().sessionId,
      pendingTasks: [],
      executionHistory: [],
      preferences: this.getDefaultPreferences()
    };
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Enhanced AI Client');

      // Initialize project context if available
      if (this.projectContext) {
        await this.projectContext.initialize();
      }

      // Test Ollama connection
      await this.ollamaClient.testConnection();

      logger.info('Enhanced AI Client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Enhanced AI Client:', error);
      throw error;
    }
  }

  /**
   * Process a user message with streaming updates
   */
  async *processMessageStreaming(message: string): AsyncIterableIterator<ProcessingUpdate> {
    const streamingUpdates: ProcessingUpdate[] = [];

    // Create streaming operation that wraps the entire processing
    const streamingIterator = this.streamingProcessor.processWithStreaming(
      async () => {
        const result = await this.processMessage(message);
        return result;
      },
      `process_${Date.now()}`
    );

    // Yield updates and collect them for final result
    for await (const update of streamingIterator) {
      streamingUpdates.push(update);
      yield update;
    }
  }

  /**
   * Process a user message with full enhanced capabilities
   */
  async processMessage(message: string): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      logger.info('Processing user message', { message: message.substring(0, 100) });

      // Check for pending task plan confirmation before analyzing intent
      // Use mutex to prevent race conditions on session state
      return await this.sessionStateMutex.lock(async () => {
        if (this.sessionState.activeTaskPlan) {
          const confirmationResponse = this.checkForTaskPlanConfirmation(message);
          if (confirmationResponse.isConfirmation) {
            return await this.handleTaskPlanConfirmation(confirmationResponse, startTime);
          }
        }

        return await this.processMessageInternal(message, startTime);
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Message processing failed:', error);

      const errorResponse = `I encountered an error while processing your request: ${normalizeError(error).message}`;

      return {
        success: false,
        intent: UserIntentFactory.createErrorResponse(),
        response: errorResponse,
        conversationId: this.sessionState.conversationId,
        processingTime,
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Internal message processing logic
   */
  private async processMessageInternal(message: string, startTime: number): Promise<ProcessingResult> {
    try {

      // Add to conversation
      // User message is handled when adding turn

      // Analyze intent with built-in timeout protection
      const intent = await this.intentAnalyzer.analyze(message, {
        projectContext: this.projectContext,
        conversationHistory: this.conversationManager.getRecentHistory(5).map(turn => turn.userInput),
        workingDirectory: process.cwd(),
        recentFiles: this.projectContext?.allFiles.slice(0, 20).map(f => f.path) || []
      });

      logger.debug('Intent analyzed', {
        type: intent.type,
        action: intent.action,
        complexity: intent.complexity,
        riskLevel: intent.riskLevel
      });

      // Route to appropriate handler
      const routingContext = {
        projectContext: this.projectContext,
        conversationManager: this.conversationManager,
        workingDirectory: process.cwd(),
        userPreferences: {
          autoApprove: this.config.executionPreferences?.autoExecute || false,
          confirmHighRisk: this.config.executionPreferences?.riskTolerance !== 'aggressive',
          preferredApproach: this.config.executionPreferences?.riskTolerance || 'balanced'
        }
      };
      const routingResult = await this.nlRouter.route(message, routingContext);

      let response: string;
      let executionPlan: TaskPlan | undefined;

      if (routingResult.type === 'command') {
        // Execute the identified command directly
        response = await this.executeCommand(routingResult);
      } else if (routingResult.type === 'task_plan' && this.config.enableTaskPlanning) {
        // Create and potentially execute plan
        const planResult = await this.createAndExecutePlan(intent);
        response = planResult.response;
        executionPlan = planResult.executionPlan;
      } else {
        // Handle as conversation or simple command
        response = await this.generateResponse(intent, routingResult);
      }

      // Add response to conversation
      // Assistant message is handled when adding turn

      const processingTime = Date.now() - startTime;

      // Track metrics
      const currentProcessingTime = this.sessionMetrics.get('avgProcessingTime') || 0;
      const messageCount = this.sessionMetrics.get('messageCount') || 0;
      this.sessionMetrics.set('messageCount', messageCount + 1);
      this.sessionMetrics.set('avgProcessingTime',
        (currentProcessingTime * messageCount + processingTime) / (messageCount + 1)
      );

      // Cache response if it's useful for future reference
      const cacheKey = `${intent.type}_${intent.action}`;
      this.responseCache.set(cacheKey, response);

      logger.info('Message processing completed', {
        processingTime,
        intentType: intent.type,
        hasTaskPlan: !!executionPlan
      });

      return {
        success: true,
        intent,
        response,
        executionPlan,
        conversationId: this.sessionState.conversationId,
        processingTime
      };

    } catch (error) {
      logger.error('Message processing failed:', error);

      const errorResponse = `I encountered an error while processing your request: ${
        normalizeError(error).message
      }`;

      return {
        success: false,
        intent: {
          type: 'conversation',
          action: message,
          entities: { files: [], directories: [], functions: [], classes: [], technologies: [], concepts: [], variables: [] },
          confidence: 0,
          complexity: 'simple',
          multiStep: false,
          riskLevel: 'low',
          requiresClarification: false,
          suggestedClarifications: [],
          estimatedDuration: 0,
          context: {
            projectAware: false,
            fileSpecific: false,
            followUp: false,
            references: []
          }
        },
        response: errorResponse,
        conversationId: this.sessionState.conversationId,
        processingTime: Date.now() - startTime,
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Create and potentially execute a plan for the intent
   */
  private async createAndExecutePlan(intent: UserIntent): Promise<{
    response: string;
    executionPlan?: TaskPlan;
    }> {
    try {
      // Create execution plan
      const executionPlan = await this.taskPlanner.createPlan(intent.action, {
        projectRoot: this.projectContext?.root || process.cwd(),
        availableTools: [],
        projectLanguages: this.projectContext?.projectLanguages || [],
        codebaseSize: 'medium',
        userExperience: 'intermediate',
        qualityRequirements: 'production'
      });

      // Store as active plan
      this.sessionState.activeTaskPlan = executionPlan;

      // Determine if we should auto-execute
      const shouldAutoExecute = this.shouldAutoExecute(executionPlan, intent);

      if (shouldAutoExecute) {
        // TODO: Implement direct task execution without execution engine
        // For now, return the plan with a note about auto-execution
        const response = `${this.generatePlanProposal(executionPlan)}\n\n⚠️ Auto-execution is temporarily disabled due to architectural changes.`;

        return {
          response,
          executionPlan
        };
      } else {
        // Return plan for user approval
        const response = this.generatePlanProposal(executionPlan);

        return {
          response,
          executionPlan
        };
      }

    } catch (error) {
      logger.error('Plan creation/execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a command with streaming updates
   */
  async *executeCommandStreaming(routingResult: any): AsyncIterableIterator<ProcessingUpdate> {
    const { commandName, args } = routingResult.data;

    // Use streaming processor for command execution
    const streamingIterator = this.streamingProcessor.processCommand(
      commandName,
      args,
      async (cmd: string, cmdArgs: string[]) => {
        return await this.executeCommandInternal(cmd, cmdArgs);
      }
    );

    for await (const update of streamingIterator) {
      yield update;
    }
  }

  /**
   * Execute a command directly
   */
  private async executeCommand(routingResult: any): Promise<string> {
    const { commandName, args } = routingResult.data;
    return await this.executeCommandInternal(commandName, args);
  }

  /**
   * Internal command execution logic
   */
  private async executeCommandInternal(commandName: string, args: string[]): Promise<string> {
    try {
      // Import the executeCommand function and console capture utility
      const { executeCommand } = await import('../commands/index.js');
      const { captureConsoleOutput } = await import('../utils/console-capture.js');

      // Execute the command with console output capture
      const { result, output, errorOutput, duration } = await captureConsoleOutput(
        async () => {
          await executeCommand(commandName, args);
          return `Command '${commandName}' executed successfully`;
        },
        {
          includeStderr: true,
          maxOutputSize: 512 * 1024, // 512KB limit for command output
          timeout: API_REQUEST_TIMEOUT
        }
      );

      // Combine stdout and stderr if there's error output
      let fullOutput = output;
      if (errorOutput.trim()) {
        fullOutput += '\n' + errorOutput;
      }

      // Return captured output or success message
      if (fullOutput.trim()) {
        return fullOutput;
      } else {
        return `${SUCCESS_MESSAGES.COMMAND_SUCCESS_PREFIX}${result}`;
      }

    } catch (error: any) {
      logger.error('Command execution failed:', error);

      // Check if this is a captured error with output
      if (error.output || error.errorOutput) {
        let errorMessage = ERROR_MESSAGES.COMMAND_EXECUTION_FAILED;
        if (error.output) {
          errorMessage += `\n\nOutput:\n${error.output}`;
        }
        if (error.errorOutput) {
          errorMessage += `\n\nErrors:\n${error.errorOutput}`;
        }
        if (error.error instanceof Error) {
          errorMessage += `\n\nError: ${error.error.message}`;
        }
        return errorMessage;
      }

      return `❌ Failed to execute command: ${normalizeError(error).message}`;
    }
  }

  /**
   * Generate a response with streaming updates
   */
  async *generateResponseStreaming(intent: UserIntent, routingResult: any): AsyncIterableIterator<ProcessingUpdate> {
    // Use streaming processor for AI analysis
    const streamingIterator = this.streamingProcessor.processAIAnalysis(
      intent.action,
      async (message: string) => {
        return await this.generateResponseInternal(intent, routingResult);
      }
    );

    for await (const update of streamingIterator) {
      yield update;
    }
  }

  /**
   * Generate a response based on intent and routing result
   */
  private async generateResponse(intent: UserIntent, routingResult: any): Promise<string> {
    return await this.generateResponseInternal(intent, routingResult);
  }

  /**
   * Internal response generation logic
   */
  private async generateResponseInternal(intent: UserIntent, routingResult: any): Promise<string> {
    const context = this.conversationManager.generateContextualPrompt(
      this.sessionState.conversationId,
      intent
    );

    // Use the conversation context to generate an appropriate response
    const response = await this.ollamaClient.complete(
      `Based on the user's intent (${intent.type}: ${intent.action}), please provide a helpful response.

      Context: ${context}

      User's message: ${intent.action}`,
      {
        temperature: DEFAULT_TEMPERATURE
      }
    );

    return response.message.content;
  }

  /**
   * Determine if plan should be auto-executed
   */
  private shouldAutoExecute(plan: TaskPlan, intent: UserIntent): boolean {
    if (!this.config.executionPreferences?.autoExecute) {
      return false;
    }

    // Auto-execute only low-risk plans in aggressive mode
    // Consider plans with fewer tasks and shorter duration as low-risk
    const isLowRisk = plan.tasks.length <= 3 && plan.estimatedDuration <= 5;
    if (this.sessionState.preferences.riskTolerance === 'aggressive' && isLowRisk) {
      return true;
    }

    // Auto-execute simple analysis tasks
    if (intent.type === 'question' && intent.complexity === 'simple') {
      return true;
    }

    return false;
  }

  /**
   * Generate plan proposal for user approval
   */
  private generatePlanProposal(plan: TaskPlan): string {
    const taskSummary = plan.tasks.map(t => `- ${t.title}`).join('\n');
    const estimatedDuration = plan.estimatedDuration;

    // Assess risk based on task count and duration
    const riskLevel = plan.tasks.length > 5 || plan.estimatedDuration > 15 ? 'high' :
                     plan.tasks.length > 3 || plan.estimatedDuration > 5 ? 'medium' : 'low';

    return `I've created an execution plan for your request:

**${plan.title}**

**Tasks (${plan.tasks.length}):**
${taskSummary}

**Estimated Duration:** ${estimatedDuration} minutes
**Risk Level:** ${riskLevel}

Would you like me to execute this plan? You can:
- Say "yes" or "execute" to run the plan
- Say "modify" to adjust the plan
- Say "no" or "cancel" to abort

You can also ask for more details about any specific task or phase.`;
  }


  /**
   * Execute pending plan (when user approves)
   */
  async executePendingPlan(): Promise<ProcessingResult> {
    if (!this.sessionState.activeTaskPlan) {
      throw new Error('No pending execution plan');
    }

    const startTime = Date.now();
    const plan = this.sessionState.activeTaskPlan;

    try {
      // TODO: Implement direct task execution without execution engine
      // For now, return a response indicating the plan is ready for execution
      const response = `Plan "${plan.title}" is ready for execution.\n\n⚠️ Auto-execution is temporarily disabled due to architectural changes.`;

      return {
        success: true,
        intent: {
          type: 'command',
          action: 'execute plan',
          entities: { files: [], directories: [], functions: [], classes: [], technologies: [], concepts: [], variables: [] },
          confidence: 1.0,
          complexity: 'moderate',
          multiStep: true,
          riskLevel: plan.metadata.complexity === 'expert' ? 'high' : plan.metadata.complexity === 'complex' ? 'medium' : 'low',
          requiresClarification: false,
          suggestedClarifications: [],
          estimatedDuration: plan.estimatedDuration,
          context: {
            projectAware: true,
            fileSpecific: false,
            followUp: false,
            references: []
          }
        },
        response,
        executionPlan: plan,
        conversationId: this.sessionState.conversationId,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Plan execution failed:', error);
      throw error;
    }
  }

  /**
   * Get current session state
   */
  getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    Object.assign(this.sessionState.preferences, preferences);

    // TODO: Update execution preferences when execution engine is re-implemented
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): any[] {
    return this.conversationManager.getRecentHistory();
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): ExecutionSummary[] {
    return [...this.sessionState.executionHistory];
  }

  /**
   * Start new conversation
   */
  startNewConversation(): string {
    this.sessionState.conversationId = this.conversationManager.getConversationContext().sessionId;
    this.sessionState.activeTaskPlan = undefined;
    return this.sessionState.conversationId;
  }

  /**
   * Get project context
   */
  getProjectContext(): ProjectContext {
    return this.projectContext;
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      verbosity: 'standard',
      autoConfirm: false,
      riskTolerance: 'balanced',
      preferredExecutionMode: 'assisted'
    };
  }

  /**
   * Complete text using the underlying AI client
   */
  async complete(prompt: string, options: any = {}): Promise<any> {
    return await this.ollamaClient.complete(prompt, options);
  }

  /**
   * Check if client is ready
   */
  async isReady(): Promise<boolean> {
    try {
      await this.ollamaClient.complete('test');
      return true;
    } catch {
      return false;
    }
  }


  /**
   * Get streaming processor status
   */
  getStreamingStatus(): {
    activeStreams: number;
    averageProgress: number;
    oldestStreamAge: number;
  } {
    const stats = this.streamingProcessor.getStreamStats();
    return {
      activeStreams: stats.activeCount,
      averageProgress: stats.averageProgress,
      oldestStreamAge: stats.oldestStreamAge
    };
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    ready: boolean;
    activeExecutions: number;
    conversationId: string;
    executionHistory: number;
    streaming: {
      activeStreams: number;
      averageProgress: number;
    };
  } {
    const streamingStats = this.getStreamingStatus();
    return {
      ready: true, // Simplified for now
      activeExecutions: 0, // TODO: Re-implement when execution engine is added back
      conversationId: this.sessionState.conversationId,
      executionHistory: this.sessionState.executionHistory.length,
      streaming: {
        activeStreams: streamingStats.activeStreams,
        averageProgress: streamingStats.averageProgress
      }
    };
  }

  /**
   * Check if user message is a confirmation for pending task plan
   */
  private checkForTaskPlanConfirmation(message: string): {
    isConfirmation: boolean;
    action: 'execute' | 'cancel' | 'modify' | 'details' | 'none';
  } {
    const lowerMessage = message.toLowerCase().trim();

    // Execution confirmations
    if (['yes', 'y', 'execute', 'run', 'start', 'proceed', 'go', 'ok', 'okay'].includes(lowerMessage)) {
      return { isConfirmation: true, action: 'execute' };
    }

    // Cancellation confirmations
    if (['no', 'n', 'cancel', 'abort', 'stop', 'skip', 'quit'].includes(lowerMessage)) {
      return { isConfirmation: true, action: 'cancel' };
    }

    // Modification requests
    if (['modify', 'edit', 'change', 'adjust', 'update'].includes(lowerMessage)) {
      return { isConfirmation: true, action: 'modify' };
    }

    // Details requests
    if (['details', 'info', 'explain', 'describe', 'more'].includes(lowerMessage)) {
      return { isConfirmation: true, action: 'details' };
    }

    return { isConfirmation: false, action: 'none' };
  }

  /**
   * Handle task plan confirmation response
   */
  private async handleTaskPlanConfirmation(
    confirmation: { isConfirmation: boolean; action: 'execute' | 'cancel' | 'modify' | 'details' | 'none' },
    startTime: number
  ): Promise<ProcessingResult> {
    const plan = this.sessionState.activeTaskPlan!;

    switch (confirmation.action) {
      case 'execute':
        logger.info('Executing confirmed task plan', { planId: plan.id, taskCount: plan.tasks.length });

        try {
          const result = await this.executePendingPlan();
          return result;
        } catch (error) {
          const errorMessage = `Failed to execute task plan: ${normalizeError(error).message}`;
          logger.error('Task plan execution failed', error);

          return {
            success: false,
            intent: UserIntentFactory.createTaskExecution('execute_plan'),
            response: errorMessage,
            conversationId: this.sessionState.conversationId,
            processingTime: Date.now() - startTime,
            error: errorMessage
          };
        } finally {
          // Always clear the active task plan regardless of success or failure
          this.sessionState.activeTaskPlan = undefined;
        }

      case 'cancel':
        logger.info('Task plan cancelled by user', { planId: plan.id });
        this.sessionState.activeTaskPlan = undefined;

        return {
          success: true,
          intent: {
            type: 'task_execution',
            action: 'cancel_plan',
            entities: { files: [], directories: [], functions: [], classes: [], technologies: [], concepts: [], variables: [] },
            confidence: 1.0,
            complexity: 'simple',
            multiStep: false,
            riskLevel: 'low',
            requiresClarification: false,
            suggestedClarifications: [],
            estimatedDuration: 0,
            context: {
              projectAware: false,
              fileSpecific: false,
              followUp: true,
              references: []
            }
          },
          response: 'Task plan cancelled. How else can I help you?',
          conversationId: this.sessionState.conversationId,
          processingTime: Date.now() - startTime
        };

      case 'modify':
        logger.info('Task plan modification requested', { planId: plan.id });

        return {
          success: true,
          intent: {
            type: 'task_execution',
            action: 'modify_plan',
            entities: { files: [], directories: [], functions: [], classes: [], technologies: [], concepts: [], variables: [] },
            confidence: 1.0,
            complexity: 'simple',
            multiStep: false,
            riskLevel: 'low',
            requiresClarification: true,
            suggestedClarifications: ['Which tasks would you like to modify?', 'What changes do you want to make?'],
            estimatedDuration: 0,
            context: {
              projectAware: false,
              fileSpecific: false,
              followUp: true,
              references: []
            }
          },
          response: 'What modifications would you like to make to the task plan? Please specify which tasks to change or what adjustments you need.',
          conversationId: this.sessionState.conversationId,
          processingTime: Date.now() - startTime
        };

      case 'details':
        logger.info('Task plan details requested', { planId: plan.id });

        const detailsResponse = this.generateTaskPlanDetails(plan);

        return {
          success: true,
          intent: {
            type: 'task_execution',
            action: 'show_details',
            entities: { files: [], directories: [], functions: [], classes: [], technologies: [], concepts: [], variables: [] },
            confidence: 1.0,
            complexity: 'simple',
            multiStep: false,
            riskLevel: 'low',
            requiresClarification: false,
            suggestedClarifications: [],
            estimatedDuration: 0,
            context: {
              projectAware: true,
              fileSpecific: false,
              followUp: true,
              references: []
            }
          },
          response: detailsResponse,
          conversationId: this.sessionState.conversationId,
          processingTime: Date.now() - startTime
        };

      default:
        return {
          success: false,
          intent: {
            type: 'conversation',
            action: 'unknown_confirmation',
            entities: { files: [], directories: [], functions: [], classes: [], technologies: [], concepts: [], variables: [] },
            confidence: 0,
            complexity: 'simple',
            multiStep: false,
            riskLevel: 'low',
            requiresClarification: true,
            suggestedClarifications: ['Do you want to execute the plan?', 'Should I cancel the plan?'],
            estimatedDuration: 0,
            context: {
              projectAware: false,
              fileSpecific: false,
              followUp: true,
              references: []
            }
          },
          response: 'I need clarification about the task plan. Would you like me to execute it, cancel it, or modify it?',
          conversationId: this.sessionState.conversationId,
          processingTime: Date.now() - startTime
        };
    }
  }

  /**
   * Generate detailed description of task plan
   */
  private generateTaskPlanDetails(plan: TaskPlan): string {
    let details = `**Task Plan Details: ${plan.title}**\n\n`;
    details += `**Description:** ${plan.description}\n`;
    details += `**Estimated Duration:** ${plan.estimatedDuration} minutes\n`;
    details += `**Risk Level:** ${plan.riskLevel}\n`;
    details += `**Task Count:** ${plan.tasks.length}\n\n`;

    details += `**Tasks:**\n`;
    plan.tasks.forEach((task, index) => {
      details += `${index + 1}. **${task.title}**\n`;
      details += `   - ${task.description}\n`;
      details += `   - Estimated time: ${task.estimatedDuration} minutes\n`;
      if (task.dependencies && task.dependencies.length > 0) {
        details += `   - Dependencies: ${task.dependencies.join(', ')}\n`;
      }
      details += `\n`;
    });

    details += `\nWould you like to proceed with this plan? Say "yes" to execute, "no" to cancel, or "modify" to make changes.`;

    return details;
  }
}

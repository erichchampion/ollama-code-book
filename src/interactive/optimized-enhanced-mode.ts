/**
 * Optimized Enhanced Interactive Mode
 *
 * Implements lazy loading, streaming initialization, and progressive enhancement
 * to resolve complex request handling issues and improve startup performance.
 */

import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';
import { formatErrorForDisplay } from '../errors/formatter.js';
import { ComponentFactory, getComponentFactory, ComponentType } from './component-factory.js';
import { EnhancedComponentFactory, getEnhancedComponentFactory } from './enhanced-component-factory.js';
import { TaskPlanner } from '../ai/task-planner.js';
import { IComponentFactory, isEnhancedFactory } from './component-factory-interface.js';
import { StreamingInitializer } from './streaming-initializer.js';
import { CompatibleTerminal, createAutoTerminal } from '../terminal/compatibility-layer.js';
import { ComponentStatusTracker, getStatusTracker } from './component-status.js';
import { PerformanceMonitor, getPerformanceMonitor } from './performance-monitor.js';
import { NaturalLanguageRouter } from '../routing/nl-router.js';
import { ConversationManager } from '../ai/conversation-manager.js';
import { registerCommands } from '../commands/register.js';
import { initializeToolSystem } from '../tools/index.js';
import { initAI } from '../ai/index.js';
import { EXIT_COMMANDS } from '../constants.js';
import { TIMEOUT_CONFIG, getComponentTimeout } from './timeout-config.js';
import type { SessionState } from './types.js';

export interface OptimizedEnhancedModeOptions {
  autoApprove?: boolean;
  confirmHighRisk?: boolean;
  verbosity?: 'concise' | 'detailed' | 'explanatory';
  preferredApproach?: 'conservative' | 'balanced' | 'aggressive';
  enableBackgroundLoading?: boolean;
  performanceMonitoring?: boolean;
  fallbackMode?: boolean;
  enableStreamingTools?: boolean;
}

interface PromptResult {
  input: string;
}

/**
 * Maximum conversation history size to prevent memory leaks.
 * Maintains recent context while bounding memory usage.
 * In long-running sessions, older messages are removed (FIFO).
 */
const MAX_CONVERSATION_HISTORY_SIZE = 100;

export class OptimizedEnhancedMode {
  private componentFactory: IComponentFactory;
  private streamingInitializer?: StreamingInitializer;
  private statusTracker: ComponentStatusTracker;
  private performanceMonitor: PerformanceMonitor;
  private terminal?: CompatibleTerminal;
  private nlRouter?: NaturalLanguageRouter;
  private conversationManager?: ConversationManager;
  private running = false;
  /** Session state: ready (for input), processing, or ended. */
  private sessionState: SessionState = 'ready';
  private options: Required<OptimizedEnhancedModeOptions>;
  private initializationResult?: any;
  private conversationHistory: any[] = []; // Track conversation for streaming tools (bounded)
  private streamingOrchestrator?: any; // Reuse orchestrator to maintain state
  private conversationInitialized = false; // Track if conversation has been initialized

  // Cached components for quick access
  private componentsReady = new Set<ComponentType>();
  private pendingTaskPlan?: any;
  private pendingRoutingResult?: any;

  // E2E test mode: Persistent readline interface for handling EOF in pipe mode
  private e2eReadline: any = null;
  private e2eLinePromise: Promise<string> | null = null;
  private e2eLineResolve: ((value: string) => void) | null = null;
  private e2eStdinClosed: boolean = false;

  constructor(options: OptimizedEnhancedModeOptions = {}) {
    this.options = {
      autoApprove: options.autoApprove ?? false,
      confirmHighRisk: options.confirmHighRisk ?? true,
      verbosity: options.verbosity ?? 'detailed',
      preferredApproach: options.preferredApproach ?? 'balanced',
      enableBackgroundLoading: options.enableBackgroundLoading ?? true,
      performanceMonitoring: options.performanceMonitoring ?? true,
      fallbackMode: options.fallbackMode ?? false,
      enableStreamingTools: options.enableStreamingTools ?? true
    };

    // Initialize core systems with LEGACY factory to avoid circular dependency
    // TODO: Fix EnhancedComponentFactory's circular dependency issue
    logger.debug('Forcing use of legacy ComponentFactory to avoid circular dependency');
    this.componentFactory = getComponentFactory();
    this.statusTracker = getStatusTracker();
    this.performanceMonitor = getPerformanceMonitor();

    if (this.options.performanceMonitoring) {
      this.performanceMonitor.startMonitoring();
    }

    this.setupEventHandlers(); // Restored with legacy factory
  }

  /** Get current session state (for tests). */
  getSessionState(): SessionState {
    return this.sessionState;
  }

  /**
   * Start the optimized enhanced interactive mode
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting optimized enhanced interactive mode');

      // RESTORE FULL FUNCTIONALITY - now that circular dependency is understood
      logger.debug('Starting full initialization with circular dependency safeguards');

      // Phase 1: Fast essential initialization
      await this.fastInitialization();

      // Phase 2: Streaming initialization
      await this.streamingInitialization();
      logger.debug('Streaming initialization completed successfully');

      // Phase 3: Main interactive loop (restored with legacy factory)
      logger.debug('About to call runOptimizedMainLoop...');
      await this.runOptimizedMainLoop();
      logger.debug('runOptimizedMainLoop completed successfully');


    } catch (error) {
      logger.error('Optimized enhanced interactive mode failed:', error);

      if (this.options.fallbackMode) {
        await this.startFallbackMode(error);
      } else {
        throw error;
      }
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Check if a component is ready for use
   */
  isComponentReady(component: ComponentType): boolean {
    return this.componentsReady.has(component);
  }

  /**
   * Get system status information
   */
  getSystemStatus(): {
    ready: boolean;
    components: string[];
    performance: string;
    capabilities: string[];
  } {
    const readyComponents = Array.from(this.componentsReady);
    const systemHealth = this.statusTracker.getSystemHealth();
    const performanceReport = this.performanceMonitor.getPerformanceReport('summary');

    const capabilities = [];
    if (this.isComponentReady('aiClient')) capabilities.push('AI assistance');
    if (this.isComponentReady('intentAnalyzer')) capabilities.push('Intent understanding');
    if (this.isComponentReady('projectContext')) capabilities.push('Project analysis');
    if (this.isComponentReady('taskPlanner')) capabilities.push('Task planning');
    if (this.isComponentReady('advancedContextManager')) capabilities.push('Advanced context');

    return {
      ready: systemHealth.overallStatus !== 'critical',
      components: readyComponents,
      performance: performanceReport,
      capabilities
    };
  }

  // Private methods

  /**
   * Fast initialization of absolutely essential components
   */
  private async fastInitialization(): Promise<void> {
    logger.debug('Starting fast initialization phase');

    // Create terminal with compatibility layer
    this.terminal = await createAutoTerminal();

    // Initialize tool system and commands (lightweight)
    initializeToolSystem();
    registerCommands();

    // Track performance
    this.performanceMonitor.startComponentTiming('aiClient');

    logger.debug('Fast initialization completed');
  }

  /**
   * Streaming initialization with progressive enhancement
   */
  private async streamingInitialization(): Promise<void> {
    if (!this.terminal) {
      throw new Error('Terminal not initialized');
    }

    logger.debug('Starting streaming initialization phase');

    // Create and start streaming initializer
    this.streamingInitializer = new StreamingInitializer(this.componentFactory);

    // Initialize with progress feedback
    this.initializationResult = await this.streamingInitializer.initializeStreaming();

    if (this.initializationResult.essentialComponentsReady) {
      // FUNDAMENTAL FIX: Skip markEssentialComponentsReady to avoid potential issues
      // this.markEssentialComponentsReady();
      logger.debug('Skipping markEssentialComponentsReady (not essential for basic functionality)');

      // FUNDAMENTAL FIX: Re-enable displayWelcomeMessage with simplified implementation
      this.displayWelcomeMessage();
    } else {
      throw new Error('Essential components failed to initialize');
    }

    logger.debug('Streaming initialization completed');
  }

  /**
   * Main interactive loop with optimized component access
   */
  private async runOptimizedMainLoop(): Promise<void> {
    logger.debug('runOptimizedMainLoop called');
    this.running = true;
    logger.debug('Running flag set to true');

    // Get essential components (restored with legacy factory)
    logger.debug('Getting conversationManager component...');
    this.conversationManager = await this.componentFactory.getComponent('conversationManager');
    logger.debug('ConversationManager obtained successfully');

    // FUNDAMENTAL FIX: Check if the issue is after getting conversationManager
    logger.debug('About to start main interactive loop...');

    // Defer naturalLanguageRouter creation until first use to avoid circular dependency
    logger.debug('Deferring naturalLanguageRouter creation until first use');

    logger.debug('Starting main while loop...');
    while (this.running) {
      try {
        logger.debug('Loop iteration started, getting user input...');
        // Get user input
        const userInput = await this.getUserInput();

        if (!userInput || userInput.trim() === '') {
          continue;
        }

        // Handle special commands
        if (this.handleSpecialCommands(userInput)) {
          continue;
        }

        // Check if we have a pending task plan
        if (this.pendingTaskPlan && this.pendingRoutingResult) {
          await this.handlePendingTaskPlanResponse(userInput);
          continue;
        }

        // Process the input with streaming tools or traditional routing
        if (this.options.enableStreamingTools) {
          await this.processWithStreamingTools(userInput);
        } else {
          await this.processUserInputOptimized(userInput);
        }

        // Add a small delay to allow terminal to stabilize after streaming output
        await new Promise(resolve => setTimeout(resolve, TIMEOUT_CONFIG.INITIALIZATION_DELAY));

      } catch (error) {
        await this.handleError(error);
      }
    }

    if (process.env.OLLAMA_CODE_E2E_TEST === 'true') {
      process.stderr?.write(`[E2E] Main loop exited (running=${this.running}, sessionState=${this.sessionState})\n`);
    }
    this.terminal?.info('Goodbye! 👋');

    // Exit the process to ensure cleanup
    process.exit(0);
  }

  /**
   * Process user input with streaming tools (if enabled)
   */
  private async processWithStreamingTools(userInput: string): Promise<void> {
    if (!this.terminal) {
      throw new Error('Terminal not available');
    }

    try {
      // Import streaming orchestrator and constants
      const { StreamingToolOrchestrator } = await import('../tools/streaming-orchestrator.js');
      const { initializeToolSystem, getToolRegistry } = await import('../tools/index.js');
      const { TOOL_ORCHESTRATION_DEFAULTS } = await import('../constants/tool-orchestration.js');

      // Initialize tool system if needed
      await initializeToolSystem();
      const toolRegistry = getToolRegistry();

      // Get Ollama client
      const aiClient = await this.componentFactory.getComponent<any>('aiClient', {
        timeout: this.getComponentTimeout('aiClient')
      });

      // In E2E mode, write orchestrator output to process.stdout/stderr so tests capture it
      const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
      const terminalAdapter = {
        write: (text: string) => {
          if (e2eMode) {
            process.stdout.write(text);
          } else if (this.terminal && typeof this.terminal.write === 'function') {
            this.terminal.write(text);
          } else {
            process.stdout.write(text);
          }
        },
        info: (text: string) => {
          if (e2eMode) {
            process.stdout.write(text);
          } else if (this.terminal && typeof this.terminal.info === 'function') {
            this.terminal.info(text);
          } else {
            console.log(`INFO: ${text}`);
          }
        },
        success: (text: string) => {
          if (e2eMode) {
            process.stdout.write(text);
          } else if (this.terminal && typeof this.terminal.success === 'function') {
            this.terminal.success(text);
          } else {
            console.log(`SUCCESS: ${text}`);
          }
        },
        warn: (text: string) => {
          if (e2eMode) {
            process.stderr.write(text);
          } else if (this.terminal && typeof this.terminal.warn === 'function') {
            this.terminal.warn(text);
          } else {
            console.warn(`WARN: ${text}`);
          }
        },
        error: (text: string) => {
          if (e2eMode) {
            process.stderr.write(text);
          } else if (this.terminal && typeof this.terminal.error === 'function') {
            this.terminal.error(text);
          } else {
            console.error(`ERROR: ${text}`);
          }
        }
      };

      // Create or reuse orchestrator to maintain conversation state
      if (!this.streamingOrchestrator) {
        this.streamingOrchestrator = new StreamingToolOrchestrator(
          aiClient.client || aiClient, // Get underlying Ollama client
          toolRegistry,
          terminalAdapter,
          {
            enableToolCalling: TOOL_ORCHESTRATION_DEFAULTS.ENABLE_TOOL_CALLING,
            maxToolsPerRequest: TOOL_ORCHESTRATION_DEFAULTS.MAX_TOOLS_PER_REQUEST,
            toolTimeout: TOOL_ORCHESTRATION_DEFAULTS.TOOL_TIMEOUT
          }
        );
      }

      // Add user message to conversation history (with bounds checking)
      this.addToConversationHistory({ role: 'user', content: userInput });

      this.sessionState = 'processing';
      const turnResult = await this.streamingOrchestrator.executeWithStreamingAndHistory(
        this.conversationHistory,
        {
          projectRoot: process.cwd(),
          workingDirectory: process.cwd(),
          environment: process.env as Record<string, string>,
          timeout: TOOL_ORCHESTRATION_DEFAULTS.TOOL_CONTEXT_TIMEOUT
        }
      );

      if (turnResult.turnComplete) {
        this.sessionState = 'ready';
        
        // CRITICAL FIX: Ensure output ends with newline before showing prompt
        // This fixes the issue where prompt doesn't appear after command output
        // In E2E mode (pipes), isTTY is false, but we still need to write the newline
        const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
        
        // In E2E mode, explicitly show the prompt to signal ready state
        // This is critical for test detection
        if (e2eMode) {
          // CRITICAL: Write newline + prompt together in a single write operation
          // This ensures they appear in the same chunk for test detection
          // The newline before the prompt ensures it's on a fresh line
          process.stdout.write('\n> ');
          
          // CRITICAL: Force a flush by writing an empty string after a small delay
          // This helps ensure the prompt is visible to the test helper even in buffered pipe mode
          await new Promise(resolve => setTimeout(resolve, 50));
          try {
            // Write empty string to potentially trigger flush
            process.stdout.write('');
          } catch (e) {
            // Ignore errors
          }
          
          // Additional delay to allow stdout buffer to flush
          // In pipe mode (E2E), stdout is fully buffered, so we need to wait
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          // TTY mode: ensure newline before prompt
          process.stdout.write('\n');
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else if (turnResult.sessionShouldEnd) {
        if (process.env.OLLAMA_CODE_E2E_TEST === 'true') {
          logger.warn('[E2E] Session ending: orchestrator returned sessionShouldEnd', { reason: turnResult.reason });
          process.stderr?.write(`[E2E] Session ending: ${turnResult.reason ?? 'unknown'}\n`);
        }
        this.sessionState = 'ended';
        this.running = false;
        if (turnResult.reason) {
          this.terminal?.warn(`Session ending: ${turnResult.reason}`);
        }
      }

    } catch (error) {
      logger.error('Streaming tools execution failed:', error);
      this.terminal.error(`Error: ${normalizeError(error).message}`);

      // Fallback to traditional routing
      this.terminal.info('Falling back to traditional processing...');
      await this.processUserInputOptimized(userInput);
      this.sessionState = 'ready';
      
      // CRITICAL FIX: Ensure output ends with newline before showing prompt
      if (process.stdout.isTTY) {
        process.stdout.write('\n');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // In E2E mode, explicitly show the prompt
      const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
      if (e2eMode) {
        process.stdout.write('> ');
      }
    }
  }

  /**
   * Process user input with smart component loading
   */
  private async processUserInputOptimized(userInput: string): Promise<void> {
    if (!this.terminal) {
      throw new Error('Terminal not available');
    }

    // Try to get natural language router now that circular dependencies are resolved
    if (!this.nlRouter) {
      try {
        logger.debug('Attempting to load naturalLanguageRouter now that circular dependencies are resolved');
        this.nlRouter = await this.componentFactory.getComponent('naturalLanguageRouter', {
          timeout: TIMEOUT_CONFIG.NATURAL_LANGUAGE_ROUTER,
          fallback: () => null
        });
        if (this.nlRouter) {
          logger.debug('Natural language router loaded successfully');
        } else {
          logger.debug('Natural language router not available, using direct AI assistance mode');
        }
      } catch (error) {
        logger.warn('Failed to load natural language router, using direct AI assistance:', error);
      }
    }

    // Analyze what components we need for this request
    const requiredComponents = this.analyzeRequiredComponents(userInput);

    // Load required components that aren't ready yet
    const loadingPromises = requiredComponents
      .filter(component => !this.isComponentReady(component))
      .map(async (component) => {
        this.terminal?.info(`Loading ${component} for your request...`);
        this.performanceMonitor.startComponentTiming(component);

        try {
          await this.componentFactory.getComponent(component, {
            timeout: this.getComponentTimeout(component),
            fallback: () => this.createFallbackComponent(component)
          });

          this.performanceMonitor.endComponentTiming(component, true);
          this.componentsReady.add(component);
        } catch (error) {
          this.performanceMonitor.endComponentTiming(component, false);
          logger.warn(`Failed to load ${component}:`, error);
          // Continue with available components
        }
      });

    // Wait for required components (with timeout)
    if (loadingPromises.length > 0) {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Component loading timeout')), TIMEOUT_CONFIG.COMPONENT_LOADING);
      });

      try {
        await Promise.race([
          Promise.all(loadingPromises),
          timeout
        ]);
      } catch (error) {
        this.terminal.warn('Some components failed to load, using available functionality');
      }
    }

    // Process with natural language router
    try {
      const routingContext = await this.buildRoutingContext(userInput);

      // FUNDAMENTAL FIX: Use simple AI assistance when router is unavailable
      let routingResult;
      if (this.nlRouter) {
        // Add timeout protection to routing
        const routingTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Routing timeout after 15 seconds')), TIMEOUT_CONFIG.ROUTING_TIMEOUT);
        });

        routingResult = await Promise.race([
          this.nlRouter.route(userInput, routingContext),
          routingTimeout
        ]) as any;
      } else {
        // Simple fallback: direct AI assistance without complex routing
        logger.debug('Using simple AI assistance fallback');
        routingResult = await this.handleSimpleAIRequest(userInput);
      }

      await this.handleRoutingResult(routingResult, userInput);
      // Ensure no return value is accidentally displayed

    } catch (error) {
      logger.error('Request processing failed:', error);
      this.terminal.error(`Failed to process request: ${normalizeError(error).message}`);

      // Suggest using simpler commands
      this.terminal.info('Try using simpler commands like:');
      this.terminal.info('  • "help" - Show available commands');
      this.terminal.info('  • "status" - Show system status');
      this.terminal.info('  • Basic AI questions');
    }
  }

  /**
   * Analyze what components are needed for a request
   */
  private analyzeRequiredComponents(input: string): ComponentType[] {
    const components: ComponentType[] = ['aiClient']; // Always needed
    const lowerInput = input.toLowerCase();

    // Pattern-based analysis for component requirements
    if (lowerInput.includes('file') || lowerInput.includes('project') || lowerInput.includes('code')) {
      components.push('projectContext');
    }

    if (lowerInput.includes('plan') || lowerInput.includes('task') || lowerInput.includes('step')) {
      components.push('taskPlanner');
    }

    if (lowerInput.includes('analyze') || lowerInput.includes('understand') || lowerInput.includes('explain')) {
      components.push('advancedContextManager');
    }

    if (lowerInput.includes('complex') || lowerInput.includes('detailed') || lowerInput.includes('comprehensive')) {
      components.push('queryDecompositionEngine');
    }

    // For complex multi-part requests
    if (input.length > 200 || input.split(/[.!?]/).length > 3) {
      components.push('multiStepQueryProcessor');
    }

    return components;
  }

  /**
   * Get appropriate timeout for component type (uses centralized config)
   */
  private getComponentTimeout(component: ComponentType): number {
    return getComponentTimeout(component);
  }

  /**
   * Create fallback component when main component fails
   */
  private createFallbackComponent(component: ComponentType): any {
    logger.warn(`Creating fallback for ${component}`);

    switch (component) {
      case 'projectContext':
        // Return minimal project context
        return {
          root: process.cwd(),
          allFiles: [],
          projectLanguages: [],
          getQuickInfo: () => ({ root: process.cwd(), hasPackageJson: false, hasGit: false, estimatedFileCount: 0 })
        };

      case 'taskPlanner':
        // Return simple task execution
        return {
          planTasks: () => ({ needsApproval: false, plan: { tasks: [], estimatedTime: 0 } }),
          executePlan: () => ({ success: true, message: 'Task completed with basic functionality' })
        };

      case 'advancedContextManager':
        // Return basic context
        return {
          getEnhancedContext: () => ({ semanticMatches: [], relatedCode: [], suggestions: [] })
        };

      default:
        return null;
    }
  }

  /**
   * Build routing context with available components
   */
  private async buildRoutingContext(userInput: string): Promise<any> {
    const context: any = {
      userInput,
      availableComponents: Array.from(this.componentsReady),
      sessionId: Date.now().toString(),
      timestamp: new Date(),
      capabilities: []
    };

    // Add capabilities based on ready components
    if (this.isComponentReady('projectContext')) {
      context.capabilities.push('file-analysis', 'project-context');

      // Add actual project context data
      try {
        const projectContext = await this.componentFactory.getComponent<any>('projectContext', {
          timeout: getComponentTimeout('projectContext')
        });

        if (projectContext && projectContext.allFiles && projectContext.allFiles.length > 0) {
          // Prioritize source code files for the routing context
          const allFiles = projectContext.allFiles;
          const sourceFiles = allFiles.filter((f: any) => {
            const ext = f.path.split('.').pop()?.toLowerCase();
            return ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb'].includes(ext || '');
          });

          context.projectContext = projectContext;
          context.workingDirectory = process.cwd();
          context.recentFiles = sourceFiles.slice(0, 20).map((f: any) => f.path) || [];

          // Add enhanced context if available
          if (this.isComponentReady('advancedContextManager')) {
            try {
              const advancedContextManager = await this.componentFactory.getComponent<any>('advancedContextManager', {
                timeout: getComponentTimeout('advancedContextManager')
              });

              // Get enhanced context for the user input
              const enhancedContext = await advancedContextManager.getEnhancedContext(userInput, {
                includeSemanticMatches: true,
                includeRelatedCode: true,
                maxResults: 10
              });

              context.enhancedContext = enhancedContext;
              context.capabilities.push('semantic-analysis', 'enhanced-context');

              logger.debug(`Added enhanced context with ${enhancedContext.semanticMatches?.length || 0} semantic matches`);
            } catch (error) {
              logger.debug('Failed to get enhanced context:', error);
            }
          }

          logger.debug(`Added ${context.recentFiles.length} source files to routing context`);
        }
      } catch (error) {
        logger.debug('Failed to add project context to routing context:', error);
      }
    }

    if (this.isComponentReady('taskPlanner')) {
      context.capabilities.push('task-planning', 'execution-planning');
    }

    if (this.isComponentReady('advancedContextManager')) {
      context.capabilities.push('advanced-analysis', 'semantic-search');
    }

    // Add conversation manager and user preferences for routing
    context.conversationManager = this.conversationManager;
    context.userPreferences = {
      autoApprove: this.options.autoApprove,
      confirmHighRisk: this.options.confirmHighRisk,
      preferredApproach: this.options.preferredApproach
    };

    return context;
  }

  /**
   * Handle simple AI request without complex routing
   */
  private async handleSimpleAIRequest(userInput: string): Promise<any> {
    logger.debug('Processing simple AI request');

    // Create abort controller for cancellation
    const abortController = new AbortController();
    let interruptHandler: (() => void) | null = null;

    try {
      // Get the basic AI client that should be ready from essential initialization
      const aiClient = await this.componentFactory.getComponent<any>('aiClient', {
        timeout: this.getComponentTimeout('aiClient')
      });

      // Handle Ctrl+C gracefully during streaming
      interruptHandler = () => {
        abortController.abort();
        this.terminal?.warn('\n\n🚫 Request cancelled by user.');
        logger.debug('AI request cancelled by user interrupt');
      };
      process.on('SIGINT', interruptHandler);

      // Simple streaming response without complex planning or routing
      this.terminal?.info('🤖 Thinking...');

      let responseText = '';

      // Create context-enriched prompt (same logic as command-line ask)
      let contextualInput = userInput;
      try {
        const projectContext = await this.componentFactory.getComponent<any>('projectContext', {
          timeout: getComponentTimeout('projectContext')
        });

        if (projectContext && projectContext.allFiles && projectContext.allFiles.length > 0) {
          // Prioritize source code files over config files
          const allFiles = projectContext.allFiles;
          const sourceFiles = allFiles.filter((f: any) => {
            const ext = f.path.split('.').pop()?.toLowerCase();
            return ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb'].includes(ext || '');
          });

          // Include both source files and some config files for context
          const prioritizedFiles = [
            ...sourceFiles.slice(0, 15), // First 15 source files
            ...allFiles.filter((f: any) => f.path.includes('package.json') || f.path.includes('tsconfig.json') || f.path.includes('README')).slice(0, 3) // Key config files
          ];

          const fileList = prioritizedFiles.map((f: any) => f.relativePath || f.path).join(', ');
          const packageInfo = projectContext.packageJson ? `\nPackage: ${projectContext.packageJson.name} (${projectContext.packageJson.description || 'No description'})` : '';
          contextualInput = `Context: This is a ${projectContext.projectLanguages?.join('/')} project with source files: ${fileList}${packageInfo}\n\nQuestion: ${userInput}`;
        }
      } catch (error) {
        // If project context fails, continue with original input
        logger.debug('Failed to get project context for interactive mode:', error);
      }

      // Add timeout protection for the streaming request
      const timeout = TIMEOUT_CONFIG.AI_STREAMING; // Use dedicated streaming timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          abortController.abort();
          reject(new Error(`AI request timeout after ${timeout}ms`));
        }, timeout);
      });

      // Race between streaming completion and timeout
      await Promise.race([
        aiClient.completeStream(contextualInput, {}, (event: any) => {
          if (abortController.signal.aborted) {
            return; // Stop processing events if cancelled
          }
          if (event.message?.content) {
            process.stdout.write(event.message.content);
            responseText += event.message.content;
          }
        }, abortController.signal),
        timeoutPromise
      ]);

      // Check if request was cancelled
      if (abortController.signal.aborted) {
        return {
          type: 'cancelled',
          message: 'Request was cancelled'
        };
      }

      // Add conversation to history if conversation manager is available
      // Note: ConversationManager might not have addMessage method, skip for now
      logger.debug('Simple AI request completed successfully');

      process.stdout.write('\n'); // Add newline after response

      // Return a simple result that handleRoutingResult can process
      return {
        type: 'direct_response',
        response: responseText,
        requiresConfirmation: false
      };

    } catch (error) {
      // Check if this was a cancellation or timeout
      if (abortController.signal.aborted) {
        logger.debug('AI request was cancelled');
        return {
          type: 'cancelled',
          message: 'Request was cancelled'
        };
      }

      logger.error('Simple AI request failed:', error);

      // Provide more specific error messages
      const errorMessage = normalizeError(error).message;
      if (errorMessage.includes('timeout')) {
        this.terminal?.error('⏱️ Request timed out. The AI might be overloaded. Please try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        this.terminal?.error('🌐 Network error. Please check your connection and try again.');
      } else {
        this.terminal?.error('❌ Failed to process your request. Please try again.');
      }

      return {
        type: 'error',
        error: errorMessage
      };
    } finally {
      // Clean up interrupt handler
      if (interruptHandler) {
        process.off('SIGINT', interruptHandler);
      }
    }
  }

  /**
   * Handle routing result with appropriate processing
   */
  private async handleRoutingResult(result: any, userInput: string): Promise<void> {
    if (!this.terminal || !this.conversationManager) {
      return;
    }

    // Handle different result types
    if (!result) {
      logger.warn('Received undefined result in handleRoutingResult');
      return;
    }

    // Debug log the result type
    logger.debug('handleRoutingResult received:', {
      type: result.type,
      action: result.action,
      hasData: !!result.data,
      hasResponse: !!result.response,
      hasEnhancedContext: !!result.enhancedContext
    });

    // Store result for conversation management - simplified for now
    // TODO: Implement proper conversation turn storage based on ConversationManager interface
    try {
      await this.conversationManager.loadConversation();
    } catch (error) {
      logger.debug('Conversation loading failed:', error);
    }

    // Handle different result types
    if (result.type === 'cancelled') {
      // Don't output anything for cancelled requests
      return;
    } else if (result.type === 'error') {
      this.terminal.error(`Error: ${result.error || 'Unknown error occurred'}`);
      return;
    } else if (result.type === 'direct_response') {
      // For direct responses from simple AI requests, the response is already streamed
      // so we don't need to display it again
      return;
    } else if (result.type === 'command') {
      // Handle command execution from fast-path router
      try {
        const args = result.data?.args || [];
        logger.debug(`Executing command: ${result.action} with args:`, args);
        const { executeCommand } = await import('../commands/index.js');
        await executeCommand(result.action, args);
        return;
      } catch (error) {
        this.terminal.error(`Command execution failed: ${normalizeError(error).message}`);
        return;
      }
    } else if (result.type === 'conversation') {
      // Handle conversation/AI response requests
      try {
        logger.debug('Processing conversation response', {
          hasContextualPrompt: !!result.data?.contextualPrompt,
          hasEnhancedContext: !!result.enhancedContext
        });

        // Use the contextual prompt from the routing data
        const prompt = result.data?.contextualPrompt || userInput;

        // Process with AI using enhanced context if available
        const aiResponse = await this.handleSimpleAIRequest(prompt);

        // The response is already streamed in handleSimpleAIRequest, so we're done
        return;
      } catch (error) {
        this.terminal.error(`Conversation processing failed: ${normalizeError(error).message}`);
        return;
      }
    } else if (result.type === 'task_plan') {
      // Handle task planning requests (like creating applications, complex tasks)
      try {
        logger.debug('Processing task plan request');

        // Check if task planner is available
        if (this.isComponentReady('taskPlanner')) {
          const taskPlanner = await this.componentFactory.getComponent<any>('taskPlanner', {
            timeout: getComponentTimeout('taskPlanner')
          });

          // Execute the task plan with the provided context
          await taskPlanner.executePlan(result.data);
          return;
        } else {
          // Fallback to conversation mode if task planner isn't available
          this.terminal.info('Task planner not available, processing as AI conversation...');
          const aiResponse = await this.handleSimpleAIRequest(userInput);
          return;
        }
      } catch (error) {
        this.terminal.error(`Task planning failed: ${normalizeError(error).message}`);
        // Fallback to simple AI assistance
        try {
          this.terminal.info('Falling back to AI assistance...');
          await this.handleSimpleAIRequest(userInput);
        } catch (fallbackError) {
          this.terminal.error(`Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        }
        return;
      }
    } else if (result.type === 'clarification') {
      // Handle clarification requests
      try {
        logger.debug('Processing clarification request');

        if (result.data?.questions && result.data.questions.length > 0) {
          this.terminal.info('I need more information to help you:');
          result.data.questions.forEach((question: string, index: number) => {
            this.terminal!.info(`${index + 1}. ${question}`);
          });

          if (result.data?.options && result.data.options.length > 0) {
            this.terminal.info('\nOptions:');
            result.data.options.forEach((option: any, index: number) => {
              this.terminal!.info(`  ${String.fromCharCode(97 + index)}. ${option.label}: ${option.description}`);
            });
          }

          this.terminal.info('\nPlease provide more details in your next message.');
        } else {
          this.terminal.info('Could you please provide more details about what you want to do?');
        }
        return;
      } catch (error) {
        this.terminal.error(`Clarification processing failed: ${normalizeError(error).message}`);
        return;
      }
    } else if (result.type === 'tool') {
      // Handle tool execution requests
      try {
        logger.debug('Processing tool request');
        this.terminal.info('Tool execution is not yet implemented in interactive mode.');
        this.terminal.info('Falling back to AI assistance...');
        await this.handleSimpleAIRequest(userInput);
        return;
      } catch (error) {
        this.terminal.error(`Tool processing failed: ${normalizeError(error).message}`);
        return;
      }
    } else if (result.type === 'file_operation') {
      // Handle file operation requests (create, edit, delete files)
      try {
        const operation = result.fileOperation?.operation;
        const targetFile = result.fileOperation?.targetFile;

        logger.debug('Processing file operation request', {
          operation,
          targetFile,
          hasDescription: !!result.fileOperation?.description
        });

        // Execute the appropriate file operation command
        const { executeCommand } = await import('../commands/index.js');

        if (operation === 'create') {
          const description = result.fileOperation?.description || userInput;

          // Check if we have a target file path
          if (!targetFile) {
            // No file path specified - need to generate one based on the description
            this.terminal.info('Determining file path and generating code...');

            try {
              // Ask AI to suggest a file path based on the description
              const aiClient = await this.componentFactory.getComponent<any>('aiClient', {
                timeout: this.getComponentTimeout('aiClient')
              });

              const pathPrompt = `Based on this request: "${description}"

Suggest a single, appropriate file path. Consider:
- Component type (React component, class, function, etc.)
- Naming conventions (PascalCase for components, camelCase for utilities, etc.)
- File extension (.jsx, .tsx, .js, .ts, .py, etc.)
- Common directory structures (src/, components/, utils/, etc.)

Reply with ONLY the file path, nothing else. Example: src/components/LoginForm.jsx`;

              const response = await aiClient.complete(pathPrompt);
              const rawContent = response.message?.content;
              const suggestedPath = rawContent ? rawContent.trim() : '';

              if (suggestedPath && suggestedPath.length > 0 && suggestedPath.length < 200) {
                // Use the suggested path
                this.terminal.info(`Creating file: ${suggestedPath}...`);
                await executeCommand('create-file', ['--path', suggestedPath, '--description', description]);
                this.terminal.success(`✓ File created: ${suggestedPath}`);
                return;
              } else {
                // Invalid path from AI - fall back to generate-code
                logger.debug('AI suggested invalid path, falling back to generate-code');
                this.terminal.info('Generating code (could not determine file path)...');
                await executeCommand('generate-code', ['--description', description]);
                this.terminal.info('\nTo save this code, use: create-file with a specific path');
                return;
              }
            } catch (error) {
              logger.debug('Failed to determine file path via AI:', error);
              this.terminal.info('Generating code (could not determine file path)...');
              await executeCommand('generate-code', ['--description', description]);
              this.terminal.info('\nTo save this code, use: create-file with a specific path');
              return;
            }
          }

          this.terminal.info(`Creating file: ${targetFile}...`);

          // Use create-file command with the user's description
          const args = ['--path', targetFile, '--description', description];

          await executeCommand('create-file', args);
          this.terminal.success(`✓ File created successfully`);
          return;
        } else if (operation === 'edit' || operation === 'modify') {
          if (!targetFile) {
            this.terminal.warn('No target file specified. Please specify which file to edit.');
            return;
          }

          this.terminal.info(`Editing file: ${targetFile}...`);

          // Use edit-file command with the user's instructions
          const instructions = result.fileOperation?.description || userInput;
          await executeCommand('edit-file', ['--path', targetFile, '--instructions', instructions]);
          this.terminal.success(`✓ File edited successfully`);
          return;
        } else if (operation === 'delete') {
          // For safety, we should ask for confirmation before deleting
          this.terminal.warn('File deletion requires confirmation. Use the file system directly for deletions.');
          return;
        } else {
          // Unknown operation - fall back to AI assistance
          logger.debug(`Unknown file operation: ${operation}, falling back to AI`);
          this.terminal.info('Processing file operation...');
          await this.handleSimpleAIRequest(userInput);
          return;
        }
      } catch (error) {
        this.terminal.error(`File operation processing failed: ${normalizeError(error).message}`);
        return;
      }
    }

    // Log unhandled result types for debugging
    logger.warn('Unhandled routing result type:', {
      type: result.type,
      action: result.action,
      hasData: !!result.data,
      hasResponse: !!result.response
    });

    // Display result for other types (task plans, etc.)
    if (result.needsApproval) {
      this.pendingTaskPlan = result.plan;
      this.pendingRoutingResult = result;
      this.terminal.info(result.response || 'No response available');
      this.terminal.info('\nWould you like to proceed? (yes/no)');
    } else {
      // Only display if we have a valid response
      if (result.response) {
        this.terminal.info(result.response);
      }
    }
  }

  /**
   * Handle pending task plan responses
   */
  private async handlePendingTaskPlanResponse(userInput: string): Promise<void> {
    const response = userInput.toLowerCase().trim();

    if (response === 'yes' || response === 'y') {
      this.terminal?.info('Executing approved plan...');

      try {
        // Execute the plan with timeout protection
        const executionTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Plan execution timeout')), TIMEOUT_CONFIG.PLAN_EXECUTION);
        });

        const executionResult = await Promise.race([
          this.executePendingPlan(),
          executionTimeout
        ]);

        this.terminal?.success(`Plan executed successfully: ${executionResult}`);
      } catch (error) {
        this.terminal?.error(`Plan execution failed: ${normalizeError(error).message}`);
      }
    } else {
      this.terminal?.info('Plan cancelled.');
    }

    // Clear pending state
    this.pendingTaskPlan = undefined;
    this.pendingRoutingResult = undefined;
  }

  /**
   * Execute pending plan with available components
   */
  private async executePendingPlan(): Promise<string> {
    if (!this.pendingTaskPlan) {
      throw new Error('No pending plan to execute');
    }

    // Try to get task planner, fall back to simple execution
    try {
      const taskPlanner = await this.componentFactory.getComponent<TaskPlanner>('taskPlanner', {
        timeout: getComponentTimeout('taskPlanner'),
        fallback: () => this.createFallbackComponent('taskPlanner')
      });

      await taskPlanner.executePlan(this.pendingTaskPlan);
      return 'Plan executed successfully';
    } catch (error) {
      // Fallback execution
      logger.warn('Task planner not available, using fallback execution');
      return 'Plan executed with basic functionality';
    }
  }

  /**
   * Get user input with timeout protection
   */
  private async getUserInput(): Promise<string> {
    if (!this.terminal) {
      throw new Error('Terminal not available');
    }

    // Allow non-TTY mode for E2E testing
    const allowNonTTY = process.env.OLLAMA_CODE_E2E_TEST === 'true';

    if (!this.terminal.isInteractive && !allowNonTTY) {
      // Non-interactive mode - return empty to exit gracefully
      logger.warn('Terminal is not interactive, exiting gracefully');
      this.sessionState = 'ended';
      this.running = false;
      return '';
    }

    // E2E mode: use persistent readline to handle incremental input and EOF gracefully
    if (allowNonTTY) {
      return this.getUserInputFromE2E();
    }

    // TTY mode: use readline with paste detection
    return this.getUserInputFromReadline();
  }

  /**
   * Get user input from readline (TTY mode)
   * Original implementation with paste detection for interactive use
   */
  private async getUserInputFromReadline(): Promise<string> {
    if (!this.terminal) {
      throw new Error('Terminal not available');
    }

    try {
      logger.debug(`Starting input prompt with ${TIMEOUT_CONFIG.USER_INPUT}ms timeout`);

      // CRITICAL FIX: Ensure output ends with newline and stdout is flushed before showing prompt
      // This fixes the issue where prompt doesn't appear after command output
      if (process.stdout.isTTY) {
        // Check if cursor is not at start of line (output didn't end with newline)
        // Force a newline to ensure prompt appears on a fresh line
        process.stdout.write('\n');
        // Small delay to ensure stdout is flushed
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const readline = await import('readline');

      const inputPromise = new Promise<string>((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: '> '
        });

        let lines: string[] = [];
        let isMultiLineMode = false;
        let pasteBuffer: string[] = [];
        let pasteTimer: NodeJS.Timeout | null = null;

        // Show initial prompt
        rl.prompt();

        // Handle line input with paste detection for better UX
        rl.on('line', (line: string) => {
          // Check if this might be a paste operation (multiple lines received quickly)
          if (pasteTimer) {
            clearTimeout(pasteTimer);
          }

          pasteBuffer.push(line);

          // Set timer to detect end of paste
          pasteTimer = setTimeout(() => {
            // If we have accumulated lines in paste buffer, process them as multi-line
            if (pasteBuffer.length > 1) {
              if (!isMultiLineMode) {
                isMultiLineMode = true;
                if (this.terminal) {
                  this.terminal.info('Multi-line input detected. Enter an empty line to submit, or type "cancel" to cancel.');
                }
              }
              lines.push(...pasteBuffer);
              pasteBuffer = [];
              rl.prompt();
            } else if (pasteBuffer.length === 1) {
              const currentLine = pasteBuffer[0];
              pasteBuffer = [];

              if (isMultiLineMode) {
                // In multi-line mode, empty line submits
                if (currentLine.trim() === '') {
                  rl.close();
                  resolve(lines.join('\n'));
                  return;
                }
                // Check for cancel
                if (currentLine.trim().toLowerCase() === 'cancel') {
                  if (this.terminal) {
                    this.terminal.warn('Input cancelled');
                  }
                  rl.close();
                  resolve('');
                  return;
                }
                lines.push(currentLine);
                rl.setPrompt('... ');
                rl.prompt();
              } else {
                // Single line mode - return immediately
                rl.close();
                resolve(currentLine);
              }
            }
          }, 50); // 50ms delay to detect paste operations
        });

        // Handle Ctrl+C
        rl.on('SIGINT', () => {
          rl.close();
          resolve('');
        });

        // Cleanup on close
        rl.on('close', () => {
          if (pasteTimer) {
            clearTimeout(pasteTimer);
          }
        });
      });

      /**
       * CRITICAL: Timeout promise resolves with null for proper type safety.
       *
       * Previous implementation used Promise<never> that only rejected, causing
       * TypeScript type issues with Promise.race. Now timeout resolves to null,
       * giving us Promise.race<PromptResult | null> which is type-safe.
       *
       * We can then check if result is null to detect timeout.
       */
      const inputTimeout = new Promise<null>(resolve => {
        setTimeout(() => {
          logger.debug('Input timeout triggered');
          resolve(null); // Resolve with null instead of rejecting
        }, TIMEOUT_CONFIG.USER_INPUT);
      });

      // Race the promises - type is now PromptResult | null
      logger.debug('Racing input vs timeout...');
      const result = await Promise.race([inputPromise, inputTimeout]);

      // Check if we timed out (result is null)
      if (result === null) {
        logger.warn('Input timeout detected');
        this.terminal.warn('Input timeout - exiting...');
        this.sessionState = 'ended';
        this.running = false;
        return '';
      }

      return result;
    } catch (error) {
      // Handle other errors (not timeout-related)
      logger.error('Error during input prompt:', error);
      throw error;
    }
  }

  /**
   * Initialize E2E readline interface (called once at start)
   * Creates a persistent readline interface for line-by-line reading
   */
  private async initializeE2EReadline(): Promise<void> {
    if (this.e2eReadline) {
      return; // Already initialized
    }

    logger.debug('[E2E] Initializing persistent readline interface');

    const readline = await import('readline');

    this.e2eReadline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false // Don't treat as terminal in E2E mode
    });

    // Set up 'line' event handler
    this.e2eReadline.on('line', (line: string) => {
      logger.debug(`[E2E] Received line: ${line.substring(0, 50)}...`);

      // If we have a pending promise, resolve it with this line
      if (this.e2eLineResolve) {
        const resolve = this.e2eLineResolve;
        this.e2eLineResolve = null;
        this.e2eLinePromise = null;
        resolve(line);
      }
    });

    // Handle stdin close (EOF)
    this.e2eReadline.on('close', () => {
      logger.debug('[E2E] stdin closed (EOF)');
      // In E2E, log to stderr so test output captures why process exited
      if (process.env.OLLAMA_CODE_E2E_TEST === 'true') {
        process.stderr?.write('[E2E] readline "close" received (stdin EOF or stream closed)\n');
      }
      this.e2eStdinClosed = true;

      // If we have a pending promise waiting for input, resolve it with empty string
      if (this.e2eLineResolve) {
        const resolve = this.e2eLineResolve;
        this.e2eLineResolve = null;
        this.e2eLinePromise = null;
        resolve('');
      }
    });

    // Handle errors
    this.e2eReadline.on('error', (error: Error) => {
      logger.error('[E2E] Error reading input:', error);
      this.e2eStdinClosed = true;
    });
  }

  /**
   * Get user input from E2E readline (E2E test mode)
   * Reads one line at a time from stdin, handling EOF gracefully
   */
  private async getUserInputFromE2E(): Promise<string> {
    // Initialize readline interface on first call
    if (!this.e2eReadline) {
      await this.initializeE2EReadline();
    }

    // Check if stdin is already closed
    if (this.e2eStdinClosed) {
      if (process.env.OLLAMA_CODE_E2E_TEST === 'true') {
        process.stderr?.write('[E2E] Exiting: e2eStdinClosed was true (stdin had closed earlier)\n');
      }
      logger.info('[E2E] stdin closed, exiting gracefully');
      this.sessionState = 'ended';
      this.running = false;
      return '';
    }

    // Show prompt to signal ready state (for E2E test detection)
    // CRITICAL: Ensure we're on a new line before writing prompt
    // The prompt from processWithStreamingTools() might have already been written,
    // but we write it again here to ensure it's visible when getUserInputFromE2E() is called
    // This ensures the prompt is definitely present when we're waiting for input
    // Write prompt with newline to ensure it's on its own line and triggers flush
    process.stdout.write('> ');

    // Create a new promise to wait for the next line
    if (!this.e2eLinePromise) {
      this.e2eLinePromise = new Promise<string>((resolve) => {
        this.e2eLineResolve = resolve;
      });
    }

    // Wait for the next line
    const line = await this.e2eLinePromise;

    // Echo the input for test visibility
    if (line) {
      process.stdout.write(line + '\n');
      logger.debug(`[E2E] Returning input: ${line.substring(0, 50)}...`);
    } else {
      if (process.env.OLLAMA_CODE_E2E_TEST === 'true') {
        process.stderr?.write('[E2E] Exiting: getUserInputFromE2E returned empty line (EOF)\n');
      }
      logger.info('[E2E] EOF reached, exiting gracefully');
      this.sessionState = 'ended';
      this.running = false;
    }

    return line;
  }

  /**
   * Handle special commands
   */
  private handleSpecialCommands(input: string): boolean {
    const command = input.toLowerCase().trim();

    if ((EXIT_COMMANDS as readonly string[]).includes(command)) {
      if (process.env.OLLAMA_CODE_E2E_TEST === 'true') {
        process.stderr?.write(`[E2E] Exiting: user sent exit command "${command}"\n`);
      }
      this.sessionState = 'ended';
      this.running = false;
      return true;
    }

    switch (command) {
      case '/help':
        this.displayHelp();
        return true;

      case '/status':
        this.displayStatus();
        return true;

      case '/performance':
        this.displayPerformance();
        return true;

      case '/components':
        this.displayComponents();
        return true;

      case '/clear':
        this.terminal?.clear();
        return true;

      default:
        return false;
    }
  }

  /**
   * Display help information
   */
  private displayHelp(): void {
    if (!this.terminal) return;

    const status = this.getSystemStatus();
    this.terminal.info('🤖 Ollama Code - Enhanced Interactive Mode\n');
    this.terminal.info('Available capabilities:');
    status.capabilities.forEach(cap => this.terminal!.info(`  • ${cap}`));
    this.terminal.info('\nSpecial commands:');
    this.terminal.info('  /help - Show this help');
    this.terminal.info('  /status - Show system status');
    this.terminal.info('  /performance - Show performance metrics');
    this.terminal.info('  /components - Show component status');
    this.terminal.info('  /clear - Clear screen');
    this.terminal.info('  exit, quit, bye - Exit the application');
  }

  /**
   * Display system status
   */
  private displayStatus(): void {
    if (!this.terminal) return;

    const status = this.getSystemStatus();
    const systemHealth = this.statusTracker.getSystemHealth();

    this.terminal.info('📊 System Status:\n');
    this.terminal.info(`Overall: ${systemHealth.overallStatus}`);
    this.terminal.info(`Components: ${systemHealth.readyComponents}/${systemHealth.totalComponents} ready`);
    this.terminal.info(`Memory: ${systemHealth.totalMemoryUsage.toFixed(1)}MB`);
    this.terminal.info(`Uptime: ${Math.floor(systemHealth.uptime / 1000)}s`);
    this.terminal.info('\nReady components:');
    status.components.forEach(comp => this.terminal!.info(`  ✅ ${comp}`));
  }

  /**
   * Display performance metrics
   */
  private displayPerformance(): void {
    if (!this.terminal) return;

    const report = this.performanceMonitor.getPerformanceReport('summary');
    this.terminal.info('⚡ Performance Metrics:\n');
    this.terminal.info(report);
  }

  /**
   * Display component status
   */
  private displayComponents(): void {
    if (!this.terminal) return;

    const display = this.statusTracker.getStatusDisplay({
      format: 'list',
      showMetrics: true,
      showDependencies: false
    });

    this.terminal.info('🔧 Component Status:\n');
    this.terminal.info(display);
  }

  /**
   * Display welcome message (simplified to avoid circular dependency)
   */
  private displayWelcomeMessage(): void {
    if (!this.terminal) return;

    // FUNDAMENTAL FIX: Simplified welcome message to avoid statusTracker circular dependency
    this.terminal.success('🚀 Enhanced Interactive Mode Ready!\n');
    this.terminal.info('I can help you with:');

    // Use consistent capabilities list from streaming initializer to avoid DRY violation
    const basicCapabilities = [
      '💬 Natural language requests',
      '🤖 Basic AI assistance',
      '📝 Code analysis'
    ];

    basicCapabilities.forEach(cap => this.terminal!.info(`  • ${cap}`));

    const backgroundStatus = this.streamingInitializer?.getBackgroundStatus();
    if (backgroundStatus && backgroundStatus.active.length > 0) {
      this.terminal.info(`\n🔄 Loading in background: ${backgroundStatus.active.join(', ')}`);
    }

    this.terminal.info('\nType /help for more commands, or just ask me anything!\n');
    
    // CRITICAL FIX: Ensure welcome message ends with newline and stdout is flushed
    // This fixes the issue where prompt doesn't appear when first launched
    // The newline is already added above, but we ensure stdout is ready
    if (process.stdout.isTTY && typeof process.stdout.write === 'function') {
      try {
        // Force a flush by writing empty string
        process.stdout.write('');
      } catch (e) {
        // Ignore errors - flush may not be supported in all environments
      }
    }
  }

  /**
   * Mark essential components as ready
   */
  private markEssentialComponentsReady(): void {
    const essentialComponents: ComponentType[] = ['aiClient', 'intentAnalyzer', 'conversationManager'];

    for (const component of essentialComponents) {
      if (this.componentFactory.isReady(component)) {
        this.componentsReady.add(component);
      }
    }
  }

  /**
   * Add entry to conversation history with bounds checking.
   *
   * CRITICAL: Prevents unbounded memory growth in long-running sessions.
   * Implements FIFO eviction - oldest messages are removed when limit is reached.
   * This maintains recent context while preventing memory leaks.
   *
   * @param entry - Conversation entry to add (role and content)
   */
  private addToConversationHistory(entry: { role: string; content: string }): void {
    this.conversationHistory.push(entry);

    // Enforce memory bounds using FIFO eviction
    if (this.conversationHistory.length > MAX_CONVERSATION_HISTORY_SIZE) {
      const removed = this.conversationHistory.shift();
      logger.debug('Conversation history limit reached, removed oldest entry', {
        historySize: this.conversationHistory.length,
        maxSize: MAX_CONVERSATION_HISTORY_SIZE,
        removedRole: removed?.role
      });
    }
  }

  /**
   * Setup event handlers for component tracking
   */
  private setupEventHandlers(): void {
    // Track component factory progress
    this.componentFactory.onProgress((progress) => {
      this.statusTracker.updateFromProgress(progress);

      if (progress.status === 'ready') {
        this.componentsReady.add(progress.component);

        // Notify user when background components become available
        if (this.terminal && this.running) {
          this.terminal.info(`🔧 ${progress.component} now available`);
        }
      }
    });

    // Handle component degradation
    this.statusTracker.on('componentDegraded', (component, health) => {
      if (this.terminal) {
        this.terminal.warn(`Component ${component} degraded: ${health.lastError?.message}`);
      }
    });
  }

  /**
   * Handle errors with graceful degradation
   *
   * CRITICAL: Properly handles null terminal to prevent crashes.
   * When terminal is unavailable, uses safe defaults for error recovery.
   */
  private async handleError(error: any): Promise<void> {
    const formattedError = formatErrorForDisplay(error);

    // Check if terminal is available for user interaction
    if (!this.terminal) {
      if (process.env.OLLAMA_CODE_E2E_TEST === 'true') {
        process.stderr?.write('[E2E] Exiting: terminal unavailable after error\n');
      }
      logger.error('Error occurred but terminal unavailable for user prompt:', formattedError);
      logger.error('Stopping execution due to error without user confirmation');
      // Safe default: stop execution when we can't ask the user
      this.sessionState = 'ended';
      this.running = false;
      return;
    }

    // Display error to user
    this.terminal.error(formattedError);

    // Record error in performance monitor
    if (error instanceof Error) {
      this.statusTracker.recordFailure('aiClient', error);
    }

    // Ask if user wants to continue
    try {
      const shouldContinue = await this.terminal.prompt({
        type: 'confirm',
        name: 'continue',
        message: 'An error occurred. Would you like to continue?',
        default: true
      });

      if (!shouldContinue?.continue) {
        this.sessionState = 'ended';
        this.running = false;
      }
    } catch (promptError) {
      // If we can't prompt (e.g., terminal became unavailable), log and continue
      logger.warn('Failed to prompt user after error:', promptError);
      this.terminal?.info('Continuing after error (prompt unavailable)...');
      // Default to continuing since we already had a terminal but prompt failed
    }
  }

  /**
   * Start fallback mode when full mode fails
   */
  private async startFallbackMode(originalError: any): Promise<void> {
    logger.warn('Starting fallback mode due to initialization failure');

    if (this.terminal) {
      this.terminal.warn('Enhanced mode failed, running in basic mode');
      this.terminal.info('Limited functionality available');
    }

    // Simple command loop without advanced features
    this.running = true;
    while (this.running) {
      try {
        const input = await this.getUserInput();
        if (!input || (EXIT_COMMANDS as readonly string[]).includes(input.toLowerCase().trim())) {
          this.sessionState = 'ended';
          this.running = false;
          break;
        }

        // Basic responses only
        this.terminal?.info('Basic mode response: ' + input);
      } catch (error) {
        this.terminal?.error('Fallback mode error: ' + error);
        break;
      }
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    logger.debug('Cleaning up optimized enhanced mode');

    this.sessionState = 'ended';
    this.running = false;
    this.performanceMonitor.stopMonitoring();
    this.statusTracker.stopHealthChecks();

    // Wait for any pending background operations
    if (this.streamingInitializer) {
      try {
        const backgroundStatus = this.streamingInitializer.getBackgroundStatus();
        if (backgroundStatus.active.length > 0) {
          logger.debug('Waiting for background components to finish...');
          await this.streamingInitializer.waitForComponents(backgroundStatus.active, 5000);
        }
      } catch (error) {
        logger.debug('Background component cleanup timeout');
      } finally {
        // Always dispose of the streaming initializer to cleanup timeouts (restored with legacy factory)
        this.streamingInitializer.dispose();
      }
    }

    // Cleanup component factory (restored with legacy factory)
    await this.componentFactory.clear();
  }
}

/**
 * Create and start optimized enhanced interactive mode
 */
export async function startOptimizedEnhancedMode(
  options?: OptimizedEnhancedModeOptions
): Promise<void> {
  const mode = new OptimizedEnhancedMode(options);
  await mode.start();
}

export default OptimizedEnhancedMode;

/**
 * Orchestrates tool execution with dependency resolution,
 * parallel execution, caching, and approval workflows
 */
export class ToolOrchestrator {
  private registry: ToolRegistry;
  private cache: ResultCache;
  private resolver: DependencyResolver;
  private executor: ParallelExecutor;
  private logger: Logger;
  private context: ToolContext;

  constructor(
    registry: ToolRegistry,
    logger: Logger,
    workingDirectory: string,
    options: OrchestratorOptions = {}
  ) {
    this.registry = registry;
    this.logger = logger;
    this.cache = new ResultCache(logger, options.cache);
    this.resolver = new DependencyResolver(logger);
    this.executor = new ParallelExecutor(logger, options.maxConcurrency || 5);

    this.context = {
      workingDirectory,
      logger,
      toolRegistry: registry,
      preferences: options.preferences || {},
      cancellationToken: options.cancellationToken
    };
  }

  /**
   * Execute tool calls
   */
  async execute(
    toolCalls: ToolCall[],
    options: ExecutionOptions = {}
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`Executing ${toolCalls.length} tool calls`);

      // 1. Build dependency graph
      const graph = this.resolver.buildGraph(toolCalls, this.registry);

      // 2. Plan execution
      const plan = this.resolver.planExecution(graph);
      this.logger.debug(`Execution plan: ${plan.totalCalls} calls, ${plan.parallel.length} levels`);

      // 3. Execute with caching and approval
      const results = await this.executor.execute(
        toolCalls,
        plan,
        async (call) => this.executeToolCall(call, options),
        options
      );

      // 4. Aggregate results
      const successCount = Array.from(results.values()).filter(r => r.success).length;
      const failureCount = results.size - successCount;

      this.logger.info(`Execution complete: ${successCount} successful, ${failureCount} failed`);

      return {
        success: failureCount === 0,
        results: Array.from(results.values()),
        metadata: {
          totalCalls: toolCalls.length,
          successCount,
          failureCount,
          durationMs: Date.now() - startTime,
          cacheHits: this.countCacheHits(results),
          parallelLevels: plan.parallel.length
        }
      };
    } catch (error: any) {
      this.logger.error(`Execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a single tool call with caching and approval
   */
  private async executeToolCall(
    call: ToolCall,
    options: ExecutionOptions
  ): Promise<ToolResult> {
    const tool = this.registry.get(call.toolName);

    // 1. Check cache (if tool is cacheable)
    if (tool.cacheable && options.enableCache !== false) {
      const cacheKey = CacheKeyGenerator.generateKey(call);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        return cached;
      }
    }

    // 2. Request approval (if required)
    if (tool.requiresApproval && options.approvalCallback) {
      const approved = await options.approvalCallback(call, tool);

      if (!approved) {
        return {
          callId: call.id,
          toolName: call.toolName,
          success: false,
          error: {
            message: 'User denied approval',
            code: 'APPROVAL_DENIED',
            recoverable: false
          },
          metadata: {
            durationMs: 0,
            cached: false,
            timestamp: new Date(),
            approvalGranted: false
          }
        };
      }
    }

    // 3. Execute tool
    const startTime = Date.now();

    try {
      // Set timeout if specified
      const timeout = tool.timeoutMs || options.timeoutMs;
      const result = timeout
        ? await this.executeWithTimeout(tool, call, timeout)
        : await tool.execute(call.parameters, this.context);

      // Add call ID and duration
      result.callId = call.id;
      result.toolName = call.toolName;
      result.metadata.durationMs = Date.now() - startTime;

      // 4. Cache successful results
      if (result.success && tool.cacheable && options.enableCache !== false) {
        const cacheKey = CacheKeyGenerator.generateKey(call);
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Tool ${call.toolName} threw error: ${error.message}`);

      return {
        callId: call.id,
        toolName: call.toolName,
        success: false,
        error: {
          message: error.message,
          code: 'EXECUTION_ERROR',
          recoverable: tool.retryable || false,
          stack: error.stack
        },
        metadata: {
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Execute tool with timeout
   */
  private async executeWithTimeout(
    tool: Tool,
    call: ToolCall,
    timeoutMs: number
  ): Promise<ToolResult> {
    return Promise.race([
      tool.execute(call.parameters, this.context),
      new Promise<ToolResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Tool ${call.toolName} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  /**
   * Count cache hits in results
   */
  private countCacheHits(results: Map<string, ToolResult>): number {
    return Array.from(results.values()).filter(r => r.metadata.cached).length;
  }

  /**
   * Clear result cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }
}

interface OrchestratorOptions {
  cache?: CacheOptions;
  maxConcurrency?: number;
  preferences?: UserPreferences;
  cancellationToken?: CancellationToken;
}

interface UserPreferences {
  autoApprove?: boolean;
  verbose?: boolean;
  [key: string]: any;
}

interface CancellationToken {
  isCancelled: boolean;
  cancel(): void;
}

interface ToolExecutionResult {
  success: boolean;
  results: ToolResult[];
  metadata: {
    totalCalls: number;
    successCount: number;
    failureCount: number;
    durationMs: number;
    cacheHits: number;
    parallelLevels: number;
  };
}
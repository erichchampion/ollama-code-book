/**
 * Executes tool calls in parallel when possible
 */
export class ParallelExecutor {
  private logger: Logger;
  private maxConcurrency: number;

  constructor(logger: Logger, maxConcurrency: number = 5) {
    this.logger = logger;
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Execute tool calls according to execution plan
   */
  async execute(
    toolCalls: ToolCall[],
    plan: ExecutionPlan,
    executor: (call: ToolCall) => Promise<ToolResult>,
    options: ExecutionOptions = {}
  ): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>();
    const startTime = Date.now();

    if (options.parallelExecution && plan.parallel.length > 0) {
      // Execute level by level
      for (let i = 0; i < plan.parallel.length; i++) {
        const level = plan.parallel[i];
        this.logger.debug(`Executing level ${i}: ${level.length} calls`);

        // Execute all calls in this level in parallel
        const levelResults = await this.executeLevel(
          level,
          toolCalls,
          executor,
          results,
          options
        );

        // Merge results
        for (const [callId, result] of levelResults) {
          results.set(callId, result);
        }

        // Check for errors
        const errors = Array.from(levelResults.values()).filter(r => !r.success);
        if (errors.length > 0 && options.failFast) {
          this.logger.error(`Level ${i} failed with ${errors.length} errors, stopping`);
          throw new Error(`Execution failed at level ${i}`);
        }
      }
    } else {
      // Sequential execution
      this.logger.debug(`Executing sequentially: ${plan.sequential.length} calls`);

      for (const callId of plan.sequential) {
        const call = toolCalls.find(c => c.id === callId);
        if (!call) continue;

        try {
          const result = await executor(call);
          results.set(callId, result);

          if (!result.success && options.failFast) {
            throw new Error(`Call ${callId} failed: ${result.error?.message}`);
          }
        } catch (error: any) {
          this.logger.error(`Call ${callId} threw error: ${error.message}`);
          if (options.failFast) throw error;
        }
      }
    }

    const totalTime = Date.now() - startTime;
    this.logger.info(`Executed ${results.size} calls in ${totalTime}ms`);

    return results;
  }

  /**
   * Execute a single level (all calls in parallel)
   */
  private async executeLevel(
    level: string[],
    allCalls: ToolCall[],
    executor: (call: ToolCall) => Promise<ToolResult>,
    previousResults: Map<string, ToolResult>,
    options: ExecutionOptions
  ): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>();

    // Limit concurrency
    const batches = this.createBatches(level, this.maxConcurrency);

    for (const batch of batches) {
      // Execute batch in parallel
      const promises = batch.map(async (callId) => {
        const call = allCalls.find(c => c.id === callId);
        if (!call) return;

        try {
          // Resolve parameter references from previous results
          const resolvedCall = this.resolveParameters(call, previousResults);

          const result = await executor(resolvedCall);
          results.set(callId, result);
        } catch (error: any) {
          this.logger.error(`Call ${callId} failed: ${error.message}`);
          results.set(callId, {
            callId,
            toolName: call.toolName,
            success: false,
            error: {
              message: error.message,
              code: 'EXECUTION_ERROR',
              recoverable: false
            },
            metadata: {
              durationMs: 0,
              cached: false,
              timestamp: new Date()
            }
          });
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Create batches for concurrency limiting
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Resolve parameter references from previous results
   * Example: ${call_1.data.files[0]} → "src/index.ts"
   */
  private resolveParameters(
    call: ToolCall,
    results: Map<string, ToolResult>
  ): ToolCall {
    const params = { ...call.parameters };

    // Simple template resolution (in production, use a proper template engine)
    const resolveValue = (value: any): any => {
      if (typeof value === 'string' && value.includes('${')) {
        // Extract reference: ${call_1.data.files}
        const match = value.match(/\$\{(.+?)\}/);
        if (match) {
          const ref = match[1];
          const [callId, ...path] = ref.split('.');

          const result = results.get(callId);
          if (!result || !result.success) {
            throw new Error(`Cannot resolve ${ref}: call ${callId} failed or not found`);
          }

          // Navigate path: data.files[0]
          let resolved: any = result;
          for (const segment of path) {
            if (segment.includes('[')) {
              // Array index
              const [prop, index] = segment.split('[');
              resolved = resolved[prop][parseInt(index.replace(']', ''), 10)];
            } else {
              resolved = resolved[segment];
            }
          }

          return resolved;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively resolve objects and arrays
        if (Array.isArray(value)) {
          return value.map(resolveValue);
        } else {
          const resolved: any = {};
          for (const [k, v] of Object.entries(value)) {
            resolved[k] = resolveValue(v);
          }
          return resolved;
        }
      }

      return value;
    };

    for (const [key, value] of Object.entries(params)) {
      params[key] = resolveValue(value);
    }

    return { ...call, parameters: params };
  }
}

interface ExecutionOptions {
  // Execute in parallel when possible
  parallelExecution?: boolean;

  // Stop on first error
  failFast?: boolean;

  // Timeout for entire execution
  timeoutMs?: number;
}
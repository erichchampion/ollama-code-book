/**
 * Optimized tool orchestrator with parallel execution
 */
export class ParallelToolOrchestrator extends ToolOrchestrator {
  private executor: ParallelExecutor;

  constructor(
    aiProvider: AIProvider,
    options: OrchestratorOptions
  ) {
    super(aiProvider, options);
    this.executor = new ParallelExecutor(
      options.maxParallelTools || 5,
      options.logger
    );
  }

  /**
   * Execute tools in parallel based on dependency graph
   */
  async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    const graph = this.buildDependencyGraph(plan.toolCalls);

    // Get execution levels (tools that can run in parallel)
    const levels = graph.getExecutionLevels();

    const results: ToolResult[] = [];
    const resultMap = new Map<string, ToolResult>();

    // Execute each level in parallel
    for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
      const level = levels[levelIndex];

      this.logger.info('Executing tool level', {
        level: levelIndex + 1,
        tools: level.length
      });

      // Execute all tools in this level in parallel
      const levelResults = await this.executor.map(
        level,
        async (toolId) => {
          const toolCall = plan.toolCalls.find(tc => tc.id === toolId)!;

          // Resolve parameters (may reference previous tool results)
          const params = this.resolveParameters(
            toolCall.parameters,
            resultMap
          );

          // Execute tool
          const tool = this.registry.get(toolCall.tool);
          if (!tool) {
            throw new Error(`Tool not found: ${toolCall.tool}`);
          }

          const result = await this.cachedExecute(tool, params);

          // Store result for dependent tools
          resultMap.set(toolId, result);

          return result;
        }
      );

      results.push(...levelResults);
    }

    return {
      success: true,
      toolResults: results,
      metadata: {
        levels: levels.length,
        parallelism: levels.map(l => l.length)
      }
    };
  }

  /**
   * Cached tool execution
   */
  private async cachedExecute(
    tool: Tool,
    params: Record<string, any>
  ): Promise<ToolResult> {
    // Use cache if available
    if (this.cache && tool.cacheable) {
      const cached = await this.cache.get(tool.name, params);
      if (cached) {
        return cached;
      }
    }

    const result = await tool.execute(params, this.context);

    // Cache result
    if (this.cache && tool.cacheable) {
      await this.cache.set(tool.name, params, result);
    }

    return result;
  }
}
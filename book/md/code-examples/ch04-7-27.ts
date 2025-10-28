/**
 * Resolves tool call dependencies and plans execution
 */
export class DependencyResolver {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Build dependency graph from tool calls
   */
  buildGraph(toolCalls: ToolCall[], registry: ToolRegistry): DependencyGraph {
    const graph = new DependencyGraph();

    for (const call of toolCalls) {
      // Get tool definition
      const tool = registry.get(call.toolName);

      // Collect dependencies
      const dependencies = call.dependsOn || [];

      // Add tool's declared dependencies (if any)
      if (tool.dependencies) {
        // Find calls that provide these dependencies
        for (const depToolName of tool.dependencies) {
          const depCall = toolCalls.find(c => c.toolName === depToolName);
          if (depCall && !dependencies.includes(depCall.id)) {
            dependencies.push(depCall.id);
          }
        }
      }

      graph.addNode(call.id, call.toolName, dependencies);
    }

    // Validate no cycles
    const cycle = graph.detectCycle();
    if (cycle) {
      this.logger.error(`Circular dependency: ${cycle.join(' -> ')}`);
      throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`);
    }

    return graph;
  }

  /**
   * Plan execution order
   */
  planExecution(graph: DependencyGraph): ExecutionPlan {
    const sequential = graph.topologicalSort();
    const parallel = graph.getExecutionLevels();

    this.logger.debug(`Execution plan:`);
    this.logger.debug(`  Sequential: ${sequential.length} calls`);
    this.logger.debug(`  Parallel: ${parallel.length} levels`);

    return {
      sequential,
      parallel,
      totalCalls: sequential.length,
      maxParallelism: Math.max(...parallel.map(level => level.length))
    };
  }
}

interface ExecutionPlan {
  // Sequential execution order (dependencies first)
  sequential: string[];

  // Parallel execution levels (can run concurrently within each level)
  parallel: string[][];

  // Total number of calls
  totalCalls: number;

  // Maximum parallelism (largest level size)
  maxParallelism: number;
}
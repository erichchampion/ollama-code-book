/**
 * Tool Orchestrator
 *
 * Manages execution of multiple tools with dependency resolution,
 * parallel execution, and result aggregation.
 */

import { EventEmitter } from 'events';
import { BaseTool, ToolExecution, ToolExecutionContext, ToolOrchestratorConfig, ToolResult, OrchestrationPlan } from './types.js';
import { toolRegistry } from './registry.js';
import { logger } from '../utils/logger.js';
import { EXECUTION_CONSTANTS } from '../config/constants.js';
import { normalizeError } from '../utils/error-utils.js';
import { safeStringify } from '../utils/safe-json.js';

// Re-export OrchestrationPlan for external use
export type { OrchestrationPlan } from './types.js';

interface ExecutionEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  execution: ToolExecution;
  data?: any;
}

export class ToolOrchestrator extends EventEmitter {
  private config: ToolOrchestratorConfig;
  private activeExecutions = new Map<string, ToolExecution>();
  private executionCache = new Map<string, ToolResult>();
  private cacheTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: Partial<ToolOrchestratorConfig> = {}) {
    super();
    this.config = {
      maxConcurrentTools: config.maxConcurrentTools || EXECUTION_CONSTANTS.DEFAULT_MAX_CONCURRENT_TOOLS,
      defaultTimeout: config.defaultTimeout || EXECUTION_CONSTANTS.DEFAULT_TASK_TIMEOUT,
      enableCaching: config.enableCaching !== false,
      cacheTTL: config.cacheTTL || EXECUTION_CONSTANTS.CACHE_TTL
    };
  }

  /**
   * Execute a single tool
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const tool = toolRegistry.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    // Check cache if enabled
    const cacheKey = this.generateCacheKey(toolName, parameters);
    if (this.config.enableCaching && this.executionCache.has(cacheKey)) {
      const cachedResult = this.executionCache.get(cacheKey)!;
      logger.debug(`Using cached result for ${toolName}`);
      return cachedResult;
    }

    const execution: ToolExecution = {
      id: this.generateExecutionId(),
      toolName,
      parameters,
      status: 'pending',
      startTime: new Date(),
      dependencies: []
    };

    try {
      execution.status = 'running';
      this.activeExecutions.set(execution.id, execution);
      this.emit('execution', { type: 'start', execution });

      const result = await tool.execute(parameters, context);

      execution.status = result.success ? 'completed' : 'failed';
      execution.endTime = new Date();
      execution.result = result;

      // Cache successful results
      if (this.config.enableCaching && result.success) {
        // Clear existing timer if any
        const existingTimer = this.cacheTimers.get(cacheKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        this.executionCache.set(cacheKey, result);

        // Set TTL cleanup with tracked timer
        const timer = setTimeout(() => {
          this.executionCache.delete(cacheKey);
          this.cacheTimers.delete(cacheKey);
        }, this.config.cacheTTL);

        this.cacheTimers.set(cacheKey, timer);
      }

      this.emit('execution', { type: 'complete', execution, data: result });
      return result;

    } catch (error) {
      const normalizedError = normalizeError(error);
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.result = {
        success: false,
        error: normalizedError.message
      };

      this.emit('execution', { type: 'error', execution, data: normalizedError });
      throw normalizedError;

    } finally {
      this.activeExecutions.delete(execution.id);
    }
  }

  /**
   * Execute multiple tools with orchestration
   */
  async executeOrchestration(
    plan: OrchestrationPlan,
    context: ToolExecutionContext
  ): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>();
    const completed = new Set<string>();
    const inProgress = new Set<string>();

    // Create execution queue respecting dependencies
    const queue = [...plan.executions];
    const maxConcurrent = Math.min(this.config.maxConcurrentTools, queue.length);

    logger.info(`Starting orchestrated execution of ${queue.length} tools (max ${maxConcurrent} concurrent)`);

    while (queue.length > 0 || inProgress.size > 0) {
      // Track promises for proper async coordination
      const executionPromises: Promise<ToolResult>[] = [];

      // Find ready executions (dependencies satisfied)
      const readyExecutions = queue.filter(execution =>
        execution.dependencies.every(dep => completed.has(dep))
      );

      // Start executions up to concurrent limit
      const slotsAvailable = maxConcurrent - inProgress.size;
      const toStart = readyExecutions.slice(0, slotsAvailable);

      for (const execution of toStart) {
        // Remove from queue and add to in-progress
        const index = queue.indexOf(execution);
        queue.splice(index, 1);
        inProgress.add(execution.id);

        // Execute asynchronously and track promise
        const promise = this.executeTool(execution.toolName, execution.parameters, context)
          .then(result => {
            results.set(execution.id, result);
            completed.add(execution.id);
            logger.debug(`Completed execution ${execution.id} (${execution.toolName})`);
            return result;
          })
          .catch(error => {
            const errorResult: ToolResult = {
              success: false,
              error: error.message
            };
            results.set(execution.id, errorResult);
            completed.add(execution.id);
            logger.error(`Failed execution ${execution.id} (${execution.toolName}): ${error.message}`);
            return errorResult;
          })
          .finally(() => {
            inProgress.delete(execution.id);
          });

        executionPromises.push(promise);
      }

      // Wait for at least one promise to complete before checking dependencies
      if (executionPromises.length > 0) {
        await Promise.race(executionPromises);
      } else if (inProgress.size > 0) {
        // If no new executions started but we have in-progress ones, wait briefly
        await new Promise(resolve => setTimeout(resolve, EXECUTION_CONSTANTS.TASK_POLL_INTERVAL));
      }

      // Detect deadlock using topological sort validation
      if (toStart.length === 0 && inProgress.size === 0 && queue.length > 0) {
        // Try to detect circular dependencies
        const circularDeps = this.detectCircularDependencies(queue);
        if (circularDeps.length > 0) {
          logger.error('Deadlock detected - circular dependencies found:', {
            circularChain: circularDeps.join(' -> ')
          });
          throw new Error(`Circular dependency detected: ${circularDeps.join(' -> ')}`);
        } else {
          logger.error('Deadlock detected in orchestration plan - unresolved dependencies');
        }
        break;
      }
    }

    return results;
  }

  /**
   * Detect circular dependencies using topological sort approach
   */
  private detectCircularDependencies(executions: ToolExecution[]): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const hasCycle = (execution: ToolExecution): boolean => {
      if (recursionStack.has(execution.id)) {
        // Found cycle - build the circular path
        const cycleStart = path.indexOf(execution.id);
        return true;
      }

      if (visited.has(execution.id)) {
        return false;
      }

      visited.add(execution.id);
      recursionStack.add(execution.id);
      path.push(execution.id);

      // Check all dependencies
      for (const depId of execution.dependencies) {
        const depExecution = executions.find(e => e.id === depId);
        if (depExecution && hasCycle(depExecution)) {
          return true;
        }
      }

      recursionStack.delete(execution.id);
      path.pop();
      return false;
    };

    // Check each execution for cycles
    for (const execution of executions) {
      if (!visited.has(execution.id)) {
        if (hasCycle(execution)) {
          // Return the circular path
          const cycleStart = path.findIndex(id => recursionStack.has(id));
          return cycleStart >= 0 ? path.slice(cycleStart) : path;
        }
      }
    }

    return [];
  }

  /**
   * Create an orchestration plan from tool execution requests
   */
  createPlan(executions: Array<{
    toolName: string;
    parameters: Record<string, any>;
    dependencies?: string[];
  }>): OrchestrationPlan {
    const plan: OrchestrationPlan = {
      executions: [],
      dependencies: new Map(),
      estimatedDuration: 0
    };

    // Create execution objects
    for (const exec of executions) {
      const execution: ToolExecution = {
        id: this.generateExecutionId(),
        toolName: exec.toolName,
        parameters: exec.parameters,
        status: 'pending',
        startTime: new Date(),
        dependencies: exec.dependencies || []
      };

      plan.executions.push(execution);
      plan.dependencies.set(execution.id, execution.dependencies);
    }

    // Validate dependencies
    this.validateDependencies(plan);

    // Estimate duration (simplified)
    plan.estimatedDuration = this.estimatePlanDuration(plan);

    return plan;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(): Array<{
    id: string;
    toolName: string;
    status: string;
    duration: number;
  }> {
    return Array.from(this.activeExecutions.values()).map(execution => ({
      id: execution.id,
      toolName: execution.toolName,
      status: execution.status,
      duration: Date.now() - execution.startTime.getTime()
    }));
  }

  /**
   * Cancel all active executions
   */
  cancelAll(): void {
    for (const execution of this.activeExecutions.values()) {
      execution.status = 'failed';
      this.emit('execution', {
        type: 'error',
        execution,
        data: new Error('Execution cancelled')
      });
    }
    this.activeExecutions.clear();

    // Clear all cache timers to prevent memory leaks
    for (const timer of this.cacheTimers.values()) {
      clearTimeout(timer);
    }
    this.cacheTimers.clear();

    logger.debug('All tool executions cancelled and timers cleared');
  }

  /**
   * Dispose of the orchestrator and cleanup all resources
   */
  dispose(): void {
    // Cancel all active executions and clear timers
    this.cancelAll();

    // Clear execution cache
    this.executionCache.clear();

    // Remove all event listeners to prevent memory leaks
    this.removeAllListeners();

    logger.debug('Tool orchestrator disposed');
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateCacheKey(toolName: string, parameters: Record<string, any>): string {
    const paramString = safeStringify(parameters, { maxDepth: 5 });

    // Use faster hash for large objects instead of base64
    if (paramString.length > 1000) {
      return `${toolName}:${this.hashString(paramString)}`;
    }

    return `${toolName}:${Buffer.from(paramString).toString('base64')}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private validateDependencies(plan: OrchestrationPlan): void {
    const executionIds = new Set(plan.executions.map(e => e.id));

    for (const execution of plan.executions) {
      for (const dep of execution.dependencies) {
        if (!executionIds.has(dep)) {
          throw new Error(`Invalid dependency '${dep}' in execution '${execution.id}'`);
        }
      }
    }

    // Check for circular dependencies (simplified)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (execId: string): boolean => {
      if (recursionStack.has(execId)) return true;
      if (visited.has(execId)) return false;

      visited.add(execId);
      recursionStack.add(execId);

      const execution = plan.executions.find(e => e.id === execId);
      if (execution) {
        for (const dep of execution.dependencies) {
          if (hasCycle(dep)) return true;
        }
      }

      recursionStack.delete(execId);
      return false;
    };

    for (const execution of plan.executions) {
      if (hasCycle(execution.id)) {
        throw new Error('Circular dependency detected in orchestration plan');
      }
    }
  }

  private estimatePlanDuration(plan: OrchestrationPlan): number {
    // Simplified estimation based on configured average tool duration
    // In reality, this would be based on tool metadata and historical data
    const avgToolDuration = EXECUTION_CONSTANTS.AVG_TOOL_DURATION_MS;
    const maxParallel = this.config.maxConcurrentTools;
    const totalTools = plan.executions.length;

    return Math.ceil(totalTools / maxParallel) * avgToolDuration;
  }
}
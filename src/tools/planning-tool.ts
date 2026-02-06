/**
 * Planning Tool
 *
 * Provides planning capabilities as a tool that can be called by the agent.
 * Wraps TaskPlanner functionality to expose planning operations through the tool system.
 */

import { BaseTool, ToolMetadata, ToolResult, ToolExecutionContext } from './types.js';
import { TaskPlanner, TaskPlan, PlanningContext } from '../ai/task-planner.js';
import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';

export class PlanningTool extends BaseTool {
  private taskPlannerInstance: TaskPlanner | null = null;
  private taskPlannerFactory?: () => Promise<TaskPlanner> | TaskPlanner;

  metadata: ToolMetadata = {
    name: 'planning',
    description: 'Create, view, update, execute, and track task plans for complex multi-step coding tasks. Use this tool when breaking down complex requests into manageable steps. Operations: "create" = generate plan from request, "view" = display plan details, "update" = modify plan tasks, "execute" = run plan step-by-step, "status" = get execution progress.',
    category: 'planning',
    version: '1.0.0',
    parameters: [
      {
        name: 'operation',
        type: 'string',
        description: 'The planning operation to perform: "create" = generate task plan, "view" = display plan details, "update" = modify plan, "execute" = run plan, "status" = get progress',
        required: true,
        enum: ['create', 'view', 'update', 'execute', 'status'],
        validation: (value) => ['create', 'view', 'update', 'execute', 'status'].includes(value),
      },
      {
        name: 'request',
        type: 'string',
        description: 'User request for plan creation (required for "create" operation)',
        required: false,
      },
      {
        name: 'planId',
        type: 'string',
        description: 'Plan identifier (required for "view", "update", "execute", "status" operations)',
        required: false,
      },
      {
        name: 'includeContext',
        type: 'boolean',
        description: 'Whether to include project context when creating plan (default: true)',
        required: false,
        default: true,
      },
      {
        name: 'updates',
        type: 'object',
        description: 'Plan updates (required for "update" operation). Can include tasks, title, description, etc.',
        required: false,
      },
    ],
    examples: [
      {
        description: 'Create a plan for building a REST API',
        parameters: {
          operation: 'create',
          request: 'Build a REST API with authentication',
          includeContext: true,
        },
      },
      {
        description: 'View an existing plan',
        parameters: {
          operation: 'view',
          planId: 'plan-123',
        },
      },
      {
        description: 'Execute a plan',
        parameters: {
          operation: 'execute',
          planId: 'plan-123',
        },
      },
      {
        description: 'Get plan status',
        parameters: {
          operation: 'status',
          planId: 'plan-123',
        },
      },
    ],
  };

  constructor(taskPlanner?: TaskPlanner | (() => Promise<TaskPlanner> | TaskPlanner)) {
    super();
    if (taskPlanner) {
      if (typeof taskPlanner === 'function') {
        this.taskPlannerFactory = taskPlanner;
      } else {
        this.taskPlannerInstance = taskPlanner;
      }
    }
  }

  /**
   * Get TaskPlanner instance, creating it lazily if needed
   */
  private async getTaskPlanner(): Promise<TaskPlanner> {
    if (this.taskPlannerInstance) {
      return this.taskPlannerInstance;
    }

    if (this.taskPlannerFactory) {
      const planner = await this.taskPlannerFactory();
      this.taskPlannerInstance = planner;
      return planner;
    }

    // Try to get from AI module
    try {
      const { getTaskPlanner } = await import('../ai/index.js');
      const planner = getTaskPlanner();
      if (planner) {
        this.taskPlannerInstance = planner;
        return planner;
      }
    } catch (error) {
      logger.debug('Could not get TaskPlanner from AI module:', error);
    }

    throw new Error('TaskPlanner not available. Planning tool requires TaskPlanner to be initialized.');
  }

  async execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate operation parameter first
      const { operation } = parameters;
      if (!operation || typeof operation !== 'string') {
        return {
          success: false,
          error: 'operation parameter is required',
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
      }

      if (!['create', 'view', 'update', 'execute', 'status'].includes(operation)) {
        return {
          success: false,
          error: `Invalid operation: ${operation}. Valid operations: create, view, update, execute, status`,
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
      }

      // Validate operation-specific parameters
      const validationError = this.validateOperationParameters(operation, parameters);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
      }

      // Route to appropriate operation handler
      switch (operation) {
        case 'create':
          return await this.handleCreate(parameters, context);
        case 'view':
          return await this.handleView(parameters, context);
        case 'update':
          return await this.handleUpdate(parameters, context);
        case 'execute':
          return await this.handleExecute(parameters, context);
        case 'status':
          return await this.handleStatus(parameters, context);
        default:
          return {
            success: false,
            error: `Invalid operation: ${operation}. Valid operations: create, view, update, execute, status`,
            metadata: {
              executionTime: Date.now() - startTime,
            },
          };
      }
    } catch (error) {
      logger.error('Planning tool execution failed:', error);
      return {
        success: false,
        error: normalizeError(error).message,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Handle create operation
   */
  private async handleCreate(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const { request, includeContext = true } = parameters;

    if (!request || typeof request !== 'string') {
      return {
        success: false,
        error: 'request parameter is required for create operation',
      };
    }

    if (!context) {
      return {
        success: false,
        error: 'context parameter is required for create operation',
      };
    }

    try {
      // Build planning context from execution context
      const planningContext: PlanningContext = {
        projectRoot: context.projectRoot || process.cwd(),
        availableTools: [], // Would be populated from tool registry if needed
        projectLanguages: [], // Would be detected from project if needed
        codebaseSize: 'medium', // Would be determined from project analysis
        userExperience: 'intermediate',
        qualityRequirements: 'production',
      };

      // Create plan using TaskPlanner
      const taskPlanner = await this.getTaskPlanner();
      const plan = await taskPlanner.createPlan(request, planningContext);

      return {
        success: true,
        data: {
          planId: plan.id,
          title: plan.title,
          description: plan.description,
          tasks: plan.tasks,
          estimatedDuration: plan.estimatedDuration,
          status: plan.status,
          progress: plan.progress,
          metadata: plan.metadata,
          riskLevel: plan.riskLevel,
        },
        metadata: {
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error).message,
      };
    }
  }

  /**
   * Handle view operation
   */
  private async handleView(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const { planId } = parameters;

    if (!planId || typeof planId !== 'string') {
      return {
        success: false,
        error: 'planId parameter is required for view operation',
      };
    }

    try {
      const taskPlanner = await this.getTaskPlanner();
      const plan = taskPlanner.getPlan(planId);

      if (!plan) {
        return {
          success: false,
          error: `Plan with id "${planId}" not found`,
        };
      }

      return {
        success: true,
        data: {
          planId: plan.id,
          title: plan.title,
          description: plan.description,
          tasks: plan.tasks,
          dependencies: Array.from(plan.dependencies.entries()),
          estimatedDuration: plan.estimatedDuration,
          status: plan.status,
          progress: plan.progress,
          created: plan.created,
          started: plan.started,
          completed: plan.completed,
          metadata: plan.metadata,
          riskLevel: plan.riskLevel,
        },
        metadata: {
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error).message,
      };
    }
  }

  /**
   * Handle update operation
   */
  private async handleUpdate(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const { planId, updates } = parameters;

    if (!planId || typeof planId !== 'string') {
      return {
        success: false,
        error: 'planId parameter is required for update operation',
      };
    }

    if (!updates || typeof updates !== 'object') {
      return {
        success: false,
        error: 'updates parameter is required for update operation',
      };
    }

    try {
      const taskPlanner = await this.getTaskPlanner();
      const plan = taskPlanner.getPlan(planId);

      if (!plan) {
        return {
          success: false,
          error: `Plan with id "${planId}" not found`,
        };
      }

      // Apply updates to plan
      if (updates.title !== undefined) {
        plan.title = updates.title;
      }
      if (updates.description !== undefined) {
        plan.description = updates.description;
      }
      if (updates.tasks !== undefined && Array.isArray(updates.tasks)) {
        // Update tasks - merge with existing or replace
        for (const taskUpdate of updates.tasks) {
          const existingTask = plan.tasks.find((t) => t.id === taskUpdate.id);
          if (existingTask) {
            Object.assign(existingTask, taskUpdate);
          } else {
            // Add new task
            plan.tasks.push({
              id: taskUpdate.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: taskUpdate.title || 'Untitled Task',
              description: taskUpdate.description || '',
              type: taskUpdate.type || 'implementation',
              priority: taskUpdate.priority || 'medium',
              status: taskUpdate.status || 'pending',
              dependencies: taskUpdate.dependencies || [],
              estimatedDuration: taskUpdate.estimatedDuration || 15,
              toolsRequired: taskUpdate.toolsRequired || [],
              filesInvolved: taskUpdate.filesInvolved || [],
              acceptance_criteria: taskUpdate.acceptance_criteria || [],
              created: new Date(),
            });
          }
        }
        // Rebuild dependencies
        plan.dependencies = this.buildDependencyMap(plan.tasks);
        plan.progress.total = plan.tasks.length;
      }

      return {
        success: true,
        data: {
          planId: plan.id,
          title: plan.title,
          description: plan.description,
          tasks: plan.tasks,
          status: plan.status,
          progress: plan.progress,
        },
        metadata: {
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error).message,
      };
    }
  }

  /**
   * Handle execute operation
   */
  private async handleExecute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const { planId } = parameters;

    if (!planId || typeof planId !== 'string') {
      return {
        success: false,
        error: 'planId parameter is required for execute operation',
      };
    }

    try {
      const taskPlanner = await this.getTaskPlanner();
      const plan = taskPlanner.getPlan(planId);

      if (!plan) {
        return {
          success: false,
          error: `Plan with id "${planId}" not found`,
        };
      }

      // Execute plan
      await taskPlanner.executePlan(planId);

      // Get updated plan status
      const updatedPlan = taskPlanner.getPlan(planId);

      return {
        success: true,
        data: {
          planId: updatedPlan!.id,
          status: updatedPlan!.status,
          progress: updatedPlan!.progress,
          completed: updatedPlan!.completed,
        },
        metadata: {
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error).message,
      };
    }
  }

  /**
   * Handle status operation
   */
  private async handleStatus(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const { planId } = parameters;

    if (!planId || typeof planId !== 'string') {
      return {
        success: false,
        error: 'planId parameter is required for status operation',
      };
    }

    try {
      const taskPlanner = await this.getTaskPlanner();
      const plan = taskPlanner.getPlan(planId);

      if (!plan) {
        return {
          success: false,
          error: `Plan with id "${planId}" not found`,
        };
      }

      return {
        success: true,
        data: {
          planId: plan.id,
          title: plan.title,
          status: plan.status,
          progress: plan.progress,
          started: plan.started,
          completed: plan.completed,
          tasks: plan.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            progress: task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0,
          })),
        },
        metadata: {
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error).message,
      };
    }
  }

  /**
   * Build dependency map from tasks
   */
  private buildDependencyMap(tasks: any[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    for (const task of tasks) {
      dependencies.set(task.id, task.dependencies || []);
    }
    return dependencies;
  }

  /**
   * Validate operation-specific parameters and return error message if invalid
   */
  private validateOperationParameters(operation: string, parameters: Record<string, any>): string | null {
    switch (operation) {
      case 'create':
        if (!parameters.request || typeof parameters.request !== 'string' || parameters.request.length === 0) {
          return 'request parameter is required for create operation';
        }
        return null;
      case 'view':
      case 'execute':
      case 'status':
        if (!parameters.planId || typeof parameters.planId !== 'string' || parameters.planId.length === 0) {
          return 'planId parameter is required for ' + operation + ' operation';
        }
        return null;
      case 'update':
        if (!parameters.planId || typeof parameters.planId !== 'string' || parameters.planId.length === 0) {
          return 'planId parameter is required for update operation';
        }
        if (!parameters.updates || typeof parameters.updates !== 'object' || parameters.updates === null) {
          return 'updates parameter is required for update operation';
        }
        return null;
      default:
        return `Invalid operation: ${operation}`;
    }
  }

  /**
   * Override validateParameters to add custom validation
   */
  validateParameters(parameters: Record<string, any>): boolean {
    // First check base validation
    if (!super.validateParameters(parameters)) {
      return false;
    }

    const { operation } = parameters;
    if (!operation) {
      return false;
    }

    // Operation-specific validation
    return this.validateOperationParameters(operation, parameters) === null;
  }
}

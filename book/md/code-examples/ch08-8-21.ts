/**
 * Advanced orchestrator with parallel execution
 */
export class ParallelWorkflowOrchestrator extends WorkflowOrchestrator {
  /**
   * Build workflow with dependency analysis for parallel execution
   */
  protected buildWorkflow(
    commands: Array<{
      command: RoutableCommand;
      params: Record<string, any>;
    }>
  ): WorkflowPlan {
    // Build dependency graph
    const graph = new DependencyGraph();

    commands.forEach((cmd, index) => {
      graph.addNode(`step_${index}`, {
        command: cmd.command,
        params: cmd.params
      });
    });

    // Analyze dependencies
    for (let i = 0; i < commands.length; i++) {
      for (let j = i + 1; j < commands.length; j++) {
        if (this.hasDependency(commands[i], commands[j])) {
          graph.addEdge(`step_${i}`, `step_${j}`);
        }
      }
    }

    // Get execution levels (parallel groups)
    const levels = graph.getExecutionLevels();

    return {
      levels: levels.map(level =>
        level.map(nodeId => {
          const index = parseInt(nodeId.split('_')[1]);
          return commands[index];
        })
      )
    };
  }

  /**
   * Check if cmdB depends on cmdA
   */
  private hasDependency(
    cmdA: { command: RoutableCommand; params: any },
    cmdB: { command: RoutableCommand; params: any }
  ): boolean {
    // Example: test depends on commit
    if (cmdA.command.name === 'commit' && cmdB.command.name === 'test') {
      return true;
    }

    // Example: deploy depends on test
    if (cmdA.command.name === 'test' && cmdB.command.name === 'deploy') {
      return true;
    }

    // Could analyze parameter dependencies too

    return false;
  }

  /**
   * Execute workflow with parallel execution
   */
  async execute(
    input: string,
    context: CommandContext
  ): Promise<WorkflowResult> {
    const routing = await this.router.route(input, context);

    if (!routing.success || !routing.commands) {
      return {
        success: false,
        error: routing.error || 'Routing failed',
        steps: []
      };
    }

    const plan = this.buildWorkflow(routing.commands);
    const steps: WorkflowStep[] = [];
    let stepIndex = 0;

    // Execute each level (levels can run in parallel)
    for (const level of plan.levels) {
      // Execute all commands in level in parallel
      const promises = level.map(async ({ command, params }) => {
        const index = stepIndex++;

        const step: WorkflowStep = {
          index,
          command: command.name,
          params,
          status: 'running'
        };

        steps.push(step);
        this.displayProgress(steps);

        try {
          const result = await command.execute(params, context);

          step.result = result;
          step.status = result.success ? 'completed' : 'failed';

          this.displayProgress(steps);

          return { step, success: result.success };

        } catch (error) {
          step.status = 'failed';
          step.error = error.message;

          this.displayProgress(steps);

          return { step, success: false };
        }
      });

      const results = await Promise.all(promises);

      // Stop if any command in level failed
      const failed = results.find(r => !r.success);
      if (failed) {
        return {
          success: false,
          error: `Step ${failed.step.index + 1} failed`,
          steps
        };
      }
    }

    return {
      success: true,
      steps
    };
  }
}

interface WorkflowPlan {
  levels: Array<Array<{
    command: RoutableCommand;
    params: Record<string, any>;
  }>>;
}
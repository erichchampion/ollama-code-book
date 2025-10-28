/**
 * Orchestrates multi-step workflows
 */
export class WorkflowOrchestrator {
  private router: NaturalLanguageRouter;
  private logger: Logger;

  constructor(
    router: NaturalLanguageRouter,
    logger: Logger
  ) {
    this.router = router;
    this.logger = logger;
  }

  /**
   * Execute workflow from natural language input
   */
  async execute(
    input: string,
    context: CommandContext
  ): Promise<WorkflowResult> {
    // Route input to commands
    const routing = await this.router.route(input, context);

    if (!routing.success || !routing.commands) {
      return {
        success: false,
        error: routing.error || 'Routing failed',
        steps: []
      };
    }

    // Build workflow
    const workflow = this.buildWorkflow(routing.commands);

    // Execute workflow
    const steps: WorkflowStep[] = [];

    for (let i = 0; i < workflow.length; i++) {
      const { command, params } = workflow[i];

      const step: WorkflowStep = {
        index: i,
        command: command.name,
        params,
        status: 'pending'
      };

      steps.push(step);

      // Update status
      step.status = 'running';
      this.displayProgress(steps);

      try {
        // Execute command
        const result = await command.execute(params, {
          ...context,
          // Add results from previous steps to context
          previousSteps: steps.slice(0, i).map(s => ({
            command: s.command,
            result: s.result
          }))
        });

        step.result = result;
        step.status = result.success ? 'completed' : 'failed';

        this.displayProgress(steps);

        // Stop on failure (unless command is optional)
        if (!result.success && !this.isOptional(command)) {
          return {
            success: false,
            error: `Step ${i + 1} failed: ${result.error}`,
            steps
          };
        }

      } catch (error) {
        step.status = 'failed';
        step.error = error.message;

        this.displayProgress(steps);

        return {
          success: false,
          error: `Step ${i + 1} threw error: ${error.message}`,
          steps
        };
      }
    }

    return {
      success: true,
      steps
    };
  }

  /**
   * Build workflow from commands (resolve dependencies)
   */
  private buildWorkflow(
    commands: Array<{
      command: RoutableCommand;
      params: Record<string, any>;
    }>
  ): Array<{
    command: RoutableCommand;
    params: Record<string, any>;
  }> {
    // For now, execute in order
    // Future: analyze dependencies and parallelize independent steps
    return commands;
  }

  /**
   * Check if command is optional (failure doesn't stop workflow)
   */
  private isOptional(command: RoutableCommand): boolean {
    // Could be metadata on command
    return false;
  }

  /**
   * Display workflow progress
   */
  private displayProgress(steps: WorkflowStep[]): void {
    console.clear();
    console.log('\n📋 Workflow Progress:\n');

    for (const step of steps) {
      const icon = this.getStatusIcon(step.status);
      const name = step.command;

      console.log(`${icon} Step ${step.index + 1}: ${name}`);

      if (step.status === 'completed' && step.result?.message) {
        console.log(`  ✓ ${step.result.message}`);
      } else if (step.status === 'failed') {
        console.log(`  ✗ ${step.result?.error || step.error}`);
      }
    }

    console.log('');
  }

  private getStatusIcon(status: WorkflowStepStatus): string {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'running':
        return '▶️ ';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
    }
  }
}

export interface WorkflowResult {
  success: boolean;
  error?: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  index: number;
  command: string;
  params: Record<string, any>;
  status: WorkflowStepStatus;
  result?: CommandResult;
  error?: string;
}

export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed';
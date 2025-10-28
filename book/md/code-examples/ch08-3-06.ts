/**
 * Routes natural language input to appropriate commands
 */
export class NaturalLanguageRouter {
  private intentClassifier: IntentClassifier;
  private commandRegistry: CommandRegistry;
  private parameterInferenceEngine: ParameterInferenceEngine;
  private logger: Logger;

  constructor(
    aiProvider: AIProvider,
    commandRegistry: CommandRegistry,
    logger: Logger
  ) {
    this.intentClassifier = new IntentClassifier(aiProvider);
    this.commandRegistry = commandRegistry;
    this.parameterInferenceEngine = new ParameterInferenceEngine(aiProvider);
    this.logger = logger;
  }

  /**
   * Route natural language input to command(s)
   */
  async route(
    input: string,
    context: CommandContext
  ): Promise<RoutingResult> {
    this.logger.debug('Routing input:', input);

    // Step 1: Classify intent(s)
    const matches = await this.intentClassifier.classify(input, context);

    if (matches.length === 0) {
      return {
        success: false,
        error: 'Could not understand intent. Please rephrase or use specific command.'
      };
    }

    // Step 2: Route to commands
    const commands: Array<{
      command: RoutableCommand;
      params: Record<string, any>;
    }> = [];

    for (const match of matches) {
      // Get command from registry
      const command = await this.commandRegistry.get(match.intent.commandClass);

      if (!command) {
        this.logger.warn(`No command found for intent: ${match.intent.name}`);
        continue;
      }

      // Step 3: Infer missing parameters
      let params = match.extractedParams;

      if (match.missingParams.length > 0 && command.inferParameters) {
        const inferred = await command.inferParameters(params, {
          ...context,
          userInput: input,
          extractedParams: params
        });

        params = { ...params, ...inferred };
      }

      // Step 4: Validate parameters
      const validation = command.validateParameters(params);

      if (!validation.valid) {
        // Try to fix validation errors through user interaction
        params = await this.fixValidationErrors(
          command,
          params,
          validation.errors,
          context
        );
      }

      commands.push({ command, params });
    }

    return {
      success: true,
      commands,
      matches
    };
  }

  /**
   * Attempt to fix validation errors through user interaction
   */
  private async fixValidationErrors(
    command: RoutableCommand,
    params: Record<string, any>,
    errors: ValidationError[],
    context: CommandContext
  ): Promise<Record<string, any>> {
    const fixed = { ...params };

    for (const error of errors) {
      const paramDef = command.parameters[error.parameter];

      if (!paramDef) continue;

      // Ask user for missing/invalid parameter
      console.log(`\n❓ ${paramDef.description}`);

      if (paramDef.enum) {
        console.log(`   Options: ${paramDef.enum.join(', ')}`);
      }

      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>(resolve => {
        rl.question(`   > `, resolve);
      });

      rl.close();

      // Parse answer based on type
      fixed[error.parameter] = this.parseParameter(answer, paramDef.type);
    }

    return fixed;
  }

  private parseParameter(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value.toLowerCase() === 'true' || value === '1';
      case 'array':
        return value.split(',').map(s => s.trim());
      case 'object':
        return JSON.parse(value);
      default:
        return value;
    }
  }
}

export interface RoutingResult {
  success: boolean;
  commands?: Array<{
    command: RoutableCommand;
    params: Record<string, any>;
  }>;
  matches?: IntentMatch[];
  error?: string;
}
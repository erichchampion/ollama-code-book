/**
 * Base interface for all routable commands
 */
export interface RoutableCommand {
  /** Command name */
  readonly name: string;

  /** Command description */
  readonly description: string;

  /** Parameter schema */
  readonly parameters: CommandParameters;

  /**
   * Execute the command
   * @param params - Command parameters (may be incomplete)
   * @param context - Execution context
   */
  execute(
    params: Record<string, any>,
    context: CommandContext
  ): Promise<CommandResult>;

  /**
   * Infer missing parameters from context
   * @param params - Provided parameters
   * @param context - Inference context
   */
  inferParameters?(
    params: Record<string, any>,
    context: InferenceContext
  ): Promise<Record<string, any>>;

  /**
   * Validate parameters before execution
   * @param params - Parameters to validate
   */
  validateParameters(params: Record<string, any>): ValidationResult;
}

export interface CommandParameters {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    default?: any;
    enum?: any[];
  };
}

export interface CommandContext {
  workingDirectory: string;
  conversationHistory: Message[];
  gitStatus?: GitStatus;
  projectStructure?: ProjectStructure;
  aiProvider: AIProvider;
  cancellationToken: CancellationToken;
}

export interface InferenceContext extends CommandContext {
  userInput: string;
  extractedParams: Record<string, any>;
}
/**
 * Commit command - creates git commits with AI-generated messages
 */
export class CommitCommand implements RoutableCommand {
  readonly name = 'commit';
  readonly description = 'Create a git commit with AI-generated message';

  readonly parameters: CommandParameters = {
    files: {
      type: 'array',
      description: 'Files to commit (default: all staged)',
      required: false
    },
    message: {
      type: 'string',
      description: 'Commit message (default: AI-generated)',
      required: false
    },
    scope: {
      type: 'string',
      description: 'Commit scope (e.g., "auth", "api")',
      required: false
    },
    noVerify: {
      type: 'boolean',
      description: 'Skip git hooks',
      required: false,
      default: false
    }
  };

  constructor(
    private gitService: GitService,
    private aiProvider: AIProvider,
    private logger: Logger
  ) {}

  async execute(
    params: Record<string, any>,
    context: CommandContext
  ): Promise<CommandResult> {
    try {
      // Stage files if specified
      if (params.files && params.files.length > 0) {
        await this.gitService.add(params.files);
      }

      // Get diff
      const diff = await this.gitService.diff({ staged: true });

      if (diff.files.length === 0) {
        return {
          success: false,
          error: 'No changes to commit'
        };
      }

      // Generate message if not provided
      let message = params.message;

      if (!message) {
        this.logger.info('Generating commit message...');

        const generator = new CommitMessageGenerator(this.aiProvider);
        const generated = await generator.generate(diff, {
          scope: params.scope,
          conversationHistory: context.conversationHistory
        });

        message = generated.message;

        console.log(`\n📝 Generated commit message:\n${message}\n`);
      }

      // Create commit
      await this.gitService.commit({
        message,
        noVerify: params.noVerify
      });

      return {
        success: true,
        message: `Committed: ${message.split('\n')[0]}`
      };

    } catch (error) {
      return {
        success: false,
        error: `Commit failed: ${error.message}`
      };
    }
  }

  async inferParameters(
    params: Record<string, any>,
    context: InferenceContext
  ): Promise<Record<string, any>> {
    const inferred: Record<string, any> = {};

    // Infer files from scope if mentioned
    if (params.scope && !params.files) {
      const gitStatus = context.gitStatus || await this.gitService.status();

      // Find files matching scope
      const scopeFiles = gitStatus.files.filter(file =>
        file.path.includes(params.scope)
      );

      if (scopeFiles.length > 0) {
        inferred.files = scopeFiles.map(f => f.path);
      }
    }

    // Infer scope from files if not specified
    if (!params.scope && params.files && params.files.length > 0) {
      // Try to infer scope from common path
      const paths = params.files.map((f: string) => f.split('/'));

      // Find common directory
      if (paths.length > 0 && paths[0].length > 1) {
        const commonDir = paths[0][paths[0].length - 2]; // Parent directory
        inferred.scope = commonDir;
      }
    }

    return inferred;
  }

  validateParameters(params: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate files array
    if (params.files) {
      if (!Array.isArray(params.files)) {
        errors.push({
          parameter: 'files',
          message: 'Files must be an array'
        });
      }
    }

    // Validate message format
    if (params.message) {
      if (typeof params.message !== 'string') {
        errors.push({
          parameter: 'message',
          message: 'Message must be a string'
        });
      } else if (params.message.length === 0) {
        errors.push({
          parameter: 'message',
          message: 'Message cannot be empty'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  parameter: string;
  message: string;
}
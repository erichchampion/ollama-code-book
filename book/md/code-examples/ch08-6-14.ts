/**
 * Infers missing command parameters from context
 */
export class ParameterInferenceEngine {
  private aiProvider: AIProvider;
  private logger: Logger;

  constructor(aiProvider: AIProvider, logger: Logger) {
    this.aiProvider = aiProvider;
    this.logger = logger;
  }

  /**
   * Infer parameters using multiple strategies
   */
  async infer(
    command: RoutableCommand,
    providedParams: Record<string, any>,
    context: InferenceContext
  ): Promise<Record<string, any>> {
    const inferred: Record<string, any> = {};

    // Strategy 1: Command-specific inference
    if (command.inferParameters) {
      const commandInferred = await command.inferParameters(providedParams, context);
      Object.assign(inferred, commandInferred);
    }

    // Strategy 2: File system analysis
    const fsInferred = await this.inferFromFileSystem(
      command,
      providedParams,
      context
    );
    Object.assign(inferred, fsInferred);

    // Strategy 3: Git analysis
    const gitInferred = await this.inferFromGit(
      command,
      providedParams,
      context
    );
    Object.assign(inferred, gitInferred);

    // Strategy 4: Conversation history
    const conversationInferred = await this.inferFromConversation(
      command,
      providedParams,
      context
    );
    Object.assign(inferred, conversationInferred);

    // Strategy 5: Project structure
    const projectInferred = await this.inferFromProject(
      command,
      providedParams,
      context
    );
    Object.assign(inferred, projectInferred);

    // Strategy 6: AI-powered inference (last resort)
    const aiInferred = await this.inferWithAI(
      command,
      providedParams,
      context,
      inferred
    );
    Object.assign(inferred, aiInferred);

    this.logger.debug('Parameter inference results:', inferred);

    return inferred;
  }

  /**
   * Infer from file system
   */
  private async inferFromFileSystem(
    command: RoutableCommand,
    providedParams: Record<string, any>,
    context: InferenceContext
  ): Promise<Record<string, any>> {
    const inferred: Record<string, any> = {};

    // Example: Infer test files for test command
    if (command.name === 'test' && !providedParams.files) {
      const fs = await import('fs/promises');
      const path = await import('path');

      try {
        // Look for test directories
        const entries = await fs.readdir(context.workingDirectory, {
          withFileTypes: true
        });

        const testDirs = entries
          .filter(e => e.isDirectory())
          .filter(e => e.name === 'test' || e.name === 'tests' || e.name === '__tests__')
          .map(e => e.name);

        if (testDirs.length > 0) {
          inferred.files = testDirs;
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return inferred;
  }

  /**
   * Infer from git status
   */
  private async inferFromGit(
    command: RoutableCommand,
    providedParams: Record<string, any>,
    context: InferenceContext
  ): Promise<Record<string, any>> {
    const inferred: Record<string, any> = {};

    if (!context.gitStatus) {
      return inferred;
    }

    // Example: Infer files for commit command
    if (command.name === 'commit' && !providedParams.files) {
      const stagedFiles = context.gitStatus.files
        .filter(f => f.staged)
        .map(f => f.path);

      if (stagedFiles.length > 0) {
        inferred.files = stagedFiles;
      }
    }

    // Example: Infer branch for review command
    if (command.name === 'review' && !providedParams.branch) {
      inferred.branch = context.gitStatus.branch;
    }

    return inferred;
  }

  /**
   * Infer from conversation history
   */
  private async inferFromConversation(
    command: RoutableCommand,
    providedParams: Record<string, any>,
    context: InferenceContext
  ): Promise<Record<string, any>> {
    const inferred: Record<string, any> = {};

    if (context.conversationHistory.length === 0) {
      return inferred;
    }

    // Look for mentions in recent messages
    const recentMessages = context.conversationHistory.slice(-5);

    for (const message of recentMessages) {
      // Extract PR numbers
      const prMatch = message.content.match(/PR\s*#?(\d+)/i);
      if (prMatch && !providedParams.pr) {
        inferred.pr = parseInt(prMatch[1]);
      }

      // Extract file paths
      const fileMatches = message.content.match(/(?:src|test|lib)\/[\w\/.]+/g);
      if (fileMatches && !providedParams.files) {
        inferred.files = fileMatches;
      }

      // Extract scope/module names
      const scopeMatch = message.content.match(/(?:auth|api|ui|core|utils|database)\b/i);
      if (scopeMatch && !providedParams.scope) {
        inferred.scope = scopeMatch[0].toLowerCase();
      }
    }

    return inferred;
  }

  /**
   * Infer from project structure
   */
  private async inferFromProject(
    command: RoutableCommand,
    providedParams: Record<string, any>,
    context: InferenceContext
  ): Promise<Record<string, any>> {
    const inferred: Record<string, any> = {};

    if (!context.projectStructure) {
      return inferred;
    }

    // Example: Infer test command from package.json
    if (command.name === 'test' && !providedParams.command) {
      const packageJson = context.projectStructure.packageJson;

      if (packageJson?.scripts?.test) {
        inferred.command = `npm test`;
      } else if (packageJson?.scripts?.['test:unit']) {
        inferred.command = `npm run test:unit`;
      }
    }

    // Example: Infer source directories
    if (!providedParams.files) {
      const srcDirs = context.projectStructure.directories.filter(
        d => d.name === 'src' || d.name === 'lib'
      );

      if (srcDirs.length > 0) {
        inferred.sourceDir = srcDirs[0].path;
      }
    }

    return inferred;
  }

  /**
   * Infer using AI (last resort for complex cases)
   */
  private async inferWithAI(
    command: RoutableCommand,
    providedParams: Record<string, any>,
    context: InferenceContext,
    alreadyInferred: Record<string, any>
  ): Promise<Record<string, any>> {
    // Only use AI if we still have missing required parameters
    const missingParams = this.getMissingRequiredParams(
      command,
      { ...providedParams, ...alreadyInferred }
    );

    if (missingParams.length === 0) {
      return {};
    }

    this.logger.debug('Using AI to infer missing params:', missingParams);

    const prompt = this.buildInferencePrompt(
      command,
      providedParams,
      alreadyInferred,
      missingParams,
      context
    );

    const response = await this.aiProvider.complete({
      messages: [
        {
          role: MessageRole.SYSTEM,
          content: 'You infer missing command parameters from context. Respond with JSON only.'
        },
        {
          role: MessageRole.USER,
          content: prompt
        }
      ],
      temperature: 0.1,
      maxTokens: 500
    });

    try {
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
      const json = jsonMatch ? jsonMatch[1] : response.content;

      return JSON.parse(json);
    } catch (error) {
      this.logger.warn('Failed to parse AI inference response:', error);
      return {};
    }
  }

  private buildInferencePrompt(
    command: RoutableCommand,
    providedParams: Record<string, any>,
    alreadyInferred: Record<string, any>,
    missingParams: string[],
    context: InferenceContext
  ): string {
    return `
Infer the following missing parameters for the "${command.name}" command.

# User Input
"${context.userInput}"

# Command Description
${command.description}

# Parameters Already Provided
${JSON.stringify({ ...providedParams, ...alreadyInferred }, null, 2)}

# Missing Parameters
${missingParams.map(p => {
  const def = command.parameters[p];
  return `- ${p}: ${def.description} (type: ${def.type})`;
}).join('\n')}

# Context
Working directory: ${context.workingDirectory}
${context.gitStatus ? `Git: ${context.gitStatus.files.length} changed files` : ''}
${context.conversationHistory.length > 0 ? `Recent conversation: ${context.conversationHistory.slice(-2).map(m => m.content.substring(0, 50)).join('; ')}` : ''}

# Task
Infer values for the missing parameters based on the user input and context.
Only include parameters you can confidently infer.

# Output
\`\`\`json
{
  "param1": "inferred_value",
  "param2": "inferred_value"
}
\`\`\`
    `.trim();
  }

  private getMissingRequiredParams(
    command: RoutableCommand,
    params: Record<string, any>
  ): string[] {
    return Object.entries(command.parameters)
      .filter(([name, def]) => def.required && !(name in params))
      .map(([name]) => name);
  }
}

export interface ProjectStructure {
  packageJson?: any;
  directories: Array<{ name: string; path: string }>;
  files: string[];
}
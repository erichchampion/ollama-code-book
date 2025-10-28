/**
 * Intent Analyzer
 *
 * Analyzes user input to determine intent, extract entities, and assess complexity
 * for autonomous task planning and execution.
 */

import { logger } from '../utils/logger.js';
import { OllamaClient } from './ollama-client.js';
import { ProjectContext } from './context.js';
import { AI_ENTITY_EXTRACTION_TIMEOUT, AI_INTENT_ANALYSIS_TIMEOUT } from '../constants.js';
import { AI_CONSTANTS, THRESHOLD_CONSTANTS } from '../config/constants.js';

export interface UserIntent {
  type: 'task_request' | 'question' | 'command' | 'clarification' | 'conversation' | 'task_execution';
  action: string;
  entities: {
    files: string[];
    directories: string[];
    functions: string[];
    classes: string[];
    technologies: string[];
    concepts: string[];
    variables: string[];
  };
  confidence: number; // 0-1 scale
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  multiStep: boolean;
  requiresClarification: boolean;
  suggestedClarifications: string[];
  estimatedDuration: number; // in minutes
  riskLevel: 'low' | 'medium' | 'high';
  context: {
    projectAware: boolean;
    fileSpecific: boolean;
    followUp: boolean;
    references: string[];
  };
}

export interface AnalysisContext {
  conversationHistory: string[];
  projectContext?: ProjectContext;
  workingDirectory: string;
  recentFiles: string[];
  lastIntent?: UserIntent;
}

export interface EntityExtractionResult {
  entities: UserIntent['entities'];
  confidence: number;
  ambiguousReferences: string[];
}

export class IntentAnalyzer {
  private aiClient: OllamaClient;
  private entityPatterns: Map<string, RegExp[]> = new Map();
  private intentKeywords: Map<UserIntent['type'], string[]> = new Map();
  private complexityIndicators: Map<UserIntent['complexity'], string[]> = new Map();

  constructor(aiClient: OllamaClient) {
    this.aiClient = aiClient;
    this.initializePatterns();
  }

  /**
   * Analyze user input to determine intent and extract entities
   */
  async analyze(input: string, context: AnalysisContext): Promise<UserIntent> {
    const startTime = performance.now();

    try {
      logger.debug('Analyzing user intent', { input: input.substring(0, 100) });

      // Normalize input
      const normalizedInput = this.normalizeInput(input);

      // Extract entities first (faster, helps with context)
      const entityResult = await this.extractEntities(normalizedInput, context);

      // Classify intent type
      const intentType = await this.classifyIntent(normalizedInput, context, entityResult);

      // Determine action and complexity
      const action = await this.extractAction(normalizedInput, intentType);
      const complexity = this.assessComplexity(normalizedInput, entityResult, context);

      // Check if multi-step
      const multiStep = this.isMultiStep(normalizedInput, complexity);

      // Assess clarification needs
      const clarificationAnalysis = this.assessClarificationNeeds(
        normalizedInput,
        entityResult,
        context
      );

      // Estimate duration and risk
      const estimatedDuration = this.estimateDuration(complexity, multiStep, entityResult);
      const riskLevel = this.assessRiskLevel(intentType, complexity, entityResult);

      // Build context information
      const intentContext = this.buildIntentContext(normalizedInput, entityResult, context);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(
        intentType,
        entityResult,
        clarificationAnalysis,
        context
      );

      const intent: UserIntent = {
        type: intentType,
        action,
        entities: entityResult.entities,
        confidence,
        complexity,
        multiStep,
        requiresClarification: clarificationAnalysis.required,
        suggestedClarifications: clarificationAnalysis.suggestions,
        estimatedDuration,
        riskLevel,
        context: intentContext
      };

      const duration = performance.now() - startTime;
      logger.debug('Intent analysis completed', {
        duration: `${duration.toFixed(2)}ms`,
        type: intent.type,
        confidence: intent.confidence,
        complexity: intent.complexity
      });

      return intent;

    } catch (error) {
      logger.error('Intent analysis failed:', error);

      // Return fallback intent
      return this.createFallbackIntent(input, context);
    }
  }

  /**
   * Extract entities from user input using pattern matching and AI
   */
  private async extractEntities(
    input: string,
    context: AnalysisContext
  ): Promise<EntityExtractionResult> {
    const entities: UserIntent['entities'] = {
      files: [],
      directories: [],
      functions: [],
      classes: [],
      technologies: [],
      concepts: [],
      variables: []
    };

    // Pattern-based extraction (fast)
    this.extractEntitiesWithPatterns(input, entities, context);

    // AI-enhanced extraction for complex cases
    if (context.projectContext && entities.files.length === 0) {
      await this.extractEntitiesWithAI(input, entities, context);
    }

    // Resolve ambiguous file references
    const ambiguousReferences = this.findAmbiguousReferences(entities, context);

    // Calculate confidence based on extraction quality
    const confidence = this.calculateEntityConfidence(entities, ambiguousReferences);

    return {
      entities,
      confidence,
      ambiguousReferences
    };
  }

  /**
   * Extract entities using pattern matching
   */
  private extractEntitiesWithPatterns(
    input: string,
    entities: UserIntent['entities'],
    context: AnalysisContext
  ): void {
    // File patterns
    const filePatterns = [
      /(?:file|src|\.\/|\/)?([a-zA-Z0-9_-]+\.[a-zA-Z]{1,4})/g,
      /(?:in|from|edit|modify|update)\s+([a-zA-Z0-9_/-]+\.(?:js|ts|py|java|cpp|c|go|rs|php|rb))/g
    ];

    // Directory patterns
    const dirPatterns = [
      /(?:directory|folder|dir)\s+([a-zA-Z0-9_/-]+)/g,
      /(?:in|from)\s+([a-zA-Z0-9_/-]+\/)/g
    ];

    // Function patterns
    const functionPatterns = [
      /(?:function|method|func)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g
    ];

    // Class patterns
    const classPatterns = [
      /(?:class|interface|type)\s+([A-Z][a-zA-Z0-9_]*)/g,
      /new\s+([A-Z][a-zA-Z0-9_]*)/g
    ];

    // Technology patterns
    const techPatterns = [
      /(?:using|with|in)\s+(React|Vue|Angular|Express|FastAPI|Django|Spring|Laravel)/gi,
      /(JavaScript|TypeScript|Python|Java|C\+\+|Go|Rust|PHP|Ruby)/gi,
      /(Node\.js|npm|yarn|pip|maven|gradle|cargo|composer)/gi,
      /(testing|test|framework|jest|mocha|jasmine|pytest|junit|cypress|playwright|vitest)/gi,
      /(?:testing|test).*(?:framework|suite|setup|environment)/gi,
      /(?:framework|system|environment|infrastructure|project).*(?:testing|test)/gi
    ];

    // Apply patterns
    this.applyPatterns(filePatterns, input, entities.files);
    this.applyPatterns(dirPatterns, input, entities.directories);
    this.applyPatterns(functionPatterns, input, entities.functions);
    this.applyPatterns(classPatterns, input, entities.classes);
    this.applyPatterns(techPatterns, input, entities.technologies);

    // Extract concepts based on keywords
    this.extractConcepts(input, entities.concepts);

    // Clean and deduplicate
    this.cleanEntities(entities);
  }

  /**
   * Enhanced entity extraction using AI for complex cases
   */
  private async extractEntitiesWithAI(
    input: string,
    entities: UserIntent['entities'],
    context: AnalysisContext
  ): Promise<void> {
    if (!context.projectContext) return;

    const prompt = `
Analyze this user request and extract specific entities:
"${input}"

Project context:
- Working directory: ${context.workingDirectory}
- Recent files: ${context.recentFiles.join(', ')}
- Project files: ${context.projectContext.allFiles.slice(0, 20).map(f => f.path).join(', ')}

Extract and return ONLY a JSON object with these fields:
{
  "files": ["exact file paths mentioned or implied"],
  "functions": ["function names mentioned"],
  "classes": ["class names mentioned"],
  "technologies": ["technologies or frameworks mentioned"]
}

Be precise and only include entities that are clearly referenced.`;

    try {
      // Add timeout to prevent hanging - uses centralized constant
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI entity extraction timeout')), AI_ENTITY_EXTRACTION_TIMEOUT);
      });

      const response = await Promise.race([
        this.aiClient.complete(prompt, {
          temperature: AI_CONSTANTS.ANALYSIS_TEMPERATURE
        }),
        timeoutPromise
      ]) as any;

      if (response.message?.content) {
        const aiEntities = this.parseAIEntityResponse(response.message.content);
        this.mergeEntities(entities, aiEntities);
      }
    } catch (error) {
      logger.debug('AI entity extraction failed, using pattern-based only:', error);
    }
  }

  /**
   * Classify the type of user intent
   */
  private async classifyIntent(
    input: string,
    context: AnalysisContext,
    entityResult: EntityExtractionResult
  ): Promise<UserIntent['type']> {
    // Quick classification using keywords
    const quickClassification = this.quickClassifyIntent(input);
    if (quickClassification && entityResult.confidence > 0.7) {
      return quickClassification;
    }

    // AI-based classification for complex cases
    return await this.aiClassifyIntent(input, context);
  }

  /**
   * Quick intent classification using keywords
   */
  private quickClassifyIntent(input: string): UserIntent['type'] | null {
    const normalized = input.toLowerCase();

    // Task request indicators
    const taskKeywords = [
      'create', 'add', 'implement', 'build', 'make', 'generate', 'write',
      'refactor', 'fix', 'update', 'modify', 'change', 'improve', 'optimize',
      'delete', 'remove', 'rename', 'move', 'copy', 'install', 'setup'
    ];

    // Question indicators
    const questionKeywords = [
      'what', 'how', 'why', 'when', 'where', 'which', 'who',
      'explain', 'describe', 'tell me', 'show me', 'help'
    ];

    // Command indicators
    const commandKeywords = [
      'run', 'execute', 'start', 'stop', 'test', 'build', 'deploy',
      'list', 'show', 'display', 'search', 'find'
    ];

    // Confirmation indicators
    const confirmationKeywords = [
      'yes', 'y', 'ok', 'okay', 'sure', 'proceed', 'continue', 'go ahead',
      'execute', 'run', 'do it', 'start', 'launch', 'begin'
    ];

    // Negative confirmation indicators
    const negativeKeywords = [
      'no', 'n', 'cancel', 'abort', 'stop', 'never mind', 'nevermind'
    ];

    // Check for confirmation patterns first (short responses are likely confirmations)
    if (normalized.length <= 20) {
      if (confirmationKeywords.some(keyword => normalized.includes(keyword))) {
        return 'task_execution';
      }
      if (negativeKeywords.some(keyword => normalized.includes(keyword))) {
        return 'task_execution';
      }
    }

    if (taskKeywords.some(keyword => normalized.includes(keyword))) {
      return 'task_request';
    }

    if (questionKeywords.some(keyword => normalized.includes(keyword))) {
      return 'question';
    }

    if (commandKeywords.some(keyword => normalized.includes(keyword))) {
      return 'command';
    }

    // Check for question patterns
    if (normalized.includes('?') || normalized.startsWith('how') || normalized.startsWith('what')) {
      return 'question';
    }

    return null;
  }

  /**
   * AI-based intent classification
   */
  private async aiClassifyIntent(
    input: string,
    context: AnalysisContext
  ): Promise<UserIntent['type']> {
    const prompt = `
Classify this user input into one of these categories:
- task_request: User wants something to be done (create, modify, fix, implement)
- question: User wants information or explanation
- command: User wants to execute a specific action
- clarification: User is providing additional information
- conversation: General conversation or unclear intent

Input: "${input}"

Context: ${context.conversationHistory.length > 0 ? `Previous: ${context.conversationHistory[context.conversationHistory.length - 1]}` : 'No previous context'}

Return ONLY the category name.`;

    try {
      // Add timeout to prevent hanging - uses centralized constant
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI classification timeout')), AI_INTENT_ANALYSIS_TIMEOUT);
      });

      const response = await Promise.race([
        this.aiClient.complete(prompt, {
          temperature: AI_CONSTANTS.ANALYSIS_TEMPERATURE
        }),
        timeoutPromise
      ]) as any;

      const classification = response.message?.content?.trim().toLowerCase();

      const validTypes: UserIntent['type'][] = [
        'task_request', 'question', 'command', 'clarification', 'conversation'
      ];

      if (classification && validTypes.includes(classification as UserIntent['type'])) {
        return classification as UserIntent['type'];
      }
    } catch (error) {
      logger.debug('AI intent classification failed:', error);
    }

    // Fallback to conversation
    return 'conversation';
  }

  /**
   * Extract the main action from the input
   */
  private async extractAction(input: string, intentType: UserIntent['type']): Promise<string> {
    const normalized = input.toLowerCase().trim();

    // For commands, extract the command verb
    if (intentType === 'command') {
      const commandMatch = normalized.match(/^(run|execute|start|stop|test|build|deploy|list|show|search|find)\s/);
      if (commandMatch) {
        return commandMatch[1];
      }
    }

    // For task requests, extract the action verb
    if (intentType === 'task_request') {
      const actionMatch = normalized.match(/(create|add|implement|build|make|generate|write|refactor|fix|update|modify|change|improve|optimize|delete|remove|rename|move|copy|install|setup)/);
      if (actionMatch) {
        return actionMatch[1];
      }
    }

    // For questions, extract the question type
    if (intentType === 'question') {
      const questionMatch = normalized.match(/(what|how|why|when|where|which|who|explain|describe)/);
      if (questionMatch) {
        return questionMatch[1];
      }
    }

    // Return the first few words as the action
    return input.split(' ').slice(0, 3).join(' ');
  }

  /**
   * Assess the complexity of the request
   */
  private assessComplexity(
    input: string,
    entityResult: EntityExtractionResult,
    context: AnalysisContext
  ): UserIntent['complexity'] {
    let complexityScore = 0;

    // Input length factor
    if (input.length > 200) complexityScore += 1;
    if (input.length > 500) complexityScore += 1;

    // Entity count factor
    const totalEntities = Object.values(entityResult.entities)
      .reduce((sum, arr) => sum + arr.length, 0);
    if (totalEntities > 5) complexityScore += 1;
    if (totalEntities > 10) complexityScore += 1;

    // Multiple file involvement
    if (entityResult.entities.files.length > 3) complexityScore += 1;
    if (entityResult.entities.files.length > 8) complexityScore += 1;

    // Technology complexity
    if (entityResult.entities.technologies.length > 2) complexityScore += 1;

    // Keywords indicating complexity
    const complexityKeywords = [
      'architecture', 'refactor', 'migrate', 'integrate', 'optimize',
      'design pattern', 'microservice', 'database', 'api', 'framework'
    ];
    const hasComplexKeywords = complexityKeywords.some(keyword =>
      input.toLowerCase().includes(keyword)
    );
    if (hasComplexKeywords) complexityScore += 2;

    // Multiple actions
    const actionWords = ['and', 'then', 'also', 'additionally', 'furthermore'];
    const hasMultipleActions = actionWords.some(word =>
      input.toLowerCase().includes(word)
    );
    if (hasMultipleActions) complexityScore += 1;

    // Return complexity based on score
    if (complexityScore <= 1) return 'simple';
    if (complexityScore <= 3) return 'moderate';
    if (complexityScore <= 5) return 'complex';
    return 'expert';
  }

  /**
   * Determine if this is a multi-step request
   */
  private isMultiStep(input: string, complexity: UserIntent['complexity']): boolean {
    const normalized = input.toLowerCase();

    // Explicit multi-step indicators
    const multiStepIndicators = [
      'and then', 'after that', 'next', 'also', 'additionally',
      'furthermore', 'step by step', 'phase', 'first', 'second',
      'finally', 'lastly'
    ];

    const hasMultiStepIndicators = multiStepIndicators.some(indicator =>
      normalized.includes(indicator)
    );

    // Complex tasks are often multi-step
    const isComplexTask = complexity === 'complex' || complexity === 'expert';

    // Multiple verbs might indicate multiple steps
    const actionVerbs = [
      'create', 'add', 'implement', 'build', 'make', 'generate',
      'refactor', 'fix', 'update', 'modify', 'test', 'deploy'
    ];

    const verbCount = actionVerbs.filter(verb => normalized.includes(verb)).length;

    return hasMultiStepIndicators || isComplexTask || verbCount > 2;
  }

  /**
   * Assess if clarification is needed
   */
  private assessClarificationNeeds(
    input: string,
    entityResult: EntityExtractionResult,
    context: AnalysisContext
  ): { required: boolean; suggestions: string[] } {
    const suggestions: string[] = [];

    // Check for ambiguous file references
    if (entityResult.ambiguousReferences.length > 0) {
      suggestions.push(`Which specific file did you mean: ${entityResult.ambiguousReferences.join(', ')}?`);
    }

    // Check for vague actions
    const vageActions = ['fix', 'improve', 'optimize', 'update'];
    const hasVagueAction = vageActions.some(action =>
      input.toLowerCase().includes(action)
    );

    if (hasVagueAction && entityResult.entities.files.length === 0) {
      suggestions.push('Which file or component would you like me to work on?');
    }

    // Check for missing technology context for create/setup requests
    const setupKeywords = ['create', 'setup', 'set up', 'build', 'implement'];
    const hasSetupKeyword = setupKeywords.some(keyword => input.toLowerCase().includes(keyword));

    if (hasSetupKeyword && entityResult.entities.technologies.length === 0) {
      // Only ask for clarification if the request is genuinely vague
      const hasSpecificContext = input.toLowerCase().includes('testing') ||
                                 input.toLowerCase().includes('framework') ||
                                 input.toLowerCase().includes('for this project') ||
                                 input.toLowerCase().includes('complete') ||
                                 entityResult.entities.concepts.length > 0;

      if (!hasSpecificContext) {
        suggestions.push('What technology or framework should I use?');
      }
    }

    // Check for scope clarity
    if (input.length < 20 && !context.lastIntent) {
      suggestions.push('Could you provide more details about what you want to accomplish?');
    }

    return {
      required: suggestions.length > 0,
      suggestions
    };
  }

  /**
   * Estimate duration for the task
   */
  private estimateDuration(
    complexity: UserIntent['complexity'],
    multiStep: boolean,
    entityResult: EntityExtractionResult
  ): number {
    const baseTime = {
      simple: 5,
      moderate: 15,
      complex: 45,
      expert: 120
    };

    let duration = baseTime[complexity];

    // Multi-step tasks take longer
    if (multiStep) {
      duration *= 1.5;
    }

    // Multiple files increase duration
    const fileCount = entityResult.entities.files.length;
    if (fileCount > 1) {
      duration *= (1 + (fileCount - 1) * 0.3);
    }

    return Math.round(duration);
  }

  /**
   * Assess risk level of the operation
   */
  private assessRiskLevel(
    intentType: UserIntent['type'],
    complexity: UserIntent['complexity'],
    entityResult: EntityExtractionResult
  ): UserIntent['riskLevel'] {
    let riskScore = 0;

    // Task requests are riskier than questions
    if (intentType === 'task_request') riskScore += 1;

    // Complex operations are riskier
    if (complexity === 'complex') riskScore += 1;
    if (complexity === 'expert') riskScore += 2;

    // Multiple files increase risk
    if (entityResult.entities.files.length > 3) riskScore += 1;
    if (entityResult.entities.files.length > 8) riskScore += 1;

    // System files are high risk
    const systemFiles = entityResult.entities.files.filter(file =>
      file.includes('config') || file.includes('package.json') ||
      file.includes('.env') || file.includes('Dockerfile')
    );
    if (systemFiles.length > 0) riskScore += 2;

    if (riskScore <= 1) return 'low';
    if (riskScore <= 3) return 'medium';
    return 'high';
  }

  /**
   * Build intent context information
   */
  private buildIntentContext(
    input: string,
    entityResult: EntityExtractionResult,
    context: AnalysisContext
  ): UserIntent['context'] {
    return {
      projectAware: !!context.projectContext && entityResult.entities.files.length > 0,
      fileSpecific: entityResult.entities.files.length > 0,
      followUp: context.lastIntent !== undefined,
      references: [
        ...entityResult.entities.files,
        ...entityResult.entities.functions,
        ...entityResult.entities.classes
      ]
    };
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    intentType: UserIntent['type'],
    entityResult: EntityExtractionResult,
    clarificationAnalysis: { required: boolean; suggestions: string[] },
    context: AnalysisContext
  ): number {
    let confidence = THRESHOLD_CONSTANTS.CONFIDENCE.BASE; // Base confidence

    // Intent classification confidence
    if (intentType !== 'conversation') confidence += THRESHOLD_CONSTANTS.WEIGHTS.MINOR;

    // Entity extraction confidence
    confidence += entityResult.confidence * THRESHOLD_CONSTANTS.WEIGHTS.MODERATE;

    // Reduce confidence if clarification is needed
    if (clarificationAnalysis.required) {
      confidence -= THRESHOLD_CONSTANTS.WEIGHTS.MINOR;
    }

    // Increase confidence with context
    if (context.projectContext && entityResult.entities.files.length > 0) {
      confidence += THRESHOLD_CONSTANTS.WEIGHTS.SMALL;
    }

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Initialize pattern matching rules
   */
  private initializePatterns(): void {
    this.entityPatterns = new Map();
    this.intentKeywords = new Map();
    this.complexityIndicators = new Map();

    // Initialize entity patterns
    this.entityPatterns.set('files', [
      /([a-zA-Z0-9_-]+\.[a-zA-Z]{1,4})/g,
      /(?:file|src|\.\/|\/)?([a-zA-Z0-9_/-]+\.(?:js|ts|py|java|cpp|c|go|rs|php|rb|html|css|json|md))/g
    ]);

    // Initialize intent keywords
    this.intentKeywords.set('task_request', [
      'create', 'add', 'implement', 'build', 'make', 'generate', 'write',
      'refactor', 'fix', 'update', 'modify', 'change', 'improve', 'optimize'
    ]);

    this.intentKeywords.set('question', [
      'what', 'how', 'why', 'when', 'where', 'which', 'who',
      'explain', 'describe', 'tell me', 'show me'
    ]);

    this.intentKeywords.set('command', [
      'run', 'execute', 'start', 'stop', 'test', 'build', 'deploy',
      'list', 'show', 'display', 'search', 'find'
    ]);
  }

  /**
   * Utility methods
   */
  private normalizeInput(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  private applyPatterns(patterns: RegExp[], input: string, results: string[]): void {
    patterns.forEach(pattern => {
      const matches = input.match(pattern);
      if (matches) {
        results.push(...matches.map(match => match.trim()));
      }
    });
  }

  private extractConcepts(input: string, concepts: string[]): void {
    const conceptKeywords = [
      'authentication', 'authorization', 'security', 'performance',
      'database', 'api', 'frontend', 'backend', 'testing', 'deployment'
    ];

    conceptKeywords.forEach(concept => {
      if (input.toLowerCase().includes(concept)) {
        concepts.push(concept);
      }
    });
  }

  private cleanEntities(entities: UserIntent['entities']): void {
    Object.keys(entities).forEach(key => {
      const entityArray = entities[key as keyof UserIntent['entities']] as string[];
      const uniqueEntities = new Set(entityArray.filter(entity => entity.length > 1));
      entities[key as keyof UserIntent['entities']] = Array.from(uniqueEntities) as any;
    });
  }

  private findAmbiguousReferences(
    entities: UserIntent['entities'],
    context: AnalysisContext
  ): string[] {
    const ambiguous: string[] = [];

    // Check for partial file names that could match multiple files
    if (context.projectContext) {
      entities.files.forEach(file => {
        const matches = context.projectContext!.allFiles.filter(projectFile =>
          projectFile.path.includes(file) || projectFile.relativePath.includes(file)
        );

        if (matches.length > 1) {
          ambiguous.push(file);
        }
      });
    }

    return ambiguous;
  }

  private calculateEntityConfidence(
    entities: UserIntent['entities'],
    ambiguousReferences: string[]
  ): number {
    const totalEntities = Object.values(entities).reduce((sum, arr) => sum + arr.length, 0);

    if (totalEntities === 0) return 0.3;

    const ambiguousCount = ambiguousReferences.length;
    const clarityRatio = (totalEntities - ambiguousCount) / totalEntities;

    return Math.max(0.3, clarityRatio);
  }

  private parseAIEntityResponse(content: string): Partial<UserIntent['entities']> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.debug('Failed to parse AI entity response:', error);
    }

    return {};
  }

  private mergeEntities(
    target: UserIntent['entities'],
    source: Partial<UserIntent['entities']>
  ): void {
    Object.keys(source).forEach(key => {
      const entityKey = key as keyof UserIntent['entities'];
      const sourceArray = source[entityKey];
      const targetArray = target[entityKey] as string[];

      if (Array.isArray(sourceArray)) {
        targetArray.push(...sourceArray.filter(item => !targetArray.includes(item)));
      }
    });
  }

  private createFallbackIntent(input: string, context: AnalysisContext): UserIntent {
    return {
      type: 'conversation',
      action: 'respond',
      entities: {
        files: [],
        directories: [],
        functions: [],
        classes: [],
        technologies: [],
        concepts: [],
        variables: []
      },
      confidence: 0.2,
      complexity: 'simple',
      multiStep: false,
      requiresClarification: true,
      suggestedClarifications: ['Could you rephrase your request?'],
      estimatedDuration: 1,
      riskLevel: 'low',
      context: {
        projectAware: false,
        fileSpecific: false,
        followUp: false,
        references: []
      }
    };
  }
}
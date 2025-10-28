/**
 * Enhanced Intent Analyzer
 *
 * Advanced intent analysis with timeout protection, multi-strategy fallback,
 * and robust error handling for complex query processing.
 */

import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';
import { UserIntent, AnalysisContext } from './intent-analyzer.js';
import { AI_CONSTANTS } from '../config/constants.js';

interface CacheEntry {
  intent: UserIntent;
  timestamp: number;
  accessCount: number;
}

interface PatternRule {
  pattern: RegExp;
  type: UserIntent['type'];
  action: string;
  entities?: Partial<UserIntent['entities']>;
  confidence: number;
  complexity: UserIntent['complexity'];
}

/**
 * LRU Cache for intent analysis results
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

export class EnhancedIntentAnalyzer {
  private aiClient: any;
  private responseCache = new LRUCache<string, CacheEntry>(100);
  private patternRules: PatternRule[] = [];

  constructor(aiClient: any) {
    this.aiClient = aiClient;
    this.initializePatternRules();
  }

  /**
   * Analyze user intent with multi-strategy fallback and timeout protection
   */
  async analyze(
    input: string,
    context?: AnalysisContext,
    timeout: number = 15000
  ): Promise<UserIntent> {
    const cacheKey = this.generateCacheKey(input, context);

    // Check cache first
    const cached = this.responseCache.get(cacheKey);
    if (cached && this.isCacheEntryValid(cached)) {
      cached.accessCount++;
      logger.debug('Intent analysis cache hit');
      return cached.intent;
    }

    // Multi-strategy analysis with progressive fallback
    const strategies = [
      () => this.quickPatternMatch(input),
      () => this.aiAnalysisWithTimeout(input, context, timeout),
      () => this.templateBasedAnalysis(input, context),
      () => this.minimalistFallback(input)
    ];

    let lastError: Error | null = null;

    for (const strategy of strategies) {
      try {
        const result = await Promise.race([
          strategy(),
          this.createTimeoutPromise(Math.min(timeout / strategies.length, 5000))
        ]);

        if (this.validateIntent(result)) {
          // Cache successful result
          this.responseCache.set(cacheKey, {
            intent: result,
            timestamp: Date.now(),
            accessCount: 1
          });
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        logger.debug(`Intent analysis strategy failed: ${normalizeError(error).message}`);
        continue;
      }
    }

    // Final fallback
    logger.warn('All intent analysis strategies failed, using emergency fallback');
    return this.createEmergencyFallback(input, lastError);
  }

  /**
   * Quick pattern matching for common queries
   */
  async quickPatternMatch(input: string): Promise<UserIntent> {
    const normalizedInput = input.toLowerCase().trim();

    for (const rule of this.patternRules) {
      if (rule.pattern.test(normalizedInput)) {
        logger.debug(`Pattern matched: ${rule.pattern.source}`);

        return {
          type: rule.type,
          action: rule.action,
          entities: {
            files: this.extractFiles(input),
            directories: this.extractDirectories(input),
            functions: this.extractFunctions(input),
            classes: this.extractClasses(input),
            technologies: this.extractTechnologies(input),
            concepts: this.extractConcepts(input),
            variables: this.extractVariables(input),
            ...rule.entities
          },
          confidence: rule.confidence,
          complexity: rule.complexity,
          multiStep: this.isMultiStep(input),
          requiresClarification: false,
          suggestedClarifications: [],
          estimatedDuration: this.estimateDuration(rule.complexity),
          riskLevel: this.assessRiskLevel(rule.type, rule.complexity),
          context: {
            projectAware: rule.entities?.files !== undefined || rule.entities?.directories !== undefined,
            fileSpecific: (this.extractFiles(input).length + this.extractDirectories(input).length) > 0,
            followUp: false,
            references: [...this.extractFiles(input), ...this.extractDirectories(input)]
          }
        };
      }
    }

    throw new Error('No pattern match found');
  }

  /**
   * AI analysis with timeout protection
   */
  private async aiAnalysisWithTimeout(
    input: string,
    context: AnalysisContext | undefined,
    timeout: number
  ): Promise<UserIntent> {
    if (!this.aiClient) {
      throw new Error('AI client not available');
    }

    const prompt = this.buildAnalysisPrompt(input, context);

    const response = await Promise.race([
      this.aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.INTENT_ANALYSIS_TEMPERATURE,
        maxTokens: 1000
      }),
      this.createTimeoutPromise(timeout)
    ]);

    return this.parseAIResponse(response, input);
  }

  /**
   * Template-based analysis for structured queries
   */
  private async templateBasedAnalysis(
    input: string,
    context?: AnalysisContext
  ): Promise<UserIntent> {
    const templates = [
      {
        keywords: ['analyze', 'review', 'examine', 'understand'],
        type: 'task_request' as const,
        action: 'analyze codebase',
        complexity: 'moderate' as const
      },
      {
        keywords: ['create', 'make', 'add', 'build'],
        type: 'task_request' as const,
        action: 'create new content',
        complexity: 'simple' as const
      },
      {
        keywords: ['fix', 'debug', 'resolve', 'solve'],
        type: 'task_request' as const,
        action: 'fix issues',
        complexity: 'moderate' as const
      },
      {
        keywords: ['help', 'how', 'what', 'explain'],
        type: 'question' as const,
        action: 'provide information',
        complexity: 'simple' as const
      }
    ];

    const lowerInput = input.toLowerCase();

    for (const template of templates) {
      if (template.keywords.some(keyword => lowerInput.includes(keyword))) {
        return {
          type: template.type,
          action: template.action,
          entities: this.extractAllEntities(input),
          confidence: 0.7,
          complexity: template.complexity,
          multiStep: lowerInput.split(/\s+and\s+|\s+then\s+/).length > 1,
          requiresClarification: false,
          suggestedClarifications: [],
          estimatedDuration: this.estimateDuration(template.complexity),
          riskLevel: this.assessRiskLevel(template.type, template.complexity),
          context: {
            projectAware: context?.projectContext !== undefined,
            fileSpecific: this.extractFiles(input).length > 0,
            followUp: false,
            references: this.extractFiles(input)
          }
        };
      }
    }

    throw new Error('No template match found');
  }

  /**
   * Minimalist fallback for unrecognized queries
   */
  async minimalistFallback(input: string): Promise<UserIntent> {
    return {
      type: 'conversation',
      action: input,
      entities: this.extractAllEntities(input),
      confidence: 0.3,
      complexity: 'simple',
      multiStep: false,
      requiresClarification: true,
      suggestedClarifications: [
        'Could you rephrase your request?',
        'What specific action would you like me to take?',
        'Are you looking for help with a particular task?'
      ],
      estimatedDuration: 5,
      riskLevel: 'low',
      context: {
        projectAware: false,
        fileSpecific: false,
        followUp: false,
        references: []
      }
    };
  }

  /**
   * Validate intent structure
   */
  validateIntent(intent: any): intent is UserIntent {
    if (!intent || typeof intent !== 'object') return false;

    const requiredFields = ['type', 'action', 'entities', 'confidence', 'complexity', 'context'];
    const hasRequiredFields = requiredFields.every(field => field in intent);

    if (!hasRequiredFields) return false;

    // Validate context structure
    const context = intent.context;
    if (!context || typeof context !== 'object') return false;

    const requiredContextFields = ['projectAware', 'fileSpecific', 'followUp', 'references'];
    return requiredContextFields.every(field => field in context);
  }

  /**
   * Get cache size for testing
   */
  getCacheSize(): number {
    return this.responseCache.size();
  }

  /**
   * Initialize pattern matching rules
   */
  private initializePatternRules(): void {
    this.patternRules = [
      // Help and documentation
      {
        pattern: /^(help|h|\?)$/,
        type: 'question',
        action: 'show help',
        confidence: 0.95,
        complexity: 'simple'
      },
      {
        pattern: /^list\s+(models?|commands?)$/,
        type: 'command',
        action: 'list available options',
        confidence: 0.9,
        complexity: 'simple'
      },

      // Codebase analysis
      {
        pattern: /analyz(e|ing)\s+(this\s+)?(codebase|project|code)/,
        type: 'task_request',
        action: 'analyze codebase structure and patterns',
        confidence: 0.85,
        complexity: 'moderate'
      },
      {
        pattern: /review\s+(the\s+)?(code|project|architecture)/,
        type: 'task_request',
        action: 'review code quality and structure',
        confidence: 0.8,
        complexity: 'moderate'
      },

      // File operations
      {
        pattern: /create\s+(a\s+)?(new\s+)?file/,
        type: 'task_request',
        action: 'create new file',
        confidence: 0.85,
        complexity: 'simple'
      },
      {
        pattern: /(delete|remove)\s+(the\s+)?file/,
        type: 'task_request',
        action: 'delete file',
        confidence: 0.8,
        complexity: 'simple'
      },

      // Testing
      {
        pattern: /(run|execute|start)\s+(the\s+)?(tests?|testing|test\s+suite|testing\s+suite)/,
        type: 'command',
        action: 'execute tests',
        confidence: 0.9,
        complexity: 'simple'
      },
      {
        pattern: /(create|add|write)\s+tests?/,
        type: 'task_request',
        action: 'create test cases',
        confidence: 0.8,
        complexity: 'moderate'
      },
      {
        pattern: /(set\s*up|setup|create|build|implement)\s+(a\s+)?(complete\s+)?(testing\s+)?(framework|test\s+framework)/,
        type: 'task_request',
        action: 'setup testing framework',
        confidence: 0.85,
        complexity: 'moderate',
        entities: {
          technologies: ['testing', 'framework'],
          concepts: ['testing']
        }
      },

      // Complex application setup
      {
        pattern: /(set\s*up|setup|create|build|implement)\s+(a\s+)?(complete\s+)?(react|vue|angular)\s+(application|app|project)/,
        type: 'task_request',
        action: 'setup application project',
        confidence: 0.85,
        complexity: 'complex',
        entities: {
          technologies: ['react', 'application'],
          concepts: ['development']
        }
      },

      // Security analysis
      {
        pattern: /(check|scan|analyze|review)\s+((this\s+)?(codebase|code|project)\s+)?(for\s+)?(security\s+)?(vulnerabilities|issues|problems|flaws|risks)/,
        type: 'task_request',
        action: 'analyze security vulnerabilities',
        confidence: 0.85,
        complexity: 'moderate',
        entities: {
          concepts: ['security']
        }
      },

      // File-specific test generation
      {
        pattern: /(generate|create|write)\s+(unit\s+)?(tests?)\s+(for\s+)?(the\s+)?([a-zA-Z0-9_-]+\.(js|ts|py|java|cpp|c))\s+(file)?/,
        type: 'task_request',
        action: 'generate file-specific tests',
        confidence: 0.85,
        complexity: 'moderate',
        entities: {
          concepts: ['testing']
        }
      },

      // Testing strategy recommendations
      {
        pattern: /(recommend|suggest|propose)\s+(a\s+)?(testing\s+)?(strategy|plan|approach)\s+(for\s+)?(this\s+)?(project|codebase)/,
        type: 'task_request',
        action: 'recommend testing strategy',
        confidence: 0.85,
        complexity: 'moderate',
        entities: {
          concepts: ['testing']
        }
      }
    ];
  }

  /**
   * Extract entities from input text
   */
  private extractFiles(input: string): string[] {
    const filePattern = /[\w-]+\.(ts|js|json|md|py|java|cpp|c|h|css|html|xml|yml|yaml|conf|config)(\s|$)/gi;
    const matches = input.match(filePattern) || [];
    return matches.map(match => match.trim());
  }

  private extractDirectories(input: string): string[] {
    const dirPattern = /(src|lib|dist|build|test|tests|docs|components|utils|services|controllers|models)\/[\w-\/]*/gi;
    const matches = input.match(dirPattern) || [];
    return matches;
  }

  private extractFunctions(input: string): string[] {
    const funcPattern = /function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*\(/gi;
    const matches = input.match(funcPattern) || [];
    return matches.map(match => match.replace(/function\s+|const\s+|=|\s*\(/g, ''));
  }

  private extractClasses(input: string): string[] {
    const classPattern = /class\s+(\w+)|interface\s+(\w+)|type\s+(\w+)/gi;
    const matches = input.match(classPattern) || [];
    return matches.map(match => match.replace(/class\s+|interface\s+|type\s+/gi, ''));
  }

  private extractTechnologies(input: string): string[] {
    const techKeywords = [
      'react', 'vue', 'angular', 'node', 'express', 'typescript', 'javascript',
      'python', 'java', 'cpp', 'rust', 'go', 'docker', 'kubernetes', 'aws',
      'mongodb', 'postgresql', 'mysql', 'redis', 'graphql', 'rest', 'api',
      'testing', 'test', 'framework', 'jest', 'mocha', 'jasmine', 'pytest',
      'junit', 'cypress', 'playwright', 'vitest'
    ];

    const lowerInput = input.toLowerCase();
    const keywordMatches = techKeywords.filter(tech => lowerInput.includes(tech));

    // Also check for testing framework patterns
    const testingPatterns = [
      /(?:testing|test).*(?:framework|suite|setup|environment)/gi,
      /(?:framework|system|environment|infrastructure|project).*(?:testing|test)/gi
    ];

    const hasTestingPattern = testingPatterns.some(pattern => pattern.test(input));
    if (hasTestingPattern && !keywordMatches.includes('testing')) {
      keywordMatches.push('testing', 'framework');
    }

    return keywordMatches;
  }

  private extractConcepts(input: string): string[] {
    const conceptKeywords = [
      'authentication', 'authorization', 'security', 'performance', 'optimization',
      'refactoring', 'testing', 'debugging', 'architecture', 'patterns',
      'database', 'api', 'frontend', 'backend', 'deployment'
    ];

    const lowerInput = input.toLowerCase();
    return conceptKeywords.filter(concept => lowerInput.includes(concept));
  }

  private extractVariables(input: string): string[] {
    const varPattern = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;
    const matches = input.match(varPattern) || [];
    return matches.filter(match => match.length > 2 && !/^(the|and|or|for|in|on|at|to|from|with|by)$/i.test(match));
  }

  private extractAllEntities(input: string): UserIntent['entities'] {
    return {
      files: this.extractFiles(input),
      directories: this.extractDirectories(input),
      functions: this.extractFunctions(input),
      classes: this.extractClasses(input),
      technologies: this.extractTechnologies(input),
      concepts: this.extractConcepts(input),
      variables: this.extractVariables(input)
    };
  }

  /**
   * Utility methods
   */
  private isMultiStep(input: string): boolean {
    const multiStepIndicators = [
      /\s+and\s+/,
      /\s+then\s+/,
      /\s+after\s+/,
      /\s+also\s+/,
      /[;,]\s+/
    ];

    return multiStepIndicators.some(pattern => pattern.test(input.toLowerCase()));
  }

  private estimateDuration(complexity: UserIntent['complexity']): number {
    const durations = {
      simple: 5,
      moderate: 15,
      complex: 30,
      expert: 60
    };
    return durations[complexity];
  }

  private assessRiskLevel(
    type: UserIntent['type'],
    complexity: UserIntent['complexity']
  ): UserIntent['riskLevel'] {
    if (type === 'command' && complexity === 'complex') return 'high';
    if (type === 'task_request' && complexity === 'expert') return 'high';
    if (complexity === 'moderate' || complexity === 'complex') return 'medium';
    return 'low';
  }

  private generateCacheKey(input: string, context?: AnalysisContext): string {
    const contextHash = context ?
      JSON.stringify({
        fileCount: context.projectContext?.allFiles?.length || 0,
        recentFiles: context.recentFiles?.slice(0, 3) || []
      }) : '';

    return `${input.toLowerCase().trim()}_${contextHash}`;
  }

  private isCacheEntryValid(entry: CacheEntry): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - entry.timestamp < maxAge;
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Analysis timeout')), timeout);
    });
  }

  private buildAnalysisPrompt(input: string, context?: AnalysisContext): string {
    return `Analyze the user's intent and return a JSON object with the following structure:
{
  "type": "task_request|question|command|clarification|conversation",
  "action": "specific action description",
  "entities": {
    "files": [],
    "directories": [],
    "functions": [],
    "classes": [],
    "technologies": [],
    "concepts": [],
    "variables": []
  },
  "confidence": 0.8,
  "complexity": "simple|moderate|complex|expert",
  "multiStep": false,
  "requiresClarification": false,
  "suggestedClarifications": [],
  "estimatedDuration": 15,
  "riskLevel": "low|medium|high"
}

User input: "${input}"

Context: ${context ? JSON.stringify(context, null, 2) : 'No context available'}

Return only valid JSON, no explanatory text.`;
  }

  private parseAIResponse(response: any, originalInput: string): UserIntent {
    try {
      const content = response.message?.content || response.content || '';

      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!this.validateIntent(parsed)) {
        throw new Error('Invalid intent structure');
      }

      return parsed;
    } catch (error) {
      logger.debug(`Failed to parse AI response: ${normalizeError(error).message}`);
      throw error;
    }
  }

  private createEmergencyFallback(input: string, lastError: Error | null): UserIntent {
    logger.error('Using emergency fallback for intent analysis', { lastError: lastError?.message });

    return {
      type: 'conversation',
      action: input,
      entities: {
        files: [],
        directories: [],
        functions: [],
        classes: [],
        technologies: [],
        concepts: [],
        variables: []
      },
      confidence: 0.1,
      complexity: 'simple',
      multiStep: false,
      requiresClarification: true,
      suggestedClarifications: [
        'I had trouble understanding your request. Could you try rephrasing it?',
        'Are you looking for help with a specific task?'
      ],
      estimatedDuration: 5,
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

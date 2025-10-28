/**
 * Multi-Step Query Processor
 *
 * Enables context-aware multi-step query processing with intelligent follow-up
 * detection, query chaining, and progressive disclosure capabilities.
 */

import { logger } from '../utils/logger.js';
import { ProjectContext } from './context.js';
import { UserIntent } from './intent-analyzer.js';
import { ConversationManager } from './conversation-manager.js';
import { AI_CONSTANTS, THRESHOLD_CONSTANTS } from '../config/constants.js';

export interface QuerySession {
  id: string;
  initialQuery: string;
  context: QuerySessionContext;
  queries: QueryInfo[];
  results: QueryResult[];
  currentStep: number;
  isComplete: boolean;
  startTime: Date;
  endTime?: Date;
  metadata: {
    totalQueries: number;
    followUpQueries: number;
    chainedQueries: number;
    averageConfidence: number;
  };
}

export interface QueryInfo {
  id: string;
  text: string;
  timestamp: Date;
  type: 'initial' | 'followup' | 'chained' | 'refined';
  isFollowUp: boolean;
  context: QueryContext;
  intent?: UserIntent;
  confidence?: number;
}

export interface QueryResult {
  queryId: string;
  content: string;
  suggestions: string[];
  needsFollowUp: boolean;
  confidence: number;
  processingTime: number;
  metadata: {
    tokensUsed?: number;
    complexityLevel: 'simple' | 'moderate' | 'complex';
    requiresRefinement: boolean;
  };
}

export interface QuerySessionContext {
  projectContext?: ProjectContext;
  conversationManager?: ConversationManager;
  userPreferences: {
    verbosity: 'minimal' | 'standard' | 'detailed';
    autoSuggest: boolean;
    maxSuggestions: number;
  };
  workingDirectory: string;
}

export interface QueryContext {
  previousQueries: string[];
  previousResults: string[];
  projectContext?: ProjectContext;
  conversationHistory: any[];
  semanticContext: {
    topics: string[];
    entities: string[];
    relationships: string[];
  };
}

export interface QueryChainOptions {
  maxChainLength?: number;
  confidenceThreshold?: number;
  timeoutMs?: number;
}

export interface SuggestionConfig {
  maxSuggestions: number;
  includeExamples: boolean;
  contextAware: boolean;
  prioritizeRecent: boolean;
}

export class MultiStepQueryProcessor {
  private aiClient: any;
  private projectContext?: ProjectContext;
  private intentAnalyzer?: any;
  private conversationManager?: ConversationManager;
  private querySession: QuerySession | null = null;
  private suggestionConfig: SuggestionConfig;

  // Follow-up detection patterns
  private readonly followUpPatterns = [
    /^(what about|how about|can you also|and what|now show me)/i,
    /^(explain more|tell me more|go deeper|elaborate)/i,
    /^(show me the|find the|where is|which)/i,
    /^(also|additionally|furthermore|moreover)/i,
    /^(but what|however|what if)/i
  ];

  // Refinement patterns
  private readonly refinementPatterns = [
    /^(specifically|particularly|especially|focus on)/i,
    /^(but only|just the|only show)/i,
    /^(exclude|ignore|skip|without)/i,
    /^(more detailed|in detail|comprehensive)/i
  ];

  constructor(
    aiClient: any,
    projectContext?: ProjectContext,
    conversationManager?: ConversationManager
  ) {
    this.aiClient = aiClient;
    this.projectContext = projectContext;
    // Optional enhanced intent analyzer can be integrated later
    this.conversationManager = conversationManager;

    this.suggestionConfig = {
      maxSuggestions: 3,
      includeExamples: true,
      contextAware: true,
      prioritizeRecent: true
    };
  }

  /**
   * Start a new multi-step query session
   */
  async startQuerySession(
    initialQuery: string,
    context: Partial<QuerySessionContext> = {}
  ): Promise<QuerySession> {
    logger.info('Starting new query session', { initialQuery });

    this.querySession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      initialQuery,
      context: {
        projectContext: this.projectContext,
        conversationManager: this.conversationManager,
        userPreferences: {
          verbosity: 'standard',
          autoSuggest: true,
          maxSuggestions: 3,
          ...context.userPreferences
        },
        workingDirectory: process.cwd(),
        ...context
      },
      queries: [],
      results: [],
      currentStep: 0,
      isComplete: false,
      startTime: new Date(),
      metadata: {
        totalQueries: 0,
        followUpQueries: 0,
        chainedQueries: 0,
        averageConfidence: 0
      }
    };

    return this.querySession;
  }

  /**
   * Process a query within the current session
   */
  async processQuery(query: string, options: { type?: QueryInfo['type'] } = {}): Promise<QueryResult> {
    if (!this.querySession) {
      throw new Error('No active query session. Start a session first.');
    }

    const startTime = Date.now();
    logger.debug('Processing query in session', {
      sessionId: this.querySession.id,
      query: query.substring(0, 100),
      step: this.querySession.currentStep
    });

    // Create query info
    const queryInfo: QueryInfo = {
      id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: query,
      timestamp: new Date(),
      type: options.type || (this.querySession.queries.length === 0 ? 'initial' : 'followup'),
      isFollowUp: this.isFollowUpQuery(query),
      context: this.buildQueryContext(query)
    };

    // Analyze intent
    try {
      queryInfo.intent = await this.intentAnalyzer.analyze(query, {
        projectContext: this.projectContext,
        conversationHistory: queryInfo.context.previousQueries,
        workingDirectory: this.querySession.context.workingDirectory,
        recentFiles: this.projectContext?.allFiles.slice(0, 20).map(f => f.path) || []
      });
      queryInfo.confidence = queryInfo.intent?.confidence || THRESHOLD_CONSTANTS.CONFIDENCE.BASE;
    } catch (error) {
      logger.warn('Intent analysis failed, using fallback', { error });
      queryInfo.confidence = THRESHOLD_CONSTANTS.CONFIDENCE.BASE;
    }

    this.querySession.queries.push(queryInfo);

    // Process with AI
    const result = await this.processWithAI(queryInfo);

    // Store result
    this.querySession.results.push(result);
    this.querySession.currentStep++;

    // Update metadata
    this.updateSessionMetadata();

    logger.info('Query processed successfully', {
      sessionId: this.querySession.id,
      queryId: queryInfo.id,
      confidence: result.confidence,
      needsFollowUp: result.needsFollowUp
    });

    return result;
  }

  /**
   * Chain a query with a refinement
   */
  async chainQuery(baseQuery: string, refinement: string): Promise<QueryResult> {
    const chainedQuery = `${baseQuery} - ${refinement}`;
    const result = await this.processQuery(chainedQuery, { type: 'chained' });

    if (this.querySession) {
      this.querySession.metadata.chainedQueries++;
    }

    return result;
  }

  /**
   * Refine a previous query with additional context
   */
  async refineQuery(originalQuery: string, refinement: string): Promise<QueryResult> {
    const refinedQuery = `${originalQuery} (specifically: ${refinement})`;
    return this.processQuery(refinedQuery, { type: 'refined' });
  }

  /**
   * Detect if a query is a follow-up to previous queries
   */
  isFollowUpQuery(query: string): boolean {
    // Check against follow-up patterns
    const isPatternMatch = this.followUpPatterns.some(pattern => pattern.test(query));

    // Check for refinement patterns
    const isRefinement = this.refinementPatterns.some(pattern => pattern.test(query));

    // Check for contextual indicators (pronouns, relative references)
    const hasContextualReferences = /\b(this|that|it|they|them|here|there)\b/i.test(query);

    // Check if query is very short (likely a follow-up)
    const isShort = query.trim().split(/\s+/).length <= 3;

    return isPatternMatch || isRefinement || (hasContextualReferences && isShort);
  }

  /**
   * Build context for query processing
   */
  private buildQueryContext(query: string): QueryContext {
    if (!this.querySession) {
      throw new Error('No active session');
    }

    const previousQueries = this.querySession.queries.map(q => q.text);
    const previousResults = this.querySession.results
      .slice(-3) // Last 3 results
      .map(r => r.content.substring(0, 500)); // Truncate for context

    return {
      previousQueries,
      previousResults,
      projectContext: this.projectContext,
      conversationHistory: this.conversationManager?.getRecentHistory(5) || [],
      semanticContext: this.extractSemanticContext(query, previousQueries)
    };
  }

  /**
   * Extract semantic context from query and history
   */
  private extractSemanticContext(query: string, previousQueries: string[]): QueryContext['semanticContext'] {
    const allText = [query, ...previousQueries].join(' ').toLowerCase();

    // Extract topics (common programming/analysis terms)
    const topicKeywords = [
      'structure', 'pattern', 'dependency', 'test', 'configuration', 'performance',
      'security', 'error', 'function', 'class', 'component', 'api', 'database'
    ];
    const topics = topicKeywords.filter(topic => allText.includes(topic));

    // Extract entities (file types, technologies)
    const entityKeywords = [
      'typescript', 'javascript', 'react', 'node', 'express', 'test', 'config',
      'package.json', 'tsconfig', 'eslint', 'jest', 'git'
    ];
    const entities = entityKeywords.filter(entity => allText.includes(entity));

    // Extract relationships (action words)
    const relationshipKeywords = [
      'analyze', 'review', 'find', 'show', 'explain', 'create', 'update', 'fix'
    ];
    const relationships = relationshipKeywords.filter(rel => allText.includes(rel));

    return { topics, entities, relationships };
  }

  /**
   * Process query with AI
   */
  private async processWithAI(queryInfo: QueryInfo): Promise<QueryResult> {
    const prompt = this.buildProcessingPrompt(queryInfo);

    try {
      const response = await this.aiClient.complete(prompt, {
        temperature: AI_CONSTANTS.CREATIVE_TEMPERATURE,
        enableToolUse: true
      });

      const content = response?.message?.content || response?.content || 'No response generated';

      return {
        queryId: queryInfo.id,
        content,
        suggestions: this.generateSuggestions(queryInfo, content),
        needsFollowUp: this.detectFollowUpNeeds(queryInfo.text, content),
        confidence: queryInfo.confidence || 0.7,
        processingTime: Date.now() - queryInfo.timestamp.getTime(),
        metadata: {
          complexityLevel: this.assessComplexity(queryInfo.text),
          requiresRefinement: this.requiresRefinement(queryInfo.text, content)
        }
      };
    } catch (error) {
      logger.error('AI processing failed', { error, queryId: queryInfo.id });

      return {
        queryId: queryInfo.id,
        content: 'I apologize, but I encountered an error processing your query. Please try rephrasing or simplifying your request.',
        suggestions: ['Try rephrasing your question', 'Ask a more specific question', 'Check if the project context is available'],
        needsFollowUp: false,
        confidence: 0.1,
        processingTime: Date.now() - queryInfo.timestamp.getTime(),
        metadata: {
          complexityLevel: 'simple',
          requiresRefinement: true
        }
      };
    }
  }

  /**
   * Build AI processing prompt with context
   */
  private buildProcessingPrompt(queryInfo: QueryInfo): string {
    let prompt = `## Multi-Step Query Processing\n\n`;
    prompt += `**Current Query:** ${queryInfo.text}\n`;
    prompt += `**Query Type:** ${queryInfo.type}\n`;
    prompt += `**Is Follow-up:** ${queryInfo.isFollowUp}\n\n`;

    // Add session context
    if (this.querySession) {
      prompt += `**Session Context:**\n`;
      prompt += `- Session ID: ${this.querySession.id}\n`;
      prompt += `- Step: ${this.querySession.currentStep + 1}\n`;
      prompt += `- Initial Query: ${this.querySession.initialQuery}\n\n`;
    }

    // Add previous context
    if (queryInfo.context.previousQueries.length > 0) {
      prompt += `**Previous Queries in Session:**\n`;
      queryInfo.context.previousQueries.forEach((q, i) => {
        prompt += `${i + 1}. ${q}\n`;
      });
      prompt += '\n';
    }

    // Add previous results for context
    if (queryInfo.context.previousResults.length > 0) {
      prompt += `**Previous Results (for context):**\n`;
      queryInfo.context.previousResults.forEach((r, i) => {
        prompt += `${i + 1}. ${r.substring(0, 200)}...\n`;
      });
      prompt += '\n';
    }

    // Add project context
    if (this.projectContext) {
      prompt += `**Project Context:**\n`;
      prompt += `- Root: ${this.projectContext.root}\n`;
      prompt += `- Files: ${this.projectContext.allFiles.length} total\n`;

      if (this.projectContext.allFiles.length > 0) {
        prompt += `- Key files: ${this.projectContext.allFiles.slice(0, 10).map(f => f.path).join(', ')}\n`;
      }
      prompt += '\n';
    }

    // Add semantic context
    const semantic = queryInfo.context.semanticContext;
    if (semantic.topics.length > 0 || semantic.entities.length > 0) {
      prompt += `**Semantic Context:**\n`;
      if (semantic.topics.length > 0) prompt += `- Topics: ${semantic.topics.join(', ')}\n`;
      if (semantic.entities.length > 0) prompt += `- Entities: ${semantic.entities.join(', ')}\n`;
      if (semantic.relationships.length > 0) prompt += `- Actions: ${semantic.relationships.join(', ')}\n`;
      prompt += '\n';
    }

    prompt += `**Instructions:**\n`;
    prompt += `1. Consider the full context of this multi-step conversation\n`;
    prompt += `2. Build upon previous queries and results when relevant\n`;
    prompt += `3. Provide a comprehensive but focused response\n`;
    prompt += `4. If this is a follow-up, reference and extend previous answers\n`;
    prompt += `5. Use the actual project context for accurate analysis\n\n`;

    prompt += `Please provide a detailed response to the current query, taking into account all the context provided above.`;

    return prompt;
  }

  /**
   * Generate contextual suggestions for follow-up queries
   */
  private generateSuggestions(queryInfo: QueryInfo, result: string): string[] {
    const suggestions: string[] = [];

    // Query-type specific suggestions
    if (queryInfo.text.toLowerCase().includes('analyze')) {
      suggestions.push('Would you like to see specific code patterns?');
      suggestions.push('Should I check for potential issues?');
      suggestions.push('Want to explore the test coverage?');
    } else if (queryInfo.text.toLowerCase().includes('file') || queryInfo.text.toLowerCase().includes('directory')) {
      suggestions.push('Would you like to see the file contents?');
      suggestions.push('Should I analyze the code structure?');
      suggestions.push('Want to check dependencies?');
    } else if (queryInfo.text.toLowerCase().includes('error') || queryInfo.text.toLowerCase().includes('issue')) {
      suggestions.push('Should I suggest potential fixes?');
      suggestions.push('Would you like to see related code?');
      suggestions.push('Want to check for similar issues?');
    }

    // Context-aware suggestions based on semantic analysis
    const semantic = queryInfo.context.semanticContext;
    if (semantic.topics.includes('test')) {
      suggestions.push('Want to see test coverage details?');
    }
    if (semantic.topics.includes('performance')) {
      suggestions.push('Should I analyze performance bottlenecks?');
    }
    if (semantic.topics.includes('security')) {
      suggestions.push('Would you like a security audit?');
    }

    // Generic follow-up suggestions
    if (suggestions.length === 0) {
      suggestions.push('Would you like me to elaborate on any part?');
      suggestions.push('Should I provide more specific examples?');
      suggestions.push('Any particular aspect you\'d like to explore?');
    }

    // Limit to configured maximum
    return suggestions.slice(0, this.suggestionConfig.maxSuggestions);
  }

  /**
   * Detect if the query/result combination needs follow-up
   */
  private detectFollowUpNeeds(query: string, result: string): boolean {
    // Check query complexity indicators
    const complexityIndicators = [
      'analyze', 'review', 'explain', 'understand', 'explore', 'comprehensive'
    ];

    const hasComplexityIndicator = complexityIndicators.some(indicator =>
      query.toLowerCase().includes(indicator)
    );

    // Check result length (longer results might warrant follow-up)
    const isSubstantialResult = result.length > 500;

    // Check for lists or structured content (often leads to detail requests)
    const hasStructuredContent = result.includes('- ') || result.includes('1.') || result.includes('*');

    return hasComplexityIndicator || (isSubstantialResult && hasStructuredContent);
  }

  /**
   * Assess query complexity
   */
  private assessComplexity(query: string): 'simple' | 'moderate' | 'complex' {
    const words = query.split(/\s+/).length;
    const complexTerms = ['analyze', 'comprehensive', 'detailed', 'complex', 'advanced'];
    const hasComplexTerms = complexTerms.some(term => query.toLowerCase().includes(term));

    if (words > 15 || hasComplexTerms) return 'complex';
    if (words > 8) return 'moderate';
    return 'simple';
  }

  /**
   * Check if result requires refinement
   */
  private requiresRefinement(query: string, result: string): boolean {
    // Check if result is too generic
    const isGeneric = result.length < 200 && !result.includes(this.projectContext?.root || '');

    // Check if query was complex but result seems simple
    const isComplexQuery = this.assessComplexity(query) !== 'simple';
    const isSimpleResult = result.length < 300;

    return isGeneric || (isComplexQuery && isSimpleResult);
  }

  /**
   * Update session metadata
   */
  private updateSessionMetadata(): void {
    if (!this.querySession) return;

    const { queries } = this.querySession;
    this.querySession.metadata.totalQueries = queries.length;
    this.querySession.metadata.followUpQueries = queries.filter(q => q.isFollowUp).length;

    const confidences = queries.filter(q => q.confidence).map(q => q.confidence!);
    this.querySession.metadata.averageConfidence = confidences.length > 0
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : 0;
  }

  /**
   * Get current query session
   */
  getQuerySession(): QuerySession | null {
    return this.querySession;
  }

  /**
   * End current query session
   */
  endQuerySession(): QuerySession | null {
    if (!this.querySession) return null;

    this.querySession.isComplete = true;
    this.querySession.endTime = new Date();

    logger.info('Query session ended', {
      sessionId: this.querySession.id,
      totalQueries: this.querySession.metadata.totalQueries,
      duration: this.querySession.endTime.getTime() - this.querySession.startTime.getTime()
    });

    const session = this.querySession;
    this.querySession = null;
    return session;
  }

  /**
   * Update suggestion configuration
   */
  updateSuggestionConfig(config: Partial<SuggestionConfig>): void {
    this.suggestionConfig = { ...this.suggestionConfig, ...config };
  }
}
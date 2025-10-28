/**
 * Conversation Manager
 *
 * Manages conversation context, history, and state across interactive sessions.
 * Provides context-aware response generation and conversation persistence.
 */

import { logger } from '../utils/logger.js';
import { UserIntent } from './intent-analyzer.js';
import { ProjectContext } from './context.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ConversationTurn {
  id: string;
  timestamp: Date;
  userInput: string;
  intent: UserIntent;
  response: string;
  actions: ActionTaken[];
  outcome: 'success' | 'failure' | 'partial' | 'pending';
  feedback?: UserFeedback;
  contextSnapshot: {
    workingDirectory: string;
    activeFiles: string[];
    lastModified: string[];
  };
}

export interface ActionTaken {
  type: 'file_read' | 'file_write' | 'file_create' | 'file_delete' | 'command_execute' | 'analysis' | 'tool_use';
  target: string;
  details: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface UserFeedback {
  rating: number; // 1-5 scale
  helpful: boolean;
  accurate: boolean;
  comments?: string;
  timestamp: Date;
}

export interface ConversationContext {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  turnCount: number;
  currentTopics: string[];
  activeTask?: {
    id: string;
    description: string;
    progress: number;
    nextSteps: string[];
  };
  userPreferences: {
    verbosity: 'concise' | 'detailed' | 'explanatory';
    codeStyle: 'functional' | 'object-oriented' | 'mixed';
    toolPreference: string[];
    frameworkPreference: string[];
  };
  projectContext?: ProjectContext;
}

export interface ConversationSummary {
  totalTurns: number;
  successRate: number;
  commonPatterns: string[];
  userSatisfaction: number;
  productiveHours: number;
  topTopics: Array<{ topic: string; count: number }>;
}

export class ConversationManager {
  private conversationHistory: ConversationTurn[] = [];
  private context: ConversationContext;
  private persistencePath: string;
  private maxHistorySize = 1000;
  private contextWindow = 10; // Number of recent turns to consider for context

  constructor(sessionId?: string) {
    this.context = this.initializeContext(sessionId);
    this.persistencePath = join(homedir(), '.ollama-code', 'conversations');
    this.ensurePersistenceDirectory();
  }

  /**
   * Add a new conversation turn
   */
  async addTurn(
    userInput: string,
    intent: UserIntent,
    response: string,
    actions: ActionTaken[] = []
  ): Promise<ConversationTurn> {
    const turn: ConversationTurn = {
      id: this.generateTurnId(),
      timestamp: new Date(),
      userInput,
      intent,
      response,
      actions,
      outcome: 'pending',
      contextSnapshot: {
        workingDirectory: process.cwd(),
        activeFiles: this.getActiveFiles(),
        lastModified: await this.getRecentlyModifiedFiles()
      }
    };

    this.conversationHistory.push(turn);
    this.updateContext(turn);
    this.trimHistory();

    // Persist conversation
    await this.persistConversation();

    logger.debug('Added conversation turn', {
      turnId: turn.id,
      intent: intent.type,
      actionsCount: actions.length
    });

    return turn;
  }

  /**
   * Update the outcome of a conversation turn
   */
  async updateTurnOutcome(
    turnId: string,
    outcome: ConversationTurn['outcome'],
    feedback?: UserFeedback
  ): Promise<void> {
    const turn = this.conversationHistory.find(t => t.id === turnId);
    if (turn) {
      turn.outcome = outcome;
      if (feedback) {
        turn.feedback = feedback;
      }

      await this.persistConversation();

      logger.debug('Updated turn outcome', { turnId, outcome });
    }
  }

  /**
   * Get conversation context for the current session
   */
  getConversationContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Get recent conversation history for context
   */
  getRecentHistory(maxTurns: number = this.contextWindow): ConversationTurn[] {
    return this.conversationHistory.slice(-maxTurns);
  }

  /**
   * Get relevant history based on current intent
   */
  getRelevantHistory(currentIntent: UserIntent, maxTurns: number = 5): ConversationTurn[] {
    const relevantTurns: ConversationTurn[] = [];

    // Get recent history
    const recentTurns = this.getRecentHistory(maxTurns * 2);

    for (const turn of recentTurns.reverse()) {
      if (relevantTurns.length >= maxTurns) break;

      // Check for intent similarity
      if (this.isIntentRelevant(turn.intent, currentIntent)) {
        relevantTurns.unshift(turn);
        continue;
      }

      // Check for entity overlap
      if (this.hasEntityOverlap(turn.intent, currentIntent)) {
        relevantTurns.unshift(turn);
        continue;
      }

      // Check for topic continuity
      if (this.isTopicContinuation(turn, currentIntent)) {
        relevantTurns.unshift(turn);
        continue;
      }
    }

    return relevantTurns;
  }

  /**
   * Generate contextual prompt for AI
   */
  generateContextualPrompt(currentInput: string, currentIntent: UserIntent): string {
    const relevantHistory = this.getRelevantHistory(currentIntent);

    let prompt = `You are an AI coding assistant in an ongoing conversation.\n\n`;

    // Add conversation context
    if (this.context.activeTask) {
      prompt += `Current active task: ${this.context.activeTask.description}\n`;
      prompt += `Progress: ${this.context.activeTask.progress}%\n`;
      if (this.context.activeTask.nextSteps.length > 0) {
        prompt += `Next steps: ${this.context.activeTask.nextSteps.join(', ')}\n`;
      }
      prompt += '\n';
    }

    // Add relevant history
    if (relevantHistory.length > 0) {
      prompt += `Recent relevant conversation:\n`;
      relevantHistory.forEach((turn, index) => {
        prompt += `${index + 1}. User: ${turn.userInput}\n`;
        prompt += `   Assistant: ${turn.response.substring(0, 150)}${turn.response.length > 150 ? '...' : ''}\n`;
      });
      prompt += '\n';
    }

    // Add project context
    if (this.context.projectContext) {
      prompt += `Current project: ${this.context.projectContext.root}\n`;
      prompt += `Working directory: ${process.cwd()}\n\n`;
    }

    // Add current topics
    if (this.context.currentTopics.length > 0) {
      prompt += `Current conversation topics: ${this.context.currentTopics.join(', ')}\n\n`;
    }

    // Add user preferences
    prompt += `User preferences:\n`;
    prompt += `- Verbosity: ${this.context.userPreferences.verbosity}\n`;
    prompt += `- Code style: ${this.context.userPreferences.codeStyle}\n`;
    if (this.context.userPreferences.toolPreference.length > 0) {
      prompt += `- Preferred tools: ${this.context.userPreferences.toolPreference.join(', ')}\n`;
    }
    prompt += '\n';

    prompt += `Current request: ${currentInput}\n`;
    prompt += `Intent analysis: ${JSON.stringify(currentIntent, null, 2)}\n\n`;

    prompt += `Please provide a helpful response that takes into account the conversation context and user preferences.`;

    return prompt;
  }

  /**
   * Track user feedback and learn preferences
   */
  async trackFeedback(turnId: string, feedback: UserFeedback): Promise<void> {
    await this.updateTurnOutcome(turnId, 'success', feedback);
    this.updateUserPreferences(feedback);
    await this.persistConversation();

    logger.debug('Tracked user feedback', {
      turnId,
      rating: feedback.rating,
      helpful: feedback.helpful
    });
  }

  /**
   * Generate conversation summary
   */
  generateSummary(days: number = 7): ConversationSummary {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentTurns = this.conversationHistory.filter(
      turn => turn.timestamp >= cutoffDate
    );

    const successfulTurns = recentTurns.filter(
      turn => turn.outcome === 'success'
    );

    const topicsMap = new Map<string, number>();
    recentTurns.forEach(turn => {
      turn.intent.entities.concepts.forEach(concept => {
        topicsMap.set(concept, (topicsMap.get(concept) || 0) + 1);
      });
    });

    const topTopics = Array.from(topicsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    const feedbackTurns = recentTurns.filter(turn => turn.feedback);
    const avgSatisfaction = feedbackTurns.length > 0
      ? feedbackTurns.reduce((sum, turn) => sum + (turn.feedback?.rating || 0), 0) / feedbackTurns.length
      : 0;

    return {
      totalTurns: recentTurns.length,
      successRate: recentTurns.length > 0 ? successfulTurns.length / recentTurns.length : 0,
      commonPatterns: this.extractCommonPatterns(recentTurns),
      userSatisfaction: avgSatisfaction,
      productiveHours: this.calculateProductiveHours(recentTurns),
      topTopics
    };
  }

  /**
   * Load conversation from persistence
   */
  async loadConversation(sessionId?: string): Promise<void> {
    if (!sessionId) sessionId = this.context.sessionId;

    try {
      const conversationFile = join(this.persistencePath, `${sessionId}.json`);
      const data = await fs.readFile(conversationFile, 'utf-8');
      const savedData = JSON.parse(data);

      this.conversationHistory = savedData.history || [];
      this.context = { ...this.context, ...savedData.context };

      logger.debug('Loaded conversation from persistence', {
        sessionId,
        turnCount: this.conversationHistory.length
      });
    } catch (error) {
      logger.debug('No saved conversation found or failed to load:', error);
    }
  }

  /**
   * Save conversation to persistence
   */
  async persistConversation(): Promise<void> {
    try {
      const conversationFile = join(this.persistencePath, `${this.context.sessionId}.json`);
      const dataToSave = {
        context: this.context,
        history: this.conversationHistory
      };

      await fs.writeFile(conversationFile, JSON.stringify(dataToSave, null, 2));

      logger.debug('Persisted conversation', {
        sessionId: this.context.sessionId,
        turnCount: this.conversationHistory.length
      });
    } catch (error) {
      logger.error('Failed to persist conversation:', error);
    }
  }

  /**
   * Clear conversation history
   */
  async clearHistory(): Promise<void> {
    this.conversationHistory = [];
    this.context.turnCount = 0;
    this.context.currentTopics = [];
    this.context.activeTask = undefined;

    await this.persistConversation();

    logger.debug('Cleared conversation history');
  }

  /**
   * Private helper methods
   */
  private initializeContext(sessionId?: string): ConversationContext {
    return {
      sessionId: sessionId || this.generateSessionId(),
      startTime: new Date(),
      lastActivity: new Date(),
      turnCount: 0,
      currentTopics: [],
      userPreferences: {
        verbosity: 'detailed',
        codeStyle: 'mixed',
        toolPreference: [],
        frameworkPreference: []
      }
    };
  }

  private updateContext(turn: ConversationTurn): void {
    this.context.lastActivity = turn.timestamp;
    this.context.turnCount = this.conversationHistory.length;

    // Update current topics
    const newTopics = turn.intent.entities.concepts;
    newTopics.forEach(topic => {
      if (!this.context.currentTopics.includes(topic)) {
        this.context.currentTopics.push(topic);
      }
    });

    // Keep only recent topics
    if (this.context.currentTopics.length > 10) {
      this.context.currentTopics = this.context.currentTopics.slice(-10);
    }

    // Update active task if it's a task request
    if (turn.intent.type === 'task_request' && turn.intent.multiStep) {
      this.context.activeTask = {
        id: turn.id,
        description: turn.intent.action,
        progress: 0,
        nextSteps: turn.intent.suggestedClarifications
      };
    }
  }

  /**
   * Trim conversation history using a sliding window approach
   * Keeps the most recent messages up to maxHistorySize limit
   */
  private trimHistory(): void {
    const currentSize = this.conversationHistory.length;

    if (currentSize > this.maxHistorySize) {
      const removedCount = currentSize - this.maxHistorySize;

      // Use sliding window: remove oldest messages, keep most recent
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistorySize);

      logger.debug('Trimmed conversation history', {
        previousSize: currentSize,
        newSize: this.conversationHistory.length,
        removedCount,
        maxSize: this.maxHistorySize
      });
    }
  }

  private isIntentRelevant(pastIntent: UserIntent, currentIntent: UserIntent): boolean {
    // Same type of intent
    if (pastIntent.type === currentIntent.type) return true;

    // Related actions
    const relatedActions = {
      'create': ['add', 'implement', 'build'],
      'fix': ['update', 'modify', 'improve'],
      'refactor': ['optimize', 'clean', 'restructure']
    };

    for (const [mainAction, related] of Object.entries(relatedActions)) {
      if (pastIntent.action === mainAction && related.includes(currentIntent.action)) {
        return true;
      }
    }

    return false;
  }

  private hasEntityOverlap(pastIntent: UserIntent, currentIntent: UserIntent): boolean {
    const pastEntities = new Set([
      ...pastIntent.entities.files,
      ...pastIntent.entities.functions,
      ...pastIntent.entities.classes
    ]);

    const currentEntities = new Set([
      ...currentIntent.entities.files,
      ...currentIntent.entities.functions,
      ...currentIntent.entities.classes
    ]);

    // Check for any overlap
    for (const entity of currentEntities) {
      if (pastEntities.has(entity)) return true;
    }

    return false;
  }

  private isTopicContinuation(turn: ConversationTurn, currentIntent: UserIntent): boolean {
    const pastTopics = new Set(turn.intent.entities.concepts);
    const currentTopics = new Set(currentIntent.entities.concepts);

    for (const topic of currentTopics) {
      if (pastTopics.has(topic)) return true;
    }

    return false;
  }

  private updateUserPreferences(feedback: UserFeedback): void {
    // This would implement learning from user feedback
    // For now, just track satisfaction
    if (feedback.rating >= 4) {
      // User was satisfied - no preference changes needed
    } else if (feedback.rating <= 2) {
      // User was dissatisfied - might want to adjust verbosity or approach
      if (feedback.comments?.includes('too verbose')) {
        this.context.userPreferences.verbosity = 'concise';
      } else if (feedback.comments?.includes('not enough detail')) {
        this.context.userPreferences.verbosity = 'explanatory';
      }
    }
  }

  private extractCommonPatterns(turns: ConversationTurn[]): string[] {
    const patterns: Map<string, number> = new Map();

    turns.forEach(turn => {
      const pattern = `${turn.intent.type}:${turn.intent.action}`;
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });

    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }

  private calculateProductiveHours(turns: ConversationTurn[]): number {
    if (turns.length === 0) return 0;

    const firstTurn = turns[0];
    const lastTurn = turns[turns.length - 1];
    const totalTime = lastTurn.timestamp.getTime() - firstTurn.timestamp.getTime();

    return totalTime / (1000 * 60 * 60); // Convert to hours
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTurnId(): string {
    return `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getActiveFiles(): string[] {
    // This would track files currently being worked on
    // For now, return empty array
    return [];
  }

  private async getRecentlyModifiedFiles(): Promise<string[]> {
    // This would scan for recently modified files in the project
    // For now, return empty array
    return [];
  }

  /**
   * Ensure persistence directory exists with retry mechanism
   */
  private async ensurePersistenceDirectory(): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await fs.mkdir(this.persistencePath, { recursive: true });
        logger.debug('Persistence directory created/verified', {
          path: this.persistencePath,
          attempt
        });
        return; // Success
      } catch (error) {
        logger.warn(`Failed to create persistence directory (attempt ${attempt}/${MAX_RETRIES}):`, error);

        if (attempt < MAX_RETRIES) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        } else {
          // Final attempt failed
          logger.error('Failed to create persistence directory after all retries:', error);
          throw new Error(`Could not create persistence directory: ${error}`);
        }
      }
    }
  }
}
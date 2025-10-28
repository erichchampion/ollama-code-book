/**
 * User Intent Factory
 *
 * Provides standardized creation of UserIntent objects to eliminate
 * code duplication and ensure consistency across the system.
 */

import { UserIntent } from '../ai/intent-analyzer.js';

export class UserIntentFactory {
  /**
   * Create a basic UserIntent with default values
   */
  static create(
    type: UserIntent['type'],
    action: string,
    overrides: Partial<UserIntent> = {}
  ): UserIntent {
    const defaultIntent: UserIntent = {
      type,
      action,
      entities: {
        files: [],
        directories: [],
        functions: [],
        classes: [],
        technologies: [],
        concepts: [],
        variables: []
      },
      confidence: 0,
      complexity: 'simple',
      multiStep: false,
      requiresClarification: false,
      suggestedClarifications: [],
      estimatedDuration: 0,
      riskLevel: 'low',
      context: {
        projectAware: false,
        fileSpecific: false,
        followUp: false,
        references: []
      }
    };

    return { ...defaultIntent, ...overrides };
  }

  /**
   * Create a task execution intent for confirmed plans
   */
  static createTaskExecution(
    action: 'execute_plan' | 'cancel_plan' | 'modify_plan' | 'show_details',
    overrides: Partial<UserIntent> = {}
  ): UserIntent {
    return this.create('task_execution', action, {
      confidence: 1.0,
      complexity: 'simple',
      multiStep: false,
      riskLevel: 'low',
      requiresClarification: false,
      suggestedClarifications: [],
      estimatedDuration: 0,
      context: {
        projectAware: false,
        fileSpecific: false,
        followUp: true,
        references: []
      },
      ...overrides
    });
  }

  /**
   * Create a conversation intent for error responses
   */
  static createErrorResponse(errorMessage?: string): UserIntent {
    return this.create('conversation', 'error_response', {
      confidence: 0,
      complexity: 'simple',
      multiStep: false,
      riskLevel: 'low',
      requiresClarification: false,
      suggestedClarifications: [],
      estimatedDuration: 0,
      context: {
        projectAware: false,
        fileSpecific: false,
        followUp: false,
        references: []
      }
    });
  }

  /**
   * Create a high-confidence intent for direct command execution
   */
  static createCommandIntent(
    action: string,
    confidence: number = 0.9,
    overrides: Partial<UserIntent> = {}
  ): UserIntent {
    return this.create('command', action, {
      confidence,
      complexity: 'moderate',
      multiStep: false,
      riskLevel: 'medium',
      requiresClarification: false,
      suggestedClarifications: [],
      estimatedDuration: 2,
      context: {
        projectAware: true,
        fileSpecific: false,
        followUp: false,
        references: []
      },
      ...overrides
    });
  }

  /**
   * Create a task request intent for complex operations
   */
  static createTaskRequest(
    action: string,
    complexity: UserIntent['complexity'] = 'moderate',
    overrides: Partial<UserIntent> = {}
  ): UserIntent {
    const riskLevel = complexity === 'expert' ? 'high' :
                     complexity === 'complex' ? 'medium' : 'low';

    const estimatedDuration = complexity === 'expert' ? 30 :
                             complexity === 'complex' ? 15 :
                             complexity === 'moderate' ? 5 : 2;

    return this.create('task_request', action, {
      confidence: 0.8,
      complexity,
      multiStep: complexity !== 'simple',
      riskLevel,
      requiresClarification: complexity === 'expert',
      suggestedClarifications: complexity === 'expert' ?
        ['Please provide more specific requirements'] : [],
      estimatedDuration,
      context: {
        projectAware: true,
        fileSpecific: complexity !== 'simple',
        followUp: false,
        references: []
      },
      ...overrides
    });
  }

  /**
   * Create a question intent for informational queries
   */
  static createQuestion(
    action: string,
    confidence: number = 0.7,
    overrides: Partial<UserIntent> = {}
  ): UserIntent {
    return this.create('question', action, {
      confidence,
      complexity: 'simple',
      multiStep: false,
      riskLevel: 'low',
      requiresClarification: false,
      suggestedClarifications: [],
      estimatedDuration: 1,
      context: {
        projectAware: false,
        fileSpecific: false,
        followUp: false,
        references: []
      },
      ...overrides
    });
  }

  /**
   * Create a clarification intent when user input is unclear
   */
  static createClarification(
    suggestions: string[],
    overrides: Partial<UserIntent> = {}
  ): UserIntent {
    return this.create('clarification', 'request_clarification', {
      confidence: 0.5,
      complexity: 'simple',
      multiStep: false,
      riskLevel: 'low',
      requiresClarification: true,
      suggestedClarifications: suggestions,
      estimatedDuration: 0,
      context: {
        projectAware: false,
        fileSpecific: false,
        followUp: true,
        references: []
      },
      ...overrides
    });
  }

  /**
   * Create a conversation intent for general chat
   */
  static createConversation(
    action: string = 'general_chat',
    overrides: Partial<UserIntent> = {}
  ): UserIntent {
    return this.create('conversation', action, {
      confidence: 0.6,
      complexity: 'simple',
      multiStep: false,
      riskLevel: 'low',
      requiresClarification: false,
      suggestedClarifications: [],
      estimatedDuration: 1,
      context: {
        projectAware: false,
        fileSpecific: false,
        followUp: false,
        references: []
      },
      ...overrides
    });
  }

  /**
   * Merge multiple intents (for complex multi-step operations)
   */
  static mergeIntents(
    primary: UserIntent,
    secondary: UserIntent[]
  ): UserIntent {
    const merged = { ...primary };

    // Combine entities
    secondary.forEach(intent => {
      Object.keys(intent.entities).forEach(entityType => {
        const key = entityType as keyof typeof intent.entities;
        merged.entities[key] = [
          ...new Set([...merged.entities[key], ...intent.entities[key]])
        ];
      });
    });

    // Adjust complexity and risk based on secondary intents
    const hasComplex = secondary.some(i => ['complex', 'expert'].includes(i.complexity));
    if (hasComplex && merged.complexity === 'simple') {
      merged.complexity = 'moderate';
    }

    const hasHighRisk = secondary.some(i => i.riskLevel === 'high');
    if (hasHighRisk && merged.riskLevel !== 'high') {
      merged.riskLevel = 'medium';
    }

    // Mark as multi-step if any secondary intents exist
    if (secondary.length > 0) {
      merged.multiStep = true;
    }

    // Combine duration estimates
    merged.estimatedDuration += secondary.reduce((sum, intent) =>
      sum + intent.estimatedDuration, 0
    );

    return merged;
  }

  /**
   * Validate a UserIntent object
   */
  static validate(intent: UserIntent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!intent.type) {
      errors.push('Intent type is required');
    }

    if (!intent.action) {
      errors.push('Intent action is required');
    }

    if (intent.confidence < 0 || intent.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }

    if (intent.estimatedDuration < 0) {
      errors.push('Estimated duration cannot be negative');
    }

    if (!intent.entities || typeof intent.entities !== 'object') {
      errors.push('Entities object is required');
    }

    if (!intent.context || typeof intent.context !== 'object') {
      errors.push('Context object is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
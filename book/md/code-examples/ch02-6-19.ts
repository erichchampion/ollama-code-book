/**
 * Request context for routing decisions
 */
export interface RoutingContext {
  /** The user's prompt */
  prompt: string;

  /** Task complexity (estimated) */
  complexity: 'simple' | 'medium' | 'complex';

  /** Priority: cost, quality, or performance */
  priority: 'cost' | 'quality' | 'performance' | 'balanced';

  /** Maximum acceptable cost for this request */
  maxCost?: number;

  /** Maximum acceptable latency (ms) */
  maxLatency?: number;

  /** Required capabilities */
  requiredCapabilities?: string[];

  /** Conversation history (for context) */
  conversationHistory?: Message[];
}

/**
 * Routing decision result
 */
export interface RoutingDecision {
  /** Selected provider ID */
  providerId: string;

  /** Selected model */
  model: string;

  /** Reasoning for this choice */
  reasoning: string;

  /** Estimated cost */
  estimatedCost: number;

  /** Fallback providers (in order) */
  fallbacks: string[];

  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Routing strategy interface
 */
export interface RoutingStrategy {
  /**
   * Select the best provider for this context
   */
  selectProvider(
    context: RoutingContext,
    availableProviders: Map<string, BaseAIProvider>
  ): Promise<RoutingDecision>;

  /**
   * Get strategy name
   */
  getName(): string;
}
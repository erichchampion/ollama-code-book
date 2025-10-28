export interface FusionResponse {
  /** The fused/consensus result */
  result: string;

  /** Individual provider responses */
  individualResponses: Array<{
    providerId: string;
    response: string;
    confidence: number;
  }>;

  /** Fusion method used */
  fusionMethod: string;

  /** Overall confidence in result (0-1) */
  confidence: number;

  /** Total cost of fusion */
  totalCost: number;
}

export class MajorityVotingFusion {
  constructor(
    private router: IntelligentRouter,
    private logger: Logger
  ) {}

  /**
   * Get consensus from multiple providers using majority voting
   */
  async fuse(
    prompt: string,
    options: {
      providerIds?: string[];  // Specific providers (default: top 3)
      minAgreement?: number;    // Minimum agreement % (default: 0.66)
      complexity?: 'simple' | 'medium' | 'complex';
    } = {}
  ): Promise<FusionResponse> {
    const { providerIds, minAgreement = 0.66, complexity = 'medium' } = options;

    // Determine providers to query
    const providers = providerIds || await this.selectProvidersForFusion(complexity);

    if (providers.length < 2) {
      throw new Error('Fusion requires at least 2 providers');
    }

    this.logger.info(`Starting majority voting fusion with ${providers.length} providers`);

    // Query all providers in parallel
    const responses = await Promise.allSettled(
      providers.map(async (providerId) => {
        const provider = await this.router['providerManager'].getProvider(providerId);
        const response = await provider.complete(prompt, { temperature: 0.3 });

        return {
          providerId,
          response: response.content,
          confidence: this.calculateConfidence(response),
          cost: response.metadata?.cost || 0
        };
      })
    );

    // Extract successful responses
    const successfulResponses = responses
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    if (successfulResponses.length < 2) {
      throw new Error('Fusion requires at least 2 successful responses');
    }

    // Group similar responses
    const groups = this.groupSimilarResponses(successfulResponses);

    // Find majority group
    const majorityGroup = groups.sort((a, b) => b.length - a.length)[0];
    const agreementRatio = majorityGroup.length / successfulResponses.length;

    if (agreementRatio < minAgreement) {
      this.logger.warn(`Low agreement in fusion: ${(agreementRatio * 100).toFixed(1)}%`);
    }

    // Calculate total cost
    const totalCost = successfulResponses.reduce((sum, r) => sum + r.cost, 0);

    // Use the highest-confidence response from majority group
    const bestResponse = majorityGroup
      .sort((a, b) => b.confidence - a.confidence)[0];

    return {
      result: bestResponse.response,
      individualResponses: successfulResponses,
      fusionMethod: 'majority-voting',
      confidence: agreementRatio,
      totalCost
    };
  }

  /**
   * Group similar responses together
   */
  private groupSimilarResponses(responses: any[]): any[][] {
    const groups: any[][] = [];

    for (const response of responses) {
      let foundGroup = false;

      for (const group of groups) {
        // Check similarity to first member of group
        const similarity = this.calculateSimilarity(response.response, group[0].response);

        if (similarity > 0.80) {  // 80% similarity threshold
          group.push(response);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        groups.push([response]);
      }
    }

    return groups;
  }

  /**
   * Calculate similarity between two strings (0-1)
   */
  private calculateSimilarity(a: string, b: string): number {
    // Simple normalized Levenshtein distance
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance implementation
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Select best providers for fusion
   */
  private async selectProvidersForFusion(complexity: string): Promise<string[]> {
    // Use quality-optimized strategy to select top 3 providers
    const context: RoutingContext = {
      prompt: '',
      complexity: complexity as any,
      priority: 'quality'
    };

    const decision = await this.router.route(context);

    // Return primary + top 2 fallbacks
    return [decision.providerId, ...decision.fallbacks.slice(0, 2)];
  }

  /**
   * Calculate confidence score for response
   */
  private calculateConfidence(response: any): number {
    // Factors: finish reason, content length, metadata
    let confidence = 0.5;  // Base confidence

    if (response.finishReason === 'stop') {
      confidence += 0.3;  // Complete response
    }

    if (response.content.length > 100) {
      confidence += 0.1;  // Substantial content
    }

    if (response.metadata?.confidence) {
      confidence = (confidence + response.metadata.confidence) / 2;
    }

    return Math.min(1.0, confidence);
  }
}
export class WeightedConsensusFusion {
  // Provider quality weights (sum = 1.0)
  private providerWeights: Record<string, number> = {
    'openai-main': 0.30,
    'anthropic-main': 0.35,
    'google-main': 0.20,
    'ollama-local': 0.15
  };

  constructor(
    private router: IntelligentRouter,
    private logger: Logger
  ) {}

  /**
   * Fuse responses using weighted consensus
   */
  async fuse(
    prompt: string,
    options: {
      providerIds?: string[];
      complexity?: 'simple' | 'medium' | 'complex';
    } = {}
  ): Promise<FusionResponse> {
    const { providerIds, complexity = 'medium' } = options;

    const providers = providerIds || Object.keys(this.providerWeights);

    this.logger.info(`Starting weighted consensus fusion with ${providers.length} providers`);

    // Query all providers
    const responses = await Promise.allSettled(
      providers.map(async (providerId) => {
        const provider = await this.router['providerManager'].getProvider(providerId);
        const response = await provider.complete(prompt, { temperature: 0.3 });

        return {
          providerId,
          response: response.content,
          confidence: this.calculateConfidence(response),
          weight: this.providerWeights[providerId] || 0.10,
          cost: response.metadata?.cost || 0
        };
      })
    );

    const successfulResponses = responses
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    if (successfulResponses.length === 0) {
      throw new Error('All fusion providers failed');
    }

    // Group similar responses
    const groups = this.groupSimilarResponses(successfulResponses);

    // Calculate weighted score for each group
    const groupScores = groups.map(group => {
      const totalWeight = group.reduce((sum, r) => sum + r.weight, 0);
      const avgConfidence = group.reduce((sum, r) => sum + r.confidence, 0) / group.length;

      return {
        group,
        score: totalWeight * avgConfidence,
        totalWeight
      };
    });

    // Select highest scoring group
    const winningGroup = groupScores.sort((a, b) => b.score - a.score)[0];

    // Use highest confidence response from winning group
    const bestResponse = winningGroup.group
      .sort((a, b) => b.confidence - a.confidence)[0];

    const totalCost = successfulResponses.reduce((sum, r) => sum + r.cost, 0);

    return {
      result: bestResponse.response,
      individualResponses: successfulResponses,
      fusionMethod: 'weighted-consensus',
      confidence: winningGroup.score,
      totalCost
    };
  }

  private groupSimilarResponses(responses: any[]): any[][] {
    // Same implementation as MajorityVotingFusion
    const groups: any[][] = [];

    for (const response of responses) {
      let foundGroup = false;

      for (const group of groups) {
        const similarity = this.calculateSimilarity(response.response, group[0].response);

        if (similarity > 0.80) {
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

  private calculateSimilarity(a: string, b: string): number {
    // Same implementation as MajorityVotingFusion
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(a: string, b: string): number {
    // Same implementation as MajorityVotingFusion
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

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

  private calculateConfidence(response: any): number {
    // Same implementation as MajorityVotingFusion
    let confidence = 0.5;

    if (response.finishReason === 'stop') confidence += 0.3;
    if (response.content.length > 100) confidence += 0.1;
    if (response.metadata?.confidence) {
      confidence = (confidence + response.metadata.confidence) / 2;
    }

    return Math.min(1.0, confidence);
  }
}
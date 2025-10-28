/**
 * Privacy-preserving AI interaction strategy
 */
export class PrivacyPreservingAI {
  private privacyFilter: PrivacyFilter;
  private localProvider: AIProvider; // Ollama
  private cloudProvider: AIProvider; // Anthropic/OpenAI
  private logger: Logger;

  constructor(
    localProvider: AIProvider,
    cloudProvider: AIProvider,
    logger: Logger
  ) {
    this.privacyFilter = new PrivacyFilter(logger);
    this.localProvider = localProvider;
    this.cloudProvider = cloudProvider;
    this.logger = logger;
  }

  /**
   * Route request based on sensitivity
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Analyze sensitivity
    const sensitivity = this.analyzeSensitivity(request);

    this.logger.info('Privacy routing:', {
      sensitivity: sensitivity.level,
      reasons: sensitivity.reasons
    });

    // Route based on sensitivity
    if (sensitivity.level === 'high' || sensitivity.level === 'critical') {
      // Use local provider for sensitive data
      return this.localProvider.complete(request);

    } else {
      // Filter and use cloud provider for non-sensitive data
      const filtered = await this.filterRequest(request);
      return this.cloudProvider.complete(filtered);
    }
  }

  /**
   * Analyze sensitivity of request
   */
  private analyzeSensitivity(request: CompletionRequest): SensitivityAnalysis {
    const reasons: string[] = [];
    let level: SensitivityLevel = 'low';

    // Check each message
    for (const message of request.messages) {
      const validation = new InputValidator(this.logger).validate(message.content);

      for (const issue of validation.issues) {
        if (issue.type === 'sensitive_data') {
          level = 'critical';
          reasons.push(`Message contains ${issue.message}`);
        }
      }
    }

    // Check for code files
    const hasCodeFiles = request.messages.some(m =>
      m.content.includes('```') || m.content.length > 5000
    );

    if (hasCodeFiles) {
      if (level === 'low') level = 'medium';
      reasons.push('Request contains code files');
    }

    return { level, reasons };
  }

  /**
   * Filter request before sending to cloud
   */
  private async filterRequest(
    request: CompletionRequest
  ): Promise<CompletionRequest> {
    const filteredMessages = await Promise.all(
      request.messages.map(async msg => {
        const result = await this.privacyFilter.filterForAI(msg.content);

        return {
          ...msg,
          content: result.filtered
        };
      })
    );

    return {
      ...request,
      messages: filteredMessages
    };
  }
}

type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';

interface SensitivityAnalysis {
  level: SensitivityLevel;
  reasons: string[];
}
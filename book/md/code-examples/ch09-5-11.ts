/**
 * Filters sensitive data before sending to AI
 */
export class PrivacyFilter {
  private validator: InputValidator;
  private logger: Logger;

  constructor(logger: Logger) {
    this.validator = new InputValidator(logger);
    this.logger = logger;
  }

  /**
   * Filter input before sending to AI
   */
  async filterForAI(input: string): Promise<FilterResult> {
    // Sanitize sensitive data
    const sanitized = this.validator.sanitize(input);

    // Check if safe
    const safe = this.validator.isSafeForAI(input);

    if (!safe) {
      this.logger.warn('Input filtered for AI:', {
        originalLength: input.length,
        sanitizedLength: sanitized.length
      });
    }

    return {
      filtered: sanitized,
      hadSensitiveData: !safe,
      redactions: this.countRedactions(input, sanitized)
    };
  }

  /**
   * Filter file content before sending to AI
   */
  async filterFileContent(
    filePath: string,
    content: string
  ): Promise<FilterResult> {
    // Check if file should be entirely blocked
    if (this.isBlockedFile(filePath)) {
      this.logger.warn('Blocked file from AI:', { path: filePath });

      return {
        filtered: `[File ${filePath} contains sensitive data and was not sent to AI]`,
        hadSensitiveData: true,
        redactions: 1
      };
    }

    // Filter content
    return this.filterForAI(content);
  }

  /**
   * Check if file is sensitive and should be blocked
   */
  private isBlockedFile(filePath: string): boolean {
    const blockedPatterns = [
      /\.env$/,
      /\.env\./,
      /credentials/i,
      /secrets/i,
      /\.key$/,
      /\.pem$/,
      /id_rsa$/,
      /id_dsa$/
    ];

    return blockedPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Count number of redactions made
   */
  private countRedactions(original: string, filtered: string): number {
    const redactionPattern = /\[REDACTED\]/g;
    const matches = filtered.match(redactionPattern);
    return matches ? matches.length : 0;
  }
}

export interface FilterResult {
  filtered: string;
  hadSensitiveData: boolean;
  redactions: number;
}
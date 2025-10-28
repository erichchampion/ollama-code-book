/**
 * Quality-based assertions for AI outputs
 */
export class AIAssertions {
  /**
   * Assert response contains code
   */
  static containsCode(response: string): void {
    const codeBlockPattern = /```[\s\S]*?```/;

    if (!codeBlockPattern.test(response)) {
      throw new Error('Response does not contain code block');
    }
  }

  /**
   * Assert code is valid TypeScript
   */
  static async isValidTypeScript(code: string): Promise<void> {
    const ts = await import('typescript');

    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext
      }
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      const errors = result.diagnostics.map(d => d.messageText).join('\n');
      throw new Error(`TypeScript compilation errors:\n${errors}`);
    }
  }

  /**
   * Assert code passes linting
   */
  static async passesLint(code: string): Promise<void> {
    const { ESLint } = await import('eslint');

    const eslint = new ESLint({
      useEslintrc: false,
      baseConfig: {
        extends: ['eslint:recommended'],
        parserOptions: {
          ecmaVersion: 2020,
          sourceType: 'module'
        }
      }
    });

    const results = await eslint.lintText(code);

    const errors = results[0].messages.filter(m => m.severity === 2);

    if (errors.length > 0) {
      const errorMessages = errors.map(e => e.message).join('\n');
      throw new Error(`Linting errors:\n${errorMessages}`);
    }
  }

  /**
   * Assert code implements specific functionality
   */
  static implementsFunction(code: string, functionName: string): void {
    const functionPattern = new RegExp(
      `(function\\s+${functionName}|const\\s+${functionName}\\s*=|${functionName}\\s*:\\s*function)`
    );

    if (!functionPattern.test(code)) {
      throw new Error(`Code does not implement function: ${functionName}`);
    }
  }

  /**
   * Assert response has minimum quality score
   */
  static async hasMinimumQuality(
    response: string,
    minScore: number,
    criteria: QualityCriteria
  ): Promise<void> {
    const score = await this.calculateQualityScore(response, criteria);

    if (score < minScore) {
      throw new Error(
        `Quality score ${score.toFixed(2)} below minimum ${minScore}`
      );
    }
  }

  /**
   * Calculate quality score based on criteria
   */
  private static async calculateQualityScore(
    response: string,
    criteria: QualityCriteria
  ): Promise<number> {
    let score = 0;
    let totalWeight = 0;

    if (criteria.hasCode) {
      totalWeight += criteria.hasCode;
      if (/```[\s\S]*?```/.test(response)) {
        score += criteria.hasCode;
      }
    }

    if (criteria.hasExplanation) {
      totalWeight += criteria.hasExplanation;
      // Check for explanation text (not in code blocks)
      const textOutsideCode = response.replace(/```[\s\S]*?```/g, '');
      if (textOutsideCode.trim().length > 50) {
        score += criteria.hasExplanation;
      }
    }

    if (criteria.isValid) {
      totalWeight += criteria.isValid;
      const codeMatch = response.match(/```(?:typescript|javascript)?\n([\s\S]*?)```/);
      if (codeMatch) {
        try {
          await this.isValidTypeScript(codeMatch[1]);
          score += criteria.isValid;
        } catch (error) {
          // Not valid
        }
      }
    }

    return totalWeight > 0 ? (score / totalWeight) * 100 : 0;
  }

  /**
   * Assert semantic similarity to expected output
   */
  static async semanticallySimilar(
    actual: string,
    expected: string,
    minSimilarity: number = 0.7
  ): Promise<void> {
    // Use Levenshtein distance for simple similarity
    const similarity = this.calculateSimilarity(actual, expected);

    if (similarity < minSimilarity) {
      throw new Error(
        `Semantic similarity ${similarity.toFixed(2)} below minimum ${minSimilarity}`
      );
    }
  }

  /**
   * Calculate similarity using Levenshtein distance
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);

    return 1 - (distance / maxLen);
  }
}

export interface QualityCriteria {
  hasCode?: number;        // Weight for containing code
  hasExplanation?: number; // Weight for containing explanation
  isValid?: number;        // Weight for valid syntax
  passesLint?: number;     // Weight for passing linting
}
/**
 * Anonymizes code and data before sending to AI
 */
export class CodeAnonymizer {
  private identifierMap: Map<string, string> = new Map();
  private counter = 0;

  /**
   * Anonymize code by replacing identifiers
   */
  anonymize(code: string, language: string): AnonymizedCode {
    // Simple anonymization (production would use AST parsing)
    let anonymized = code;

    // Replace function names
    anonymized = anonymized.replace(
      /function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (match, name) => {
        const anon = this.getAnonymousName(name);
        return `function ${anon}`;
      }
    );

    // Replace variable names
    anonymized = anonymized.replace(
      /(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (match, name) => {
        const anon = this.getAnonymousName(name);
        return match.replace(name, anon);
      }
    );

    // Replace class names
    anonymized = anonymized.replace(
      /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (match, name) => {
        const anon = this.getAnonymousName(name);
        return `class ${anon}`;
      }
    );

    return {
      anonymized,
      identifierMap: new Map(this.identifierMap)
    };
  }

  /**
   * Deanonymize response from AI
   */
  deanonymize(code: string): string {
    let deanonymized = code;

    // Reverse identifier mapping
    for (const [original, anon] of this.identifierMap) {
      deanonymized = deanonymized.replace(
        new RegExp(`\\b${anon}\\b`, 'g'),
        original
      );
    }

    return deanonymized;
  }

  /**
   * Get or create anonymous name
   */
  private getAnonymousName(original: string): string {
    if (this.identifierMap.has(original)) {
      return this.identifierMap.get(original)!;
    }

    const anon = `var_${this.counter++}`;
    this.identifierMap.set(original, anon);

    return anon;
  }

  /**
   * Clear mapping
   */
  reset(): void {
    this.identifierMap.clear();
    this.counter = 0;
  }
}

interface AnonymizedCode {
  anonymized: string;
  identifierMap: Map<string, string>;
}
/**
 * Generates synthetic test cases for AI systems
 */
export class SyntheticTestGenerator {
  constructor(private aiProvider: AIProvider) {}

  /**
   * Generate test cases for a function
   */
  async generateTests(
    functionCode: string,
    options: GenerateTestsOptions = {}
  ): Promise<GeneratedTest[]> {
    const prompt = this.buildGenerationPrompt(functionCode, options);

    const response = await this.aiProvider.complete({
      messages: [
        {
          role: MessageRole.SYSTEM,
          content: 'You generate comprehensive test cases for code.'
        },
        {
          role: MessageRole.USER,
          content: prompt
        }
      ],
      temperature: 0.7 // Higher temperature for diverse tests
    });

    return this.parseGeneratedTests(response.content);
  }

  /**
   * Build prompt for test generation
   */
  private buildGenerationPrompt(
    functionCode: string,
    options: GenerateTestsOptions
  ): string {
    return `
Generate comprehensive test cases for the following function:

\`\`\`typescript
${functionCode}
\`\`\`

Requirements:
- Test happy path scenarios
- Test edge cases (empty input, null, undefined, boundary values)
- Test error cases
- Test integration scenarios${options.includePerformance ? '\n- Test performance characteristics' : ''}

Generate ${options.count || 10} test cases covering different scenarios.

Output format (JSON):
\`\`\`json
[
  {
    "description": "Test description",
    "input": {...},
    "expectedOutput": {...},
    "expectedError": null | "error message",
    "category": "happy_path" | "edge_case" | "error_case" | "integration"
  }
]
\`\`\`
    `.trim();
  }

  /**
   * Parse generated test cases
   */
  private parseGeneratedTests(response: string): GeneratedTest[] {
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    const json = jsonMatch ? jsonMatch[1] : response;

    return JSON.parse(json);
  }

  /**
   * Generate edge cases for input type
   */
  async generateEdgeCases(inputType: string): Promise<any[]> {
    const edgeCases: Record<string, any[]> = {
      string: ['', ' ', '\n', 'a'.repeat(10000), '🚀', 'null', 'undefined'],
      number: [0, -1, 1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, NaN, Infinity, -Infinity],
      boolean: [true, false],
      array: [[], [1], Array(1000).fill(0)],
      object: [{}, { key: 'value' }, null]
    };

    return edgeCases[inputType] || [];
  }
}

export interface GenerateTestsOptions {
  count?: number;
  includePerformance?: boolean;
  includeIntegration?: boolean;
}

export interface GeneratedTest {
  description: string;
  input: any;
  expectedOutput?: any;
  expectedError?: string;
  category: 'happy_path' | 'edge_case' | 'error_case' | 'integration';
}
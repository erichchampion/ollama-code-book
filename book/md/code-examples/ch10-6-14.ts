describe('Synthetic Tests', () => {
  let generator: SyntheticTestGenerator;

  beforeAll(async () => {
    // Use real AI for generation (run once, cache results)
    const ai = new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY! });
    generator = new SyntheticTestGenerator(ai);
  });

  test('run generated tests for TokenCounter', async () => {
    const functionCode = `
    export class TokenCounter {
      count(text: string): number {
        return text.split(/\\s+/).filter(word => word.length > 0).length;
      }
    }
    `;

    // Generate tests (do this once, save results)
    const generatedTests = await generator.generateTests(functionCode, {
      count: 20
    });

    // Save to file for later use
    fs.writeFileSync(
      './tests/generated/token-counter.json',
      JSON.stringify(generatedTests, null, 2)
    );

    // Run generated tests
    const counter = new TokenCounter();

    for (const test of generatedTests) {
      if (test.expectedError) {
        expect(() => counter.count(test.input.text)).toThrow(test.expectedError);
      } else {
        const result = counter.count(test.input.text);
        expect(result).toBe(test.expectedOutput);
      }
    }
  });
});
describe('Code Generation Quality', () => {
  let ai: AIProvider;

  beforeAll(() => {
    ai = new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY! });
  });

  test('generates valid code with explanation', async () => {
    const response = await ai.complete({
      messages: [{
        role: MessageRole.USER,
        content: 'Write a TypeScript function to calculate fibonacci numbers'
      }]
    });

    // Quality-based assertions
    AIAssertions.containsCode(response.content);

    const codeMatch = response.content.match(/```typescript\n([\s\S]*?)```/);
    expect(codeMatch).not.toBeNull();

    const code = codeMatch![1];

    // Assert valid TypeScript
    await AIAssertions.isValidTypeScript(code);

    // Assert implements fibonacci
    AIAssertions.implementsFunction(code, 'fibonacci');

    // Assert passes linting
    await AIAssertions.passesLint(code);

    // Assert minimum quality
    await AIAssertions.hasMinimumQuality(response.content, 80, {
      hasCode: 30,
      hasExplanation: 30,
      isValid: 40
    });
  });

  test('generates semantically similar responses', async () => {
    const response1 = await ai.complete({
      messages: [{
        role: MessageRole.USER,
        content: 'Explain dependency injection'
      }],
      temperature: 0.7
    });

    const response2 = await ai.complete({
      messages: [{
        role: MessageRole.USER,
        content: 'Explain dependency injection'
      }],
      temperature: 0.7
    });

    // Responses should be semantically similar even if not identical
    await AIAssertions.semanticallySimilar(
      response1.content,
      response2.content,
      0.6 // 60% similarity threshold
    );
  });
});
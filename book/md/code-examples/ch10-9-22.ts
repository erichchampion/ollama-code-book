describe('Regression Tests', () => {
  let ai: AIProvider;
  let regressionSuite: RegressionTestSuite;

  beforeAll(async () => {
    ai = new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY! });
    regressionSuite = new RegressionTestSuite('./tests/baseline.json');
    await regressionSuite.loadBaseline();
  });

  afterAll(async () => {
    await regressionSuite.saveBaseline();
  });

  test('code generation quality', async () => {
    const response = await ai.complete({
      messages: [{
        role: MessageRole.USER,
        content: 'Write a TypeScript function to reverse a string'
      }]
    });

    const result = await regressionSuite.testAgainstBaseline(
      'reverse_string',
      response.content,
      {
        hasCode: 30,
        hasExplanation: 20,
        isValid: 50
      }
    );

    if (result.status === 'regression') {
      throw new Error(result.message);
    }

    expect(result.status).not.toBe('regression');
  });

  test('commit message quality', async () => {
    const generator = new CommitMessageGenerator(ai);

    const diff: GitDiff = {
      files: [
        { path: 'src/auth/login.ts', additions: 15, deletions: 3, changes: 18 }
      ],
      additions: 15,
      deletions: 3
    };

    const message = await generator.generate(diff, { scope: 'auth' });

    const result = await regressionSuite.testAgainstBaseline(
      'commit_message_auth',
      message.message,
      {
        hasExplanation: 100 // Commit messages should be explanatory
      }
    );

    expect(result.status).not.toBe('regression');
  });
});
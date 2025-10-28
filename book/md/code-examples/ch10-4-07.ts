describe('CommitMessageGenerator', () => {
  let mockAI: MockAIProvider;
  let generator: CommitMessageGenerator;

  beforeEach(() => {
    mockAI = new MockAIProvider();
    generator = new CommitMessageGenerator(mockAI);
  });

  afterEach(() => {
    mockAI.reset();
  });

  test('generates conventional commit message', async () => {
    // Mock AI response
    mockAI.setDefaultResponse(
      'fix(auth): resolve token refresh race condition\n\n' +
      'Add mutex lock to prevent concurrent token refreshes'
    );

    const diff: GitDiff = {
      files: [
        {
          path: 'src/auth/token.ts',
          additions: 10,
          deletions: 2,
          changes: 12
        }
      ],
      additions: 10,
      deletions: 2
    };

    const message = await generator.generate(diff);

    expect(message.message).toMatch(/^fix\(auth\):/);
    expect(message.message).toContain('token refresh');
    expect(mockAI.getCallCount()).toBe(1);
  });

  test('uses scope from context', async () => {
    mockAI.setDefaultResponse('feat(api): add user endpoint');

    const diff: GitDiff = {
      files: [{ path: 'src/api/users.ts', additions: 50, deletions: 0, changes: 50 }],
      additions: 50,
      deletions: 0
    };

    const message = await generator.generate(diff, {
      scope: 'api'
    });

    expect(message.message).toMatch(/^feat\(api\):/);

    // Verify AI was called with scope in prompt
    const calls = mockAI.getCalls();
    expect(calls[0].messages[1].content).toContain('scope: api');
  });
});

describe('NaturalLanguageRouter', () => {
  let mockAI: MockAIProvider;
  let router: NaturalLanguageRouter;

  beforeEach(() => {
    mockAI = new MockAIProvider();
    router = new NaturalLanguageRouter(mockAI, commandRegistry, logger);
  });

  test('routes commit intent', async () => {
    // Mock intent classification response
    mockAI.setResponse(
      /classify/i,
      JSON.stringify([{
        intent: 'COMMIT',
        confidence: 0.95,
        extractedParams: {},
        missingParams: []
      }])
    );

    const result = await router.route('commit my changes', context);

    expect(result.success).toBe(true);
    expect(result.commands).toHaveLength(1);
    expect(result.commands![0].command.name).toBe('commit');
  });

  test('handles unknown intent', async () => {
    mockAI.setResponse(/classify/i, JSON.stringify([]));

    const result = await router.route('do something weird', context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Could not understand intent');
  });
});
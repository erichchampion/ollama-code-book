describe('CommitWorkflow Integration', () => {
  let mockAI: MockAIProvider;
  let mockGit: MockGitService;
  let workflow: CommitWorkflow;

  beforeEach(() => {
    mockAI = new MockAIProvider();
    mockGit = new MockGitService();
    workflow = new CommitWorkflow(mockAI, mockGit);
  });

  test('complete commit workflow', async () => {
    // Setup git state
    mockGit.setStatus({
      branch: 'feature/auth',
      files: [
        { path: 'src/auth/login.ts', status: 'modified', staged: false },
        { path: 'src/auth/token.ts', status: 'modified', staged: false }
      ]
    });

    mockGit.setDiff({
      files: [
        { path: 'src/auth/login.ts', additions: 10, deletions: 2, changes: 12 },
        { path: 'src/auth/token.ts', additions: 5, deletions: 1, changes: 6 }
      ],
      additions: 15,
      deletions: 3
    });

    // Mock AI to generate commit message
    mockAI.setDefaultResponse(
      'feat(auth): implement token-based authentication\n\n' +
      'Add JWT token generation and validation'
    );

    // Execute workflow
    const result = await workflow.execute({
      scope: 'auth',
      autoStage: true
    });

    expect(result.success).toBe(true);
    expect(result.commitHash).toBeDefined();

    // Verify git operations
    expect(mockGit.wasCalledWith('add', ['src/auth/login.ts', 'src/auth/token.ts'])).toBe(true);
    expect(mockGit.wasCalledWith('commit')).toBe(true);
  });
});
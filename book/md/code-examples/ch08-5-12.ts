// Register commands with lazy loading
commandRegistry.register({
  className: 'CommitCommand',
  loader: async () => {
    const { CommitCommand } = await import('./commands/commit.js');
    return CommitCommand;
  },
  dependencies: {
    gitService,
    aiProvider,
    logger
  }
});

commandRegistry.register({
  className: 'ReviewCommand',
  loader: async () => {
    const { ReviewCommand } = await import('./commands/review.js');
    return ReviewCommand;
  },
  dependencies: {
    gitService,
    githubService,
    aiProvider,
    logger
  }
});

commandRegistry.register({
  className: 'AnalyzeCommand',
  loader: async () => {
    const { AnalyzeCommand } = await import('./commands/analyze.js');
    return AnalyzeCommand;
  },
  dependencies: {
    codeAnalyzer,
    logger
  }
});
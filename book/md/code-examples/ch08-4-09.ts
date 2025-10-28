// Register commit intent
classifier.registerIntent({
  name: 'COMMIT',
  description: 'Create a git commit with staged changes',
  examples: [
    'commit my changes',
    'commit with message "fix bug"',
    'create a commit for the auth files',
    'commit the authentication changes'
  ],
  requiredParams: [],
  optionalParams: ['message', 'files', 'scope'],
  commandClass: 'CommitCommand'
});

// Register review intent
classifier.registerIntent({
  name: 'REVIEW',
  description: 'Review code or pull request',
  examples: [
    'review PR 123',
    'review my changes',
    'code review the authentication module',
    'review that pull request we discussed'
  ],
  requiredParams: [],
  optionalParams: ['pr', 'files', 'depth'],
  commandClass: 'ReviewCommand'
});

// Register analyze intent
classifier.registerIntent({
  name: 'ANALYZE',
  description: 'Analyze code quality, complexity, or other metrics',
  examples: [
    'analyze code complexity',
    'check code quality',
    'analyze the auth module',
    'measure test coverage'
  ],
  requiredParams: [],
  optionalParams: ['type', 'files', 'threshold'],
  commandClass: 'AnalyzeCommand'
});

// Register test intent
classifier.registerIntent({
  name: 'TEST',
  description: 'Run tests',
  examples: [
    'run tests',
    'test the auth module',
    'run unit tests',
    'execute test suite'
  ],
  requiredParams: [],
  optionalParams: ['files', 'type', 'watch'],
  commandClass: 'TestCommand'
});
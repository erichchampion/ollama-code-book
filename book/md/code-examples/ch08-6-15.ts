// Example 1: Infer files from scope
const context1 = {
  workingDirectory: '/project',
  gitStatus: {
    branch: 'main',
    files: [
      { path: 'src/auth/login.ts', staged: true },
      { path: 'src/auth/token.ts', staged: true },
      { path: 'src/api/users.ts', staged: false }
    ]
  },
  conversationHistory: [],
  aiProvider,
  cancellationToken: new CancellationToken()
};

const inferred1 = await inferenceEngine.infer(
  commitCommand,
  { scope: 'auth' },
  { ...context1, userInput: 'commit auth changes', extractedParams: {} }
);
// Result: { files: ['src/auth/login.ts', 'src/auth/token.ts'] }

// Example 2: Infer PR from conversation
const context2 = {
  ...context1,
  conversationHistory: [
    {
      role: MessageRole.USER,
      content: 'I just created PR #456 for the authentication feature'
    }
  ]
};

const inferred2 = await inferenceEngine.infer(
  reviewCommand,
  {},
  { ...context2, userInput: 'review that PR', extractedParams: {} }
);
// Result: { pr: 456, scope: 'authentication' }

// Example 3: Infer test command from package.json
const context3 = {
  ...context1,
  projectStructure: {
    packageJson: {
      scripts: {
        test: 'vitest',
        'test:unit': 'vitest run'
      }
    },
    directories: [
      { name: 'src', path: 'src' },
      { name: 'test', path: 'test' }
    ],
    files: []
  }
};

const inferred3 = await inferenceEngine.infer(
  testCommand,
  {},
  { ...context3, userInput: 'run tests', extractedParams: {} }
);
// Result: { command: 'npm test', files: ['test'] }
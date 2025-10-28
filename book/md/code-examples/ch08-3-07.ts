// Initialize router
const router = new NaturalLanguageRouter(
  aiProvider,
  commandRegistry,
  logger
);

// Route natural language input
const result = await router.route(
  "commit my authentication changes and run tests",
  {
    workingDirectory: process.cwd(),
    conversationHistory: [],
    gitStatus: await getGitStatus(),
    projectStructure: await analyzeProject(),
    aiProvider,
    cancellationToken: new CancellationToken()
  }
);

if (result.success) {
  // Execute commands in sequence
  for (const { command, params } of result.commands) {
    console.log(`\n▶️  ${command.name}`);

    const commandResult = await command.execute(params, context);

    if (!commandResult.success) {
      console.error(`❌ ${commandResult.error}`);
      break;
    }

    console.log(`✓ ${commandResult.message}`);
  }
} else {
  console.error(`❌ ${result.error}`);
}
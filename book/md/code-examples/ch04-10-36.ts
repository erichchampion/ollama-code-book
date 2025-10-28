// Bootstrap the orchestrator
const logger = new Logger();
const registry = createToolRegistry(logger);
const orchestrator = new ToolOrchestrator(registry, logger, '/project', {
  maxConcurrency: 5,
  cache: {
    maxSize: 1000,
    ttlMs: 5 * 60 * 1000 // 5 minutes
  }
});

// Define tool calls
const toolCalls: ToolCall[] = [
  {
    id: 'call_1',
    toolName: 'list_files',
    parameters: { path: 'src/', recursive: true, pattern: '*.ts' }
  },
  {
    id: 'call_2',
    toolName: 'search_code',
    parameters: { pattern: 'TODO:', path: 'src/' }
  },
  {
    id: 'call_3',
    toolName: 'read_file',
    parameters: { path: '${call_1.data.files[0]}' },
    dependsOn: ['call_1']
  },
  {
    id: 'call_4',
    toolName: 'write_file',
    parameters: {
      path: 'analysis.md',
      content: 'Analysis results:\n${call_2.data.matches}'
    },
    dependsOn: ['call_2']
  }
];

// Execute with options
const result = await orchestrator.execute(toolCalls, {
  parallelExecution: true,
  enableCache: true,
  failFast: false,
  approvalCallback: async (call, tool) => {
    // Show user what will be done
    console.log(`\nTool: ${tool.name}`);
    console.log(`Description: ${tool.description}`);
    console.log(`Parameters: ${JSON.stringify(call.parameters, null, 2)}`);

    // Prompt for approval
    const answer = await promptUser('Approve? (y/n): ');
    return answer.toLowerCase() === 'y';
  }
});

// Display results
console.log(`\n✓ Execution complete`);
console.log(`  Success: ${result.metadata.successCount}/${result.metadata.totalCalls}`);
console.log(`  Duration: ${result.metadata.durationMs}ms`);
console.log(`  Cache hits: ${result.metadata.cacheHits}`);
console.log(`  Parallel levels: ${result.metadata.parallelLevels}`);

// Show individual results
for (const toolResult of result.results) {
  if (toolResult.success) {
    console.log(`✓ ${toolResult.toolName}`);
  } else {
    console.log(`✗ ${toolResult.toolName}: ${toolResult.error?.message}`);
  }
}
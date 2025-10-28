// User request
"Find all TODOs in src/ and create GitHub issues"

// 1. AI Provider returns tool calls
const toolCalls: ToolCall[] = [
  {
    id: 'call_1',
    toolName: 'search_code',
    parameters: {
      pattern: 'TODO:',
      path: 'src/',
      includeContext: true
    }
  },
  {
    id: 'call_2',
    toolName: 'read_file',
    parameters: {
      path: '${call_1.results[0].file}' // Depends on search results
    },
    dependsOn: ['call_1']
  },
  {
    id: 'call_3',
    toolName: 'create_github_issue',
    parameters: {
      title: 'TODO: ${call_2.todoContent}',
      body: '${call_2.context}',
      labels: ['technical-debt']
    },
    dependsOn: ['call_2'],
    requiresApproval: true // User must approve issue creation
  }
];

// 2. Tool Orchestrator processes calls
const orchestrator = new ToolOrchestrator(toolRegistry);
const results = await orchestrator.execute(toolCalls, {
  parallelExecution: true,
  enableCache: true,
  approvalCallback: async (call) => {
    // Show user what will be done
    console.log(`Create GitHub issue: ${call.parameters.title}?`);
    return await promptUser('Approve? (y/n)');
  }
});

// 3. Results returned to AI
// AI can now respond to user with summary:
// "✓ Found 15 TODOs
//  ✓ Created 15 GitHub issues
//  📊 Issues: #101-#115"
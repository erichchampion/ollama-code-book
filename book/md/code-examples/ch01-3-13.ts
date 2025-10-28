// Step 1: User Input
// Command: ollama-code "Add input validation to the login function"

// Step 2: Intent Analysis
const intent = await intentAnalyzer.analyze("Add input validation to the login function");
// Result: { type: 'task_request', action: 'modify_code', confidence: 0.95 }

// Step 3: Context Gathering
const context = await projectContext.findRelevantFiles("login function");
// Result: ['src/auth/login.ts', 'src/validators/index.ts']

const loginCode = await fs.readFile('src/auth/login.ts');
// Current code without validation

// Step 4: AI Processing
const response = await aiClient.completeStream(
  `Add input validation to this login function:

   ${loginCode}

   Use the validators from src/validators/index.ts`,
  {
    onContent: (chunk) => terminal.write(chunk),
    onToolCall: async (toolCall) => {
      if (toolCall.name === 'filesystem') {
        // AI wants to write updated code
        const result = await toolRegistry.execute(toolCall);
        return result;
      }
    }
  }
);

// Step 5: Tool Execution
// AI calls: filesystem tool with operation='write'
// Result: Updated src/auth/login.ts with validation

// Step 6: Response Display
terminal.success('✓ Added input validation to login function');
terminal.info('Modified files:');
terminal.info('  - src/auth/login.ts');

// Step 7: State Update
await conversationManager.addTurn(
  userInput: "Add input validation to the login function",
  intent,
  response: "I've added comprehensive input validation...",
  actions: [{ type: 'file_modified', path: 'src/auth/login.ts' }]
);
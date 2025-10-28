// Bootstrap registry
const logger = new Logger();
const registry = createToolRegistry(logger);

// Get tool metadata for AI
const tools = registry.getToolsForAI();
const aiResponse = await provider.chat({
  messages: [{ role: 'user', content: 'List all files in src/' }],
  tools // AI can now see all available tools
});

// AI returns: Use tool "list_files" with params { path: "src/" }

// Execute the tool
const tool = registry.get('list_files');
const result = await tool.execute(
  { path: 'src/' },
  { workingDirectory: '/project', logger, toolRegistry: registry }
);

console.log(result.data.files);
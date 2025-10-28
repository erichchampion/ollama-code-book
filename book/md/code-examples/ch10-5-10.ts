describe('ToolOrchestrator Integration', () => {
  let mockAI: MockAIProvider;
  let orchestrator: ToolOrchestrator;
  let fileSystem: InMemoryFileSystem; // Test file system

  beforeEach(() => {
    mockAI = new MockAIProvider();
    fileSystem = new InMemoryFileSystem();
    orchestrator = new ToolOrchestrator(mockAI, {
      fileSystem,
      logger
    });

    // Register tools
    orchestrator.registerTool(new ReadFileTool(fileSystem));
    orchestrator.registerTool(new WriteFileTool(fileSystem));
    orchestrator.registerTool(new SearchTool(fileSystem));
  });

  test('executes tools in dependency order', async () => {
    // Setup test files
    fileSystem.writeFile('/project/src/index.ts', 'export const foo = 1;');

    // Mock AI to request tool calls
    mockAI.setDefaultResponse(JSON.stringify({
      toolCalls: [
        {
          tool: 'read_file',
          parameters: { path: '/project/src/index.ts' }
        },
        {
          tool: 'search_code',
          parameters: { pattern: 'foo', path: '/project/src' },
          dependencies: ['read_file'] // Depends on read_file
        }
      ]
    }));

    const result = await orchestrator.execute('Read and search code');

    expect(result.success).toBe(true);
    expect(result.toolResults).toHaveLength(2);

    // Verify execution order
    expect(result.toolResults[0].tool).toBe('read_file');
    expect(result.toolResults[1].tool).toBe('search_code');
  });

  test('handles tool errors gracefully', async () => {
    mockAI.setDefaultResponse(JSON.stringify({
      toolCalls: [
        {
          tool: 'read_file',
          parameters: { path: '/nonexistent.ts' }
        }
      ]
    }));

    const result = await orchestrator.execute('Read nonexistent file');

    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });

  test('uses result caching', async () => {
    fileSystem.writeFile('/project/test.ts', 'test content');

    mockAI.setDefaultResponse(JSON.stringify({
      toolCalls: [
        {
          tool: 'read_file',
          parameters: { path: '/project/test.ts' }
        }
      ]
    }));

    // First execution
    const result1 = await orchestrator.execute('Read file');
    expect(result1.fromCache).toBe(false);

    // Second execution (should use cache)
    const result2 = await orchestrator.execute('Read file');
    expect(result2.fromCache).toBe(true);
    expect(result2.toolResults[0].result).toBe(result1.toolResults[0].result);
  });
});
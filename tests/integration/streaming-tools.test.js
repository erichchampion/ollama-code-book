/**
 * Integration tests for Streaming Tool Calling
 *
 * Tests end-to-end functionality of streaming tool orchestration
 * with real Ollama instance.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Streaming Tool Calling Integration', () => {
  let StreamingToolOrchestrator;
  let OllamaClient;
  let ToolRegistry;
  let FileSystemTool;
  let ollamaClient;
  let toolRegistry;
  let mockTerminal;

  beforeAll(async () => {
    // Import from compiled dist/src files (Jest can't handle TypeScript directly)
    const orchestratorModule = await import('../../dist/src/tools/streaming-orchestrator.js');
    const ollamaModule = await import('../../dist/src/ai/ollama-client.js');
    const registryModule = await import('../../dist/src/tools/registry.js');
    const filesystemModule = await import('../../dist/src/tools/filesystem.js');

    StreamingToolOrchestrator = orchestratorModule.StreamingToolOrchestrator;
    OllamaClient = ollamaModule.OllamaClient;
    ToolRegistry = registryModule.ToolRegistry;
    FileSystemTool = filesystemModule.FileSystemTool;

    // Setup
    ollamaClient = new OllamaClient();
    toolRegistry = new ToolRegistry();
    toolRegistry.register(new FileSystemTool());

    mockTerminal = {
      write: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  });

  afterAll(() => {
    // Cleanup if needed
  });

  it('should create orchestrator instance with default config', () => {
    const orchestrator = new StreamingToolOrchestrator(
      ollamaClient,
      toolRegistry,
      mockTerminal
    );

    expect(orchestrator).toBeDefined();
    expect(typeof orchestrator.executeWithStreaming).toBe('function');
  });

  it('should handle tool results caching', () => {
    const orchestrator = new StreamingToolOrchestrator(
      ollamaClient,
      toolRegistry,
      mockTerminal
    );

    const results = orchestrator.getToolResults();
    expect(results).toBeInstanceOf(Map);
    expect(results.size).toBe(0);
  });

  it('should support approval cache operations', () => {
    const orchestrator = new StreamingToolOrchestrator(
      ollamaClient,
      toolRegistry,
      mockTerminal
    );

    // Pre-approve a tool
    orchestrator.preApprove('test-tool', 'testing');

    // Get stats
    const stats = orchestrator.getApprovalStats();
    expect(stats.totalApprovals).toBe(1);

    // Clear approvals
    orchestrator.clearApprovals();
    const clearedStats = orchestrator.getApprovalStats();
    expect(clearedStats.totalApprovals).toBe(0);
  });

  it('should support category-wide pre-approval', () => {
    const orchestrator = new StreamingToolOrchestrator(
      ollamaClient,
      toolRegistry,
      mockTerminal
    );

    // Pre-approve entire category
    orchestrator.preApproveCategory('safe-operations');

    const stats = orchestrator.getApprovalStats();
    expect(stats.categoryApprovals).toBe(1);
  });

  it('should update configuration dynamically', () => {
    const orchestrator = new StreamingToolOrchestrator(
      ollamaClient,
      toolRegistry,
      mockTerminal,
      {
        maxToolsPerRequest: 5
      }
    );

    // Update config
    orchestrator.updateConfig({ maxToolsPerRequest: 15 });

    // Verify orchestrator still works
    expect(typeof orchestrator.executeWithStreaming).toBe('function');
  });

  it('should export OllamaToolAdapter utilities', async () => {
    const { OllamaToolAdapter } = await import('../../dist/src/tools/ollama-adapter.js');

    const fileSystemTool = new FileSystemTool();
    const ollamaTool = OllamaToolAdapter.toOllamaFormat(fileSystemTool);

    expect(ollamaTool).toBeDefined();
    expect(ollamaTool.type).toBe('function');
    expect(ollamaTool.function.name).toBe(fileSystemTool.metadata.name);
    expect(ollamaTool.function.parameters).toBeDefined();
  });

  it('should handle empty tool registry gracefully', async () => {
    const { OllamaToolAdapter } = await import('../../dist/src/tools/ollama-adapter.js');
    const emptyRegistry = new ToolRegistry();

    const tools = OllamaToolAdapter.getAllTools(emptyRegistry);
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(0);
  });

  // This test requires Ollama to be running and is marked as optional
  it.skip('should execute streaming request with tools (requires Ollama)', async () => {
    const orchestrator = new StreamingToolOrchestrator(
      ollamaClient,
      toolRegistry,
      mockTerminal,
      {
        skipUnapprovedTools: true // Skip approval for automated test
      }
    );

    // Simple query that shouldn't trigger tools
    await orchestrator.executeWithStreaming(
      'What is 2 + 2?',
      {
        projectRoot: process.cwd(),
        workingDirectory: process.cwd(),
        environment: process.env,
        timeout: 30000
      }
    );

    // Verify terminal output was called
    expect(mockTerminal.write).toHaveBeenCalled();
  }, 60000); // 60 second timeout for Ollama response
});

describe('Approval Prompt Utilities', () => {
  let ApprovalCache;

  beforeAll(async () => {
    const approvalModule = await import('../../dist/src/utils/approval-prompt.js');
    ApprovalCache = approvalModule.ApprovalCache;
  });

  it('should create approval cache instance', () => {
    const cache = new ApprovalCache();
    expect(cache).toBeDefined();
  });

  it('should cache approval decisions', () => {
    const cache = new ApprovalCache();

    cache.setApproval('test-tool', 'testing', true);

    const approved = cache.isApproved('test-tool', 'testing');
    expect(approved).toBe(true);
  });

  it('should return undefined for uncached approvals', () => {
    const cache = new ApprovalCache();

    const approved = cache.isApproved('unknown-tool', 'unknown');
    expect(approved).toBeUndefined();
  });

  it('should cache category-wide approvals', () => {
    const cache = new ApprovalCache();

    cache.setCategoryApproval('testing', true);

    const approved = cache.isApproved('any-tool', 'testing');
    expect(approved).toBe(true);
  });

  it('should prioritize specific approvals over category approvals', () => {
    const cache = new ApprovalCache();

    // Approve category
    cache.setCategoryApproval('testing', true);

    // Deny specific tool
    cache.setApproval('blocked-tool', 'testing', false);

    // Specific denial should take precedence
    const approved = cache.isApproved('blocked-tool', 'testing');
    expect(approved).toBe(false);

    // Other tools in category should still be approved
    const otherApproved = cache.isApproved('other-tool', 'testing');
    expect(otherApproved).toBe(true);
  });

  it('should clear all approvals', () => {
    const cache = new ApprovalCache();

    cache.setApproval('tool1', 'cat1', true);
    cache.setCategoryApproval('cat2', true);

    cache.clear();

    expect(cache.isApproved('tool1', 'cat1')).toBeUndefined();
    expect(cache.isApproved('any', 'cat2')).toBeUndefined();
  });

  it('should provide accurate statistics', () => {
    const cache = new ApprovalCache();

    cache.setApproval('tool1', 'cat1', true);
    cache.setApproval('tool2', 'cat1', false);
    cache.setCategoryApproval('cat2', true);

    const stats = cache.getStats();
    expect(stats.totalApprovals).toBe(2);
    expect(stats.categoryApprovals).toBe(1);
  });
});

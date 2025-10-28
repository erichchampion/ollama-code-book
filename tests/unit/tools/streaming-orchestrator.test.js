/**
 * Unit tests for StreamingToolOrchestrator
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('StreamingToolOrchestrator', () => {
  let StreamingToolOrchestrator;
  let OllamaToolAdapter;
  let ToolRegistry;

  beforeEach(async () => {
    // Dynamic imports for ESM modules
    const orchestratorModule = await import('../../../dist/src/tools/streaming-orchestrator.js');
    const adapterModule = await import('../../../dist/src/tools/ollama-adapter.js');
    const registryModule = await import('../../../dist/src/tools/registry.js');

    StreamingToolOrchestrator = orchestratorModule.StreamingToolOrchestrator;
    OllamaToolAdapter = adapterModule.OllamaToolAdapter;
    ToolRegistry = registryModule.ToolRegistry;
  });

  it('should create an instance with required dependencies', () => {
    const mockOllamaClient = {
      completeStreamWithTools: jest.fn()
    };

    const toolRegistry = new ToolRegistry();

    const mockTerminal = {
      write: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    const orchestrator = new StreamingToolOrchestrator(
      mockOllamaClient,
      toolRegistry,
      mockTerminal
    );

    expect(orchestrator).toBeDefined();
  });

  it('should have default configuration', () => {
    const mockOllamaClient = { completeStreamWithTools: jest.fn() };
    const toolRegistry = new ToolRegistry();
    const mockTerminal = {
      write: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    const orchestrator = new StreamingToolOrchestrator(
      mockOllamaClient,
      toolRegistry,
      mockTerminal
    );

    // Check that orchestrator was created with defaults
    expect(orchestrator).toBeDefined();
    expect(typeof orchestrator.executeWithStreaming).toBe('function');
    expect(typeof orchestrator.getToolResults).toBe('function');
  });

  it('should allow configuration updates', () => {
    const mockOllamaClient = { completeStreamWithTools: jest.fn() };
    const toolRegistry = new ToolRegistry();
    const mockTerminal = {
      write: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    const orchestrator = new StreamingToolOrchestrator(
      mockOllamaClient,
      toolRegistry,
      mockTerminal,
      {
        enableToolCalling: false,
        maxToolsPerRequest: 5
      }
    );

    expect(orchestrator).toBeDefined();

    // Update config
    orchestrator.updateConfig({ maxToolsPerRequest: 15 });

    // Verify orchestrator still works
    expect(typeof orchestrator.executeWithStreaming).toBe('function');
  });
});

describe('OllamaToolAdapter', () => {
  let OllamaToolAdapter;
  let ToolRegistry;
  let FileSystemTool;

  beforeEach(async () => {
    const adapterModule = await import('../../../dist/src/tools/ollama-adapter.js');
    const registryModule = await import('../../../dist/src/tools/registry.js');
    const filesystemModule = await import('../../../dist/src/tools/filesystem.js');

    OllamaToolAdapter = adapterModule.OllamaToolAdapter;
    ToolRegistry = registryModule.ToolRegistry;
    FileSystemTool = filesystemModule.FileSystemTool;
  });

  it('should convert BaseTool to Ollama format', () => {
    const fileSystemTool = new FileSystemTool();
    const ollamaTool = OllamaToolAdapter.toOllamaFormat(fileSystemTool);

    expect(ollamaTool).toBeDefined();
    expect(ollamaTool.type).toBe('function');
    expect(ollamaTool.function).toBeDefined();
    expect(ollamaTool.function.name).toBe(fileSystemTool.metadata.name);
    expect(ollamaTool.function.description).toBe(fileSystemTool.metadata.description);
    expect(ollamaTool.function.parameters).toBeDefined();
    expect(ollamaTool.function.parameters.type).toBe('object');
  });

  it('should get all tools from registry', () => {
    const toolRegistry = new ToolRegistry();
    const fileSystemTool = new FileSystemTool();

    toolRegistry.register(fileSystemTool);

    const ollamaTools = OllamaToolAdapter.getAllTools(toolRegistry);

    expect(Array.isArray(ollamaTools)).toBe(true);
    expect(ollamaTools.length).toBeGreaterThan(0);
    expect(ollamaTools[0].type).toBe('function');
  });

  it('should get specific tools by name', () => {
    const toolRegistry = new ToolRegistry();
    const fileSystemTool = new FileSystemTool();

    toolRegistry.register(fileSystemTool);

    const specificTools = OllamaToolAdapter.getSpecificTools(
      toolRegistry,
      [fileSystemTool.metadata.name]
    );

    expect(Array.isArray(specificTools)).toBe(true);
    expect(specificTools.length).toBe(1);
    expect(specificTools[0].function.name).toBe(fileSystemTool.metadata.name);
  });

  it('should get tools by category', () => {
    const toolRegistry = new ToolRegistry();
    const fileSystemTool = new FileSystemTool();

    toolRegistry.register(fileSystemTool);

    const categoryTools = OllamaToolAdapter.getToolsByCategory(
      toolRegistry,
      fileSystemTool.metadata.category
    );

    expect(Array.isArray(categoryTools)).toBe(true);
    expect(categoryTools.length).toBeGreaterThan(0);
  });
});

#!/usr/bin/env node

/**
 * Direct test of tool calling to debug message flow
 * This bypasses the CLI and directly tests the tool orchestrator
 */

// Set debug logging
process.env.LOG_LEVEL = 'debug';

import path from 'path';
import { promises as fsPromises } from 'fs';
import { OllamaClient } from './dist/src/ai/ollama-client.js';
import { ToolRegistry, toolRegistry } from './dist/src/tools/registry.js';
import { StreamingToolOrchestrator } from './dist/src/tools/streaming-orchestrator.js';
import { initializeToolSystem, getToolRegistry } from './dist/src/tools/index.js';

// Main test function
async function test() {
  console.log('='.repeat(60));
  console.log('Direct Tool Calling Test');
  console.log('='.repeat(60));
  console.log('');

  // Create test directory
  const testDir = `/tmp/ollama-test-${Date.now()}`;

  await fsPromises.mkdir(testDir, { recursive: true });
  await fsPromises.writeFile(path.join(testDir, 'test.js'), 'console.log("test");');
  await fsPromises.writeFile(path.join(testDir, 'test.py'), 'print("hello")');
  await fsPromises.mkdir(path.join(testDir, 'src'), { recursive: true });
  await fsPromises.writeFile(path.join(testDir, 'src', 'index.ts'), 'export const foo = "bar";');

  console.log(`Created test directory: ${testDir}`);
  console.log('');

  // Initialize components
  const ollamaClient = new OllamaClient();
  initializeToolSystem();
  const registry = getToolRegistry();

  // Create a simple terminal mock
  const terminal = {
    write: (text) => process.stdout.write(text),
    info: (text) => console.log('[INFO]', text),
    success: (text) => console.log('[SUCCESS]', text),
    warn: (text) => console.log('[WARN]', text),
    error: (text) => console.error('[ERROR]', text)
  };

  const orchestrator = new StreamingToolOrchestrator(
    ollamaClient,
    registry,
    terminal,
    {
      enableToolCalling: true,
      maxToolsPerRequest: 10,
      toolTimeout: 30000
    }
  );

  // Create a simple conversation history with a user question
  const conversationHistory = [
    {
      role: 'user',
      content: 'What files are in this project?'
    }
  ];

  const context = {
    workingDirectory: testDir,
    projectRoot: testDir
  };

  console.log('Starting tool execution with conversation history...');
  console.log('');

  try {
    await orchestrator.executeWithStreamingAndHistory(
      conversationHistory,
      context,
      {
        model: 'qwen2.5-coder:latest'
      }
    );

    console.log('');
    console.log('='.repeat(60));
    console.log('Test completed successfully');
    console.log('='.repeat(60));
    console.log('');
    console.log('Final conversation history length:', conversationHistory.length);
    console.log('');
    console.log('Messages:');
    conversationHistory.forEach((msg, idx) => {
      console.log(`${idx}: ${msg.role}${msg.tool_name ? ` (tool: ${msg.tool_name})` : ''}${msg.tool_calls ? ` (${msg.tool_calls.length} tool calls)` : ''}`);
    });

  } catch (error) {
    console.error('');
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

test().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

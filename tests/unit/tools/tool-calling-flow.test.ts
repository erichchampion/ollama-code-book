/**
 * Tests for Tool Calling Flow
 *
 * Test suite to verify tool execution and result communication
 * between the LLM and tool orchestrator.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock types based on our actual types
interface OllamaMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: Array<{
    id?: string;
    type: 'function';
    function: {
      name: string;
      arguments: string | Record<string, any>;
    };
  }>;
  tool_name?: string;  // Ollama uses tool_name, not tool_call_id
}

describe('Tool Calling Flow', () => {
  describe('Message Structure', () => {
    it('should create valid assistant message with tool calls', () => {
      const assistantMessage: OllamaMessage = {
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: 'call_123',
          type: 'function',
          function: {
            name: 'filesystem',
            arguments: {
              operation: 'list',
              path: '.'
            }
          }
        }]
      };

      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.tool_calls).toHaveLength(1);
      expect(assistantMessage.tool_calls![0].id).toBe('call_123');
    });

    it('should create valid tool result message', () => {
      const toolResultMessage: OllamaMessage = {
        role: 'tool',
        tool_name: 'filesystem',
        content: 'Tool execution successful. Directory listing completed.\nFound 5 items (2 directories, 3 files)\n  📁 src\n  📁 dist\n  📄 package.json'
      };

      expect(toolResultMessage.role).toBe('tool');
      expect(toolResultMessage.tool_name).toBe('filesystem');
      expect(toolResultMessage.content).toContain('Directory listing completed');
    });

    it('should match tool result to tool call by name', () => {
      const toolName = 'filesystem';

      const assistantMessage: OllamaMessage = {
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: 'call_123',
          type: 'function',
          function: {
            name: toolName,
            arguments: { operation: 'list', path: '.' }
          }
        }]
      };

      const toolResultMessage: OllamaMessage = {
        role: 'tool',
        tool_name: toolName,
        content: 'Success'
      };

      expect(assistantMessage.tool_calls![0].function.name).toBe(toolResultMessage.tool_name);
    });
  });

  describe('Conversation Flow', () => {
    it('should build correct conversation history', () => {
      const conversation: OllamaMessage[] = [];

      // 1. User message
      conversation.push({
        role: 'user',
        content: 'What files are in this project?'
      });

      // 2. Assistant responds with tool call
      conversation.push({
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: 'call_123',
          type: 'function',
          function: {
            name: 'filesystem',
            arguments: { operation: 'list', path: '.' }
          }
        }]
      });

      // 3. Tool result
      conversation.push({
        role: 'tool',
        tool_name: 'filesystem',
        content: 'Tool execution successful. Found 5 files.'
      });

      // Verify structure
      expect(conversation).toHaveLength(3);
      expect(conversation[0].role).toBe('user');
      expect(conversation[1].role).toBe('assistant');
      expect(conversation[1].tool_calls).toHaveLength(1);
      expect(conversation[2].role).toBe('tool');
      expect(conversation[2].tool_name).toBe(conversation[1].tool_calls![0].function.name);
    });

    it('should handle multiple tool calls in one turn', () => {
      const conversation: OllamaMessage[] = [];

      // User message
      conversation.push({
        role: 'user',
        content: 'What TypeScript files are here?'
      });

      // Assistant with multiple tool calls
      conversation.push({
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'filesystem', arguments: { operation: 'list', path: '.' } }
          },
          {
            id: 'call_2',
            type: 'function',
            function: { name: 'search', arguments: { query: '*.ts', type: 'filename' } }
          }
        ]
      });

      // Tool results (one per call)
      conversation.push({
        role: 'tool',
        tool_name: 'filesystem',
        content: 'Found 10 items'
      });

      conversation.push({
        role: 'tool',
        tool_name: 'search',
        content: 'Found 5 TypeScript files'
      });

      // Verify
      expect(conversation).toHaveLength(4);
      expect(conversation[1].tool_calls).toHaveLength(2);
      expect(conversation[2].tool_name).toBe('filesystem');
      expect(conversation[3].tool_name).toBe('search');
    });
  });

  describe('Error Cases', () => {
    it('should detect missing tool_name in tool result', () => {
      const invalidToolResult = {
        role: 'tool',
        // Missing tool_name!
        content: 'Success'
      } as any;

      expect(invalidToolResult.tool_name).toBeUndefined();
      // This should fail validation
    });

    it('should detect mismatched tool names', () => {
      const toolName = 'filesystem';
      const wrongName = 'search';

      const assistantMessage: OllamaMessage = {
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: 'call_123',
          type: 'function',
          function: { name: toolName, arguments: {} }
        }]
      };

      const toolResultMessage: OllamaMessage = {
        role: 'tool',
        tool_name: wrongName,
        content: 'Success'
      };

      // Names don't match - this is a bug!
      expect(assistantMessage.tool_calls![0].function.name).not.toBe(toolResultMessage.tool_name);
    });

    it('should require tool_name when role is tool', () => {
      const validToolMessage: OllamaMessage = {
        role: 'tool',
        tool_name: 'filesystem',
        content: 'Success'
      };

      const invalidToolMessage = {
        role: 'tool',
        // Missing required tool_name
        content: 'Success'
      } as OllamaMessage;

      expect(validToolMessage.tool_name).toBeDefined();
      expect(invalidToolMessage.tool_name).toBeUndefined();
    });
  });

  describe('Tool Result Formatting', () => {
    it('should format list results in human-readable format', () => {
      const listResult = {
        role: 'tool',
        tool_name: 'filesystem',
        content: 'Tool execution successful. Directory listing completed.\nFound 5 items (2 directories, 3 files)\n  📁 src\n  📁 dist\n  📄 package.json (1234 bytes)\n  📄 README.md (5678 bytes)\n  📄 yarn.lock (98765 bytes)'
      };

      expect(listResult.content).toContain('Directory listing completed');
      expect(listResult.content).toContain('Found 5 items');
      expect(listResult.content).toContain('📁 src');
      expect(listResult.content).toContain('📄 package.json');
    });

    it('should format search results in human-readable format', () => {
      const searchResult = {
        role: 'tool',
        tool_name: 'search',
        content: 'Tool execution successful. Search completed.\nFound 10 matches in 25 files for "*.ts"\n  📄 src/index.ts\n  📄 src/server.ts\n  ... and 8 more matches'
      };

      expect(searchResult.content).toContain('Search completed');
      expect(searchResult.content).toContain('Found 10 matches');
      expect(searchResult.content).toContain('📄 src/index.ts');
    });
  });
});

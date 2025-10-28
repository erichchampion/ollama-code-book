/**
 * Unit tests for AnthropicOllamaAdapter - Tool Conversion
 *
 * Testing tool format conversion between Ollama and Anthropic following TDD approach
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AnthropicOllamaAdapter } from '../../../src/ai/anthropic-ollama-adapter.js';
import { OllamaTool, OllamaMessage, OllamaToolCall } from '../../../src/ai/ollama-client.js';

// Mock the AnthropicProvider
jest.mock('../../../src/ai/providers/anthropic-provider.js', () => {
  return {
    AnthropicProvider: jest.fn().mockImplementation(() => ({
      completeStream: jest.fn(),
      listModels: jest.fn().mockResolvedValue([])
    }))
  };
});

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('AnthropicOllamaAdapter - Tool Support', () => {
  let adapter: AnthropicOllamaAdapter;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Set API key for testing
    process.env.ANTHROPIC_API_KEY = 'test-api-key';

    // Create adapter instance
    adapter = new AnthropicOllamaAdapter({
      model: 'claude-3-5-haiku-20241022',
      apiKey: 'test-api-key'
    });
  });

  describe('Tool format conversion', () => {
    test('should convert Ollama tools to Anthropic format', async () => {
      const ollamaTools: OllamaTool[] = [{
        type: 'function',
        function: {
          name: 'filesystem',
          description: 'File operations',
          parameters: {
            type: 'object',
            properties: {
              operation: { type: 'string', description: 'Operation to perform' },
              path: { type: 'string', description: 'File path' }
            },
            required: ['operation']
          }
        }
      }];

      const messages: OllamaMessage[] = [
        { role: 'user', content: 'List files in current directory' }
      ];

      let capturedTools: any[] | undefined;

      // Mock the provider's completeStream to capture the tools passed to it
      const mockCompleteStream = jest.fn((messages, options, callback) => {
        capturedTools = options.tools;
        // Simulate completion
        callback({ content: '', done: true });
        return Promise.resolve();
      });

      (adapter as any).anthropicProvider.completeStream = mockCompleteStream;

      await adapter.completeStreamWithTools(
        messages,
        ollamaTools,
        { model: 'claude-3-5-haiku-20241022' },
        {}
      );

      // Verify tools were converted and passed to provider
      expect(capturedTools).toBeDefined();
      expect(capturedTools).toHaveLength(1);
      expect(capturedTools![0]).toEqual({
        name: 'filesystem',
        description: 'File operations',
        input_schema: {
          type: 'object',
          properties: {
            operation: { type: 'string', description: 'Operation to perform' },
            path: { type: 'string', description: 'File path' }
          },
          required: ['operation']
        }
      });
    });

    test('should convert multiple Ollama tools correctly', async () => {
      const ollamaTools: OllamaTool[] = [
        {
          type: 'function',
          function: {
            name: 'filesystem',
            description: 'File operations',
            parameters: {
              type: 'object',
              properties: { operation: { type: 'string' } },
              required: ['operation']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'search',
            description: 'Search operations',
            parameters: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query']
            }
          }
        }
      ];

      const messages: OllamaMessage[] = [
        { role: 'user', content: 'Test' }
      ];

      let capturedTools: any[] | undefined;

      const mockCompleteStream = jest.fn((messages, options, callback) => {
        capturedTools = options.tools;
        callback({ content: '', done: true });
        return Promise.resolve();
      });

      (adapter as any).anthropicProvider.completeStream = mockCompleteStream;

      await adapter.completeStreamWithTools(
        messages,
        ollamaTools,
        {},
        {}
      );

      expect(capturedTools).toHaveLength(2);
      expect(capturedTools![0].name).toBe('filesystem');
      expect(capturedTools![1].name).toBe('search');
    });

    test('should handle tools with no required parameters', async () => {
      const ollamaTools: OllamaTool[] = [{
        type: 'function',
        function: {
          name: 'get_time',
          description: 'Get current time',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      }];

      const messages: OllamaMessage[] = [
        { role: 'user', content: 'What time is it?' }
      ];

      let capturedTools: any[] | undefined;

      const mockCompleteStream = jest.fn((messages, options, callback) => {
        capturedTools = options.tools;
        callback({ content: '', done: true });
        return Promise.resolve();
      });

      (adapter as any).anthropicProvider.completeStream = mockCompleteStream;

      await adapter.completeStreamWithTools(
        messages,
        ollamaTools,
        {},
        {}
      );

      expect(capturedTools![0].input_schema).toEqual({
        type: 'object',
        properties: {},
        required: []
      });
    });
  });

  describe('Tool call handling', () => {
    test('should convert Anthropic tool calls to Ollama format', async () => {
      const ollamaTools: OllamaTool[] = [{
        type: 'function',
        function: {
          name: 'filesystem',
          description: 'File operations',
          parameters: {
            type: 'object',
            properties: { operation: { type: 'string' } },
            required: ['operation']
          }
        }
      }];

      const messages: OllamaMessage[] = [
        { role: 'user', content: 'List files' }
      ];

      let capturedToolCall: OllamaToolCall | undefined;

      const mockCompleteStream = jest.fn((messages, options, callback) => {
        // Simulate receiving a tool call from Anthropic
        callback({
          content: '',
          done: false,
          toolCalls: [{
            id: 'toolu_123abc',
            name: 'filesystem',
            input: { operation: 'list', path: '.' }
          }]
        });

        // Simulate completion
        callback({ content: '', done: true });
        return Promise.resolve();
      });

      (adapter as any).anthropicProvider.completeStream = mockCompleteStream;

      await adapter.completeStreamWithTools(
        messages,
        ollamaTools,
        {},
        {
          onToolCall: async (toolCall: OllamaToolCall) => {
            capturedToolCall = toolCall;
            return 'file1.txt\nfile2.txt';
          }
        }
      );

      // Verify tool call was converted to Ollama format
      expect(capturedToolCall).toBeDefined();
      expect(capturedToolCall!.function).toEqual({
        name: 'filesystem',
        arguments: JSON.stringify({ operation: 'list', path: '.' })
      });
      expect(capturedToolCall!.id).toBeDefined();
      expect(capturedToolCall!.type).toBe('function');
    });

    test('should handle multiple tool calls in single response', async () => {
      const ollamaTools: OllamaTool[] = [
        {
          type: 'function',
          function: {
            name: 'filesystem',
            description: 'File operations',
            parameters: {
              type: 'object',
              properties: { operation: { type: 'string' } },
              required: ['operation']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'search',
            description: 'Search operations',
            parameters: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query']
            }
          }
        }
      ];

      const messages: OllamaMessage[] = [
        { role: 'user', content: 'Test' }
      ];

      const capturedToolCalls: OllamaToolCall[] = [];

      const mockCompleteStream = jest.fn((messages, options, callback) => {
        // Simulate receiving multiple tool calls from Anthropic
        callback({
          content: '',
          done: false,
          toolCalls: [
            {
              id: 'toolu_1',
              name: 'filesystem',
              input: { operation: 'list' }
            },
            {
              id: 'toolu_2',
              name: 'search',
              input: { query: 'test' }
            }
          ]
        });

        callback({ content: '', done: true });
        return Promise.resolve();
      });

      (adapter as any).anthropicProvider.completeStream = mockCompleteStream;

      await adapter.completeStreamWithTools(
        messages,
        ollamaTools,
        {},
        {
          onToolCall: async (toolCall: OllamaToolCall) => {
            capturedToolCalls.push(toolCall);
            return 'result';
          }
        }
      );

      // Verify both tool calls were processed
      expect(capturedToolCalls).toHaveLength(2);
      expect(capturedToolCalls[0].function.name).toBe('filesystem');
      expect(capturedToolCalls[1].function.name).toBe('search');
    });

    test('should track tool call ID mappings', async () => {
      const ollamaTools: OllamaTool[] = [{
        type: 'function',
        function: {
          name: 'test_tool',
          description: 'Test',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      }];

      const messages: OllamaMessage[] = [
        { role: 'user', content: 'Test' }
      ];

      let ollamaId: string | undefined;
      const anthropicId = 'toolu_anthropic_123';

      const mockCompleteStream = jest.fn((messages, options, callback) => {
        callback({
          content: '',
          done: false,
          toolCalls: [{
            id: anthropicId,
            name: 'test_tool',
            input: {}
          }]
        });

        callback({ content: '', done: true });
        return Promise.resolve();
      });

      (adapter as any).anthropicProvider.completeStream = mockCompleteStream;

      await adapter.completeStreamWithTools(
        messages,
        ollamaTools,
        {},
        {
          onToolCall: async (toolCall: OllamaToolCall) => {
            ollamaId = toolCall.id;
            return 'result';
          }
        }
      );

      // Verify that the adapter created an Ollama-style ID
      expect(ollamaId).toBeDefined();
      expect(ollamaId).toMatch(/^call_/);

      // Verify the mapping is stored (we'll add a method to check this)
      const mapping = (adapter as any).toolCallIdMap?.get(ollamaId!);
      expect(mapping).toBe(anthropicId);
    });

    test('should handle text content alongside tool calls', async () => {
      const ollamaTools: OllamaTool[] = [{
        type: 'function',
        function: {
          name: 'search',
          description: 'Search',
          parameters: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query']
          }
        }
      }];

      const messages: OllamaMessage[] = [
        { role: 'user', content: 'Search for test' }
      ];

      let receivedContent = '';
      let receivedToolCall: OllamaToolCall | undefined;

      const mockCompleteStream = jest.fn((messages, options, callback) => {
        // Simulate text content
        callback({ content: 'I will search for that.', done: false, delta: 'I will search for that.' });

        // Simulate tool call
        callback({
          content: 'I will search for that.',
          done: false,
          toolCalls: [{
            id: 'toolu_123',
            name: 'search',
            input: { query: 'test' }
          }]
        });

        // Simulate completion
        callback({ content: 'I will search for that.', done: true });
        return Promise.resolve();
      });

      (adapter as any).anthropicProvider.completeStream = mockCompleteStream;

      await adapter.completeStreamWithTools(
        messages,
        ollamaTools,
        {},
        {
          onContent: (content: string) => {
            receivedContent += content;
          },
          onToolCall: async (toolCall: OllamaToolCall) => {
            receivedToolCall = toolCall;
            return 'search results';
          }
        }
      );

      // Verify both content and tool call were received
      expect(receivedContent).toContain('I will search for that');
      expect(receivedToolCall).toBeDefined();
      expect(receivedToolCall!.function.name).toBe('search');
    });
  });

  describe('Error handling', () => {
    test('should handle errors gracefully', async () => {
      const ollamaTools: OllamaTool[] = [{
        type: 'function',
        function: {
          name: 'test',
          description: 'Test',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      }];

      const messages: OllamaMessage[] = [
        { role: 'user', content: 'Test' }
      ];

      const mockError = new Error('Test error');
      const mockCompleteStream = jest.fn(() => Promise.reject(mockError));

      (adapter as any).anthropicProvider.completeStream = mockCompleteStream;

      let capturedError: Error | undefined;

      await expect(adapter.completeStreamWithTools(
        messages,
        ollamaTools,
        {},
        {
          onError: (error: Error) => {
            capturedError = error;
          }
        }
      )).rejects.toThrow('Test error');

      expect(capturedError).toBe(mockError);
    });
  });
});

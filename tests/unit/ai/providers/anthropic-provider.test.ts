/**
 * Unit tests for AnthropicProvider - Tool Support
 *
 * Testing tool calling functionality following TDD approach
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AnthropicProvider } from '../../../../src/ai/providers/anthropic-provider.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('AnthropicProvider - Tool Support', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create provider instance with test API key
    provider = new AnthropicProvider({
      name: 'anthropic-test',
      apiKey: 'test-api-key-123',
      timeout: 30000
    });
  });

  describe('Tool-related types and interfaces', () => {
    test('should accept tools in completion options', () => {
      // This test verifies the type system accepts tools parameter
      const tools = [{
        name: 'test_tool',
        description: 'A test tool',
        input_schema: {
          type: 'object' as const,
          properties: {
            param: { type: 'string' }
          },
          required: ['param']
        }
      }];

      // If this compiles, the type system is correct
      expect(tools).toBeDefined();
      expect(tools[0].name).toBe('test_tool');
      expect(tools[0].input_schema.type).toBe('object');
    });

    test('should include tools in API request body', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      const tools = [{
        name: 'filesystem',
        description: 'File operations',
        input_schema: {
          type: 'object' as const,
          properties: {
            operation: { type: 'string' }
          },
          required: ['operation']
        }
      }];

      await provider.complete('Test message', {
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 100,
        tools
      });

      // Verify fetch was called with tools in the request body
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      expect(requestBody.tools).toBeDefined();
      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.tools[0].name).toBe('filesystem');
      expect(requestBody.tool_choice).toEqual({ type: 'auto' });
    });
  });

  describe('Response parsing - Tool Calls', () => {
    test('should parse text content from response', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello, how can I help?' }
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await provider.complete('Test', {
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 100
      });

      expect(result.content).toBe('Hello, how can I help?');
      expect(result.toolCalls).toBeUndefined();
    });

    test('should parse tool_use blocks from response', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will use the tool' },
          {
            type: 'tool_use',
            id: 'toolu_123',
            name: 'filesystem',
            input: { operation: 'list', path: '.' }
          }
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 20 }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await provider.complete('List files', {
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 100,
        tools: [{
          name: 'filesystem',
          description: 'File operations',
          input_schema: {
            type: 'object' as const,
            properties: { operation: { type: 'string' }, path: { type: 'string' } },
            required: ['operation']
          }
        }]
      });

      expect(result.content).toBe('I will use the tool');
      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls![0]).toEqual({
        id: 'toolu_123',
        name: 'filesystem',
        input: { operation: 'list', path: '.' }
      });
    });

    test('should handle response with multiple tool calls', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will use two tools' },
          {
            type: 'tool_use',
            id: 'toolu_123',
            name: 'filesystem',
            input: { operation: 'list', path: '.' }
          },
          {
            type: 'tool_use',
            id: 'toolu_456',
            name: 'search',
            input: { query: 'test' }
          }
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 30 }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await provider.complete('Test', {
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 100,
        tools: [
          {
            name: 'filesystem',
            description: 'File operations',
            input_schema: {
              type: 'object' as const,
              properties: { operation: { type: 'string' } },
              required: ['operation']
            }
          },
          {
            name: 'search',
            description: 'Search operations',
            input_schema: {
              type: 'object' as const,
              properties: { query: { type: 'string' } },
              required: ['query']
            }
          }
        ]
      });

      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls![0].name).toBe('filesystem');
      expect(result.toolCalls![1].name).toBe('search');
    });

    test('should handle response with only tool_use (no text)', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_123',
            name: 'filesystem',
            input: { operation: 'list', path: '.' }
          }
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 15 }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await provider.complete('List files', {
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 100,
        tools: [{
          name: 'filesystem',
          description: 'File operations',
          input_schema: {
            type: 'object' as const,
            properties: { operation: { type: 'string' } },
            required: ['operation']
          }
        }]
      });

      expect(result.content).toBe(''); // No text content
      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls).toHaveLength(1);
    });
  });

  describe('Tool choice parameter', () => {
    test('should use auto tool choice by default', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      await provider.complete('Test', {
        model: 'claude-3-5-haiku-20241022',
        tools: [{
          name: 'test_tool',
          description: 'Test',
          input_schema: {
            type: 'object' as const,
            properties: {},
            required: []
          }
        }]
      });

      const requestBody = JSON.parse(
        (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as string
      );
      expect(requestBody.tool_choice).toEqual({ type: 'auto' });
    });
  });
});

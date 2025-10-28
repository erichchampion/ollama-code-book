/**
 * Unit tests for AnthropicProvider - Streaming Tool Support
 *
 * Testing streaming functionality with tool calling following TDD approach
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AnthropicProvider } from '../../../../src/ai/providers/anthropic-provider.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('AnthropicProvider - Streaming Tool Support', () => {
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

  /**
   * Helper function to create a mock streaming response
   */
  function createStreamResponse(events: string[]): Response {
    const stream = new ReadableStream({
      start(controller) {
        for (const event of events) {
          controller.enqueue(new TextEncoder().encode(event + '\n\n'));
        }
        controller.close();
      }
    });

    return {
      ok: true,
      body: stream,
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      status: 200,
      statusText: 'OK'
    } as Response;
  }

  describe('Text streaming', () => {
    test('should emit content events for text deltas', async () => {
      const events = [
        'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-5-haiku-20241022","usage":{"input_tokens":10,"output_tokens":0}}}',
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}',
        'event: message_stop\ndata: {"type":"message_stop"}'
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        createStreamResponse(events)
      );

      const receivedEvents: any[] = [];
      const onEvent = jest.fn((event) => {
        receivedEvents.push(event);
      });

      await provider.completeStream(
        'Test message',
        { model: 'claude-3-5-haiku-20241022', maxTokens: 100 },
        onEvent
      );

      // Should have received text deltas
      expect(receivedEvents.length).toBeGreaterThan(0);

      // Find delta events with actual text content
      const textDeltas = receivedEvents.filter(e => e.delta && e.delta.length > 0);
      expect(textDeltas.length).toBeGreaterThanOrEqual(2);

      // Verify text accumulation
      const finalEvent = receivedEvents.find(e => e.done === true);
      expect(finalEvent).toBeDefined();
      expect(finalEvent.content).toContain('Hello');
      expect(finalEvent.content).toContain('world');
    });
  });

  describe('Tool use streaming', () => {
    test('should accumulate tool input JSON from deltas', async () => {
      const events = [
        'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-5-haiku-20241022","usage":{"input_tokens":15,"output_tokens":0}}}',
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_123","name":"filesystem","input":{}}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"oper"}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"ation\\":\\"list\\""}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":",\\"path\\":\\".\\"}"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":25}}',
        'event: message_stop\ndata: {"type":"message_stop"}'
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        createStreamResponse(events)
      );

      const receivedEvents: any[] = [];
      const onEvent = jest.fn((event) => {
        receivedEvents.push(event);
      });

      await provider.completeStream(
        'List files',
        {
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
        },
        onEvent
      );

      // Should have accumulated the JSON correctly
      const finalEvent = receivedEvents.find(e => e.done === true);
      expect(finalEvent).toBeDefined();
      expect(finalEvent.toolCalls).toBeDefined();
      expect(finalEvent.toolCalls).toHaveLength(1);
      expect(finalEvent.toolCalls[0]).toEqual({
        id: 'toolu_123',
        name: 'filesystem',
        input: { operation: 'list', path: '.' }
      });
    });

    test('should emit tool_call information when tool_use complete', async () => {
      const events = [
        'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-5-haiku-20241022","usage":{"input_tokens":15,"output_tokens":0}}}',
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_456","name":"search","input":{}}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"query\\":\\"test\\"}"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":15}}',
        'event: message_stop\ndata: {"type":"message_stop"}'
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        createStreamResponse(events)
      );

      const receivedEvents: any[] = [];
      const onEvent = jest.fn((event) => {
        receivedEvents.push(event);
      });

      await provider.completeStream(
        'Search for test',
        {
          model: 'claude-3-5-haiku-20241022',
          maxTokens: 100,
          tools: [{
            name: 'search',
            description: 'Search operations',
            input_schema: {
              type: 'object' as const,
              properties: { query: { type: 'string' } },
              required: ['query']
            }
          }]
        },
        onEvent
      );

      // Final event should have tool call info
      const finalEvent = receivedEvents.find(e => e.done === true);
      expect(finalEvent).toBeDefined();
      expect(finalEvent.toolCalls).toBeDefined();
      expect(finalEvent.toolCalls[0].id).toBe('toolu_456');
      expect(finalEvent.toolCalls[0].name).toBe('search');
      expect(finalEvent.toolCalls[0].input).toEqual({ query: 'test' });
    });

    test('should handle multiple tool calls in single response', async () => {
      const events = [
        'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-5-haiku-20241022","usage":{"input_tokens":20,"output_tokens":0}}}',
        // First tool
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"filesystem","input":{}}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"operation\\":\\"list\\"}"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}',
        // Second tool
        'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_2","name":"search","input":{}}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"query\\":\\"test\\"}"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":1}',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":35}}',
        'event: message_stop\ndata: {"type":"message_stop"}'
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        createStreamResponse(events)
      );

      const receivedEvents: any[] = [];
      const onEvent = jest.fn((event) => {
        receivedEvents.push(event);
      });

      await provider.completeStream(
        'Execute multiple tools',
        {
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
        },
        onEvent
      );

      // Final event should have both tool calls
      const finalEvent = receivedEvents.find(e => e.done === true);
      expect(finalEvent).toBeDefined();
      expect(finalEvent.toolCalls).toBeDefined();
      expect(finalEvent.toolCalls).toHaveLength(2);
      expect(finalEvent.toolCalls[0].name).toBe('filesystem');
      expect(finalEvent.toolCalls[1].name).toBe('search');
    });

    test('should handle text + tool_use in same response', async () => {
      const events = [
        'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-5-haiku-20241022","usage":{"input_tokens":20,"output_tokens":0}}}',
        // Text content first
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"I will search for that."}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}',
        // Then tool use
        'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_789","name":"search","input":{}}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"query\\":\\"example\\"}"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":1}',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":30}}',
        'event: message_stop\ndata: {"type":"message_stop"}'
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        createStreamResponse(events)
      );

      const receivedEvents: any[] = [];
      const onEvent = jest.fn((event) => {
        receivedEvents.push(event);
      });

      await provider.completeStream(
        'Search for example',
        {
          model: 'claude-3-5-haiku-20241022',
          maxTokens: 100,
          tools: [{
            name: 'search',
            description: 'Search operations',
            input_schema: {
              type: 'object' as const,
              properties: { query: { type: 'string' } },
              required: ['query']
            }
          }]
        },
        onEvent
      );

      // Should have both text content and tool calls
      const finalEvent = receivedEvents.find(e => e.done === true);
      expect(finalEvent).toBeDefined();
      expect(finalEvent.content).toContain('I will search for that');
      expect(finalEvent.toolCalls).toBeDefined();
      expect(finalEvent.toolCalls).toHaveLength(1);
      expect(finalEvent.toolCalls[0].input).toEqual({ query: 'example' });
    });
  });

  describe('Error handling in streams', () => {
    test('should handle malformed JSON in tool input gracefully', async () => {
      const events = [
        'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-5-haiku-20241022","usage":{"input_tokens":15,"output_tokens":0}}}',
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_err","name":"search","input":{}}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"invalid"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":10}}',
        'event: message_stop\ndata: {"type":"message_stop"}'
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        createStreamResponse(events)
      );

      const receivedEvents: any[] = [];
      const onEvent = jest.fn((event) => {
        receivedEvents.push(event);
      });

      // Should not throw, but should handle gracefully
      await expect(provider.completeStream(
        'Test',
        {
          model: 'claude-3-5-haiku-20241022',
          maxTokens: 100,
          tools: [{
            name: 'search',
            description: 'Search',
            input_schema: {
              type: 'object' as const,
              properties: {},
              required: []
            }
          }]
        },
        onEvent
      )).resolves.not.toThrow();

      // Final event should still be emitted, possibly with empty or partial tool data
      const finalEvent = receivedEvents.find(e => e.done === true);
      expect(finalEvent).toBeDefined();
    });
  });

  describe('Streaming with abort signal', () => {
    test('should respect abort signal and stop streaming', async () => {
      const events = [
        'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-5-haiku-20241022","usage":{"input_tokens":10,"output_tokens":0}}}',
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}'
        // Would continue, but will be aborted
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        createStreamResponse(events)
      );

      const abortController = new AbortController();
      const receivedEvents: any[] = [];
      const onEvent = jest.fn((event) => {
        receivedEvents.push(event);
        // Abort after first event
        if (receivedEvents.length === 1) {
          abortController.abort();
        }
      });

      await provider.completeStream(
        'Test',
        { model: 'claude-3-5-haiku-20241022', maxTokens: 100 },
        onEvent,
        abortController.signal
      );

      // Should have stopped early
      expect(receivedEvents.length).toBeLessThan(5);
    });
  });
});

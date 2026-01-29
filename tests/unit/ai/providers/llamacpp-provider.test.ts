/**
 * llama.cpp Provider Unit Tests
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { LlamaCppProvider, LlamaCppProviderConfig } from '../../../../src/ai/providers/llamacpp-provider.js';
import { AICapability } from '../../../../src/ai/providers/base-provider.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('LlamaCppProvider', () => {
  let provider: LlamaCppProvider;
  let config: LlamaCppProviderConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      name: 'llamacpp',
      baseUrl: 'http://localhost:8080',
      timeout: 30000
    };

    provider = new LlamaCppProvider(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getName', () => {
    test('should return "llama.cpp"', () => {
      expect(provider.getName()).toBe('llama.cpp');
    });
  });

  describe('getDisplayName', () => {
    test('should return "llama.cpp (Local)"', () => {
      expect(provider.getDisplayName()).toBe('llama.cpp (Local)');
    });
  });

  describe('getCapabilities', () => {
    test('should return correct capabilities', () => {
      const capabilities = provider.getCapabilities();

      expect(capabilities.maxContextWindow).toBeGreaterThan(0);
      expect(capabilities.supportedCapabilities).toContain(AICapability.TEXT_COMPLETION);
      expect(capabilities.supportedCapabilities).toContain(AICapability.CHAT);
      expect(capabilities.supportedCapabilities).toContain(AICapability.CODE_GENERATION);
      expect(capabilities.supportedCapabilities).toContain(AICapability.STREAMING);
      expect(capabilities.features.streaming).toBe(true);
      expect(capabilities.features.functionCalling).toBe(false);
    });
  });

  describe('testConnection', () => {
    test('should return true when server is healthy', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await provider.testConnection();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/health',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    test('should return false when server is not healthy', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers(),
        statusText: 'Service Unavailable'
      } as Response);

      const result = await provider.testConnection();

      expect(result).toBe(false);
    });

    test('should return false when connection fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await provider.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('initialize', () => {
    test('should initialize successfully when server is healthy', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', data: [] }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      await provider.initialize();

      expect(provider.isReady()).toBe(true);
    });

    test('should throw when server is not healthy', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers(),
        statusText: 'Service Unavailable'
      } as Response);

      await expect(provider.initialize()).rejects.toThrow();
    });
  });

  describe('complete', () => {
    beforeEach(async () => {
      // Initialize the provider first
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      await provider.initialize();
    });

    test('should complete a simple prompt', async () => {
      const mockResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you?'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await provider.complete('Hello');

      expect(result.content).toBe('Hello! How can I help you?');
      expect(result.finishReason).toBe('stop');
      expect(result.usage.totalTokens).toBe(15);
      expect(result.metadata.provider).toBe('llamacpp');
    });

    test('should handle array of messages', async () => {
      const mockResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'I can help with that.'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 6,
          total_tokens: 26
        }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' },
        { role: 'user' as const, content: 'Can you help?' }
      ];

      const result = await provider.complete(messages);

      expect(result.content).toBe('I can help with that.');
    });
  });

  describe('listModels', () => {
    beforeEach(async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      await provider.initialize();
    });

    test('should list available models', async () => {
      const mockModels = {
        data: [
          { id: 'model-1', object: 'model', owned_by: 'local' },
          { id: 'model-2', object: 'model', owned_by: 'local' }
        ]
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      const models = await provider.listModels();

      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('model-1');
      expect(models[0].provider).toBe('llamacpp');
    });

    test('should return placeholder model when listing fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Failed to list'));

      const models = await provider.listModels();

      expect(models).toHaveLength(1);
      expect(models[0].provider).toBe('llamacpp');
    });
  });

  describe('calculateCost', () => {
    test('should always return 0 for local inference', () => {
      expect(provider.calculateCost(100, 50)).toBe(0);
      expect(provider.calculateCost(1000, 500)).toBe(0);
      expect(provider.calculateCost(0, 0)).toBe(0);
    });
  });

  describe('getHealth', () => {
    test('should return health status', () => {
      const health = provider.getHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('lastCheck');
      expect(health).toHaveProperty('responseTime');
    });
  });

  describe('getMetrics', () => {
    test('should return metrics', () => {
      const metrics = provider.getMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('successfulRequests');
      expect(metrics).toHaveProperty('failedRequests');
      expect(metrics).toHaveProperty('averageResponseTime');
    });
  });
});

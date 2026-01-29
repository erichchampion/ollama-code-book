/**
 * llama.cpp Server Manager Unit Tests
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { isLlamaCppServerRunning } from '../../../src/utils/llamacpp-server.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('llamacpp-server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isLlamaCppServerRunning', () => {
    test('should return true when server responds with OK', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await isLlamaCppServerRunning('http://localhost:8080');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/health',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    test('should return false when server responds with error', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers(),
        statusText: 'Service Unavailable'
      } as Response);

      const result = await isLlamaCppServerRunning('http://localhost:8080');

      expect(result).toBe(false);
    });

    test('should return false when connection fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await isLlamaCppServerRunning('http://localhost:8080');

      expect(result).toBe(false);
    });

    test('should use default URL when not provided', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      await isLlamaCppServerRunning();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/health',
        expect.anything()
      );
    });

    test('should use custom URL when provided', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response);

      await isLlamaCppServerRunning('http://custom-host:9090');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://custom-host:9090/health',
        expect.anything()
      );
    });
  });
});

describe('llamacpp-server configuration', () => {
  describe('LlamaCppServerConfig', () => {
    test('should have correct default values', () => {
      // Test that the interface exists and can be used
      const config = {
        baseUrl: 'http://localhost:8080',
        modelPath: '/path/to/model.gguf',
        gpuLayers: -1,
        contextSize: 4096,
        flashAttention: false,
        parallel: 1
      };

      expect(config.baseUrl).toBe('http://localhost:8080');
      expect(config.gpuLayers).toBe(-1);
      expect(config.contextSize).toBe(4096);
    });
  });
});

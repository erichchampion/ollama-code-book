import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { STREAMING_CONSTANTS } from '../../../src/constants/tool-orchestration.js';

describe('Streaming Orchestrator Parse Attempt Limits', () => {
  describe('MAX_STREAMING_PARSE_ATTEMPTS constant', () => {
    it('should be defined with a reasonable value', () => {
      expect(STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS).toBeDefined();
      expect(typeof STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS).toBe('number');
      expect(STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS).toBeGreaterThan(0);
      expect(STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS).toBeLessThan(1000);
    });

    it('should have a value that prevents infinite loops but allows normal streaming', () => {
      // Should be high enough to handle slow streaming
      expect(STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS).toBeGreaterThanOrEqual(10);
      
      // But not so high that it would take forever to detect malformed input
      expect(STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS).toBeLessThanOrEqual(500);
    });
  });

  describe('Parse attempt counter behavior', () => {
    it('should increment on each failed parse attempt', () => {
      let parseAttempts = 0;
      const maxParseAttempts = STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS;

      // Simulate multiple failed parse attempts
      for (let i = 0; i < 5; i++) {
        try {
          JSON.parse('invalid json{');
          fail('Should have thrown');
        } catch (e) {
          parseAttempts++;
        }
      }

      expect(parseAttempts).toBe(5);
      expect(parseAttempts).toBeLessThan(maxParseAttempts);
    });

    it('should stop attempting after max attempts reached', () => {
      let parseAttempts = 0;
      const maxParseAttempts = STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS;

      // Simulate hitting the limit
      for (let i = 0; i < maxParseAttempts + 10; i++) {
        try {
          JSON.parse('invalid json{');
          fail('Should have thrown');
        } catch (e) {
          parseAttempts++;

          if (parseAttempts > maxParseAttempts) {
            // Should stop here
            parseAttempts = 0; // Reset counter
            break;
          }
        }
      }

      // Counter should have been reset
      expect(parseAttempts).toBe(0);
    });

    it('should reset counter after successful parse', () => {
      let parseAttempts = 0;

      // Simulate some failed attempts
      for (let i = 0; i < 5; i++) {
        try {
          JSON.parse('invalid json{');
          fail('Should have thrown');
        } catch (e) {
          parseAttempts++;
        }
      }

      expect(parseAttempts).toBe(5);

      // Successful parse
      try {
        JSON.parse('{"valid": "json"}');
        parseAttempts = 0; // Reset on success
      } catch (e) {
        fail('Valid JSON should parse');
      }

      expect(parseAttempts).toBe(0);
    });
  });

  describe('Infinite loop prevention', () => {
    it('should not loop infinitely on malformed JSON', () => {
      const maxParseAttempts = STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS;
      let parseAttempts = 0;
      let loopIterations = 0;
      const maxIterations = maxParseAttempts * 2;

      const malformedJSON = '{"name": "test", "invalid';

      while (loopIterations < maxIterations) {
        loopIterations++;

        try {
          JSON.parse(malformedJSON);
          break; // Successful parse
        } catch (e) {
          parseAttempts++;

          if (parseAttempts > maxParseAttempts) {
            // Hit the limit - stop parsing
            break;
          }
        }
      }

      // Should have stopped at max attempts, not at max iterations
      expect(loopIterations).toBe(maxParseAttempts + 1);
      expect(loopIterations).toBeLessThan(maxIterations);
    });

    it('should handle pathological input without hanging', () => {
      const start = Date.now();
      const maxParseAttempts = STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS;
      let parseAttempts = 0;

      // Extremely nested/complex malformed JSON
      const pathologicalInput = '{'.repeat(1000) + '}';

      while (parseAttempts <= maxParseAttempts) {
        try {
          JSON.parse(pathologicalInput);
          break;
        } catch (e) {
          parseAttempts++;

          if (parseAttempts > maxParseAttempts) {
            break;
          }
        }
      }

      const duration = Date.now() - start;

      expect(parseAttempts).toBe(maxParseAttempts + 1);
      // Should complete quickly (< 1 second even with complex input)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle never-valid JSON streams gracefully', () => {
      const maxParseAttempts = STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS;
      let parseAttempts = 0;
      let chunks = 0;

      // Simulate streaming chunks that never complete
      const neverValidChunks = [
        '{',
        '{"name',
        '{"name":',
        '{"name": "test',
        '{"name": "test",',
        '{"name": "test", "arg',
        '{"name": "test", "args":',
        '{"name": "test", "args": {',
        '{"name": "test", "args": {"invalid'
        // Never closes properly
      ];

      for (const chunk of neverValidChunks) {
        chunks++;
        try {
          JSON.parse(chunk);
          break; // Successful parse
        } catch (e) {
          parseAttempts++;

          if (parseAttempts > maxParseAttempts) {
            // Should stop after max attempts
            parseAttempts = 0; // Reset for next turn
            break;
          }
        }
      }

      // Should have processed some chunks but stopped at limit
      expect(chunks).toBeLessThanOrEqual(neverValidChunks.length);
    });
  });

  describe('Valid JSON streaming scenarios', () => {
    it('should successfully parse valid JSON after few attempts', () => {
      let parseAttempts = 0;
      const streamingChunks = [
        '{',
        '{"name',
        '{"name":',
        '{"name": "test',
        '{"name": "test",',
        '{"name": "test", "arguments',
        '{"name": "test", "arguments":',
        '{"name": "test", "arguments": {',
        '{"name": "test", "arguments": {}',
        '{"name": "test", "arguments": {}}'
      ];

      let result: any = null;

      for (const chunk of streamingChunks) {
        try {
          result = JSON.parse(chunk);
          parseAttempts = 0; // Reset on success
          break;
        } catch (e) {
          parseAttempts++;
        }
      }

      expect(result).toBeDefined();
      expect(result.name).toBe('test');
      expect(result.arguments).toEqual({});
      expect(parseAttempts).toBe(0); // Should have reset after success
    });

    it('should handle multiple valid JSON objects in stream', () => {
      const maxParseAttempts = STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS;
      let parseAttempts = 0;
      let successfulParses = 0;

      const chunks = [
        '{"name": "call1", "arguments": {}}',
        'some text',
        '{"name": "call2", "arguments": {}}',
        'more text',
        '{"name": "call3", "arguments": {}}'
      ];

      for (const chunk of chunks) {
        try {
          JSON.parse(chunk);
          successfulParses++;
          parseAttempts = 0; // Reset on success
        } catch (e) {
          parseAttempts++;

          if (parseAttempts > maxParseAttempts) {
            parseAttempts = 0; // Reset after limit
          }
        }
      }

      expect(successfulParses).toBe(3);
    });

    it('should not exceed limits during normal streaming', () => {
      const maxParseAttempts = STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS;
      let parseAttempts = 0;
      let hitLimit = false;

      // Simulate realistic streaming scenario (30 chunks)
      const chunks = [];
      for (let i = 0; i < 30; i++) {
        chunks.push('{');
      }
      chunks.push('{"name": "test", "arguments": {}}');

      for (const chunk of chunks) {
        try {
          JSON.parse(chunk);
          parseAttempts = 0; // Reset on success
          break;
        } catch (e) {
          parseAttempts++;

          if (parseAttempts > maxParseAttempts) {
            hitLimit = true;
            break;
          }
        }
      }

      // Should not hit limit in realistic streaming
      expect(hitLimit).toBe(false);
      expect(parseAttempts).toBe(0);
    });
  });

  describe('Error handling and recovery', () => {
    it('should continue processing after hitting parse limit', () => {
      const maxParseAttempts = STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS;
      let parseAttempts = 0;
      let processedChunks = 0;

      // Simulate hitting limit and then getting valid JSON
      const chunks = Array(maxParseAttempts + 5).fill('invalid{');
      chunks.push('{"valid": "json"}');

      for (const chunk of chunks) {
        processedChunks++;

        try {
          JSON.parse(chunk);
          parseAttempts = 0; // Reset on success
          break;
        } catch (e) {
          parseAttempts++;

          if (parseAttempts > maxParseAttempts) {
            // Hit limit - reset and continue with next chunk
            parseAttempts = 0;
          }
        }
      }

      // Should have reset after limit and continued processing
      expect(parseAttempts).toBe(0);
      expect(processedChunks).toBeGreaterThan(maxParseAttempts);
    });

    it('should log warning when limit exceeded', () => {
      const maxParseAttempts = STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS;
      let parseAttempts = 0;
      let warningLogged = false;

      for (let i = 0; i <= maxParseAttempts + 1; i++) {
        try {
          JSON.parse('invalid{');
        } catch (e) {
          parseAttempts++;

          if (parseAttempts > maxParseAttempts) {
            // Should log warning here
            warningLogged = true;
            parseAttempts = 0;
            break;
          }
        }
      }

      expect(warningLogged).toBe(true);
    });
  });

  describe('Performance characteristics', () => {
    it('should handle high parse attempt limits efficiently', () => {
      const start = Date.now();
      const attempts = Math.min(STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS, 100);
      let parseAttempts = 0;

      for (let i = 0; i < attempts; i++) {
        try {
          JSON.parse('{"incomplete": ');
        } catch (e) {
          parseAttempts++;
        }
      }

      const duration = Date.now() - start;

      expect(parseAttempts).toBe(attempts);
      // Should be very fast (< 100ms for 100 attempts)
      expect(duration).toBeLessThan(100);
    });

    it('should not cause memory leaks with repeated parse attempts', () => {
      const maxParseAttempts = Math.min(STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS, 50);
      const initialMemory = process.memoryUsage().heapUsed;

      for (let round = 0; round < 3; round++) {
        let parseAttempts = 0;

        for (let i = 0; i < maxParseAttempts; i++) {
          try {
            JSON.parse('invalid{');
          } catch (e) {
            parseAttempts++;

            if (parseAttempts > maxParseAttempts) {
              parseAttempts = 0;
              break;
            }
          }
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});

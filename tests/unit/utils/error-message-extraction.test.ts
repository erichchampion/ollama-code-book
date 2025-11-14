/**
 * Tests for Error Message Extraction
 * Testing consolidated error message utilities
 */

import { describe, it, expect } from '@jest/globals';
import { getErrorMessage } from '../../../src/utils/error-utils.js';

describe('Error Message Extraction', () => {
  describe('Error instance handling', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      const result = getErrorMessage(error);

      expect(result).toBe('Test error message');
    });

    it('should extract message from custom Error subclass', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error');
      const result = getErrorMessage(error);

      expect(result).toBe('Custom error');
    });

    it('should include stack trace when requested', () => {
      const error = new Error('Test error');
      const result = getErrorMessage(error, true);

      expect(result).toContain('Test error');
      expect(result).toContain('at '); // Stack trace contains "at" prefix
    });

    it('should fallback to message when stack is undefined', () => {
      const error = new Error('Test error');
      delete (error as any).stack; // Remove stack
      const result = getErrorMessage(error, true);

      expect(result).toBe('Test error');
    });
  });

  describe('String error handling', () => {
    it('should handle string errors', () => {
      const error = 'Simple string error';
      const result = getErrorMessage(error);

      expect(result).toBe('Simple string error');
    });

    it('should handle empty string', () => {
      const error = '';
      const result = getErrorMessage(error);

      expect(result).toBe('');
    });

    it('should handle multi-line string errors', () => {
      const error = 'Line 1\nLine 2\nLine 3';
      const result = getErrorMessage(error);

      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('Object error handling', () => {
    it('should extract message property from object', () => {
      const error = { message: 'Error from object' };
      const result = getErrorMessage(error);

      expect(result).toBe('Error from object');
    });

    it('should stringify object without message property', () => {
      const error = { code: 'ERR001', details: 'Something went wrong' };
      const result = getErrorMessage(error);

      const parsed = JSON.parse(result);
      expect(parsed.code).toBe('ERR001');
      expect(parsed.details).toBe('Something went wrong');
    });

    it('should handle objects with non-string message property', () => {
      const error = { message: 123 };
      const result = getErrorMessage(error);

      expect(result).toBe('123');
    });

    it('should handle nested objects', () => {
      const error = {
        message: 'Parent error',
        nested: {
          code: 'NESTED',
          details: 'Nested details'
        }
      };
      const result = getErrorMessage(error);

      expect(result).toBe('Parent error');
    });
  });

  describe('Null and undefined handling', () => {
    it('should handle null', () => {
      const error = null;
      const result = getErrorMessage(error);

      expect(result).toBe('Unknown error');
    });

    it('should handle undefined', () => {
      const error = undefined;
      const result = getErrorMessage(error);

      expect(result).toBe('Unknown error');
    });
  });

  describe('Circular reference handling', () => {
    it('should handle circular references in objects', () => {
      const error: any = { message: 'Circular' };
      error.self = error; // Create circular reference

      const result = getErrorMessage(error);

      // When message exists, it should return that
      expect(result).toBe('Circular');
    });

    it('should handle circular references without message', () => {
      const error: any = { code: 'CIRC' };
      error.self = error; // Create circular reference

      const result = getErrorMessage(error);

      // JSON.stringify will fail, should fallback to String()
      expect(result).toBe('[object Object]');
    });
  });

  describe('Special types', () => {
    it('should handle number errors', () => {
      const error = 404;
      const result = getErrorMessage(error);

      expect(result).toBe('Unknown error');
    });

    it('should handle boolean errors', () => {
      const error = false;
      const result = getErrorMessage(error);

      expect(result).toBe('Unknown error');
    });

    it('should handle array errors', () => {
      const error = ['Error 1', 'Error 2'];
      const result = getErrorMessage(error);

      expect(result).toBe('["Error 1","Error 2"]');
    });

    it('should handle symbol errors', () => {
      const error = Symbol('error');
      const result = getErrorMessage(error);

      expect(result).toBe('Unknown error');
    });

    it('should handle BigInt errors', () => {
      const error = BigInt(123);
      const result = getErrorMessage(error);

      expect(result).toBe('Unknown error');
    });
  });

  describe('Edge cases', () => {
    it('should handle Error with empty message', () => {
      const error = new Error('');
      const result = getErrorMessage(error);

      expect(result).toBe('');
    });

    it('should handle object with empty string message', () => {
      const error = { message: '' };
      const result = getErrorMessage(error);

      expect(result).toBe('');
    });

    it('should handle object with null message', () => {
      const error = { message: null };
      const result = getErrorMessage(error);

      expect(result).toBe('null');
    });

    it('should handle object with undefined message', () => {
      const error = { message: undefined };
      const result = getErrorMessage(error);

      // undefined should not be treated as a valid message
      expect(result).toBe('undefined');
    });

    it('should handle function errors', () => {
      const error = function() { return 'error'; };
      const result = getErrorMessage(error);

      expect(result).toBe('Unknown error');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle axios-like errors', () => {
      const error = {
        message: 'Request failed with status code 404',
        code: 'ERR_BAD_REQUEST',
        response: {
          status: 404,
          data: { error: 'Not found' }
        }
      };

      const result = getErrorMessage(error);
      expect(result).toBe('Request failed with status code 404');
    });

    it('should handle fetch-like errors', () => {
      const error = new TypeError('Failed to fetch');
      const result = getErrorMessage(error);

      expect(result).toBe('Failed to fetch');
    });

    it('should handle file system errors', () => {
      const error = {
        message: 'ENOENT: no such file or directory',
        code: 'ENOENT',
        path: '/path/to/file.txt'
      };

      const result = getErrorMessage(error);
      expect(result).toBe('ENOENT: no such file or directory');
    });

    it('should handle database errors', () => {
      const error = {
        message: 'Duplicate entry for key',
        code: 'ER_DUP_ENTRY',
        sqlState: '23000'
      };

      const result = getErrorMessage(error);
      expect(result).toBe('Duplicate entry for key');
    });
  });
});

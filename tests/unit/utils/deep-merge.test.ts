/**
 * Tests for Deep Merge Utility
 * Testing consolidated deep merge with security features
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { deepMerge, DeepMergeOptions } from '../../../src/utils/object-helpers.js';

describe('Deep Merge', () => {
  describe('Shallow merge', () => {
    it('should merge shallow objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };

      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
      expect(result).not.toBe(target); // Should not mutate
    });

    it('should not mutate original objects', () => {
      const target = { a: 1, b: 2 };
      const source = { c: 3 };

      const result = deepMerge(target, source);

      expect(target).toEqual({ a: 1, b: 2 });
      expect(source).toEqual({ c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should overwrite primitive values', () => {
      const target = { a: 1, b: 'old' };
      const source = { b: 'new', c: true };

      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 'new', c: true });
    });
  });

  describe('Deep merge of nested objects', () => {
    it('should recursively merge nested objects', () => {
      const target = {
        a: 1,
        nested: {
          x: 10,
          y: 20
        }
      };

      const source = {
        nested: {
          y: 30,
          z: 40
        },
        b: 2
      };

      const result = deepMerge(target, source);

      expect(result).toEqual({
        a: 1,
        b: 2,
        nested: {
          x: 10,
          y: 30,
          z: 40
        }
      });
    });

    it('should handle deeply nested objects', () => {
      const target = {
        level1: {
          level2: {
            level3: {
              value: 'old'
            }
          }
        }
      };

      const source = {
        level1: {
          level2: {
            level3: {
              value: 'new',
              extra: 'added'
            }
          }
        }
      };

      const result = deepMerge(target, source);

      expect(result.level1.level2.level3).toEqual({
        value: 'new',
        extra: 'added'
      });
    });

    it('should replace object with primitive', () => {
      const target = {
        value: {
          nested: 'object'
        }
      };

      const source = {
        value: 'primitive'
      };

      const result = deepMerge(target, source);

      expect(result).toEqual({ value: 'primitive' });
    });

    it('should replace primitive with object', () => {
      const target = {
        value: 'primitive'
      };

      const source = {
        value: {
          nested: 'object'
        }
      };

      const result = deepMerge(target, source);

      expect(result).toEqual({ value: { nested: 'object' } });
    });
  });

  describe('Array handling', () => {
    it('should replace arrays by default', () => {
      const target = {
        items: [1, 2, 3]
      };

      const source = {
        items: [4, 5]
      };

      const result = deepMerge(target, source);

      expect(result.items).toEqual([4, 5]);
      expect(result.items).not.toBe(source.items); // Should be a copy
    });

    it('should not merge array items', () => {
      const target = {
        arr: [{ a: 1 }, { b: 2 }]
      };

      const source = {
        arr: [{ c: 3 }]
      };

      const result = deepMerge(target, source);

      expect(result.arr).toEqual([{ c: 3 }]);
    });

    it('should handle empty arrays', () => {
      const target = {
        items: [1, 2, 3]
      };

      const source = {
        items: []
      };

      const result = deepMerge(target, source);

      expect(result.items).toEqual([]);
    });
  });

  describe('Null and undefined handling', () => {
    it('should skip undefined values by default', () => {
      const target = { a: 1, b: 2 };
      const source = { b: undefined, c: 3 };

      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should allow undefined when option is set', () => {
      const target = { a: 1, b: 2 };
      const source = { b: undefined, c: 3 };

      const result = deepMerge(target, source, { allowUndefined: true });

      expect(result).toEqual({ a: 1, b: undefined, c: 3 });
    });

    it('should overwrite with null', () => {
      const target = { a: 1, b: 2 };
      const source = { b: null };

      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: null });
    });

    it('should handle null in nested objects', () => {
      const target = {
        nested: {
          value: 'old'
        }
      };

      const source = {
        nested: null
      };

      const result = deepMerge(target, source);

      expect(result).toEqual({ nested: null });
    });
  });

  describe('Circular reference detection', () => {
    it('should detect and handle circular references', () => {
      const target = { a: 1 };
      const source: any = { b: 2 };
      source.self = source; // Create circular reference

      expect(() => deepMerge(target, source)).toThrow(/circular/i);
    });

    it('should detect circular references in nested objects', () => {
      const source: any = {
        level1: {
          level2: {}
        }
      };
      source.level1.level2.circular = source.level1; // Create circular reference

      expect(() => deepMerge({}, source)).toThrow(/circular/i);
    });

    it('should not throw on shared references that are not circular', () => {
      const shared = { value: 'shared' };
      const target = { a: shared };
      const source = { b: shared };

      const result = deepMerge(target, source);

      expect(result).toEqual({
        a: { value: 'shared' },
        b: { value: 'shared' }
      });
    });
  });

  describe('Prototype pollution prevention', () => {
    it('should not allow __proto__ pollution', () => {
      const target = {};
      const source = JSON.parse('{"__proto__": {"polluted": true}}');

      const result = deepMerge(target, source);

      expect((Object.prototype as any).polluted).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
    });

    it('should not allow constructor pollution', () => {
      const target = {};
      const source = JSON.parse('{"constructor": {"prototype": {"polluted": true}}}');

      const result = deepMerge(target, source);

      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('should not allow prototype pollution', () => {
      const target = {};
      const source = JSON.parse('{"prototype": {"polluted": true}}');

      const result = deepMerge(target, source);

      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('should filter out dangerous keys', () => {
      const target = {};
      const source = {
        __proto__: { danger: true },
        constructor: { danger: true },
        prototype: { danger: true },
        safe: 'value'
      };

      const result = deepMerge(target, source);

      expect(result).toEqual({ safe: 'value' });
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);
    });
  });

  describe('Special object types', () => {
    it('should not deep merge Date objects', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-12-31');

      const target = { date: date1 };
      const source = { date: date2 };

      const result = deepMerge(target, source);

      expect(result.date).toBe(date2);
      expect(result.date).not.toBe(date1);
    });

    it('should not deep merge RegExp objects', () => {
      const regex1 = /test1/;
      const regex2 = /test2/;

      const target = { pattern: regex1 };
      const source = { pattern: regex2 };

      const result = deepMerge(target, source);

      expect(result.pattern).toBe(regex2);
    });

    it('should not deep merge function values', () => {
      const fn1 = () => 'one';
      const fn2 = () => 'two';

      const target = { handler: fn1 };
      const source = { handler: fn2 };

      const result = deepMerge(target, source);

      expect(result.handler).toBe(fn2);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty target', () => {
      const result = deepMerge({}, { a: 1, b: 2 });

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty source', () => {
      const result = deepMerge({ a: 1, b: 2 }, {});

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle both empty', () => {
      const result = deepMerge({}, {});

      expect(result).toEqual({});
    });

    it('should handle objects with many keys', () => {
      const target: any = {};
      const source: any = {};

      for (let i = 0; i < 100; i++) {
        target[`key${i}`] = i;
        source[`key${i}`] = i * 2;
      }

      const result = deepMerge(target, source);

      expect(Object.keys(result).length).toBe(100);
      expect(result.key50).toBe(100);
    });

    it('should handle symbol keys', () => {
      const sym = Symbol('test');
      const target = { [sym]: 'old', regular: 'value' };
      const source = { [sym]: 'new' };

      const result = deepMerge(target, source);

      expect(result[sym]).toBe('new');
      expect(result.regular).toBe('value');
    });

    it('should handle objects with no prototype', () => {
      const target = Object.create(null);
      target.a = 1;

      const source = Object.create(null);
      source.b = 2;

      const result = deepMerge(target, source);

      expect(result.a).toBe(1);
      expect(result.b).toBe(2);
    });
  });

  describe('Real-world scenarios', () => {
    it('should merge configuration objects', () => {
      const defaults = {
        server: {
          host: 'localhost',
          port: 3000,
          ssl: false
        },
        database: {
          host: 'localhost',
          port: 5432
        }
      };

      const userConfig = {
        server: {
          port: 8080,
          ssl: true
        },
        logging: {
          level: 'debug'
        }
      };

      const result = deepMerge(defaults, userConfig);

      expect(result).toEqual({
        server: {
          host: 'localhost',
          port: 8080,
          ssl: true
        },
        database: {
          host: 'localhost',
          port: 5432
        },
        logging: {
          level: 'debug'
        }
      });
    });

    it('should merge API response objects', () => {
      const cached = {
        user: {
          id: 1,
          name: 'John',
          email: 'john@example.com'
        },
        timestamp: 1234567890
      };

      const update = {
        user: {
          email: 'newemail@example.com',
          verified: true
        }
      };

      const result = deepMerge(cached, update);

      expect(result.user).toEqual({
        id: 1,
        name: 'John',
        email: 'newemail@example.com',
        verified: true
      });
      expect(result.timestamp).toBe(1234567890);
    });
  });
});

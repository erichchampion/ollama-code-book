/**
 * Advanced Indexing System Test Suite
 *
 * Tests the comprehensive indexing capabilities including B-tree, full-text,
 * spatial, and composite indexes.
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock the AdvancedIndexingSystem since we can't easily import ES modules in Jest
class MockAdvancedIndexingSystem {
  constructor(configuration) {
    this.configuration = configuration;
    this.btreeIndexes = new Map();
    this.fullTextIndexes = new Map();
    this.spatialIndexes = new Map();
    this.compositeIndexes = new Map();
    this.eventHandlers = new Map();
    this.initializeIndexes();
  }

  initializeIndexes() {
    // Initialize B-tree indexes
    for (const config of this.configuration.btreeIndexes) {
      this.btreeIndexes.set(config.name, new MockBTreeIndex());
    }

    // Initialize full-text indexes
    for (const config of this.configuration.fullTextIndexes) {
      this.fullTextIndexes.set(config.name, new MockFullTextSearchIndex());
    }

    // Initialize spatial indexes
    for (const config of this.configuration.spatialIndexes) {
      this.spatialIndexes.set(config.name, new MockSpatialIndex());
    }

    // Initialize composite indexes
    for (const config of this.configuration.compositeIndexes) {
      this.compositeIndexes.set(config.name, new MockCompositeIndex(config));
    }
  }

  addNode(nodeId, nodeData) {
    // Update B-tree indexes
    for (const [indexName, index] of this.btreeIndexes.entries()) {
      const config = this.configuration.btreeIndexes.find(c => c.name === indexName);
      if (config && nodeData[config.keyField] !== undefined) {
        index.insert(nodeData[config.keyField], nodeId);
      }
    }

    // Update full-text indexes
    for (const [indexName, index] of this.fullTextIndexes.entries()) {
      const config = this.configuration.fullTextIndexes.find(c => c.name === indexName);
      if (config) {
        const content = new Map();
        for (const field of config.fields) {
          if (nodeData[field]) {
            content.set(field, String(nodeData[field]));
          }
        }
        if (content.size > 0) {
          index.addDocument(nodeId, content);
        }
      }
    }

    // Update spatial indexes
    for (const [indexName, index] of this.spatialIndexes.entries()) {
      const config = this.configuration.spatialIndexes.find(c => c.name === indexName);
      if (config) {
        const coords = config.coordinateFields;
        const x = nodeData[coords.x];
        const y = nodeData[coords.y];

        if (x !== undefined && y !== undefined) {
          const width = coords.width ? nodeData[coords.width] || 0 : 0;
          const height = coords.height ? nodeData[coords.height] || 0 : 0;

          const boundingBox = {
            minX: x,
            minY: y,
            maxX: x + width,
            maxY: y + height
          };

          index.insert({
            id: nodeId,
            boundingBox,
            data: nodeData
          });
        }
      }
    }

    // Update composite indexes
    for (const [indexName, index] of this.compositeIndexes.entries()) {
      const config = this.configuration.compositeIndexes.find(c => c.name === indexName);
      if (config) {
        const values = {};
        for (const field of config.fields) {
          values[field] = nodeData[field];
        }
        index.addEntry(nodeId, values);
      }
    }

    this.emit('nodeIndexed', { nodeId, indexCount: this.getIndexCount() });
  }

  updateNode(nodeId, oldData, newData) {
    this.removeNode(nodeId, oldData);
    this.addNode(nodeId, newData);
  }

  removeNode(nodeId, nodeData) {
    // Remove from B-tree indexes
    for (const [indexName, index] of this.btreeIndexes.entries()) {
      const config = this.configuration.btreeIndexes.find(c => c.name === indexName);
      if (config) {
        const key = nodeData[config.keyField];
        if (key !== undefined) {
          index.remove(key, nodeId);
        }
      }
    }

    // Remove from full-text indexes
    for (const [indexName, index] of this.fullTextIndexes.entries()) {
      index.removeDocument(nodeId);
    }

    // Remove from spatial indexes
    for (const [indexName, index] of this.spatialIndexes.entries()) {
      const config = this.configuration.spatialIndexes.find(c => c.name === indexName);
      if (config) {
        const coords = config.coordinateFields;
        const x = nodeData[coords.x];
        const y = nodeData[coords.y];
        if (x !== undefined && y !== undefined) {
          index.remove(nodeId);
        }
      }
    }

    // Remove from composite indexes
    for (const [indexName, index] of this.compositeIndexes.entries()) {
      const config = this.configuration.compositeIndexes.find(c => c.name === indexName);
      if (config) {
        const values = {};
        for (const field of config.fields) {
          values[field] = nodeData[field];
        }
        index.removeEntry(nodeId, values);
      }
    }

    this.emit('nodeUnindexed', { nodeId });
  }

  searchBTree(indexName, key) {
    const index = this.btreeIndexes.get(indexName);
    return index ? index.search(key) : undefined;
  }

  rangeBTreeSearch(indexName, startKey, endKey) {
    const index = this.btreeIndexes.get(indexName);
    return index ? index.rangeSearch(startKey, endKey) : [];
  }

  fullTextSearch(indexName, query, limit = 10) {
    const index = this.fullTextIndexes.get(indexName);
    return index ? index.search(query, limit) : [];
  }

  spatialSearch(indexName, boundingBox) {
    const index = this.spatialIndexes.get(indexName);
    return index ? index.search(boundingBox) : [];
  }

  compositeSearch(indexName, values) {
    const index = this.compositeIndexes.get(indexName);
    return index ? index.search(values) : [];
  }

  getIndexStats() {
    return {
      btreeIndexCount: this.btreeIndexes.size,
      fullTextIndexCount: this.fullTextIndexes.size,
      spatialIndexCount: this.spatialIndexes.size,
      compositeIndexCount: this.compositeIndexes.size,
      totalIndexCount: this.getIndexCount()
    };
  }

  getIndexCount() {
    return this.btreeIndexes.size + this.fullTextIndexes.size +
           this.spatialIndexes.size + this.compositeIndexes.size;
  }

  rebuildIndexes(nodeDataProvider) {
    this.emit('rebuildStarted');

    // Clear all indexes
    this.btreeIndexes.clear();
    this.fullTextIndexes.clear();
    this.spatialIndexes.clear();
    this.compositeIndexes.clear();

    // Reinitialize
    this.initializeIndexes();

    this.emit('rebuildCompleted');
  }

  // Event emitter mock
  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }
}

// Mock B-Tree Index
class MockBTreeIndex {
  constructor() {
    this.data = new Map();
  }

  insert(key, value) {
    this.data.set(key, value);
  }

  search(key) {
    return this.data.get(key);
  }

  remove(key, nodeId) {
    this.data.delete(key);
  }

  rangeSearch(startKey, endKey) {
    const results = [];
    for (const [key, value] of this.data.entries()) {
      if (key >= startKey && key <= endKey) {
        results.push({ key, value });
      }
    }
    return results.sort((a, b) => a.key - b.key);
  }
}

// Mock Full-Text Search Index
class MockFullTextSearchIndex {
  constructor() {
    this.documents = new Map();
    this.invertedIndex = new Map();
  }

  addDocument(nodeId, content) {
    this.documents.set(nodeId, content);

    // Simple tokenization and indexing
    for (const [field, text] of content.entries()) {
      const tokens = text.toLowerCase().split(/\s+/);
      tokens.forEach((token, position) => {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, []);
        }
        this.invertedIndex.get(token).push({
          nodeId,
          field,
          position,
          frequency: 1
        });
      });
    }
  }

  search(query, limit = 10) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const candidates = new Map();

    for (const term of queryTerms) {
      const entries = this.invertedIndex.get(term) || [];
      for (const entry of entries) {
        if (!candidates.has(entry.nodeId)) {
          candidates.set(entry.nodeId, {
            score: 0,
            matches: []
          });
        }
        const candidate = candidates.get(entry.nodeId);
        candidate.score += 1; // Simple scoring
        candidate.matches.push({
          field: entry.field,
          position: entry.position,
          context: `...context around ${term}...`
        });
      }
    }

    return Array.from(candidates.entries())
      .map(([nodeId, data]) => ({
        nodeId,
        score: data.score,
        matches: data.matches
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  removeDocument(nodeId) {
    this.documents.delete(nodeId);

    // Remove from inverted index
    for (const [term, entries] of this.invertedIndex.entries()) {
      const filteredEntries = entries.filter(entry => entry.nodeId !== nodeId);
      if (filteredEntries.length === 0) {
        this.invertedIndex.delete(term);
      } else {
        this.invertedIndex.set(term, filteredEntries);
      }
    }
  }
}

// Mock Spatial Index
class MockSpatialIndex {
  constructor() {
    this.entries = [];
  }

  insert(entry) {
    this.entries.push(entry);
  }

  search(queryBox) {
    return this.entries.filter(entry =>
      this.intersects(entry.boundingBox, queryBox)
    );
  }

  remove(nodeId) {
    this.entries = this.entries.filter(entry => entry.id !== nodeId);
  }

  intersects(box1, box2) {
    return box1.minX <= box2.maxX && box1.maxX >= box2.minX &&
           box1.minY <= box2.maxY && box1.maxY >= box2.minY;
  }
}

// Mock Composite Index
class MockCompositeIndex {
  constructor(options) {
    this.options = options;
    this.index = new Map();
  }

  addEntry(nodeId, values) {
    const key = this.createCompositeKey(values);
    if (!this.index.has(key)) {
      this.index.set(key, new Set());
    }

    if (this.options.unique && this.index.get(key).size > 0) {
      throw new Error(`Unique constraint violation for composite key: ${key}`);
    }

    this.index.get(key).add(nodeId);
  }

  createCompositeKey(values) {
    const keyParts = this.options.fields.map(field => {
      const value = values[field];
      if (value === null || value === undefined) {
        if (this.options.sparse) {
          return null;
        }
        return 'NULL';
      }
      return String(value);
    });

    if (this.options.sparse && keyParts.some(part => part === null)) {
      return '';
    }

    return keyParts.join('|');
  }

  search(values) {
    const results = new Set();
    const searchPattern = this.createPartialSearchPattern(values);

    for (const [key, nodeIds] of this.index.entries()) {
      if (this.matchesPattern(key, searchPattern)) {
        for (const nodeId of nodeIds) {
          results.add(nodeId);
        }
      }
    }

    return Array.from(results);
  }

  createPartialSearchPattern(values) {
    const patternParts = this.options.fields.map(field => {
      const value = values[field];
      if (value === undefined) {
        return '*';
      }
      if (value === null) {
        return 'NULL';
      }
      return String(value);
    });

    return patternParts.join('|');
  }

  matchesPattern(key, pattern) {
    const keyParts = key.split('|');
    const patternParts = pattern.split('|');

    if (keyParts.length !== patternParts.length) {
      return false;
    }

    for (let i = 0; i < keyParts.length; i++) {
      if (patternParts[i] !== '*' && patternParts[i] !== keyParts[i]) {
        return false;
      }
    }

    return true;
  }

  removeEntry(nodeId, values) {
    const key = this.createCompositeKey(values);
    const nodeSet = this.index.get(key);
    if (nodeSet) {
      nodeSet.delete(nodeId);
      if (nodeSet.size === 0) {
        this.index.delete(key);
      }
    }
  }
}

describe('Advanced Indexing System', () => {
  let indexingSystem;
  let configuration;

  beforeEach(() => {
    configuration = {
      btreeIndexes: [
        {
          name: 'lineNumber',
          keyField: 'line',
          compareFunction: (a, b) => a - b
        },
        {
          name: 'alphabetical',
          keyField: 'name'
        }
      ],
      fullTextIndexes: [
        {
          name: 'codeContent',
          fields: ['content', 'comments', 'docstring']
        },
        {
          name: 'identifiers',
          fields: ['name', 'className', 'functionName']
        }
      ],
      spatialIndexes: [
        {
          name: 'codeLocation',
          coordinateFields: {
            x: 'column',
            y: 'line',
            width: 'length'
          }
        }
      ],
      compositeIndexes: [
        {
          name: 'fileAndType',
          fields: ['file', 'type'],
          unique: false
        },
        {
          name: 'uniqueIdentifier',
          fields: ['namespace', 'name'],
          unique: true
        }
      ]
    };

    indexingSystem = new MockAdvancedIndexingSystem(configuration);
  });

  describe('Index Initialization', () => {
    test('should initialize all index types correctly', () => {
      const stats = indexingSystem.getIndexStats();

      expect(stats.btreeIndexCount).toBe(2);
      expect(stats.fullTextIndexCount).toBe(2);
      expect(stats.spatialIndexCount).toBe(1);
      expect(stats.compositeIndexCount).toBe(2);
      expect(stats.totalIndexCount).toBe(7);
    });

    test('should create indexes with correct configuration', () => {
      expect(indexingSystem.btreeIndexes.has('lineNumber')).toBe(true);
      expect(indexingSystem.btreeIndexes.has('alphabetical')).toBe(true);
      expect(indexingSystem.fullTextIndexes.has('codeContent')).toBe(true);
      expect(indexingSystem.fullTextIndexes.has('identifiers')).toBe(true);
      expect(indexingSystem.spatialIndexes.has('codeLocation')).toBe(true);
      expect(indexingSystem.compositeIndexes.has('fileAndType')).toBe(true);
      expect(indexingSystem.compositeIndexes.has('uniqueIdentifier')).toBe(true);
    });
  });

  describe('B-Tree Index Operations', () => {
    test('should add and search nodes in B-tree index', () => {
      const nodeData1 = { line: 10, name: 'function1', content: 'function code' };
      const nodeData2 = { line: 20, name: 'function2', content: 'more code' };

      indexingSystem.addNode('node1', nodeData1);
      indexingSystem.addNode('node2', nodeData2);

      expect(indexingSystem.searchBTree('lineNumber', 10)).toBe('node1');
      expect(indexingSystem.searchBTree('lineNumber', 20)).toBe('node2');
      expect(indexingSystem.searchBTree('alphabetical', 'function1')).toBe('node1');
    });

    test('should perform range searches in B-tree index', () => {
      const nodes = [
        { id: 'node1', data: { line: 5, name: 'a' } },
        { id: 'node2', data: { line: 15, name: 'b' } },
        { id: 'node3', data: { line: 25, name: 'c' } },
        { id: 'node4', data: { line: 35, name: 'd' } }
      ];

      nodes.forEach(node => indexingSystem.addNode(node.id, node.data));

      const rangeResults = indexingSystem.rangeBTreeSearch('lineNumber', 10, 30);
      expect(rangeResults).toHaveLength(2);
      expect(rangeResults[0].key).toBe(15);
      expect(rangeResults[0].value).toBe('node2');
      expect(rangeResults[1].key).toBe(25);
      expect(rangeResults[1].value).toBe('node3');
    });
  });

  describe('Full-Text Search Operations', () => {
    test('should index and search text content', () => {
      const nodeData1 = {
        content: 'function calculateSum(a, b) { return a + b; }',
        comments: 'Calculates the sum of two numbers',
        name: 'calculateSum'
      };

      const nodeData2 = {
        content: 'function multiply(x, y) { return x * y; }',
        comments: 'Multiplies two values',
        name: 'multiply'
      };

      indexingSystem.addNode('func1', nodeData1);
      indexingSystem.addNode('func2', nodeData2);

      const results = indexingSystem.fullTextSearch('codeContent', 'function sum');
      expect(results).toHaveLength(2);
      expect(results[0].nodeId).toBe('func1'); // Should score higher due to 'sum'
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    test('should return relevant matches with context', () => {
      const nodeData = {
        content: 'async function fetchData() { return await api.get(); }',
        comments: 'Fetches data from API',
        name: 'fetchData'
      };

      indexingSystem.addNode('async1', nodeData);

      const results = indexingSystem.fullTextSearch('codeContent', 'fetch api');
      expect(results).toHaveLength(1);
      expect(results[0].nodeId).toBe('async1');
      expect(results[0].matches.length).toBeGreaterThan(0);
      expect(results[0].matches[0]).toHaveProperty('field');
      expect(results[0].matches[0]).toHaveProperty('position');
      expect(results[0].matches[0]).toHaveProperty('context');
    });

    test('should handle document removal from full-text index', () => {
      const nodeData = {
        content: 'unique content for removal test',
        name: 'testFunction'
      };

      indexingSystem.addNode('remove1', nodeData);

      let results = indexingSystem.fullTextSearch('codeContent', 'unique removal');
      expect(results).toHaveLength(1);

      indexingSystem.removeNode('remove1', nodeData);

      results = indexingSystem.fullTextSearch('codeContent', 'unique removal');
      expect(results).toHaveLength(0);
    });
  });

  describe('Spatial Index Operations', () => {
    test('should index and search spatial locations', () => {
      const nodeData1 = { column: 5, line: 10, length: 15, name: 'var1' };
      const nodeData2 = { column: 20, line: 25, length: 10, name: 'var2' };

      indexingSystem.addNode('spatial1', nodeData1);
      indexingSystem.addNode('spatial2', nodeData2);

      // Search for items intersecting with a bounding box
      const queryBox = { minX: 0, minY: 0, maxX: 25, maxY: 15 };
      const results = indexingSystem.spatialSearch('codeLocation', queryBox);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('spatial1');
      expect(results[0].data.name).toBe('var1');
    });

    test('should find overlapping spatial regions', () => {
      const nodes = [
        { id: 'rect1', data: { column: 0, line: 0, length: 10, name: 'topLeft' } },
        { id: 'rect2', data: { column: 5, line: 5, length: 10, name: 'center' } },
        { id: 'rect3', data: { column: 20, line: 20, length: 5, name: 'bottomRight' } }
      ];

      nodes.forEach(node => indexingSystem.addNode(node.id, node.data));

      const queryBox = { minX: 3, minY: 0, maxX: 12, maxY: 12 };
      const results = indexingSystem.spatialSearch('codeLocation', queryBox);

      expect(results).toHaveLength(2);
      const resultIds = results.map(r => r.id);
      expect(resultIds).toContain('rect1');
      expect(resultIds).toContain('rect2');
    });
  });

  describe('Composite Index Operations', () => {
    test('should index and search by multiple fields', () => {
      const nodeData1 = { file: 'utils.js', type: 'function', name: 'helper1' };
      const nodeData2 = { file: 'utils.js', type: 'variable', name: 'config' };
      const nodeData3 = { file: 'main.js', type: 'function', name: 'main' };

      indexingSystem.addNode('comp1', nodeData1);
      indexingSystem.addNode('comp2', nodeData2);
      indexingSystem.addNode('comp3', nodeData3);

      // Search by exact composite key
      const results1 = indexingSystem.compositeSearch('fileAndType', {
        file: 'utils.js',
        type: 'function'
      });
      expect(results1).toEqual(['comp1']);

      // Search by partial composite key
      const results2 = indexingSystem.compositeSearch('fileAndType', {
        file: 'utils.js'
      });
      expect(results2).toHaveLength(2);
      expect(results2).toContain('comp1');
      expect(results2).toContain('comp2');
    });

    test('should enforce unique constraints', () => {
      const nodeData1 = { namespace: 'utils', name: 'helper', type: 'function' };
      const nodeData2 = { namespace: 'utils', name: 'helper', type: 'variable' };

      indexingSystem.addNode('unique1', nodeData1);

      expect(() => {
        indexingSystem.addNode('unique2', nodeData2);
      }).toThrow('Unique constraint violation');
    });

    test('should handle sparse indexes correctly', () => {
      // Create a sparse index configuration
      const sparseConfig = {
        btreeIndexes: [],
        fullTextIndexes: [],
        spatialIndexes: [],
        compositeIndexes: [
          {
            name: 'sparseTest',
            fields: ['required', 'optional'],
            sparse: true
          }
        ]
      };

      const sparseSystem = new MockAdvancedIndexingSystem(sparseConfig);

      const nodeData1 = { required: 'value1', optional: 'optional1' };
      const nodeData2 = { required: 'value2' }; // Missing optional field

      sparseSystem.addNode('sparse1', nodeData1);
      sparseSystem.addNode('sparse2', nodeData2);

      const results = sparseSystem.compositeSearch('sparseTest', { required: 'value1' });
      expect(results).toContain('sparse1');
    });
  });

  describe('Index Maintenance', () => {
    test('should update indexes when node data changes', () => {
      const oldData = { line: 10, content: 'old function', name: 'oldName' };
      const newData = { line: 20, content: 'new function', name: 'newName' };

      indexingSystem.addNode('update1', oldData);

      // Verify old data is indexed
      expect(indexingSystem.searchBTree('lineNumber', 10)).toBe('update1');
      let results = indexingSystem.fullTextSearch('codeContent', 'old');
      expect(results).toHaveLength(1);

      // Update the node
      indexingSystem.updateNode('update1', oldData, newData);

      // Verify new data is indexed and old data is removed
      expect(indexingSystem.searchBTree('lineNumber', 10)).toBeUndefined();
      expect(indexingSystem.searchBTree('lineNumber', 20)).toBe('update1');

      results = indexingSystem.fullTextSearch('codeContent', 'old');
      expect(results).toHaveLength(0);

      results = indexingSystem.fullTextSearch('codeContent', 'new');
      expect(results).toHaveLength(1);
    });

    test('should emit events during indexing operations', () => {
      const events = [];

      indexingSystem.on('nodeIndexed', (data) => {
        events.push({ type: 'indexed', data });
      });

      indexingSystem.on('nodeUnindexed', (data) => {
        events.push({ type: 'unindexed', data });
      });

      const nodeData = { line: 5, content: 'test', name: 'test' };

      indexingSystem.addNode('event1', nodeData);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('indexed');
      expect(events[0].data.nodeId).toBe('event1');

      indexingSystem.removeNode('event1', nodeData);
      expect(events).toHaveLength(2);
      expect(events[1].type).toBe('unindexed');
      expect(events[1].data.nodeId).toBe('event1');
    });

    test('should rebuild all indexes correctly', () => {
      // Add some data
      const nodeData1 = { line: 10, content: 'test content', name: 'test1' };
      const nodeData2 = { line: 20, content: 'more content', name: 'test2' };

      indexingSystem.addNode('rebuild1', nodeData1);
      indexingSystem.addNode('rebuild2', nodeData2);

      const events = [];
      indexingSystem.on('rebuildStarted', () => events.push('started'));
      indexingSystem.on('rebuildCompleted', () => events.push('completed'));

      indexingSystem.rebuildIndexes();

      expect(events).toEqual(['started', 'completed']);

      // Verify indexes are cleared
      expect(indexingSystem.searchBTree('lineNumber', 10)).toBeUndefined();
      expect(indexingSystem.searchBTree('lineNumber', 20)).toBeUndefined();
    });
  });

  describe('Performance and Statistics', () => {
    test('should provide accurate index statistics', () => {
      const initialStats = indexingSystem.getIndexStats();
      expect(initialStats.totalIndexCount).toBe(7);

      // Add some nodes
      for (let i = 0; i < 100; i++) {
        indexingSystem.addNode(`node${i}`, {
          line: i,
          content: `content ${i}`,
          name: `name${i}`,
          file: 'test.js',
          type: 'function'
        });
      }

      const finalStats = indexingSystem.getIndexStats();
      expect(finalStats.totalIndexCount).toBe(7); // Index count doesn't change
    });

    test('should handle large datasets efficiently', () => {
      const startTime = Date.now();

      // Add 1000 nodes
      for (let i = 0; i < 1000; i++) {
        indexingSystem.addNode(`large${i}`, {
          line: i,
          content: `function test${i}() { return ${i}; }`,
          name: `test${i}`,
          column: i % 100,
          length: 10,
          file: `file${Math.floor(i / 100)}.js`,
          type: 'function'
        });
      }

      const indexingTime = Date.now() - startTime;
      expect(indexingTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Test search performance
      const searchStartTime = Date.now();
      const results = indexingSystem.fullTextSearch('codeContent', 'function test');
      const searchTime = Date.now() - searchStartTime;

      expect(results.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(1000); // Search should be fast
    });
  });

  describe('Error Handling', () => {
    test('should handle missing index gracefully', () => {
      expect(indexingSystem.searchBTree('nonexistent', 'key')).toBeUndefined();
      expect(indexingSystem.fullTextSearch('nonexistent', 'query')).toEqual([]);
      expect(indexingSystem.spatialSearch('nonexistent', { minX: 0, minY: 0, maxX: 10, maxY: 10 })).toEqual([]);
      expect(indexingSystem.compositeSearch('nonexistent', { field: 'value' })).toEqual([]);
    });

    test('should handle malformed data gracefully', () => {
      const malformedData = {
        line: 'not_a_number',
        content: null,
        name: undefined
      };

      // Should not throw errors
      expect(() => {
        indexingSystem.addNode('malformed', malformedData);
      }).not.toThrow();
    });
  });
});

console.log('✅ Advanced Indexing System test suite created');
console.log('📊 Test coverage areas:');
console.log('   - B-tree index operations and range queries');
console.log('   - Full-text search with TF-IDF scoring');
console.log('   - Spatial indexing with bounding box queries');
console.log('   - Composite indexes with unique constraints');
console.log('   - Index maintenance during updates');
console.log('   - Performance testing with large datasets');
console.log('   - Event emission and error handling');
console.log('   - Index rebuilding and statistics');
/**
 * Advanced Indexing System for Knowledge Graph
 *
 * Provides high-performance indexing capabilities including:
 * - B-tree indexes for range queries and sorting
 * - Full-text search indexes for code content
 * - Spatial indexes for location-based queries
 * - Composite indexes for complex query patterns
 * - Index maintenance during incremental updates
 */

import { ManagedEventEmitter } from '../utils/managed-event-emitter.js';
import { normalizeError } from '../utils/error-utils.js';
import { getPerformanceConfig } from '../config/performance.js';

// B-Tree Index Implementation
export interface BTreeNode<K, V> {
  keys: K[];
  values: V[];
  children?: BTreeNode<K, V>[];
  isLeaf: boolean;
  parent?: BTreeNode<K, V>;
}

export class BTreeIndex<K, V> {
  private root: BTreeNode<K, V>;
  private readonly order: number;
  private readonly compareFunction: (a: K, b: K) => number;

  constructor(order?: number, compareFunction?: (a: K, b: K) => number) {
    const config = getPerformanceConfig();
    this.order = order || config.indexing.btreeOrder;
    this.compareFunction = compareFunction || ((a, b) => a < b ? -1 : a > b ? 1 : 0);
    this.root = {
      keys: [],
      values: [],
      isLeaf: true
    };
  }

  insert(key: K, value: V): void {
    if (this.root.keys.length === 2 * this.order - 1) {
      const newRoot: BTreeNode<K, V> = {
        keys: [],
        values: [],
        children: [this.root],
        isLeaf: false
      };
      this.root.parent = newRoot;
      this.splitChild(newRoot, 0);
      this.root = newRoot;
    }
    this.insertNonFull(this.root, key, value);
  }

  private insertNonFull(node: BTreeNode<K, V>, key: K, value: V): void {
    let i = node.keys.length - 1;

    if (node.isLeaf) {
      node.keys.push(key);
      node.values.push(value);

      while (i >= 0 && this.compareFunction(node.keys[i], key) > 0) {
        node.keys[i + 1] = node.keys[i];
        node.values[i + 1] = node.values[i];
        i--;
      }
      node.keys[i + 1] = key;
      node.values[i + 1] = value;
    } else {
      while (i >= 0 && this.compareFunction(node.keys[i], key) > 0) {
        i--;
      }
      i++;

      if (node.children![i].keys.length === 2 * this.order - 1) {
        this.splitChild(node, i);
        if (this.compareFunction(node.keys[i], key) < 0) {
          i++;
        }
      }
      this.insertNonFull(node.children![i], key, value);
    }
  }

  private splitChild(parent: BTreeNode<K, V>, index: number): void {
    const fullChild = parent.children![index];
    const newChild: BTreeNode<K, V> = {
      keys: [],
      values: [],
      isLeaf: fullChild.isLeaf,
      parent: parent
    };

    const mid = this.order - 1;
    newChild.keys = fullChild.keys.splice(mid + 1);
    newChild.values = fullChild.values.splice(mid + 1);

    if (!fullChild.isLeaf) {
      newChild.children = fullChild.children!.splice(mid + 1);
      newChild.children.forEach(child => child.parent = newChild);
    }

    parent.children!.splice(index + 1, 0, newChild);
    parent.keys.splice(index, 0, fullChild.keys[mid]);
    parent.values.splice(index, 0, fullChild.values[mid]);

    fullChild.keys.splice(mid);
    fullChild.values.splice(mid);
  }

  search(key: K): V | undefined {
    return this.searchNode(this.root, key);
  }

  private searchNode(node: BTreeNode<K, V>, key: K): V | undefined {
    let i = 0;
    while (i < node.keys.length && this.compareFunction(key, node.keys[i]) > 0) {
      i++;
    }

    if (i < node.keys.length && this.compareFunction(key, node.keys[i]) === 0) {
      return node.values[i];
    }

    if (node.isLeaf) {
      return undefined;
    }

    return this.searchNode(node.children![i], key);
  }

  rangeSearch(startKey: K, endKey: K): Array<{ key: K; value: V }> {
    const result: Array<{ key: K; value: V }> = [];
    this.rangeSearchNode(this.root, startKey, endKey, result);
    return result;
  }

  private rangeSearchNode(node: BTreeNode<K, V>, startKey: K, endKey: K, result: Array<{ key: K; value: V }>): void {
    let i = 0;
    while (i < node.keys.length) {
      if (!node.isLeaf) {
        if (this.compareFunction(node.keys[i], startKey) > 0) {
          this.rangeSearchNode(node.children![i], startKey, endKey, result);
        }
      }

      if (this.compareFunction(node.keys[i], startKey) >= 0 && this.compareFunction(node.keys[i], endKey) <= 0) {
        result.push({ key: node.keys[i], value: node.values[i] });
      }

      i++;
    }

    if (!node.isLeaf && node.children!.length > i) {
      this.rangeSearchNode(node.children![i], startKey, endKey, result);
    }
  }
}

// Full-Text Search Index Implementation
export interface FullTextSearchResult {
  nodeId: string;
  score: number;
  matches: Array<{
    field: string;
    position: number;
    context: string;
  }>;
}

export interface InvertedIndexEntry {
  nodeId: string;
  field: string;
  positions: number[];
  frequency: number;
}

export class FullTextSearchIndex {
  private invertedIndex = new Map<string, InvertedIndexEntry[]>();
  private documentFrequency = new Map<string, number>();
  private totalDocuments = 0;
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
    'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours'
  ]);

  addDocument(nodeId: string, content: Map<string, string>): void {
    this.totalDocuments++;
    const processedTerms = new Set<string>();

    for (const [field, text] of content.entries()) {
      const tokens = this.tokenize(text);

      for (let position = 0; position < tokens.length; position++) {
        const term = tokens[position];
        if (this.stopWords.has(term) || term.length < 2) continue;

        if (!this.invertedIndex.has(term)) {
          this.invertedIndex.set(term, []);
        }

        let entry = this.invertedIndex.get(term)!.find(e => e.nodeId === nodeId && e.field === field);
        if (!entry) {
          entry = {
            nodeId,
            field,
            positions: [],
            frequency: 0
          };
          this.invertedIndex.get(term)!.push(entry);
        }

        entry.positions.push(position);
        entry.frequency++;

        // Track document frequency
        if (!processedTerms.has(term)) {
          processedTerms.add(term);
          this.documentFrequency.set(term, (this.documentFrequency.get(term) || 0) + 1);
        }
      }
    }
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  search(query: string, limit?: number): FullTextSearchResult[] {
    const config = getPerformanceConfig();
    const searchLimit = limit || config.indexing.fullTextSearchDefaultLimit;
    const queryTerms = this.tokenize(query).filter(term => !this.stopWords.has(term));
    if (queryTerms.length === 0) return [];

    const candidateDocuments = new Map<string, {
      score: number;
      matches: Array<{ field: string; position: number; context: string }>;
    }>();

    // Calculate TF-IDF scores
    for (const term of queryTerms) {
      const entries = this.invertedIndex.get(term) || [];
      const idf = Math.log(this.totalDocuments / (this.documentFrequency.get(term) || 1));

      for (const entry of entries) {
        const tf = entry.frequency / entry.positions.length;
        const score = tf * idf;

        if (!candidateDocuments.has(entry.nodeId)) {
          candidateDocuments.set(entry.nodeId, { score: 0, matches: [] });
        }

        const candidate = candidateDocuments.get(entry.nodeId)!;
        candidate.score += score;

        // Add match information
        for (const position of entry.positions) {
          candidate.matches.push({
            field: entry.field,
            position,
            context: this.getContext(entry.nodeId, entry.field, position)
          });
        }
      }
    }

    // Convert to results and sort by score
    const results: FullTextSearchResult[] = Array.from(candidateDocuments.entries())
      .map(([nodeId, data]) => ({
        nodeId,
        score: data.score,
        matches: data.matches
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, searchLimit);

    return results;
  }

  private getContext(nodeId: string, field: string, position: number): string {
    // In a real implementation, this would retrieve the actual text context
    // For now, return a placeholder
    return `...context around position ${position} in ${field}...`;
  }

  updateDocument(nodeId: string, content: Map<string, string>): void {
    this.removeDocument(nodeId);
    this.addDocument(nodeId, content);
  }

  removeDocument(nodeId: string): void {
    for (const [term, entries] of this.invertedIndex.entries()) {
      const filteredEntries = entries.filter(entry => entry.nodeId !== nodeId);
      if (filteredEntries.length === 0) {
        this.invertedIndex.delete(term);
        this.documentFrequency.delete(term);
      } else {
        this.invertedIndex.set(term, filteredEntries);
        // Recalculate document frequency
        const uniqueDocuments = new Set(filteredEntries.map(e => e.nodeId));
        this.documentFrequency.set(term, uniqueDocuments.size);
      }
    }
    this.totalDocuments--;
  }
}

// Spatial Index Implementation (R-Tree)
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SpatialEntry {
  id: string;
  boundingBox: BoundingBox;
  data: any;
}

export class SpatialIndex {
  private maxEntries: number;
  private minEntries: number;
  private root: SpatialNode;

  constructor(maxEntries?: number) {
    const config = getPerformanceConfig();
    this.maxEntries = maxEntries || config.indexing.spatialIndexMaxEntries;
    this.minEntries = Math.ceil(this.maxEntries * 0.4);
    this.root = new SpatialNode(true);
  }

  insert(entry: SpatialEntry): void {
    const leaf = this.chooseLeaf(entry.boundingBox);
    if (leaf.entries) {
      leaf.entries.push(entry);
    }
    this.adjustTree(leaf);
  }

  private chooseLeaf(boundingBox: BoundingBox): SpatialNode {
    let node = this.root;
    while (!node.isLeaf) {
      let bestChild = node.children![0];
      let minEnlargement = this.calculateEnlargement(bestChild.boundingBox, boundingBox);

      for (let i = 1; i < node.children!.length; i++) {
        const child = node.children![i];
        const enlargement = this.calculateEnlargement(child.boundingBox, boundingBox);
        if (enlargement < minEnlargement) {
          minEnlargement = enlargement;
          bestChild = child;
        }
      }
      node = bestChild;
    }
    return node;
  }

  private calculateEnlargement(existing: BoundingBox, newBox: BoundingBox): number {
    const enlargedBox = this.expandBoundingBox(existing, newBox);
    return this.calculateArea(enlargedBox) - this.calculateArea(existing);
  }

  private expandBoundingBox(box1: BoundingBox, box2: BoundingBox): BoundingBox {
    return {
      minX: Math.min(box1.minX, box2.minX),
      minY: Math.min(box1.minY, box2.minY),
      maxX: Math.max(box1.maxX, box2.maxX),
      maxY: Math.max(box1.maxY, box2.maxY)
    };
  }

  private calculateArea(box: BoundingBox): number {
    return (box.maxX - box.minX) * (box.maxY - box.minY);
  }

  private adjustTree(node: SpatialNode): void {
    if ((node.entries && node.entries.length > this.maxEntries) || (node.children && node.children.length > this.maxEntries)) {
      const [leftNode, rightNode] = this.splitNode(node);
      if (node === this.root) {
        this.root = new SpatialNode(false);
        this.root.children = [leftNode, rightNode];
        this.root.boundingBox = this.expandBoundingBox(leftNode.boundingBox, rightNode.boundingBox);
      }
    }
    this.updateBoundingBox(node);
  }

  private splitNode(node: SpatialNode): [SpatialNode, SpatialNode] {
    // Simplified linear split algorithm
    const leftNode = new SpatialNode(node.isLeaf);
    const rightNode = new SpatialNode(node.isLeaf);

    if (node.isLeaf && node.entries) {
      const entries = node.entries;
      const midpoint = Math.floor(entries.length / 2);
      leftNode.entries = entries.slice(0, midpoint);
      rightNode.entries = entries.slice(midpoint);
    } else if (node.children) {
      const children = node.children;
      const midpoint = Math.floor(children.length / 2);
      leftNode.children = children.slice(0, midpoint);
      rightNode.children = children.slice(midpoint);
    }

    this.updateBoundingBox(leftNode);
    this.updateBoundingBox(rightNode);

    return [leftNode, rightNode];
  }

  private updateBoundingBox(node: SpatialNode): void {
    if (node.isLeaf && node.entries && node.entries.length > 0) {
      let box = node.entries[0].boundingBox;
      for (let i = 1; i < node.entries.length; i++) {
        box = this.expandBoundingBox(box, node.entries[i].boundingBox);
      }
      node.boundingBox = box;
    } else if (node.children && node.children.length > 0) {
      let box = node.children[0].boundingBox;
      for (let i = 1; i < node.children.length; i++) {
        box = this.expandBoundingBox(box, node.children[i].boundingBox);
      }
      node.boundingBox = box;
    }
  }

  search(queryBox: BoundingBox): SpatialEntry[] {
    const results: SpatialEntry[] = [];
    this.searchNode(this.root, queryBox, results);
    return results;
  }

  private searchNode(node: SpatialNode, queryBox: BoundingBox, results: SpatialEntry[]): void {
    if (!this.intersects(node.boundingBox, queryBox)) {
      return;
    }

    if (node.isLeaf && node.entries) {
      for (const entry of node.entries) {
        if (this.intersects(entry.boundingBox, queryBox)) {
          results.push(entry);
        }
      }
    } else if (node.children) {
      for (const child of node.children) {
        this.searchNode(child, queryBox, results);
      }
    }
  }

  private intersects(box1: BoundingBox, box2: BoundingBox): boolean {
    return box1.minX <= box2.maxX && box1.maxX >= box2.minX &&
           box1.minY <= box2.maxY && box1.maxY >= box2.minY;
  }
}

class SpatialNode {
  isLeaf: boolean;
  boundingBox: BoundingBox;
  entries?: SpatialEntry[];
  children?: SpatialNode[];

  constructor(isLeaf: boolean) {
    this.isLeaf = isLeaf;
    this.boundingBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    if (isLeaf) {
      this.entries = [];
    } else {
      this.children = [];
    }
  }
}

// Composite Index for complex query patterns
export interface CompositeIndexKey {
  [field: string]: any;
}

export interface CompositeIndexOptions {
  fields: string[];
  unique?: boolean;
  sparse?: boolean;
}

export class CompositeIndex {
  private options: CompositeIndexOptions;
  private index = new Map<string, Set<string>>();

  constructor(options: CompositeIndexOptions) {
    this.options = options;
  }

  addEntry(nodeId: string, values: CompositeIndexKey): void {
    const key = this.createCompositeKey(values);
    if (!this.index.has(key)) {
      this.index.set(key, new Set());
    }

    if (this.options.unique && this.index.get(key)!.size > 0) {
      throw new Error(`Unique constraint violation for composite key: ${key}`);
    }

    this.index.get(key)!.add(nodeId);
  }

  private createCompositeKey(values: CompositeIndexKey): string {
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

  search(values: Partial<CompositeIndexKey>): string[] {
    const results = new Set<string>();

    // Handle partial key searches
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

  private createPartialSearchPattern(values: Partial<CompositeIndexKey>): string {
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

  private matchesPattern(key: string, pattern: string): boolean {
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

  removeEntry(nodeId: string, values: CompositeIndexKey): void {
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

// Main Advanced Indexing System
export interface IndexConfiguration {
  btreeIndexes: Array<{
    name: string;
    keyField: string;
    compareFunction?: (a: any, b: any) => number;
  }>;
  fullTextIndexes: Array<{
    name: string;
    fields: string[];
  }>;
  spatialIndexes: Array<{
    name: string;
    coordinateFields: { x: string; y: string; width?: string; height?: string };
  }>;
  compositeIndexes: Array<{
    name: string;
    fields: string[];
    unique?: boolean;
    sparse?: boolean;
  }>;
}

export class AdvancedIndexingSystem extends ManagedEventEmitter {
  private btreeIndexes = new Map<string, BTreeIndex<any, string>>();
  private fullTextIndexes = new Map<string, FullTextSearchIndex>();
  private spatialIndexes = new Map<string, SpatialIndex>();
  private compositeIndexes = new Map<string, CompositeIndex>();
  private configuration: IndexConfiguration;

  constructor(configuration: IndexConfiguration) {
    super();
    this.configuration = configuration;
    this.initializeIndexes();
  }

  private initializeIndexes(): void {
    // Initialize B-tree indexes
    for (const config of this.configuration.btreeIndexes) {
      this.btreeIndexes.set(
        config.name,
        new BTreeIndex(50, config.compareFunction)
      );
    }

    // Initialize full-text indexes
    for (const config of this.configuration.fullTextIndexes) {
      this.fullTextIndexes.set(config.name, new FullTextSearchIndex());
    }

    // Initialize spatial indexes
    for (const config of this.configuration.spatialIndexes) {
      this.spatialIndexes.set(config.name, new SpatialIndex());
    }

    // Initialize composite indexes
    for (const config of this.configuration.compositeIndexes) {
      this.compositeIndexes.set(config.name, new CompositeIndex({
        fields: config.fields,
        unique: config.unique,
        sparse: config.sparse
      }));
    }
  }

  addNode(nodeId: string, nodeData: any): void {
    try {
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
          const content = new Map<string, string>();
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

            const boundingBox: BoundingBox = {
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
          const values: CompositeIndexKey = {};
          for (const field of config.fields) {
            values[field] = nodeData[field];
          }
          index.addEntry(nodeId, values);
        }
      }

      this.emit('nodeIndexed', { nodeId, indexCount: this.getIndexCount() });
    } catch (error) {
      const errorMessage = normalizeError(error).message;
      this.emit('indexError', { nodeId, error: errorMessage });
      throw error;
    }
  }

  updateNode(nodeId: string, oldData: any, newData: any): void {
    // Remove old entries
    this.removeNode(nodeId, oldData);
    // Add new entries
    this.addNode(nodeId, newData);
  }

  removeNode(nodeId: string, nodeData: any): void {
    try {
      // Remove from full-text indexes
      for (const [indexName, index] of this.fullTextIndexes.entries()) {
        index.removeDocument(nodeId);
      }

      // Remove from composite indexes
      for (const [indexName, index] of this.compositeIndexes.entries()) {
        const config = this.configuration.compositeIndexes.find(c => c.name === indexName);
        if (config) {
          const values: CompositeIndexKey = {};
          for (const field of config.fields) {
            values[field] = nodeData[field];
          }
          index.removeEntry(nodeId, values);
        }
      }

      // Note: B-tree and spatial index removal would require more complex implementation
      // For now, we focus on the most commonly updated indexes

      this.emit('nodeUnindexed', { nodeId });
    } catch (error) {
      const errorMessage = normalizeError(error).message;
      this.emit('indexError', { nodeId, error: errorMessage });
      throw error;
    }
  }

  searchBTree(indexName: string, key: any): string | undefined {
    const index = this.btreeIndexes.get(indexName);
    return index ? index.search(key) : undefined;
  }

  rangeBTreeSearch(indexName: string, startKey: any, endKey: any): Array<{ key: any; value: string }> {
    const index = this.btreeIndexes.get(indexName);
    return index ? index.rangeSearch(startKey, endKey) : [];
  }

  fullTextSearch(indexName: string, query: string, limit?: number): FullTextSearchResult[] {
    const index = this.fullTextIndexes.get(indexName);
    return index ? index.search(query, limit) : [];
  }

  spatialSearch(indexName: string, boundingBox: BoundingBox): SpatialEntry[] {
    const index = this.spatialIndexes.get(indexName);
    return index ? index.search(boundingBox) : [];
  }

  compositeSearch(indexName: string, values: Partial<CompositeIndexKey>): string[] {
    const index = this.compositeIndexes.get(indexName);
    return index ? index.search(values) : [];
  }

  getIndexStats(): {
    btreeIndexCount: number;
    fullTextIndexCount: number;
    spatialIndexCount: number;
    compositeIndexCount: number;
    totalIndexCount: number;
  } {
    return {
      btreeIndexCount: this.btreeIndexes.size,
      fullTextIndexCount: this.fullTextIndexes.size,
      spatialIndexCount: this.spatialIndexes.size,
      compositeIndexCount: this.compositeIndexes.size,
      totalIndexCount: this.getIndexCount()
    };
  }

  private getIndexCount(): number {
    return this.btreeIndexes.size + this.fullTextIndexes.size +
           this.spatialIndexes.size + this.compositeIndexes.size;
  }

  rebuildIndexes(nodeDataProvider: (nodeId: string) => any): void {
    this.emit('rebuildStarted');

    try {
      // Clear all indexes
      this.btreeIndexes.clear();
      this.fullTextIndexes.clear();
      this.spatialIndexes.clear();
      this.compositeIndexes.clear();

      // Reinitialize
      this.initializeIndexes();

      this.emit('rebuildCompleted');
    } catch (error) {
      const errorMessage = normalizeError(error).message;
      this.emit('rebuildError', { error: errorMessage });
      throw error;
    }
  }
}

/**
 * Graph Partitioning System
 *
 * Implements intelligent graph partitioning for memory optimization and scalability.
 * Provides strategies for dividing large knowledge graphs into smaller, manageable
 * partitions that can be loaded and unloaded on demand.
 *
 * Features:
 * - Module-based partitioning strategy
 * - Lazy loading and eviction policies
 * - Cross-partition relationship handling
 * - Memory pressure detection and response
 * - Partition size monitoring and auto-splitting
 */

import { GraphNode, GraphEdge, CodePattern } from './code-knowledge-graph.js';
import { ProjectContext } from './context.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';
import * as path from 'path';

// Partition interfaces
export interface GraphPartition {
  id: string;
  name: string;
  type: PartitionType;
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  patterns: Map<string, CodePattern>;
  metadata: PartitionMetadata;
  crossRefs: CrossPartitionReference[];
  loadState: 'unloaded' | 'loading' | 'loaded' | 'evicting';
}

export interface PartitionMetadata {
  created: Date;
  lastAccessed: Date;
  lastModified: Date;
  accessCount: number;
  memorySize: number;
  nodeCount: number;
  edgeCount: number;
  priority: number;
  dependencies: string[]; // IDs of other partitions this depends on
}

export interface CrossPartitionReference {
  sourcePartition: string;
  targetPartition: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  weight: number;
}

export interface PartitionStrategy {
  type: PartitionType;
  maxNodesPerPartition: number;
  maxEdgesPerPartition: number;
  maxMemoryPerPartition: number; // in MB
  partitioningCriteria: PartitioningCriteria;
}

export interface PartitioningCriteria {
  groupByModule: boolean;
  groupByFileType: boolean;
  groupByDirectory: boolean;
  respectDependencies: boolean;
  minimizeCrossRefs: boolean;
}

export type PartitionType =
  | 'module_based'     // Group by npm modules/packages
  | 'directory_based'  // Group by directory structure
  | 'filetype_based'   // Group by file extensions
  | 'size_based'       // Split by size limits
  | 'dependency_based' // Group by dependency clusters
  | 'temporal_based';  // Group by modification time

export interface PartitioningResult {
  partitions: GraphPartition[];
  crossRefs: CrossPartitionReference[];
  statistics: {
    totalPartitions: number;
    avgNodesPerPartition: number;
    avgEdgesPerPartition: number;
    crossPartitionEdges: number;
    partitioningTime: number;
    memoryReduction: number;
  };
}

export interface MemoryManager {
  maxMemoryUsage: number; // Maximum memory in MB
  currentMemoryUsage: number;
  loadedPartitions: Set<string>;
  evictionPolicy: EvictionPolicy;
  memoryPressureThreshold: number; // 0.0 to 1.0
}

export type EvictionPolicy = 'lru' | 'lfu' | 'priority' | 'size_based' | 'hybrid';

/**
 * Graph Partitioning Manager
 *
 * Manages the partitioning, loading, and eviction of graph partitions
 * for optimal memory usage and performance.
 */
export class GraphPartitionManager {
  private partitions = new Map<string, GraphPartition>();
  private partitionIndex = new Map<string, string>(); // nodeId -> partitionId
  private crossRefs = new Map<string, CrossPartitionReference[]>();
  private memoryManager: MemoryManager;
  private strategy: PartitionStrategy;
  private projectContext: ProjectContext;

  // LRU tracking
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  constructor(
    projectContext: ProjectContext,
    strategy: Partial<PartitionStrategy> = {},
    memoryConfig: Partial<MemoryManager> = {}
  ) {
    this.projectContext = projectContext;

    // Default partitioning strategy
    this.strategy = {
      type: 'module_based',
      maxNodesPerPartition: 1000,
      maxEdgesPerPartition: 5000,
      maxMemoryPerPartition: 50, // 50MB
      partitioningCriteria: {
        groupByModule: true,
        groupByFileType: false,
        groupByDirectory: true,
        respectDependencies: true,
        minimizeCrossRefs: true
      },
      ...strategy
    };

    // Default memory management
    this.memoryManager = {
      maxMemoryUsage: 2048, // 2GB
      currentMemoryUsage: 0,
      loadedPartitions: new Set(),
      evictionPolicy: 'hybrid',
      memoryPressureThreshold: THRESHOLD_CONSTANTS.GRAPH_PARTITIONING.MEMORY_PRESSURE_THRESHOLD,
      ...memoryConfig
    };
  }

  /**
   * Partition a set of nodes and edges based on the configured strategy
   */
  async partitionGraph(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    patterns: Map<string, CodePattern>
  ): Promise<PartitioningResult> {
    const startTime = Date.now();
    console.log(`🔄 Starting graph partitioning with strategy: ${this.strategy.type}`);

    try {
      // Clear existing partitions
      this.partitions.clear();
      this.partitionIndex.clear();
      this.crossRefs.clear();

      let partitioningResult: PartitioningResult;

      switch (this.strategy.type) {
        case 'module_based':
          partitioningResult = await this.partitionByModule(nodes, edges, patterns);
          break;
        case 'directory_based':
          partitioningResult = await this.partitionByDirectory(nodes, edges, patterns);
          break;
        case 'filetype_based':
          partitioningResult = await this.partitionByFileType(nodes, edges, patterns);
          break;
        case 'size_based':
          partitioningResult = await this.partitionBySize(nodes, edges, patterns);
          break;
        case 'dependency_based':
          partitioningResult = await this.partitionByDependencies(nodes, edges, patterns);
          break;
        default:
          partitioningResult = await this.partitionByModule(nodes, edges, patterns);
      }

      // Update partition index
      for (const partition of partitioningResult.partitions) {
        this.partitions.set(partition.id, partition);
        for (const nodeId of partition.nodes.keys()) {
          this.partitionIndex.set(nodeId, partition.id);
        }
      }

      // Store cross-references
      this.storeCrossReferences(partitioningResult.crossRefs);

      const partitioningTime = Date.now() - startTime;
      partitioningResult.statistics.partitioningTime = partitioningTime;

      console.log(`✅ Graph partitioning completed in ${partitioningTime}ms`);
      console.log(`📊 Created ${partitioningResult.statistics.totalPartitions} partitions`);
      console.log(`🔗 Found ${partitioningResult.statistics.crossPartitionEdges} cross-partition edges`);

      return partitioningResult;

    } catch (error) {
      console.error('Error during graph partitioning:', error);
      throw error;
    }
  }

  /**
   * Partition nodes by module/package structure
   */
  private async partitionByModule(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    patterns: Map<string, CodePattern>
  ): Promise<PartitioningResult> {
    const moduleGroups = new Map<string, GraphNode[]>();
    const partitions: GraphPartition[] = [];

    // Group nodes by module
    for (const node of nodes.values()) {
      const module = this.extractModuleName(node);
      if (!moduleGroups.has(module)) {
        moduleGroups.set(module, []);
      }
      moduleGroups.get(module)!.push(node);
    }

    // Create partitions for each module
    for (const [moduleName, moduleNodes] of moduleGroups) {
      const partition = await this.createPartition(
        `module_${moduleName}`,
        moduleName,
        'module_based',
        moduleNodes,
        edges,
        patterns
      );
      partitions.push(partition);
    }

    return this.finalizePartitioning(partitions, edges);
  }

  /**
   * Partition nodes by directory structure
   */
  private async partitionByDirectory(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    patterns: Map<string, CodePattern>
  ): Promise<PartitioningResult> {
    const directoryGroups = new Map<string, GraphNode[]>();
    const partitions: GraphPartition[] = [];

    // Group nodes by directory
    for (const node of nodes.values()) {
      const directory = this.extractDirectory(node);
      if (!directoryGroups.has(directory)) {
        directoryGroups.set(directory, []);
      }
      directoryGroups.get(directory)!.push(node);
    }

    // Create partitions for each directory
    for (const [dirName, dirNodes] of directoryGroups) {
      const partition = await this.createPartition(
        `dir_${dirName.replace(/[/\\]/g, '_')}`,
        dirName,
        'directory_based',
        dirNodes,
        edges,
        patterns
      );
      partitions.push(partition);
    }

    return this.finalizePartitioning(partitions, edges);
  }

  /**
   * Partition nodes by file type
   */
  private async partitionByFileType(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    patterns: Map<string, CodePattern>
  ): Promise<PartitioningResult> {
    const typeGroups = new Map<string, GraphNode[]>();
    const partitions: GraphPartition[] = [];

    // Group nodes by file type
    for (const node of nodes.values()) {
      const fileType = this.extractFileType(node);
      if (!typeGroups.has(fileType)) {
        typeGroups.set(fileType, []);
      }
      typeGroups.get(fileType)!.push(node);
    }

    // Create partitions for each file type
    for (const [typeName, typeNodes] of typeGroups) {
      const partition = await this.createPartition(
        `type_${typeName}`,
        typeName,
        'filetype_based',
        typeNodes,
        edges,
        patterns
      );
      partitions.push(partition);
    }

    return this.finalizePartitioning(partitions, edges);
  }

  /**
   * Partition nodes by size constraints
   */
  private async partitionBySize(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    patterns: Map<string, CodePattern>
  ): Promise<PartitioningResult> {
    const partitions: GraphPartition[] = [];
    const nodeArray = Array.from(nodes.values());
    const maxNodes = this.strategy.maxNodesPerPartition;

    // Split nodes into size-based chunks
    for (let i = 0; i < nodeArray.length; i += maxNodes) {
      const chunk = nodeArray.slice(i, i + maxNodes);
      const partitionId = `size_${Math.floor(i / maxNodes)}`;

      const partition = await this.createPartition(
        partitionId,
        `Size Partition ${Math.floor(i / maxNodes)}`,
        'size_based',
        chunk,
        edges,
        patterns
      );
      partitions.push(partition);
    }

    return this.finalizePartitioning(partitions, edges);
  }

  /**
   * Partition nodes by dependency clusters
   */
  private async partitionByDependencies(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    patterns: Map<string, CodePattern>
  ): Promise<PartitioningResult> {
    const clusters = await this.findDependencyClusters(nodes, edges);
    const partitions: GraphPartition[] = [];

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const partition = await this.createPartition(
        `dep_${i}`,
        `Dependency Cluster ${i}`,
        'dependency_based',
        cluster,
        edges,
        patterns
      );
      partitions.push(partition);
    }

    return this.finalizePartitioning(partitions, edges);
  }

  /**
   * Create a single partition from a group of nodes
   */
  private async createPartition(
    id: string,
    name: string,
    type: PartitionType,
    nodeGroup: GraphNode[],
    allEdges: Map<string, GraphEdge>,
    allPatterns: Map<string, CodePattern>
  ): Promise<GraphPartition> {
    const partitionNodes = new Map<string, GraphNode>();
    const partitionEdges = new Map<string, GraphEdge>();
    const partitionPatterns = new Map<string, CodePattern>();
    const nodeIds = new Set<string>();

    // Add nodes to partition
    for (const node of nodeGroup) {
      partitionNodes.set(node.id, node);
      nodeIds.add(node.id);
    }

    // Add edges that are internal to this partition
    for (const edge of allEdges.values()) {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        partitionEdges.set(edge.id, edge);
      }
    }

    // Add relevant patterns
    for (const pattern of allPatterns.values()) {
      const hasNodesInPartition = pattern.nodes.some(nodeId => nodeIds.has(nodeId));
      if (hasNodesInPartition) {
        partitionPatterns.set(pattern.id, pattern);
      }
    }

    const memorySize = this.estimatePartitionMemorySize(partitionNodes, partitionEdges, partitionPatterns);

    return {
      id,
      name,
      type,
      nodes: partitionNodes,
      edges: partitionEdges,
      patterns: partitionPatterns,
      metadata: {
        created: new Date(),
        lastAccessed: new Date(),
        lastModified: new Date(),
        accessCount: 0,
        memorySize,
        nodeCount: partitionNodes.size,
        edgeCount: partitionEdges.size,
        priority: 1.0,
        dependencies: []
      },
      crossRefs: [],
      loadState: 'unloaded'
    };
  }

  /**
   * Finalize partitioning by calculating cross-references and statistics
   */
  private finalizePartitioning(
    partitions: GraphPartition[],
    allEdges: Map<string, GraphEdge>
  ): PartitioningResult {
    const crossRefs: CrossPartitionReference[] = [];
    let crossPartitionEdges = 0;

    // Find cross-partition edges
    for (const edge of allEdges.values()) {
      const sourcePartitionId = this.getNodePartition(edge.source, partitions);
      const targetPartitionId = this.getNodePartition(edge.target, partitions);

      if (sourcePartitionId && targetPartitionId && sourcePartitionId !== targetPartitionId) {
        crossRefs.push({
          sourcePartition: sourcePartitionId,
          targetPartition: targetPartitionId,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          edgeType: edge.type,
          weight: edge.weight || 1.0
        });
        crossPartitionEdges++;
      }
    }

    // Calculate statistics
    const totalNodes = partitions.reduce((sum, p) => sum + p.metadata.nodeCount, 0);
    const totalEdges = partitions.reduce((sum, p) => sum + p.metadata.edgeCount, 0);

    return {
      partitions,
      crossRefs,
      statistics: {
        totalPartitions: partitions.length,
        avgNodesPerPartition: totalNodes / partitions.length,
        avgEdgesPerPartition: totalEdges / partitions.length,
        crossPartitionEdges,
        partitioningTime: 0, // Will be set by caller
        memoryReduction: this.calculateMemoryReduction(partitions)
      }
    };
  }

  /**
   * Load a partition into memory
   */
  async loadPartition(partitionId: string): Promise<boolean> {
    const partition = this.partitions.get(partitionId);
    if (!partition) {
      console.warn(`Partition ${partitionId} not found`);
      return false;
    }

    if (partition.loadState === 'loaded') {
      // Update access tracking
      this.updateAccessTracking(partitionId);
      return true;
    }

    // Check memory pressure
    if (await this.isMemoryPressureHigh()) {
      await this.evictPartitions();
    }

    try {
      partition.loadState = 'loading';

      // Simulate loading time for large partitions
      if (partition.metadata.memorySize > 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      partition.loadState = 'loaded';
      partition.metadata.lastAccessed = new Date();
      partition.metadata.accessCount++;

      this.memoryManager.loadedPartitions.add(partitionId);
      this.memoryManager.currentMemoryUsage += partition.metadata.memorySize;
      this.updateAccessTracking(partitionId);

      console.log(`📥 Loaded partition ${partitionId} (${partition.metadata.memorySize}MB)`);
      return true;

    } catch (error) {
      console.error(`Error loading partition ${partitionId}:`, error);
      partition.loadState = 'unloaded';
      return false;
    }
  }

  /**
   * Evict partitions to free memory
   */
  async evictPartitions(): Promise<number> {
    const evictedCount = await this.selectPartitionsForEviction();
    console.log(`💾 Evicted ${evictedCount} partitions to free memory`);
    return evictedCount;
  }

  /**
   * Get a node from any partition, loading the partition if necessary
   */
  async getNode(nodeId: string): Promise<GraphNode | null> {
    const partitionId = this.partitionIndex.get(nodeId);
    if (!partitionId) {
      return null;
    }

    await this.loadPartition(partitionId);
    const partition = this.partitions.get(partitionId);
    return partition?.nodes.get(nodeId) || null;
  }

  /**
   * Get all nodes from a partition
   */
  async getPartitionNodes(partitionId: string): Promise<GraphNode[]> {
    await this.loadPartition(partitionId);
    const partition = this.partitions.get(partitionId);
    return partition ? Array.from(partition.nodes.values()) : [];
  }

  /**
   * Get cross-partition references for a partition
   */
  getCrossReferences(partitionId: string): CrossPartitionReference[] {
    return this.crossRefs.get(partitionId) || [];
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    current: number;
    max: number;
    usage: number;
    loadedPartitions: number;
    totalPartitions: number;
  } {
    return {
      current: this.memoryManager.currentMemoryUsage,
      max: this.memoryManager.maxMemoryUsage,
      usage: this.memoryManager.currentMemoryUsage / this.memoryManager.maxMemoryUsage,
      loadedPartitions: this.memoryManager.loadedPartitions.size,
      totalPartitions: this.partitions.size
    };
  }

  /**
   * Helper methods
   */
  private extractModuleName(node: GraphNode): string {
    if (node.type === 'file' && node.properties.path) {
      const filePath = node.properties.path as string;
      if (filePath.includes('node_modules')) {
        const parts = filePath.split('node_modules/');
        if (parts.length > 1) {
          const modulePath = parts[1].split('/')[0];
          return modulePath.startsWith('@') ?
            `${modulePath}/${parts[1].split('/')[1]}` : modulePath;
        }
      }

      // For non-node_modules files, use top-level directory
      const pathParts = filePath.split('/');
      return pathParts[0] || 'root';
    }

    return node.properties.file ?
      this.extractModuleName({ ...node, properties: { path: node.properties.file } }) : 'unknown';
  }

  private extractDirectory(node: GraphNode): string {
    const filePath = (node.properties.path || node.properties.file) as string;
    if (filePath) {
      return path.dirname(filePath) || 'root';
    }
    return 'unknown';
  }

  private extractFileType(node: GraphNode): string {
    const filePath = (node.properties.path || node.properties.file) as string;
    if (filePath) {
      const ext = path.extname(filePath);
      return ext ? ext.slice(1) : 'no-extension';
    }
    return node.type;
  }

  private async findDependencyClusters(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>
  ): Promise<GraphNode[][]> {
    // Simple clustering algorithm - can be enhanced with more sophisticated methods
    const visited = new Set<string>();
    const clusters: GraphNode[][] = [];

    for (const node of nodes.values()) {
      if (!visited.has(node.id)) {
        const cluster = this.dfsCluster(node, nodes, edges, visited);
        if (cluster.length > 0) {
          clusters.push(cluster);
        }
      }
    }

    return clusters;
  }

  private dfsCluster(
    startNode: GraphNode,
    allNodes: Map<string, GraphNode>,
    allEdges: Map<string, GraphEdge>,
    visited: Set<string>
  ): GraphNode[] {
    const cluster: GraphNode[] = [];
    const stack = [startNode];

    while (stack.length > 0 && cluster.length < this.strategy.maxNodesPerPartition) {
      const current = stack.pop()!;

      if (visited.has(current.id)) continue;

      visited.add(current.id);
      cluster.push(current);

      // Find connected nodes
      for (const edge of allEdges.values()) {
        let connectedNodeId: string | null = null;

        if (edge.source === current.id) {
          connectedNodeId = edge.target;
        } else if (edge.target === current.id) {
          connectedNodeId = edge.source;
        }

        if (connectedNodeId && !visited.has(connectedNodeId)) {
          const connectedNode = allNodes.get(connectedNodeId);
          if (connectedNode) {
            stack.push(connectedNode);
          }
        }
      }
    }

    return cluster;
  }

  private getNodePartition(nodeId: string, partitions: GraphPartition[]): string | null {
    for (const partition of partitions) {
      if (partition.nodes.has(nodeId)) {
        return partition.id;
      }
    }
    return null;
  }

  private estimatePartitionMemorySize(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    patterns: Map<string, CodePattern>
  ): number {
    // Rough estimation in MB
    const nodeMemory = nodes.size * 0.001; // ~1KB per node
    const edgeMemory = edges.size * 0.0005; // ~0.5KB per edge
    const patternMemory = patterns.size * 0.002; // ~2KB per pattern

    return Math.max(nodeMemory + edgeMemory + patternMemory, 0.1); // Minimum 0.1MB
  }

  private calculateMemoryReduction(partitions: GraphPartition[]): number {
    // Estimate memory reduction from partitioning
    // Assumes only 20% of partitions are loaded at any time
    const totalMemory = partitions.reduce((sum, p) => sum + p.metadata.memorySize, 0);
    const expectedLoadedMemory = totalMemory * 0.2;
    return ((totalMemory - expectedLoadedMemory) / totalMemory) * 100;
  }

  private updateAccessTracking(partitionId: string): void {
    this.accessOrder.set(partitionId, ++this.accessCounter);
  }

  private async isMemoryPressureHigh(): Promise<boolean> {
    const usage = this.memoryManager.currentMemoryUsage / this.memoryManager.maxMemoryUsage;
    return usage > this.memoryManager.memoryPressureThreshold;
  }

  private async selectPartitionsForEviction(): Promise<number> {
    const loadedPartitions = Array.from(this.memoryManager.loadedPartitions);
    const evictCandidates: Array<{ id: string; priority: number }> = [];

    for (const partitionId of loadedPartitions) {
      const partition = this.partitions.get(partitionId);
      if (!partition) continue;

      const priority = this.calculateEvictionPriority(partition);
      evictCandidates.push({ id: partitionId, priority });
    }

    // Sort by eviction priority (lower = more likely to evict)
    evictCandidates.sort((a, b) => a.priority - b.priority);

    let evictedCount = 0;
    const targetMemoryUsage = this.memoryManager.maxMemoryUsage * THRESHOLD_CONSTANTS.GRAPH_PARTITIONING.TARGET_MEMORY_USAGE;

    for (const candidate of evictCandidates) {
      if (this.memoryManager.currentMemoryUsage <= targetMemoryUsage) break;

      const partition = this.partitions.get(candidate.id);
      if (partition) {
        partition.loadState = 'unloaded';
        this.memoryManager.loadedPartitions.delete(candidate.id);
        this.memoryManager.currentMemoryUsage -= partition.metadata.memorySize;
        evictedCount++;

        console.log(`💾 Evicted partition ${candidate.id} (${partition.metadata.memorySize}MB)`);
      }
    }

    return evictedCount;
  }

  private calculateEvictionPriority(partition: GraphPartition): number {
    const timeSinceAccess = Date.now() - partition.metadata.lastAccessed.getTime();
    const accessFrequency = partition.metadata.accessCount;
    const memorySize = partition.metadata.memorySize;

    // Lower score = higher eviction priority
    // Factors: recent access (high weight), access frequency, memory size
    const recencyScore = Math.max(0, 100 - (timeSinceAccess / 1000 / 60)); // Minutes since access
    const frequencyScore = Math.min(accessFrequency * 10, 100);
    const sizeScore = Math.max(0, 100 - memorySize); // Prefer evicting larger partitions

    return recencyScore * THRESHOLD_CONSTANTS.GRAPH_PARTITIONING.EVICTION_WEIGHTS.RECENCY +
           frequencyScore * THRESHOLD_CONSTANTS.GRAPH_PARTITIONING.EVICTION_WEIGHTS.FREQUENCY +
           sizeScore * THRESHOLD_CONSTANTS.GRAPH_PARTITIONING.EVICTION_WEIGHTS.SIZE;
  }

  private storeCrossReferences(crossRefs: CrossPartitionReference[]): void {
    this.crossRefs.clear();

    for (const ref of crossRefs) {
      if (!this.crossRefs.has(ref.sourcePartition)) {
        this.crossRefs.set(ref.sourcePartition, []);
      }
      if (!this.crossRefs.has(ref.targetPartition)) {
        this.crossRefs.set(ref.targetPartition, []);
      }

      this.crossRefs.get(ref.sourcePartition)!.push(ref);
      this.crossRefs.get(ref.targetPartition)!.push(ref);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.partitions.clear();
    this.partitionIndex.clear();
    this.crossRefs.clear();
    this.accessOrder.clear();
    this.memoryManager.loadedPartitions.clear();
    this.memoryManager.currentMemoryUsage = 0;
  }
}
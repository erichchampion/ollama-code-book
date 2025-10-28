/**
 * Knowledge Graph - Relationship Traversal Tests
 * Tests graph traversal capabilities for relationships
 *
 * Tests relationship traversal for:
 * - Function call chain traversal
 * - Dependency graph traversal
 * - Data flow analysis
 * - Control flow analysis
 */

import * as assert from 'assert';
import * as path from 'path';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS, TRAVERSAL_CONSTANTS } from '../helpers/test-constants';
import {
  NodeType,
  RelationType,
  GraphNode,
  GraphRelationship,
  TraversalResult,
  DataFlowPath,
  ControlFlowPath,
} from '../helpers/graph-types';

/**
 * Knowledge Graph for traversal testing
 */
class KnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private relationships: Map<string, GraphRelationship> = new Map();
  private outgoing: Map<string, Set<string>> = new Map();
  private incoming: Map<string, Set<string>> = new Map();

  /**
   * Add node to graph
   */
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.outgoing.has(node.id)) {
      this.outgoing.set(node.id, new Set());
    }
    if (!this.incoming.has(node.id)) {
      this.incoming.set(node.id, new Set());
    }
  }

  /**
   * Add relationship to graph
   */
  addRelationship(relationship: GraphRelationship): void {
    this.relationships.set(relationship.id, relationship);

    // Update adjacency lists
    if (!this.outgoing.has(relationship.sourceId)) {
      this.outgoing.set(relationship.sourceId, new Set());
    }
    this.outgoing.get(relationship.sourceId)!.add(relationship.id);

    if (!this.incoming.has(relationship.targetId)) {
      this.incoming.set(relationship.targetId, new Set());
    }
    this.incoming.get(relationship.targetId)!.add(relationship.id);
  }

  /**
   * Generic graph traversal with relationship filter
   */
  private genericTraverse(
    startNodeId: string,
    maxDepth: number,
    relationshipFilter: (rel: GraphRelationship) => boolean
  ): TraversalResult[] {
    const results: TraversalResult[] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string, path: GraphNode[], relationships: GraphRelationship[], depth: number) => {
      if (depth > maxDepth || visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (!node) return;

      const currentPath = [...path, node];

      // Get outgoing relationships that match the filter
      const outgoingRels = this.outgoing.get(nodeId) || new Set();
      const filteredRels = Array.from(outgoingRels)
        .map(relId => this.relationships.get(relId)!)
        .filter(relationshipFilter);

      if (filteredRels.length === 0) {
        // Leaf node - add path to results
        results.push({
          path: currentPath,
          depth,
          relationships: [...relationships],
        });
        return;
      }

      // Continue traversal
      for (const rel of filteredRels) {
        dfs(rel.targetId, currentPath, [...relationships, rel], depth + 1);
      }
    };

    dfs(startNodeId, [], [], 0);
    return results;
  }

  /**
   * Traverse function call chain from a starting node
   */
  traverseCallChain(startNodeId: string, maxDepth: number = TRAVERSAL_CONSTANTS.MAX_DEPTH): TraversalResult[] {
    return this.genericTraverse(
      startNodeId,
      maxDepth,
      rel => rel.type === RelationType.CALLS
    );
  }

  /**
   * Traverse dependency graph
   */
  traverseDependencies(startNodeId: string, maxDepth: number = TRAVERSAL_CONSTANTS.MAX_DEPTH): TraversalResult[] {
    return this.genericTraverse(
      startNodeId,
      maxDepth,
      rel => rel.type === RelationType.DEPENDS_ON || rel.type === RelationType.IMPORTS
    );
  }

  /**
   * Analyze data flow
   */
  analyzeDataFlow(variableId: string): DataFlowPath[] {
    const paths: DataFlowPath[] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string, path: GraphNode[], operations: string[]) => {
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (!node) return;

      const currentPath = [...path, node];

      // Get READ and WRITE relationships
      const outgoingRels = this.outgoing.get(nodeId) || new Set();
      const dataRels = Array.from(outgoingRels)
        .map(relId => this.relationships.get(relId)!)
        .filter(rel => rel.type === RelationType.READS || rel.type === RelationType.WRITES);

      if (dataRels.length === 0) {
        // End of flow
        paths.push({
          variable: variableId,
          path: currentPath,
          operations: [...operations],
        });
        return;
      }

      // Continue traversal
      for (const rel of dataRels) {
        const operation = rel.type === RelationType.READS ? 'read' : 'write';
        dfs(rel.targetId, currentPath, [...operations, operation]);
      }
    };

    dfs(variableId, [], []);
    return paths;
  }

  /**
   * Analyze control flow
   */
  analyzeControlFlow(nodeId: string): ControlFlowPath[] {
    const paths: ControlFlowPath[] = [];
    const node = this.nodes.get(nodeId);

    if (!node || !node.metadata?.condition) {
      return paths;
    }

    const condition = node.metadata.condition;

    // Find true and false branches
    const outgoingRels = this.outgoing.get(nodeId) || new Set();
    const branchRels = Array.from(outgoingRels)
      .map(relId => this.relationships.get(relId)!)
      .filter(rel => rel.metadata?.branch);

    const trueBranch = branchRels.find(rel => rel.metadata?.branch === 'true');
    const falseBranch = branchRels.find(rel => rel.metadata?.branch === 'false');

    const truePath: GraphNode[] = [];
    const falsePath: GraphNode[] = [];

    // Traverse true branch
    if (trueBranch) {
      let current = this.nodes.get(trueBranch.targetId);
      while (current) {
        truePath.push(current);
        const nextRels = this.outgoing.get(current.id) || new Set();
        const nextRel = Array.from(nextRels)[0];
        if (!nextRel) break;
        const rel = this.relationships.get(nextRel);
        if (!rel) break;
        current = this.nodes.get(rel.targetId);
      }
    }

    // Traverse false branch
    if (falseBranch) {
      let current = this.nodes.get(falseBranch.targetId);
      while (current) {
        falsePath.push(current);
        const nextRels = this.outgoing.get(current.id) || new Set();
        const nextRel = Array.from(nextRels)[0];
        if (!nextRel) break;
        const rel = this.relationships.get(nextRel);
        if (!rel) break;
        current = this.nodes.get(rel.targetId);
      }
    }

    paths.push({
      condition,
      truePath,
      falsePath,
    });

    return paths;
  }

  /**
   * Find all paths between two nodes
   */
  findAllPaths(
    startId: string,
    endId: string,
    maxDepth: number = TRAVERSAL_CONSTANTS.MAX_DEPTH
  ): TraversalResult[] {
    const paths: TraversalResult[] = [];

    const dfs = (
      currentId: string,
      path: GraphNode[],
      relationships: GraphRelationship[],
      visited: Set<string>,
      depth: number
    ) => {
      if (depth > maxDepth) {
        return;
      }

      const node = this.nodes.get(currentId);
      if (!node) return;

      const currentPath = [...path, node];
      const currentVisited = new Set(visited);
      currentVisited.add(currentId);

      // Found target
      if (currentId === endId) {
        paths.push({
          path: currentPath,
          depth,
          relationships: [...relationships],
        });
        return;
      }

      // Continue traversal
      const outgoingRels = this.outgoing.get(currentId) || new Set();
      for (const relId of outgoingRels) {
        const rel = this.relationships.get(relId);
        if (!rel || currentVisited.has(rel.targetId)) continue;

        dfs(rel.targetId, currentPath, [...relationships, rel], currentVisited, depth + 1);
      }
    };

    dfs(startId, [], [], new Set(), 0);
    return paths;
  }

  /**
   * Get node by ID
   */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
    this.relationships.clear();
    this.outgoing.clear();
    this.incoming.clear();
  }
}

/**
 * Helper: Create call chain graph
 */
function createCallChainGraph(testWorkspacePath: string, graph: KnowledgeGraph): void {
  // main -> processUser -> validateUser -> checkAuth
  const nodes = [
    {
      id: 'main',
      type: NodeType.FUNCTION,
      name: 'main',
      filePath: path.join(testWorkspacePath, 'main.ts'),
      lineNumber: 1,
    },
    {
      id: 'processUser',
      type: NodeType.FUNCTION,
      name: 'processUser',
      filePath: path.join(testWorkspacePath, 'user.ts'),
      lineNumber: 10,
    },
    {
      id: 'validateUser',
      type: NodeType.FUNCTION,
      name: 'validateUser',
      filePath: path.join(testWorkspacePath, 'validation.ts'),
      lineNumber: 5,
    },
    {
      id: 'checkAuth',
      type: NodeType.FUNCTION,
      name: 'checkAuth',
      filePath: path.join(testWorkspacePath, 'auth.ts'),
      lineNumber: 15,
    },
  ];

  nodes.forEach(node => graph.addNode(node));

  graph.addRelationship({
    id: 'main-processUser',
    type: RelationType.CALLS,
    sourceId: 'main',
    targetId: 'processUser',
  });

  graph.addRelationship({
    id: 'processUser-validateUser',
    type: RelationType.CALLS,
    sourceId: 'processUser',
    targetId: 'validateUser',
  });

  graph.addRelationship({
    id: 'validateUser-checkAuth',
    type: RelationType.CALLS,
    sourceId: 'validateUser',
    targetId: 'checkAuth',
  });
}

/**
 * Helper: Create dependency graph
 */
function createDependencyGraph(testWorkspacePath: string, graph: KnowledgeGraph): void {
  // app -> db -> config
  const nodes = [
    {
      id: 'app',
      type: NodeType.MODULE,
      name: 'app',
      filePath: path.join(testWorkspacePath, 'app.ts'),
      lineNumber: 1,
    },
    {
      id: 'db',
      type: NodeType.MODULE,
      name: 'database',
      filePath: path.join(testWorkspacePath, 'db.ts'),
      lineNumber: 1,
    },
    {
      id: 'config',
      type: NodeType.MODULE,
      name: 'config',
      filePath: path.join(testWorkspacePath, 'config.ts'),
      lineNumber: 1,
    },
  ];

  nodes.forEach(node => graph.addNode(node));

  graph.addRelationship({
    id: 'app-db',
    type: RelationType.DEPENDS_ON,
    sourceId: 'app',
    targetId: 'db',
  });

  graph.addRelationship({
    id: 'db-config',
    type: RelationType.DEPENDS_ON,
    sourceId: 'db',
    targetId: 'config',
  });
}

/**
 * Helper: Create data flow graph
 */
function createDataFlowGraph(testWorkspacePath: string, graph: KnowledgeGraph): void {
  const nodes = [
    {
      id: 'userId',
      type: NodeType.VARIABLE,
      name: 'userId',
      filePath: path.join(testWorkspacePath, 'user.ts'),
      lineNumber: 5,
    },
    {
      id: 'getUser',
      type: NodeType.FUNCTION,
      name: 'getUser',
      filePath: path.join(testWorkspacePath, 'user.ts'),
      lineNumber: 10,
    },
    {
      id: 'updateUser',
      type: NodeType.FUNCTION,
      name: 'updateUser',
      filePath: path.join(testWorkspacePath, 'user.ts'),
      lineNumber: 20,
    },
  ];

  nodes.forEach(node => graph.addNode(node));

  graph.addRelationship({
    id: 'userId-getUser',
    type: RelationType.READS,
    sourceId: 'userId',
    targetId: 'getUser',
  });

  graph.addRelationship({
    id: 'getUser-updateUser',
    type: RelationType.WRITES,
    sourceId: 'getUser',
    targetId: 'updateUser',
  });
}

/**
 * Helper: Create control flow graph
 */
function createControlFlowGraph(testWorkspacePath: string, graph: KnowledgeGraph): void {
  const nodes = [
    {
      id: 'if-auth',
      type: NodeType.FUNCTION,
      name: 'checkAuthentication',
      filePath: path.join(testWorkspacePath, 'auth.ts'),
      lineNumber: 10,
      metadata: { condition: 'isAuthenticated' },
    },
    {
      id: 'allow',
      type: NodeType.FUNCTION,
      name: 'allowAccess',
      filePath: path.join(testWorkspacePath, 'auth.ts'),
      lineNumber: 15,
    },
    {
      id: 'deny',
      type: NodeType.FUNCTION,
      name: 'denyAccess',
      filePath: path.join(testWorkspacePath, 'auth.ts'),
      lineNumber: 20,
    },
  ];

  nodes.forEach(node => graph.addNode(node));

  graph.addRelationship({
    id: 'if-allow',
    type: RelationType.CALLS,
    sourceId: 'if-auth',
    targetId: 'allow',
    metadata: { branch: 'true' },
  });

  graph.addRelationship({
    id: 'if-deny',
    type: RelationType.CALLS,
    sourceId: 'if-auth',
    targetId: 'deny',
    metadata: { branch: 'false' },
  });
}

suite('Knowledge Graph - Relationship Traversal Tests', () => {
  let testWorkspacePath: string;
  let graph: KnowledgeGraph;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('knowledge-graph-traversal-tests');
    graph = new KnowledgeGraph();
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    graph.clear();
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Relationship Traversal', () => {
    test('Should traverse function call chain', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      createCallChainGraph(testWorkspacePath, graph);

      const results = graph.traverseCallChain('main');

      // Assertions
      assert.ok(results.length > 0, 'Should find call chain paths');
      assert.ok(
        results.some(r => r.path.length === 4),
        'Should find complete call chain (main -> processUser -> validateUser -> checkAuth)'
      );

      const longestPath = results.reduce((max, r) => (r.path.length > max.path.length ? r : max));
      assert.strictEqual(longestPath.path[0].name, 'main', 'Path should start at main');
      assert.strictEqual(longestPath.path[longestPath.path.length - 1].name, 'checkAuth', 'Path should end at checkAuth');

      console.log(`✓ Traversed call chain: ${longestPath.path.map(n => n.name).join(' → ')}`);
    });

    test('Should traverse dependency graph', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      createDependencyGraph(testWorkspacePath, graph);

      const results = graph.traverseDependencies('app');

      // Assertions
      assert.ok(results.length > 0, 'Should find dependency paths');
      assert.ok(
        results.some(r => r.path.some(n => n.name === 'config')),
        'Should find transitive dependency (app -> db -> config)'
      );

      const longestPath = results.reduce((max, r) => (r.path.length > max.path.length ? r : max));

      console.log(`✓ Traversed dependencies: ${longestPath.path.map(n => n.name).join(' → ')}`);
    });

    test('Should analyze data flow', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      createDataFlowGraph(testWorkspacePath, graph);

      const flows = graph.analyzeDataFlow('userId');

      // Assertions
      assert.ok(flows.length > 0, 'Should find data flow paths');
      assert.ok(
        flows.some(f => f.operations.includes('read')),
        'Should track read operations'
      );
      assert.ok(
        flows.some(f => f.operations.includes('write')),
        'Should track write operations'
      );

      console.log(`✓ Data flow analyzed: ${flows.length} path(s) found`);
      flows.forEach((f, i) => {
        console.log(`  Path ${i + 1}: ${f.path.map(n => n.name).join(' → ')} [${f.operations.join(', ')}]`);
      });
    });

    test('Should analyze control flow', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      createControlFlowGraph(testWorkspacePath, graph);

      const flows = graph.analyzeControlFlow('if-auth');

      // Assertions
      assert.ok(flows.length > 0, 'Should find control flow paths');
      assert.ok(flows[0].truePath.length > 0, 'Should have true branch');
      assert.ok(flows[0].falsePath.length > 0, 'Should have false branch');
      assert.strictEqual(flows[0].truePath[0].name, 'allowAccess', 'True branch should go to allowAccess');
      assert.strictEqual(flows[0].falsePath[0].name, 'denyAccess', 'False branch should go to denyAccess');

      console.log(`✓ Control flow analyzed:`);
      console.log(`  Condition: ${flows[0].condition}`);
      console.log(`  True path: ${flows[0].truePath.map(n => n.name).join(' → ')}`);
      console.log(`  False path: ${flows[0].falsePath.map(n => n.name).join(' → ')}`);
    });

    test('Should find all paths between two nodes', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      createCallChainGraph(testWorkspacePath, graph);

      const paths = graph.findAllPaths('main', 'checkAuth');

      // Assertions
      assert.ok(paths.length > 0, 'Should find paths between nodes');
      assert.ok(
        paths.every(p => p.path[0].id === 'main' && p.path[p.path.length - 1].id === 'checkAuth'),
        'All paths should start at main and end at checkAuth'
      );

      console.log(`✓ Found ${paths.length} path(s) from main to checkAuth`);
    });

    test('Should respect maximum depth limit', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      createCallChainGraph(testWorkspacePath, graph);

      const maxDepth = 2;
      const results = graph.traverseCallChain('main', maxDepth);

      // Assertions
      assert.ok(
        results.every(r => r.depth <= maxDepth),
        `All results should respect max depth of ${maxDepth}`
      );

      console.log(`✓ Depth limit respected: max depth ${maxDepth}`);
    });

    test('Should handle cyclic dependencies', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create cyclic dependency: A -> B -> C -> A
      const nodes = [
        { id: 'A', type: NodeType.MODULE, name: 'A', filePath: path.join(testWorkspacePath, 'a.ts'), lineNumber: 1 },
        { id: 'B', type: NodeType.MODULE, name: 'B', filePath: path.join(testWorkspacePath, 'b.ts'), lineNumber: 1 },
        { id: 'C', type: NodeType.MODULE, name: 'C', filePath: path.join(testWorkspacePath, 'c.ts'), lineNumber: 1 },
      ];

      nodes.forEach(node => graph.addNode(node));

      graph.addRelationship({ id: 'A-B', type: RelationType.DEPENDS_ON, sourceId: 'A', targetId: 'B' });
      graph.addRelationship({ id: 'B-C', type: RelationType.DEPENDS_ON, sourceId: 'B', targetId: 'C' });
      graph.addRelationship({ id: 'C-A', type: RelationType.DEPENDS_ON, sourceId: 'C', targetId: 'A' });

      const results = graph.traverseDependencies('A', 5);

      // Assertions
      assert.ok(results.length > 0, 'Should handle cyclic dependencies');
      assert.ok(
        results.every(r => r.depth <= 5),
        'Should not get stuck in infinite loop'
      );

      console.log('✓ Cyclic dependency handled correctly');
    });

    test('Should return empty paths for disconnected nodes', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create two disconnected subgraphs
      graph.addNode({
        id: 'isolated',
        type: NodeType.FUNCTION,
        name: 'isolated',
        filePath: path.join(testWorkspacePath, 'isolated.ts'),
        lineNumber: 1,
      });

      createCallChainGraph(testWorkspacePath, graph);

      const paths = graph.findAllPaths('main', 'isolated');

      // Assertions
      assert.strictEqual(paths.length, 0, 'Should return no paths for disconnected nodes');

      console.log('✓ Disconnected nodes handled correctly');
    });

    test('Should traverse multiple relationship types', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const nodes = [
        { id: 'module', type: NodeType.MODULE, name: 'module', filePath: path.join(testWorkspacePath, 'mod.ts'), lineNumber: 1 },
        { id: 'func', type: NodeType.FUNCTION, name: 'func', filePath: path.join(testWorkspacePath, 'func.ts'), lineNumber: 1 },
      ];

      nodes.forEach(node => graph.addNode(node));

      // Add both IMPORTS and DEPENDS_ON relationships
      graph.addRelationship({ id: 'mod-func-1', type: RelationType.IMPORTS, sourceId: 'module', targetId: 'func' });
      graph.addRelationship({ id: 'mod-func-2', type: RelationType.DEPENDS_ON, sourceId: 'module', targetId: 'func' });

      const results = graph.traverseDependencies('module');

      // Assertions
      assert.ok(results.length > 0, 'Should traverse multiple relationship types');
      assert.ok(
        results.some(r => r.relationships.some(rel => rel.type === RelationType.IMPORTS)),
        'Should include IMPORTS relationships'
      );

      console.log('✓ Multiple relationship types traversed');
    });

    test('Should maintain relationship metadata during traversal', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      createControlFlowGraph(testWorkspacePath, graph);

      const flows = graph.analyzeControlFlow('if-auth');

      // Assertions
      assert.ok(flows.length > 0, 'Should find control flows');
      assert.ok(flows[0].condition, 'Should maintain condition metadata');
      assert.strictEqual(flows[0].condition, 'isAuthenticated', 'Should preserve condition value');

      console.log('✓ Relationship metadata preserved during traversal');
    });
  });
});

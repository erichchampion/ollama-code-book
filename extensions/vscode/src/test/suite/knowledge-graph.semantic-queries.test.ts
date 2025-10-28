/**
 * Knowledge Graph - Semantic Queries Tests
 * Tests semantic querying capabilities of the knowledge graph
 *
 * Tests semantic queries for:
 * - Finding authentication code
 * - Finding database interactions
 * - Finding error handling patterns
 * - Finding API endpoints
 * - Multi-constraint queries
 */

import * as assert from 'assert';
import * as path from 'path';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import {
  PROVIDER_TEST_TIMEOUTS,
  KNOWLEDGE_GRAPH_CONSTANTS,
  SEMANTIC_SCORING,
} from '../helpers/test-constants';
import {
  NodeType,
  RelationType,
  GraphNode,
  GraphRelationship,
  SemanticQuery,
  QueryResult,
} from '../helpers/graph-types';

/**
 * Mock Knowledge Graph for testing
 */
class MockKnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private relationships: Map<string, GraphRelationship> = new Map();
  private nodeIndex: Map<string, Set<string>> = new Map();

  /**
   * Add a node to the graph
   */
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);

    // Index by type
    const typeKey = `type:${node.type}`;
    if (!this.nodeIndex.has(typeKey)) {
      this.nodeIndex.set(typeKey, new Set());
    }
    this.nodeIndex.get(typeKey)!.add(node.id);

    // Index by name (for semantic search)
    const nameKey = `name:${node.name.toLowerCase()}`;
    if (!this.nodeIndex.has(nameKey)) {
      this.nodeIndex.set(nameKey, new Set());
    }
    this.nodeIndex.get(nameKey)!.add(node.id);
  }

  /**
   * Add a relationship to the graph
   */
  addRelationship(relationship: GraphRelationship): void {
    this.relationships.set(relationship.id, relationship);
  }

  /**
   * Execute a semantic query
   */
  async query(semanticQuery: SemanticQuery): Promise<QueryResult[]> {
    const results: QueryResult[] = [];
    const queryTerms = semanticQuery.query.toLowerCase().split(/\s+/);

    // Filter by node types if specified
    let candidateNodes = Array.from(this.nodes.values());
    if (semanticQuery.constraints?.nodeTypes) {
      candidateNodes = candidateNodes.filter(node =>
        semanticQuery.constraints!.nodeTypes!.includes(node.type)
      );
    }

    // Filter by file patterns if specified
    if (semanticQuery.constraints?.filePatterns) {
      candidateNodes = candidateNodes.filter(node =>
        semanticQuery.constraints!.filePatterns!.some(pattern =>
          node.filePath.includes(pattern)
        )
      );
    }

    // Calculate semantic similarity for each node
    for (const node of candidateNodes) {
      const score = this.calculateSemanticScore(node, queryTerms);
      const minScore = semanticQuery.constraints?.minScore || KNOWLEDGE_GRAPH_CONSTANTS.MIN_SEMANTIC_SCORE;

      if (score >= minScore) {
        const matches = this.getMatches(node, queryTerms);
        results.push({ node, score, matches });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    const limit = semanticQuery.limit || KNOWLEDGE_GRAPH_CONSTANTS.MAX_RESULTS;
    return results.slice(0, limit);
  }

  /**
   * Calculate semantic similarity score
   */
  private calculateSemanticScore(node: GraphNode, queryTerms: string[]): number {
    const nodeName = node.name.toLowerCase();
    const nodeMetadata = JSON.stringify(node.metadata).toLowerCase();
    const searchText = `${nodeName} ${nodeMetadata}`;

    let matchCount = 0;
    const matches: string[] = [];

    for (const term of queryTerms) {
      if (searchText.includes(term)) {
        matchCount++;
        matches.push(term);
      }
    }

    // Base score: proportion of query terms matched
    let score = matchCount / queryTerms.length;

    // Boost score if node type matches query intent
    if (this.matchesIntent(node, queryTerms)) {
      score += SEMANTIC_SCORING.INTENT_BOOST;
    }

    // Boost score for exact name matches
    if (nodeName === queryTerms.join(' ')) {
      score += SEMANTIC_SCORING.EXACT_MATCH_BOOST;
    }

    return Math.min(score, SEMANTIC_SCORING.MAX_SCORE);
  }

  /**
   * Check if node type matches query intent
   */
  private matchesIntent(node: GraphNode, queryTerms: string[]): boolean {
    const intentMap: Record<string, NodeType[]> = {
      auth: [NodeType.AUTH_CHECK, NodeType.FUNCTION],
      authentication: [NodeType.AUTH_CHECK, NodeType.FUNCTION],
      login: [NodeType.AUTH_CHECK, NodeType.FUNCTION],
      database: [NodeType.DATABASE_QUERY, NodeType.FUNCTION],
      query: [NodeType.DATABASE_QUERY, NodeType.FUNCTION],
      error: [NodeType.ERROR_HANDLER, NodeType.FUNCTION],
      handler: [NodeType.ERROR_HANDLER, NodeType.FUNCTION],
      api: [NodeType.API_ENDPOINT, NodeType.FUNCTION],
      endpoint: [NodeType.API_ENDPOINT, NodeType.FUNCTION],
    };

    for (const term of queryTerms) {
      const matchingTypes = intentMap[term];
      if (matchingTypes && matchingTypes.includes(node.type)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get matched terms
   */
  private getMatches(node: GraphNode, queryTerms: string[]): string[] {
    const nodeName = node.name.toLowerCase();
    const nodeMetadata = JSON.stringify(node.metadata).toLowerCase();
    const searchText = `${nodeName} ${nodeMetadata}`;

    const matches: string[] = [];
    for (const term of queryTerms) {
      if (searchText.includes(term)) {
        matches.push(term);
      }
    }

    return matches;
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type: NodeType): GraphNode[] {
    const typeKey = `type:${type}`;
    const nodeIds = this.nodeIndex.get(typeKey) || new Set();
    return Array.from(nodeIds).map(id => this.nodes.get(id)!);
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
    this.relationships.clear();
    this.nodeIndex.clear();
  }
}

/**
 * Helper: Create test graph with authentication code
 */
async function createAuthenticationGraph(
  testWorkspacePath: string,
  graph: MockKnowledgeGraph
): Promise<void> {
  graph.addNode({
    id: 'auth-1',
    type: NodeType.AUTH_CHECK,
    name: 'authenticateUser',
    filePath: path.join(testWorkspacePath, 'auth.ts'),
    lineNumber: 10,
    metadata: {
      description: 'Authenticates user with JWT token',
      parameters: ['token'],
      returns: 'User',
    },
  });

  graph.addNode({
    id: 'auth-2',
    type: NodeType.FUNCTION,
    name: 'verifyToken',
    filePath: path.join(testWorkspacePath, 'auth.ts'),
    lineNumber: 25,
    metadata: {
      description: 'Verifies JWT token validity',
      parameters: ['token'],
      returns: 'boolean',
    },
  });

  graph.addNode({
    id: 'auth-3',
    type: NodeType.FUNCTION,
    name: 'hashPassword',
    filePath: path.join(testWorkspacePath, 'auth.ts'),
    lineNumber: 40,
    metadata: {
      description: 'Hashes password using bcrypt',
      parameters: ['password'],
      returns: 'string',
    },
  });
}

/**
 * Helper: Create test graph with database code
 */
async function createDatabaseGraph(
  testWorkspacePath: string,
  graph: MockKnowledgeGraph
): Promise<void> {
  graph.addNode({
    id: 'db-1',
    type: NodeType.DATABASE_QUERY,
    name: 'findUserById',
    filePath: path.join(testWorkspacePath, 'database.ts'),
    lineNumber: 15,
    metadata: {
      description: 'Find user by ID from database',
      query: 'SELECT * FROM users WHERE id = ?',
      parameters: ['id'],
    },
  });

  graph.addNode({
    id: 'db-2',
    type: NodeType.DATABASE_QUERY,
    name: 'insertUser',
    filePath: path.join(testWorkspacePath, 'database.ts'),
    lineNumber: 30,
    metadata: {
      description: 'Insert new user into database',
      query: 'INSERT INTO users (name, email) VALUES (?, ?)',
      parameters: ['name', 'email'],
    },
  });

  graph.addNode({
    id: 'db-3',
    type: NodeType.FUNCTION,
    name: 'connectDatabase',
    filePath: path.join(testWorkspacePath, 'database.ts'),
    lineNumber: 5,
    metadata: {
      description: 'Connect to PostgreSQL database',
      returns: 'Connection',
    },
  });
}

/**
 * Helper: Create test graph with error handling code
 */
async function createErrorHandlingGraph(
  testWorkspacePath: string,
  graph: MockKnowledgeGraph
): Promise<void> {
  graph.addNode({
    id: 'error-1',
    type: NodeType.ERROR_HANDLER,
    name: 'handleDatabaseError',
    filePath: path.join(testWorkspacePath, 'errors.ts'),
    lineNumber: 10,
    metadata: {
      description: 'Handle database connection errors',
      catches: ['DatabaseError', 'ConnectionError'],
    },
  });

  graph.addNode({
    id: 'error-2',
    type: NodeType.ERROR_HANDLER,
    name: 'handleValidationError',
    filePath: path.join(testWorkspacePath, 'errors.ts'),
    lineNumber: 25,
    metadata: {
      description: 'Handle validation errors',
      catches: ['ValidationError'],
    },
  });

  graph.addNode({
    id: 'error-3',
    type: NodeType.FUNCTION,
    name: 'logError',
    filePath: path.join(testWorkspacePath, 'errors.ts'),
    lineNumber: 40,
    metadata: {
      description: 'Log error to monitoring system',
      parameters: ['error'],
    },
  });
}

/**
 * Helper: Create test graph with API endpoints
 */
async function createApiGraph(
  testWorkspacePath: string,
  graph: MockKnowledgeGraph
): Promise<void> {
  graph.addNode({
    id: 'api-1',
    type: NodeType.API_ENDPOINT,
    name: 'GET /users/:id',
    filePath: path.join(testWorkspacePath, 'routes.ts'),
    lineNumber: 10,
    metadata: {
      method: 'GET',
      path: '/users/:id',
      description: 'Get user by ID',
      handler: 'getUserById',
    },
  });

  graph.addNode({
    id: 'api-2',
    type: NodeType.API_ENDPOINT,
    name: 'POST /users',
    filePath: path.join(testWorkspacePath, 'routes.ts'),
    lineNumber: 25,
    metadata: {
      method: 'POST',
      path: '/users',
      description: 'Create new user',
      handler: 'createUser',
    },
  });

  graph.addNode({
    id: 'api-3',
    type: NodeType.API_ENDPOINT,
    name: 'DELETE /users/:id',
    filePath: path.join(testWorkspacePath, 'routes.ts'),
    lineNumber: 40,
    metadata: {
      method: 'DELETE',
      path: '/users/:id',
      description: 'Delete user by ID',
      handler: 'deleteUser',
    },
  });
}

suite('Knowledge Graph - Semantic Queries Tests', () => {
  let testWorkspacePath: string;
  let graph: MockKnowledgeGraph;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('knowledge-graph-semantic-tests');
    graph = new MockKnowledgeGraph();
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    graph.clear();
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Semantic Queries', () => {
    test('Should find all authentication code', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await createAuthenticationGraph(testWorkspacePath, graph);

      const results = await graph.query({
        query: 'find all authentication code',
        constraints: {
          minScore: 0.5,
        },
      });

      // Assertions
      assert.ok(results.length > 0, 'Should find authentication code');
      assert.ok(
        results.some(r => r.node.type === NodeType.AUTH_CHECK),
        'Should find auth check nodes'
      );
      assert.ok(
        results.some(r => r.node.name.toLowerCase().includes('auth')),
        'Should find nodes with "auth" in name'
      );
      assert.ok(
        results.every(r => r.score >= 0.5),
        'All results should meet minimum score'
      );

      console.log(`✓ Found ${results.length} authentication code nodes`);
      console.log(`  - Top result: ${results[0].node.name} (score: ${results[0].score.toFixed(2)})`);
    });

    test('Should find database interactions', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await createDatabaseGraph(testWorkspacePath, graph);

      const results = await graph.query({
        query: 'find database interactions',
        constraints: {
          minScore: 0.5,
        },
      });

      // Assertions
      assert.ok(results.length > 0, 'Should find database interactions');
      assert.ok(
        results.some(r => r.node.type === NodeType.DATABASE_QUERY),
        'Should find database query nodes'
      );
      assert.ok(
        results.some(r => r.node.name.toLowerCase().includes('user')),
        'Should find user-related database queries'
      );

      console.log(`✓ Found ${results.length} database interaction nodes`);
      console.log(`  - Top result: ${results[0].node.name} (score: ${results[0].score.toFixed(2)})`);
    });

    test('Should find error handling patterns', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await createErrorHandlingGraph(testWorkspacePath, graph);

      const results = await graph.query({
        query: 'find error handling patterns',
        constraints: {
          minScore: 0.5,
        },
      });

      // Assertions
      assert.ok(results.length > 0, 'Should find error handling patterns');
      assert.ok(
        results.some(r => r.node.type === NodeType.ERROR_HANDLER),
        'Should find error handler nodes'
      );
      assert.ok(
        results.some(r => r.node.name.toLowerCase().includes('error')),
        'Should find nodes with "error" in name'
      );

      console.log(`✓ Found ${results.length} error handling nodes`);
      console.log(`  - Top result: ${results[0].node.name} (score: ${results[0].score.toFixed(2)})`);
    });

    test('Should find API endpoints', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await createApiGraph(testWorkspacePath, graph);

      const results = await graph.query({
        query: 'find API endpoints',
        constraints: {
          minScore: 0.5,
        },
      });

      // Assertions
      assert.ok(results.length > 0, 'Should find API endpoints');
      assert.ok(
        results.some(r => r.node.type === NodeType.API_ENDPOINT),
        'Should find API endpoint nodes'
      );
      assert.ok(
        results.some(r => r.node.metadata?.method),
        'Should find nodes with HTTP methods'
      );

      console.log(`✓ Found ${results.length} API endpoint nodes`);
      console.log(`  - Top result: ${results[0].node.name} (score: ${results[0].score.toFixed(2)})`);
    });

    test('Should handle queries with multiple constraints', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await createAuthenticationGraph(testWorkspacePath, graph);
      await createDatabaseGraph(testWorkspacePath, graph);

      const results = await graph.query({
        query: 'authentication database',
        constraints: {
          nodeTypes: [NodeType.AUTH_CHECK, NodeType.DATABASE_QUERY],
          filePatterns: ['auth.ts'],
          minScore: 0.3,
        },
        limit: 10,
      });

      // Assertions
      assert.ok(results.length > 0, 'Should find results with constraints');
      assert.ok(
        results.every(r => r.node.filePath.includes('auth.ts')),
        'Should respect file pattern constraint'
      );
      assert.ok(
        results.every(r =>
          [NodeType.AUTH_CHECK, NodeType.DATABASE_QUERY].includes(r.node.type)
        ),
        'Should respect node type constraint'
      );
      assert.ok(
        results.length <= 10,
        'Should respect limit constraint'
      );

      console.log(`✓ Found ${results.length} nodes with multiple constraints`);
    });

    test('Should rank results by semantic relevance', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await createAuthenticationGraph(testWorkspacePath, graph);

      const results = await graph.query({
        query: 'authenticate user',
        constraints: {
          minScore: 0.3,
        },
      });

      // Assertions
      assert.ok(results.length > 0, 'Should find results');

      // Results should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        assert.ok(
          results[i - 1].score >= results[i].score,
          'Results should be sorted by score descending'
        );
      }

      // Most relevant result should be at the top
      assert.ok(
        results[0].node.name.toLowerCase().includes('authenticate'),
        'Top result should be most relevant'
      );

      console.log(`✓ Results ranked by relevance:`);
      results.slice(0, 3).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.node.name} (score: ${r.score.toFixed(2)})`);
      });
    });

    test('Should return empty results for non-matching queries', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await createAuthenticationGraph(testWorkspacePath, graph);

      const results = await graph.query({
        query: 'blockchain cryptocurrency mining',
        constraints: {
          minScore: 0.6,
        },
      });

      // Assertions
      assert.strictEqual(results.length, 0, 'Should return no results for non-matching query');

      console.log('✓ Correctly returned empty results for non-matching query');
    });

    test('Should handle case-insensitive queries', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await createAuthenticationGraph(testWorkspacePath, graph);

      const results1 = await graph.query({
        query: 'AUTHENTICATION',
      });

      const results2 = await graph.query({
        query: 'authentication',
      });

      // Assertions
      assert.strictEqual(
        results1.length,
        results2.length,
        'Case should not affect results'
      );

      console.log('✓ Case-insensitive query handling verified');
    });

    test('Should support partial term matching', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await createDatabaseGraph(testWorkspacePath, graph);

      const results = await graph.query({
        query: 'user',
        constraints: {
          minScore: 0.3,
        },
      });

      // Assertions
      assert.ok(results.length > 0, 'Should find results with partial term');
      assert.ok(
        results.some(r => r.node.name.toLowerCase().includes('user')),
        'Should match nodes containing the term'
      );

      console.log(`✓ Partial term matching: found ${results.length} results for "user"`);
    });

    test('Should handle empty queries gracefully', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await createAuthenticationGraph(testWorkspacePath, graph);

      const results = await graph.query({
        query: '',
        constraints: {
          minScore: 0.5,
        },
      });

      // Assertions
      assert.strictEqual(results.length, 0, 'Empty query should return no results');

      console.log('✓ Empty query handled gracefully');
    });
  });
});

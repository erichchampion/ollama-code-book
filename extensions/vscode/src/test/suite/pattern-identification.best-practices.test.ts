/**
 * Pattern Identification - Best Practices Integration Tests
 * Tests generation of refactoring, optimization, and security recommendations
 *
 * Tests recommendation generation for:
 * - Refactoring recommendations (based on anti-patterns)
 * - Optimization recommendations (performance improvements)
 * - Security recommendations (vulnerability fixes)
 * - Recommendation prioritization (severity and impact)
 * - Actionability scoring (effort and feasibility)
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import {
  PROVIDER_TEST_TIMEOUTS,
  ANTI_PATTERN_THRESHOLDS,
  BEST_PRACTICES_THRESHOLDS,
  BEST_PRACTICES_ACTIONABLE_STEPS,
  BEST_PRACTICES_TITLES,
  BEST_PRACTICES_DESCRIPTIONS,
  BEST_PRACTICES_CODE_EXAMPLES,
  BEST_PRACTICES_SCORING,
  BEST_PRACTICES_PRIORITY_ORDER,
} from '../helpers/test-constants';
import { NodeType, GraphNode, GraphRelationship, RelationType } from '../helpers/graph-types';

/**
 * Recommendation types
 */
enum RecommendationType {
  REFACTORING = 'refactoring',
  OPTIMIZATION = 'optimization',
  SECURITY = 'security',
}

/**
 * Recommendation priority levels
 */
enum RecommendationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Recommendation result
 */
interface Recommendation {
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  affectedNodes: GraphNode[];
  actionableSteps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  expectedImpact: 'low' | 'medium' | 'high';
  actionabilityScore: number; // 0-1 (feasibility)
  location: {
    filePath: string;
    lineNumber: number;
  };
  codeExample?: {
    before: string;
    after: string;
  };
}

/**
 * Helper: Calculate recommendation priority
 */
function calculateRecommendationPriority(
  value: number,
  thresholds: { critical?: number; high: number; medium?: number }
): RecommendationPriority {
  if (thresholds.critical !== undefined && value >= thresholds.critical) {
    return RecommendationPriority.CRITICAL;
  }
  if (value >= thresholds.high) {
    return RecommendationPriority.HIGH;
  }
  if (thresholds.medium !== undefined && value >= thresholds.medium) {
    return RecommendationPriority.MEDIUM;
  }
  return RecommendationPriority.LOW;
}

/**
 * Helper: Calculate estimated effort
 */
function calculateEstimatedEffort(
  value: number,
  threshold: number,
  multipliers: { HIGH_MULTIPLIER: number; MEDIUM_MULTIPLIER: number } = BEST_PRACTICES_THRESHOLDS.EFFORT_CALCULATION
): 'low' | 'medium' | 'high' {
  const ratio = value / threshold;
  if (ratio >= multipliers.HIGH_MULTIPLIER) return 'high';
  if (ratio >= multipliers.MEDIUM_MULTIPLIER) return 'medium';
  return 'low';
}

/**
 * Helper: Check if node name matches security keywords
 */
function matchesKeywords(name: string, keywords: readonly string[]): boolean {
  const lowerName = name.toLowerCase();
  return keywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Best Practices Analyzer
 * Generates recommendations based on code analysis
 */
class BestPracticesAnalyzer {
  private nodes: Map<string, GraphNode> = new Map();
  private relationships: Map<string, GraphRelationship> = new Map();

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  addRelationship(rel: GraphRelationship): void {
    this.relationships.set(rel.id, rel);
  }

  /**
   * Generate refactoring recommendations
   */
  generateRefactoringRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Detect God Objects and recommend splitting
    for (const node of this.nodes.values()) {
      if (node.type !== NodeType.CLASS) continue;

      const methodCount = node.metadata?.methods?.length || 0;
      const dependencies = Array.from(this.relationships.values()).filter(
        rel => rel.sourceId === node.id && rel.type === RelationType.DEPENDS_ON
      ).length;

      if (methodCount >= ANTI_PATTERN_THRESHOLDS.GOD_OBJECT.METHOD_COUNT) {
        const priority = calculateRecommendationPriority(methodCount, {
          critical: ANTI_PATTERN_THRESHOLDS.GOD_OBJECT.CRITICAL_METHODS,
          high: ANTI_PATTERN_THRESHOLDS.GOD_OBJECT.HIGH_METHODS,
          medium: ANTI_PATTERN_THRESHOLDS.GOD_OBJECT.METHOD_COUNT,
        });

        const estimatedEffort = calculateEstimatedEffort(
          methodCount,
          ANTI_PATTERN_THRESHOLDS.GOD_OBJECT.METHOD_COUNT
        );

        recommendations.push({
          type: RecommendationType.REFACTORING,
          priority,
          title: BEST_PRACTICES_TITLES.GOD_OBJECT(node.name),
          description: BEST_PRACTICES_DESCRIPTIONS.GOD_OBJECT(node.name, methodCount, dependencies),
          affectedNodes: [node],
          actionableSteps: [...BEST_PRACTICES_ACTIONABLE_STEPS.GOD_OBJECT],
          estimatedEffort,
          expectedImpact: BEST_PRACTICES_SCORING.EXPECTED_IMPACT.GOD_OBJECT,
          actionabilityScore: BEST_PRACTICES_SCORING.ACTIONABILITY.GOD_OBJECT,
          location: {
            filePath: node.filePath,
            lineNumber: node.lineNumber,
          },
          codeExample: BEST_PRACTICES_CODE_EXAMPLES.GOD_OBJECT(node.name, methodCount),
        });
      }
    }

    // Detect Spaghetti Code and recommend refactoring
    for (const node of this.nodes.values()) {
      if (node.type !== NodeType.FUNCTION) continue;

      const complexity = node.metadata?.cyclomaticComplexity || 0;
      if (complexity >= ANTI_PATTERN_THRESHOLDS.SPAGHETTI_CODE.COMPLEXITY) {
        const priority = calculateRecommendationPriority(complexity, {
          critical: ANTI_PATTERN_THRESHOLDS.SPAGHETTI_CODE.CRITICAL_COMPLEXITY,
          high: ANTI_PATTERN_THRESHOLDS.SPAGHETTI_CODE.HIGH_COMPLEXITY,
          medium: ANTI_PATTERN_THRESHOLDS.SPAGHETTI_CODE.COMPLEXITY,
        });

        recommendations.push({
          type: RecommendationType.REFACTORING,
          priority,
          title: BEST_PRACTICES_TITLES.SPAGHETTI_CODE(node.name),
          description: BEST_PRACTICES_DESCRIPTIONS.SPAGHETTI_CODE(node.name, complexity),
          affectedNodes: [node],
          actionableSteps: [...BEST_PRACTICES_ACTIONABLE_STEPS.SPAGHETTI_CODE],
          estimatedEffort: BEST_PRACTICES_SCORING.ESTIMATED_EFFORT.SPAGHETTI_CODE,
          expectedImpact: BEST_PRACTICES_SCORING.EXPECTED_IMPACT.SPAGHETTI_CODE,
          actionabilityScore: BEST_PRACTICES_SCORING.ACTIONABILITY.SPAGHETTI_CODE,
          location: {
            filePath: node.filePath,
            lineNumber: node.lineNumber,
          },
        });
      }
    }

    // Detect Long Parameter Lists and recommend parameter objects
    for (const node of this.nodes.values()) {
      if (node.type !== NodeType.FUNCTION) continue;

      const paramCount = node.metadata?.parameters?.length || 0;
      if (paramCount >= ANTI_PATTERN_THRESHOLDS.LONG_PARAMETER_LIST.PARAM_THRESHOLD) {
        const priority = calculateRecommendationPriority(paramCount, {
          high: ANTI_PATTERN_THRESHOLDS.LONG_PARAMETER_LIST.HIGH_PARAM_COUNT,
          medium: ANTI_PATTERN_THRESHOLDS.LONG_PARAMETER_LIST.PARAM_THRESHOLD,
        });

        recommendations.push({
          type: RecommendationType.REFACTORING,
          priority,
          title: BEST_PRACTICES_TITLES.LONG_PARAMETER_LIST(node.name),
          description: BEST_PRACTICES_DESCRIPTIONS.LONG_PARAMETER_LIST(node.name, paramCount),
          affectedNodes: [node],
          actionableSteps: [...BEST_PRACTICES_ACTIONABLE_STEPS.LONG_PARAMETER_LIST],
          estimatedEffort: BEST_PRACTICES_SCORING.ESTIMATED_EFFORT.LONG_PARAMETER_LIST,
          expectedImpact: BEST_PRACTICES_SCORING.EXPECTED_IMPACT.LONG_PARAMETER_LIST,
          actionabilityScore: BEST_PRACTICES_SCORING.ACTIONABILITY.LONG_PARAMETER_LIST,
          location: {
            filePath: node.filePath,
            lineNumber: node.lineNumber,
          },
          codeExample: BEST_PRACTICES_CODE_EXAMPLES.LONG_PARAMETER_LIST(node.name, node.metadata?.parameters || []),
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Detect functions with high line count
    for (const node of this.nodes.values()) {
      if (node.type !== NodeType.FUNCTION) continue;

      const lineCount = node.metadata?.lineCount || 0;
      if (lineCount > BEST_PRACTICES_THRESHOLDS.LARGE_FUNCTION.LINE_COUNT_THRESHOLD) {
        const priority = calculateRecommendationPriority(lineCount, {
          high: BEST_PRACTICES_THRESHOLDS.LARGE_FUNCTION.HIGH_PRIORITY_LINES,
          medium: BEST_PRACTICES_THRESHOLDS.LARGE_FUNCTION.LINE_COUNT_THRESHOLD,
        });

        recommendations.push({
          type: RecommendationType.OPTIMIZATION,
          priority,
          title: BEST_PRACTICES_TITLES.LARGE_FUNCTION(node.name),
          description: BEST_PRACTICES_DESCRIPTIONS.LARGE_FUNCTION(node.name, lineCount),
          affectedNodes: [node],
          actionableSteps: [...BEST_PRACTICES_ACTIONABLE_STEPS.LARGE_FUNCTION],
          estimatedEffort: BEST_PRACTICES_SCORING.ESTIMATED_EFFORT.LARGE_FUNCTION,
          expectedImpact: BEST_PRACTICES_SCORING.EXPECTED_IMPACT.LARGE_FUNCTION,
          actionabilityScore: BEST_PRACTICES_SCORING.ACTIONABILITY.LARGE_FUNCTION,
          location: {
            filePath: node.filePath,
            lineNumber: node.lineNumber,
          },
        });
      }
    }

    // Detect circular dependencies (performance impact)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const foundCycles = new Set<string>(); // ✅ BUGFIX: Track unique cycles

    const detectCycle = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        const cycleStartIndex = path.indexOf(nodeId);
        const cyclePath = path.slice(cycleStartIndex);
        const cycleNodes = cyclePath.map(id => this.nodes.get(id)!);

        // ✅ BUGFIX: Create canonical representation (sorted IDs) to detect duplicates
        const cycleIds = cyclePath.sort().join('→');

        if (!foundCycles.has(cycleIds)) {
          foundCycles.add(cycleIds);

          recommendations.push({
            type: RecommendationType.OPTIMIZATION,
            priority: RecommendationPriority.HIGH,
            title: BEST_PRACTICES_TITLES.CIRCULAR_DEPENDENCY(),
            description: BEST_PRACTICES_DESCRIPTIONS.CIRCULAR_DEPENDENCY(cyclePath),
            affectedNodes: cycleNodes,
            actionableSteps: [...BEST_PRACTICES_ACTIONABLE_STEPS.CIRCULAR_DEPENDENCY],
            estimatedEffort: BEST_PRACTICES_SCORING.ESTIMATED_EFFORT.CIRCULAR_DEPENDENCY,
            expectedImpact: BEST_PRACTICES_SCORING.EXPECTED_IMPACT.CIRCULAR_DEPENDENCY,
            actionabilityScore: BEST_PRACTICES_SCORING.ACTIONABILITY.CIRCULAR_DEPENDENCY,
            location: {
              filePath: cycleNodes[0].filePath,
              lineNumber: cycleNodes[0].lineNumber,
            },
          });
        }

        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingRels = Array.from(this.relationships.values()).filter(
        rel => rel.sourceId === nodeId && (rel.type === RelationType.IMPORTS || rel.type === RelationType.DEPENDS_ON)
      );

      for (const rel of outgoingRels) {
        detectCycle(rel.targetId, [...path, nodeId]);
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of this.nodes.values()) {
      if (!visited.has(node.id)) {
        detectCycle(node.id, []);
      }
    }

    return recommendations;
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Detect authentication-related nodes without proper validation
    for (const node of this.nodes.values()) {
      if (matchesKeywords(node.name, BEST_PRACTICES_THRESHOLDS.SECURITY_PATTERNS.AUTH_KEYWORDS)) {
        const hasValidation = Array.from(this.relationships.values()).some(
          rel => rel.sourceId === node.id &&
            matchesKeywords(this.nodes.get(rel.targetId)?.name || '', BEST_PRACTICES_THRESHOLDS.SECURITY_PATTERNS.VALIDATION_KEYWORDS)
        );

        if (!hasValidation) {
          recommendations.push({
            type: RecommendationType.SECURITY,
            priority: RecommendationPriority.CRITICAL,
            title: BEST_PRACTICES_TITLES.AUTH_VALIDATION(node.name),
            description: BEST_PRACTICES_DESCRIPTIONS.AUTH_VALIDATION(node.name),
            affectedNodes: [node],
            actionableSteps: [...BEST_PRACTICES_ACTIONABLE_STEPS.AUTH_VALIDATION],
            estimatedEffort: BEST_PRACTICES_SCORING.ESTIMATED_EFFORT.AUTH_VALIDATION,
            expectedImpact: BEST_PRACTICES_SCORING.EXPECTED_IMPACT.AUTH_VALIDATION,
            actionabilityScore: BEST_PRACTICES_SCORING.ACTIONABILITY.AUTH_VALIDATION,
            location: {
              filePath: node.filePath,
              lineNumber: node.lineNumber,
            },
          });
        }
      }
    }

    // Detect database queries without prepared statements
    for (const node of this.nodes.values()) {
      if (matchesKeywords(node.name, BEST_PRACTICES_THRESHOLDS.SECURITY_PATTERNS.QUERY_KEYWORDS)) {
        recommendations.push({
          type: RecommendationType.SECURITY,
          priority: RecommendationPriority.HIGH,
          title: BEST_PRACTICES_TITLES.SQL_PREPARED_STATEMENTS(node.name),
          description: BEST_PRACTICES_DESCRIPTIONS.SQL_PREPARED_STATEMENTS(node.name),
          affectedNodes: [node],
          actionableSteps: [...BEST_PRACTICES_ACTIONABLE_STEPS.SQL_PREPARED_STATEMENTS],
          estimatedEffort: BEST_PRACTICES_SCORING.ESTIMATED_EFFORT.SQL_PREPARED_STATEMENTS,
          expectedImpact: BEST_PRACTICES_SCORING.EXPECTED_IMPACT.SQL_PREPARED_STATEMENTS,
          actionabilityScore: BEST_PRACTICES_SCORING.ACTIONABILITY.SQL_PREPARED_STATEMENTS,
          location: {
            filePath: node.filePath,
            lineNumber: node.lineNumber,
          },
          codeExample: BEST_PRACTICES_CODE_EXAMPLES.SQL_PREPARED_STATEMENTS(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate all recommendations and prioritize them
   */
  generateAllRecommendations(): Recommendation[] {
    const allRecommendations = [
      ...this.generateRefactoringRecommendations(),
      ...this.generateOptimizationRecommendations(),
      ...this.generateSecurityRecommendations(),
    ];

    // Sort by priority and actionability score
    return this.prioritizeRecommendations(allRecommendations);
  }

  /**
   * Prioritize recommendations by priority level and actionability score
   */
  private prioritizeRecommendations(recommendations: Recommendation[]): Recommendation[] {
    return recommendations.sort((a, b) => {
      // First sort by priority
      const priorityDiff = BEST_PRACTICES_PRIORITY_ORDER[b.priority] - BEST_PRACTICES_PRIORITY_ORDER[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by actionability score (higher is better)
      return b.actionabilityScore - a.actionabilityScore;
    });
  }
}

/**
 * Test helper: Create test node
 */
function createTestNode(
  id: string,
  type: NodeType,
  name: string,
  testWorkspacePath: string,
  fileName: string,
  lineNumber: number = 1,
  metadata?: any
): GraphNode {
  return {
    id,
    type,
    name,
    filePath: `${testWorkspacePath}/${fileName}`,
    lineNumber,
    metadata,
  };
}

suite('Pattern Identification - Best Practices Integration Tests', () => {
  let testWorkspacePath: string;
  let analyzer: BestPracticesAnalyzer;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('best-practices-tests');
    analyzer = new BestPracticesAnalyzer();
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Refactoring Recommendations', () => {
    test('Should generate refactoring recommendation for God Object', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const godClass = createTestNode(
        'god-class',
        NodeType.CLASS,
        'UserManager',
        testWorkspacePath,
        'UserManager.ts',
        1,
        {
          methods: Array.from({ length: 30 }, (_, i) => `method${i + 1}`),
        }
      );

      analyzer.addNode(godClass);

      const recommendations = analyzer.generateRefactoringRecommendations();
      const godObjectRec = recommendations.find(r => r.title.includes('God Object'));

      assert.ok(godObjectRec, 'Should generate God Object recommendation');
      assert.strictEqual(godObjectRec!.type, RecommendationType.REFACTORING);
      assert.ok(['high', 'critical'].includes(godObjectRec!.priority));
      assert.ok(godObjectRec!.actionableSteps.length >= 3);
      assert.ok(godObjectRec!.description.includes('Single Responsibility'));
      assert.ok(godObjectRec!.codeExample?.before);
      assert.ok(godObjectRec!.codeExample?.after);

      console.log(`✓ Generated refactoring recommendation: ${godObjectRec!.title}`);
    });

    test('Should generate refactoring recommendation for Spaghetti Code', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const complexFunction = createTestNode(
        'complex-func',
        NodeType.FUNCTION,
        'processData',
        testWorkspacePath,
        'processor.ts',
        10,
        {
          cyclomaticComplexity: 25,
          lineCount: 150,
        }
      );

      analyzer.addNode(complexFunction);

      const recommendations = analyzer.generateRefactoringRecommendations();
      const complexityRec = recommendations.find(r => r.title.includes('Reduce Complexity'));

      assert.ok(complexityRec, 'Should generate complexity recommendation');
      assert.strictEqual(complexityRec!.type, RecommendationType.REFACTORING);
      assert.ok(['high', 'critical'].includes(complexityRec!.priority));
      assert.ok(complexityRec!.description.includes('cyclomatic complexity'));
      assert.ok(complexityRec!.actionableSteps.some(step => step.includes('Extract')));

      console.log(`✓ Generated complexity recommendation: ${complexityRec!.title}`);
    });

    test('Should generate refactoring recommendation for Long Parameter List', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const longParamFunction = createTestNode(
        'long-param-func',
        NodeType.FUNCTION,
        'createUser',
        testWorkspacePath,
        'user.ts',
        15,
        {
          parameters: ['name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country'],
        }
      );

      analyzer.addNode(longParamFunction);

      const recommendations = analyzer.generateRefactoringRecommendations();
      const paramRec = recommendations.find(r => r.title.includes('Parameter Object'));

      assert.ok(paramRec, 'Should generate parameter object recommendation');
      assert.strictEqual(paramRec!.type, RecommendationType.REFACTORING);
      assert.ok(paramRec!.description.includes('8 parameters'));
      assert.ok(paramRec!.codeExample?.before.includes('name, email'));
      assert.ok(paramRec!.codeExample?.after.includes('interface'));
      assert.strictEqual(paramRec!.estimatedEffort, 'low');
      assert.ok(paramRec!.actionabilityScore >= 0.8);

      console.log(`✓ Generated parameter object recommendation: ${paramRec!.title}`);
    });
  });

  suite('Optimization Recommendations', () => {
    test('Should generate optimization recommendation for large function', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const largeFunction = createTestNode(
        'large-func',
        NodeType.FUNCTION,
        'processLargeDataset',
        testWorkspacePath,
        'processor.ts',
        100,
        {
          lineCount: 250,
          cyclomaticComplexity: 10,
        }
      );

      analyzer.addNode(largeFunction);

      const recommendations = analyzer.generateOptimizationRecommendations();
      const optimizationRec = recommendations.find(r => r.title.includes('Optimize Large Function'));

      assert.ok(optimizationRec, 'Should generate optimization recommendation');
      assert.strictEqual(optimizationRec!.type, RecommendationType.OPTIMIZATION);
      assert.strictEqual(optimizationRec!.priority, RecommendationPriority.HIGH);
      assert.ok(optimizationRec!.actionableSteps.some(step => step.includes('Profile')));
      assert.ok(optimizationRec!.description.includes('250 lines'));

      console.log(`✓ Generated optimization recommendation: ${optimizationRec!.title}`);
    });

    test('Should generate optimization recommendation for circular dependency', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const moduleA = createTestNode('module-a', NodeType.MODULE, 'ModuleA', testWorkspacePath, 'moduleA.ts');
      const moduleB = createTestNode('module-b', NodeType.MODULE, 'ModuleB', testWorkspacePath, 'moduleB.ts');
      const moduleC = createTestNode('module-c', NodeType.MODULE, 'ModuleC', testWorkspacePath, 'moduleC.ts');

      analyzer.addNode(moduleA);
      analyzer.addNode(moduleB);
      analyzer.addNode(moduleC);

      analyzer.addRelationship({ id: 'a-to-b', type: RelationType.IMPORTS, sourceId: 'module-a', targetId: 'module-b' });
      analyzer.addRelationship({ id: 'b-to-c', type: RelationType.IMPORTS, sourceId: 'module-b', targetId: 'module-c' });
      analyzer.addRelationship({ id: 'c-to-a', type: RelationType.IMPORTS, sourceId: 'module-c', targetId: 'module-a' });

      const recommendations = analyzer.generateOptimizationRecommendations();
      const circularRec = recommendations.find(r => r.title.includes('Circular Dependency'));

      assert.ok(circularRec, 'Should generate circular dependency recommendation');
      assert.strictEqual(circularRec!.type, RecommendationType.OPTIMIZATION);
      assert.strictEqual(circularRec!.priority, RecommendationPriority.HIGH);
      assert.ok(circularRec!.description.includes('Circular dependency'));
      assert.ok(circularRec!.actionableSteps.some(step => step.includes('Extract')));
      assert.strictEqual(circularRec!.estimatedEffort, 'high');

      console.log(`✓ Generated circular dependency recommendation: ${circularRec!.title}`);
    });
  });

  suite('Security Recommendations', () => {
    test('Should generate security recommendation for authentication without validation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const authFunction = createTestNode(
        'auth-func',
        NodeType.FUNCTION,
        'authenticateUser',
        testWorkspacePath,
        'auth.ts',
        20
      );

      analyzer.addNode(authFunction);

      const recommendations = analyzer.generateSecurityRecommendations();
      const securityRec = recommendations.find(r => r.title.includes('Input Validation'));

      assert.ok(securityRec, 'Should generate security recommendation');
      assert.strictEqual(securityRec!.type, RecommendationType.SECURITY);
      assert.strictEqual(securityRec!.priority, RecommendationPriority.CRITICAL);
      assert.ok(securityRec!.description.includes('input validation'));
      assert.ok(securityRec!.actionableSteps.some(step => step.includes('sanitize')));
      assert.strictEqual(securityRec!.expectedImpact, 'high');

      console.log(`✓ Generated security recommendation: ${securityRec!.title}`);
    });

    test('Should generate security recommendation for SQL queries', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const queryFunction = createTestNode(
        'query-func',
        NodeType.FUNCTION,
        'getUserQuery',
        testWorkspacePath,
        'database.ts',
        50
      );

      analyzer.addNode(queryFunction);

      const recommendations = analyzer.generateSecurityRecommendations();
      const sqlRec = recommendations.find(r => r.title.includes('Prepared Statements'));

      assert.ok(sqlRec, 'Should generate SQL security recommendation');
      assert.strictEqual(sqlRec!.type, RecommendationType.SECURITY);
      assert.strictEqual(sqlRec!.priority, RecommendationPriority.HIGH);
      assert.ok(sqlRec!.description.includes('prepared statements'));
      assert.ok(sqlRec!.codeExample?.before.includes('$'));
      assert.ok(sqlRec!.codeExample?.after.includes('?'));
      assert.ok(sqlRec!.actionabilityScore >= 0.9);

      console.log(`✓ Generated SQL security recommendation: ${sqlRec!.title}`);
    });
  });

  suite('Recommendation Prioritization', () => {
    test('Should prioritize recommendations by severity and actionability', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Add various nodes that will generate recommendations
      analyzer.addNode(createTestNode('auth', NodeType.FUNCTION, 'authenticateUser', testWorkspacePath, 'auth.ts', 1));
      analyzer.addNode(createTestNode('god', NodeType.CLASS, 'UserManager', testWorkspacePath, 'manager.ts', 1, { methods: Array.from({ length: 30 }, (_, i) => `m${i}`) }));
      analyzer.addNode(createTestNode('query', NodeType.FUNCTION, 'sqlQuery', testWorkspacePath, 'db.ts', 1));

      const recommendations = analyzer.generateAllRecommendations();

      assert.ok(recommendations.length >= 3, 'Should generate multiple recommendations');

      // Security recommendations should come first (if critical)
      const criticalRecs = recommendations.filter(r => r.priority === RecommendationPriority.CRITICAL);
      assert.ok(criticalRecs.length > 0, 'Should have critical recommendations');
      assert.strictEqual(recommendations[0].priority, RecommendationPriority.CRITICAL, 'First recommendation should be critical');

      // Verify sorting by actionability within same priority
      let lastPriorityOrder = 4;
      for (const rec of recommendations) {
        const priorityOrder = BEST_PRACTICES_PRIORITY_ORDER[rec.priority];
        assert.ok(priorityOrder <= lastPriorityOrder, 'Recommendations should be sorted by priority');
        lastPriorityOrder = priorityOrder;
      }

      console.log(`✓ Prioritized ${recommendations.length} recommendations correctly`);
    });

    test('Should calculate actionability scores correctly', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Low effort, high impact = high actionability
      const longParamFunc = createTestNode('func1', NodeType.FUNCTION, 'createUser', testWorkspacePath, 'user.ts', 1, {
        parameters: ['a', 'b', 'c', 'd', 'e', 'f'],
      });

      // High effort, high impact = moderate actionability
      const godClass = createTestNode('class1', NodeType.CLASS, 'Manager', testWorkspacePath, 'manager.ts', 1, {
        methods: Array.from({ length: 40 }, (_, i) => `m${i}`),
      });

      analyzer.addNode(longParamFunc);
      analyzer.addNode(godClass);

      const recommendations = analyzer.generateRefactoringRecommendations();

      const paramRec = recommendations.find(r => r.title.includes('Parameter Object'));
      const godRec = recommendations.find(r => r.title.includes('God Object'));

      assert.ok(paramRec, 'Should have parameter object recommendation');
      assert.ok(godRec, 'Should have God Object recommendation');

      // Parameter object should have higher actionability (easier to implement)
      assert.ok(paramRec!.actionabilityScore > godRec!.actionabilityScore, 'Low-effort refactoring should have higher actionability');
      assert.strictEqual(paramRec!.estimatedEffort, 'low');
      assert.ok(['medium', 'high'].includes(godRec!.estimatedEffort));

      console.log(`✓ Actionability scores: Parameter Object=${paramRec!.actionabilityScore}, God Object=${godRec!.actionabilityScore}`);
    });
  });

  suite('Actionability Scoring', () => {
    test('Should provide actionable steps for each recommendation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      analyzer.addNode(createTestNode('func', NodeType.FUNCTION, 'complexFunction', testWorkspacePath, 'app.ts', 1, {
        cyclomaticComplexity: 20,
      }));

      const recommendations = analyzer.generateRefactoringRecommendations();
      const rec = recommendations[0];

      assert.ok(rec, 'Should have recommendation');
      assert.ok(rec.actionableSteps.length >= 3, 'Should have at least 3 actionable steps');

      // All steps should be concrete and actionable
      for (const step of rec.actionableSteps) {
        assert.ok(step.length > 10, 'Steps should be descriptive');
        assert.ok(/^[A-Z]/.test(step), 'Steps should start with capital letter');
      }

      console.log(`✓ Provided ${rec.actionableSteps.length} actionable steps`);
    });

    test('Should include code examples for applicable recommendations', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      analyzer.addNode(createTestNode('func', NodeType.FUNCTION, 'createUser', testWorkspacePath, 'user.ts', 1, {
        parameters: ['name', 'email', 'phone', 'address', 'city', 'state'],
      }));

      const recommendations = analyzer.generateRefactoringRecommendations();
      const paramRec = recommendations.find(r => r.title.includes('Parameter Object'));

      assert.ok(paramRec, 'Should have parameter object recommendation');
      assert.ok(paramRec!.codeExample, 'Should include code example');
      assert.ok(paramRec!.codeExample!.before, 'Should have before code');
      assert.ok(paramRec!.codeExample!.after, 'Should have after code');
      assert.ok(paramRec!.codeExample!.before.includes('name'), 'Before should show parameters');
      assert.ok(paramRec!.codeExample!.after.includes('interface'), 'After should show interface');

      console.log(`✓ Code example provided:\nBefore: ${paramRec!.codeExample!.before}\nAfter: ${paramRec!.codeExample!.after}`);
    });

    test('Should estimate effort and impact for all recommendations', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      analyzer.addNode(createTestNode('god', NodeType.CLASS, 'Manager', testWorkspacePath, 'manager.ts', 1, { methods: Array.from({ length: 50 }, (_, i) => `m${i}`) }));
      analyzer.addNode(createTestNode('func', NodeType.FUNCTION, 'complexFunc', testWorkspacePath, 'app.ts', 1, { cyclomaticComplexity: 30, lineCount: 200 }));

      const recommendations = analyzer.generateAllRecommendations();

      for (const rec of recommendations) {
        assert.ok(['low', 'medium', 'high'].includes(rec.estimatedEffort), 'Should have valid effort estimate');
        assert.ok(['low', 'medium', 'high'].includes(rec.expectedImpact), 'Should have valid impact estimate');
        assert.ok(rec.actionabilityScore >= 0 && rec.actionabilityScore <= 1, 'Actionability score should be 0-1');
      }

      // High complexity should have high impact
      const complexRec = recommendations.find(r => r.affectedNodes.some(n => n.name === 'complexFunc'));
      assert.strictEqual(complexRec!.expectedImpact, 'high', 'Complex function refactoring should have high impact');

      console.log(`✓ All ${recommendations.length} recommendations have effort/impact estimates`);
    });
  });
});

/**
 * Pattern Identification - Anti-Pattern Detection Tests
 * Tests detection of common code anti-patterns
 *
 * Tests anti-pattern detection for:
 * - God Object (excessive responsibilities)
 * - Spaghetti Code (complex control flow)
 * - Circular Dependencies
 * - Feature Envy (excessive external calls)
 * - Shotgun Surgery (scattered changes)
 * - Long Parameter List
 * - Data Clumps (repeated parameter groups)
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import {
  PROVIDER_TEST_TIMEOUTS,
  ANTI_PATTERN_THRESHOLDS,
  ANTI_PATTERN_RECOMMENDATIONS,
  ANTI_PATTERN_TEST_DATA,
  ANTI_PATTERN_COMMON,
} from '../helpers/test-constants';
import { NodeType, GraphNode, GraphRelationship, RelationType, NodeMetadata } from '../helpers/graph-types';

/**
 * Anti-pattern types
 */
enum AntiPatternType {
  GOD_OBJECT = 'god_object',
  SPAGHETTI_CODE = 'spaghetti_code',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  FEATURE_ENVY = 'feature_envy',
  SHOTGUN_SURGERY = 'shotgun_surgery',
  LONG_PARAMETER_LIST = 'long_parameter_list',
  DATA_CLUMPS = 'data_clumps',
}

/**
 * Anti-pattern detection result
 */
interface AntiPatternMatch {
  type: AntiPatternType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  nodes: GraphNode[];
  description: string;
  recommendation: string;
  location: {
    filePath: string;
    lineNumber: number;
  };
  metrics?: {
    methodCount?: number;
    lineCount?: number;
    cyclomaticComplexity?: number;
    dependencyCount?: number;
    parameterCount?: number;
    externalCalls?: number;
    affectedFiles?: number;
  };
}

/**
 * Calculate severity level based on value and thresholds
 */
function calculateSeverity(
  value: number,
  thresholds: { critical?: number; high: number; medium: number }
): 'low' | 'medium' | 'high' | 'critical' {
  if (thresholds.critical !== undefined && value >= thresholds.critical) {
    return 'critical';
  }
  if (value >= thresholds.high) {
    return 'high';
  }
  if (value >= thresholds.medium) {
    return 'medium';
  }
  return 'low';
}

/**
 * Calculate confidence score (0-1) based on value and threshold
 */
function calculateConfidence(value: number, threshold: number): number {
  return Math.min(value / threshold, ANTI_PATTERN_COMMON.MAX_CONFIDENCE);
}

/**
 * Calculate average confidence from multiple ratios
 */
function calculateAverageConfidence(...ratios: number[]): number {
  const avg = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  return Math.min(avg, ANTI_PATTERN_COMMON.MAX_CONFIDENCE);
}

/**
 * Create a test graph node
 */
function createTestNode(
  id: string,
  type: NodeType,
  name: string,
  testWorkspacePath: string,
  fileName: string,
  lineNumber: number = 1,
  metadata?: NodeMetadata
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

/**
 * Add multiple relationships to detector
 */
function addMultipleRelationships(
  detector: AntiPatternDetector,
  count: number,
  idPrefix: string,
  type: RelationType,
  sourceId: string,
  targetIdPrefix: string
): void {
  for (let i = 0; i < count; i++) {
    detector.addRelationship({
      id: `${idPrefix}-${i}`,
      type,
      sourceId,
      targetId: `${targetIdPrefix}-${i}`,
    });
  }
}

/**
 * Anti-Pattern Detector
 */
class AntiPatternDetector {
  private nodes: Map<string, GraphNode> = new Map();
  private relationships: Map<string, GraphRelationship> = new Map();

  /**
   * Add node to detector
   */
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  /**
   * Add relationship to detector
   */
  addRelationship(relationship: GraphRelationship): void {
    this.relationships.set(relationship.id, relationship);
  }

  /**
   * Detect all anti-patterns
   */
  detectAntiPatterns(): AntiPatternMatch[] {
    const patterns: AntiPatternMatch[] = [];

    patterns.push(...this.detectGodObjects());
    patterns.push(...this.detectSpaghettiCode());
    patterns.push(...this.detectCircularDependencies());
    patterns.push(...this.detectFeatureEnvy());
    patterns.push(...this.detectShotgunSurgery());
    patterns.push(...this.detectLongParameterLists());
    patterns.push(...this.detectDataClumps());

    return patterns;
  }

  /**
   * Detect God Object anti-pattern
   * Class with too many responsibilities (methods, dependencies)
   */
  private detectGodObjects(): AntiPatternMatch[] {
    const matches: AntiPatternMatch[] = [];
    const thresholds = ANTI_PATTERN_THRESHOLDS.GOD_OBJECT;

    for (const node of this.nodes.values()) {
      if (node.type !== NodeType.CLASS) {
        continue;
      }

      const methodCount = node.metadata?.methods?.length || 0;
      const dependencies = Array.from(this.relationships.values()).filter(
        rel => rel.sourceId === node.id && rel.type === RelationType.DEPENDS_ON
      ).length;

      if (methodCount >= thresholds.METHOD_COUNT || dependencies >= thresholds.DEPENDENCY_COUNT) {
        const methodSeverity = calculateSeverity(methodCount, {
          critical: thresholds.CRITICAL_METHODS,
          high: thresholds.HIGH_METHODS,
          medium: thresholds.METHOD_COUNT,
        });

        const depSeverity = calculateSeverity(dependencies, {
          critical: thresholds.CRITICAL_DEPENDENCIES,
          high: thresholds.HIGH_DEPENDENCIES,
          medium: thresholds.DEPENDENCY_COUNT,
        });

        // Use the higher severity
        const severity = methodSeverity === 'critical' || depSeverity === 'critical' ? 'critical' :
                        methodSeverity === 'high' || depSeverity === 'high' ? 'high' : 'medium';

        const confidence = calculateAverageConfidence(
          methodCount / thresholds.METHOD_COUNT,
          dependencies / thresholds.DEPENDENCY_COUNT
        );

        matches.push({
          type: AntiPatternType.GOD_OBJECT,
          severity,
          confidence,
          nodes: [node],
          description: `Class '${node.name}' has too many responsibilities (${methodCount} methods, ${dependencies} dependencies)`,
          recommendation: ANTI_PATTERN_RECOMMENDATIONS.GOD_OBJECT,
          location: {
            filePath: node.filePath,
            lineNumber: node.lineNumber,
          },
          metrics: {
            methodCount,
            dependencyCount: dependencies,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Detect Spaghetti Code anti-pattern
   * Complex, tangled control flow
   */
  private detectSpaghettiCode(): AntiPatternMatch[] {
    const matches: AntiPatternMatch[] = [];
    const thresholds = ANTI_PATTERN_THRESHOLDS.SPAGHETTI_CODE;

    for (const node of this.nodes.values()) {
      if (node.type !== NodeType.FUNCTION) {
        continue;
      }

      const complexity = node.metadata?.cyclomaticComplexity || 0;
      const lineCount = node.metadata?.lineCount || 0;

      if (complexity >= thresholds.COMPLEXITY) {
        const severity = calculateSeverity(complexity, {
          critical: thresholds.CRITICAL_COMPLEXITY,
          high: thresholds.HIGH_COMPLEXITY,
          medium: thresholds.COMPLEXITY,
        });

        matches.push({
          type: AntiPatternType.SPAGHETTI_CODE,
          severity,
          confidence: calculateConfidence(complexity, thresholds.COMPLEXITY),
          nodes: [node],
          description: `Function '${node.name}' has excessive cyclomatic complexity (${complexity})`,
          recommendation: ANTI_PATTERN_RECOMMENDATIONS.SPAGHETTI_CODE,
          location: {
            filePath: node.filePath,
            lineNumber: node.lineNumber,
          },
          metrics: {
            cyclomaticComplexity: complexity,
            lineCount,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Detect Circular Dependency anti-pattern
   * Modules that depend on each other creating cycles
   */
  private detectCircularDependencies(): AntiPatternMatch[] {
    const matches: AntiPatternMatch[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const foundCycles = new Set<string>(); // Track unique cycles
    const thresholds = ANTI_PATTERN_THRESHOLDS.CIRCULAR_DEPENDENCY;

    const detectCycle = (nodeId: string, path: GraphNode[]): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found cycle
        const cycleStartIndex = path.findIndex(n => n.id === nodeId);
        const cyclePath = path.slice(cycleStartIndex);

        // Create canonical representation (sorted IDs) to detect duplicates
        const cycleIds = cyclePath.map(n => n.id).sort().join('→');

        if (!foundCycles.has(cycleIds)) {
          foundCycles.add(cycleIds);

          const severity = cyclePath.length > thresholds.LONG_CYCLE_LENGTH ? 'high' : 'medium';

          matches.push({
            type: AntiPatternType.CIRCULAR_DEPENDENCY,
            severity,
            confidence: thresholds.CONFIDENCE,
            nodes: cyclePath,
            description: `Circular dependency detected: ${cyclePath.map(n => n.name).join(' → ')} → ${path[cycleStartIndex].name}`,
            recommendation: ANTI_PATTERN_RECOMMENDATIONS.CIRCULAR_DEPENDENCY,
            location: {
              filePath: cyclePath[0].filePath,
              lineNumber: cyclePath[0].lineNumber,
            },
            metrics: {
              dependencyCount: cyclePath.length,
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

      const node = this.nodes.get(nodeId);
      if (node) {
        path.push(node);

        // Follow IMPORTS and DEPENDS_ON relationships
        const outgoing = Array.from(this.relationships.values()).filter(
          rel => rel.sourceId === nodeId &&
                 (rel.type === RelationType.IMPORTS || rel.type === RelationType.DEPENDS_ON)
        );

        for (const rel of outgoing) {
          if (detectCycle(rel.targetId, [...path])) {
            recursionStack.delete(nodeId);
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check all MODULE and CLASS nodes for cycles
    for (const node of this.nodes.values()) {
      if (node.type === NodeType.MODULE || node.type === NodeType.CLASS) {
        detectCycle(node.id, []);
      }
    }

    return matches;
  }

  /**
   * Detect Feature Envy anti-pattern
   * Method that uses more external class features than its own
   */
  private detectFeatureEnvy(): AntiPatternMatch[] {
    const matches: AntiPatternMatch[] = [];
    const thresholds = ANTI_PATTERN_THRESHOLDS.FEATURE_ENVY;

    for (const node of this.nodes.values()) {
      if (node.type !== NodeType.FUNCTION) {
        continue;
      }

      // Count calls to external classes
      const externalCalls = Array.from(this.relationships.values()).filter(
        rel => rel.sourceId === node.id && rel.type === RelationType.CALLS
      );

      // Group by target class
      const callsByClass = new Map<string, number>();
      for (const call of externalCalls) {
        const targetNode = this.nodes.get(call.targetId);
        if (targetNode) {
          const className = targetNode.metadata?.className || ANTI_PATTERN_COMMON.UNKNOWN_VALUE;
          callsByClass.set(className, (callsByClass.get(className) || 0) + 1);
        }
      }

      // Check if any external class is used more than threshold
      for (const [className, count] of callsByClass.entries()) {
        if (count >= thresholds.CALL_THRESHOLD) {
          const severity = count >= thresholds.HIGH_CALL_COUNT ? 'high' : 'medium';

          matches.push({
            type: AntiPatternType.FEATURE_ENVY,
            severity,
            confidence: calculateConfidence(count, thresholds.CALL_THRESHOLD),
            nodes: [node],
            description: `Function '${node.name}' makes ${count} calls to '${className}' - consider moving to that class`,
            recommendation: ANTI_PATTERN_RECOMMENDATIONS.FEATURE_ENVY,
            location: {
              filePath: node.filePath,
              lineNumber: node.lineNumber,
            },
            metrics: {
              externalCalls: count,
            },
          });
        }
      }
    }

    return matches;
  }

  /**
   * Detect Shotgun Surgery anti-pattern
   * Single change requires modifications across many files
   */
  private detectShotgunSurgery(): AntiPatternMatch[] {
    const matches: AntiPatternMatch[] = [];
    const thresholds = ANTI_PATTERN_THRESHOLDS.SHOTGUN_SURGERY;

    // Group nodes by feature/responsibility
    const featureGroups = new Map<string, GraphNode[]>();
    for (const node of this.nodes.values()) {
      const feature = node.metadata?.feature || ANTI_PATTERN_COMMON.UNKNOWN_VALUE;
      if (!featureGroups.has(feature)) {
        featureGroups.set(feature, []);
      }
      featureGroups.get(feature)!.push(node);
    }

    // Check if feature implementation is scattered
    for (const [feature, nodes] of featureGroups.entries()) {
      const uniqueFiles = new Set(nodes.map(n => n.filePath));

      if (uniqueFiles.size >= thresholds.FILE_THRESHOLD) {
        const severity = uniqueFiles.size >= thresholds.HIGH_FILE_COUNT ? 'high' : 'medium';

        matches.push({
          type: AntiPatternType.SHOTGUN_SURGERY,
          severity,
          confidence: calculateConfidence(uniqueFiles.size, thresholds.FILE_THRESHOLD),
          nodes,
          description: `Feature '${feature}' scattered across ${uniqueFiles.size} files`,
          recommendation: ANTI_PATTERN_RECOMMENDATIONS.SHOTGUN_SURGERY,
          location: {
            filePath: nodes[0].filePath,
            lineNumber: nodes[0].lineNumber,
          },
          metrics: {
            affectedFiles: uniqueFiles.size,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Detect Long Parameter List anti-pattern
   * Functions with too many parameters
   */
  private detectLongParameterLists(): AntiPatternMatch[] {
    const matches: AntiPatternMatch[] = [];
    const thresholds = ANTI_PATTERN_THRESHOLDS.LONG_PARAMETER_LIST;

    for (const node of this.nodes.values()) {
      if (node.type !== NodeType.FUNCTION) {
        continue;
      }

      const paramCount = node.metadata?.parameters?.length || 0;

      if (paramCount >= thresholds.PARAM_THRESHOLD) {
        const severity = paramCount >= thresholds.HIGH_PARAM_COUNT ? 'high' : 'medium';

        matches.push({
          type: AntiPatternType.LONG_PARAMETER_LIST,
          severity,
          confidence: calculateConfidence(paramCount, thresholds.PARAM_THRESHOLD),
          nodes: [node],
          description: `Function '${node.name}' has ${paramCount} parameters`,
          recommendation: ANTI_PATTERN_RECOMMENDATIONS.LONG_PARAMETER_LIST,
          location: {
            filePath: node.filePath,
            lineNumber: node.lineNumber,
          },
          metrics: {
            parameterCount: paramCount,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Detect Data Clumps anti-pattern
   * Same group of parameters appearing together repeatedly
   */
  private detectDataClumps(): AntiPatternMatch[] {
    const matches: AntiPatternMatch[] = [];
    const thresholds = ANTI_PATTERN_THRESHOLDS.DATA_CLUMPS;

    // Collect parameter groups from functions
    const parameterGroups = new Map<string, GraphNode[]>();
    for (const node of this.nodes.values()) {
      // ✅ FIXED: Changed !== to === (critical bug fix!)
      if (node.type === NodeType.FUNCTION && node.metadata?.parameters) {
        const params = node.metadata.parameters
          .slice(0, thresholds.MIN_PARAM_GROUP_SIZE)
          .sort()
          .join(',');

        if (params.split(',').length >= thresholds.MIN_PARAM_GROUP_SIZE) {
          if (!parameterGroups.has(params)) {
            parameterGroups.set(params, []);
          }
          parameterGroups.get(params)!.push(node);
        }
      }
    }

    // Check for repeated parameter groups
    for (const [params, nodes] of parameterGroups.entries()) {
      if (nodes.length >= thresholds.MIN_OCCURRENCES) {
        const severity = nodes.length >= thresholds.HIGH_OCCURRENCES ? 'high' : 'medium';

        matches.push({
          type: AntiPatternType.DATA_CLUMPS,
          severity,
          confidence: calculateConfidence(nodes.length, thresholds.MIN_OCCURRENCES),
          nodes,
          description: `Parameter group (${params}) appears in ${nodes.length} functions`,
          recommendation: ANTI_PATTERN_RECOMMENDATIONS.DATA_CLUMPS,
          location: {
            filePath: nodes[0].filePath,
            lineNumber: nodes[0].lineNumber,
          },
          metrics: {
            affectedFiles: new Set(nodes.map(n => n.filePath)).size,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.nodes.clear();
    this.relationships.clear();
  }
}

suite('Pattern Identification - Anti-Pattern Detection Tests', () => {
  let testWorkspacePath: string;
  let detector: AntiPatternDetector;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('anti-pattern-tests');
    detector = new AntiPatternDetector();
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    detector.clear();
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Anti-Pattern Detection', () => {
    test('Should detect God Object anti-pattern', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const testData = ANTI_PATTERN_TEST_DATA.GOD_OBJECT;

      // Create a class with too many methods and dependencies
      const godClass = createTestNode(
        'god-class',
        NodeType.CLASS,
        testData.CLASS_NAME,
        testWorkspacePath,
        testData.FILE_NAME,
        testData.LINE_NUMBER,
        {
          methods: Array.from({ length: testData.METHOD_COUNT }, (_, i) => `method${i + 1}`),
        }
      );

      detector.addNode(godClass);

      // Add dependencies
      addMultipleRelationships(
        detector,
        testData.DEPENDENCY_COUNT,
        'dep',
        RelationType.DEPENDS_ON,
        'god-class',
        'external'
      );

      const antiPatterns = detector.detectAntiPatterns();
      const godObject = antiPatterns.find(p => p.type === AntiPatternType.GOD_OBJECT);

      assert.ok(godObject, 'Should detect God Object');
      assert.strictEqual(godObject!.nodes[0].name, testData.CLASS_NAME);
      assert.ok(['medium', 'high', 'critical'].includes(godObject!.severity));
      assert.ok(godObject!.confidence > 0.5);
      assert.strictEqual(godObject!.metrics?.methodCount, testData.METHOD_COUNT);
      assert.strictEqual(godObject!.metrics?.dependencyCount, testData.DEPENDENCY_COUNT);
      assert.ok(godObject!.recommendation.toLowerCase().includes('split'));

      console.log(`✓ God Object detected: ${godObject!.description}`);
    });

    test('Should detect Spaghetti Code anti-pattern', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const testData = ANTI_PATTERN_TEST_DATA.SPAGHETTI_CODE;

      const complexFunction = createTestNode(
        'complex-func',
        NodeType.FUNCTION,
        testData.FUNCTION_NAME,
        testWorkspacePath,
        testData.FILE_NAME,
        testData.LINE_NUMBER,
        {
          cyclomaticComplexity: testData.COMPLEXITY,
          lineCount: testData.LINE_COUNT,
        }
      );

      detector.addNode(complexFunction);

      const antiPatterns = detector.detectAntiPatterns();
      const spaghettiCode = antiPatterns.find(p => p.type === AntiPatternType.SPAGHETTI_CODE);

      assert.ok(spaghettiCode, 'Should detect Spaghetti Code');
      assert.strictEqual(spaghettiCode!.nodes[0].name, testData.FUNCTION_NAME);
      assert.ok(['medium', 'high', 'critical'].includes(spaghettiCode!.severity));
      assert.strictEqual(spaghettiCode!.metrics?.cyclomaticComplexity, testData.COMPLEXITY);
      assert.ok(spaghettiCode!.recommendation.includes(ANTI_PATTERN_RECOMMENDATIONS.SPAGHETTI_CODE));

      console.log(`✓ Spaghetti Code detected: ${spaghettiCode!.description}`);
    });

    test('Should detect Circular Dependency anti-pattern', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const testData = ANTI_PATTERN_TEST_DATA.CIRCULAR_DEPENDENCY;

      // Create circular dependency: A → B → C → A
      const moduleA = createTestNode(
        'module-a',
        NodeType.MODULE,
        testData.MODULE_NAMES[0],
        testWorkspacePath,
        testData.FILE_NAMES[0]
      );

      const moduleB = createTestNode(
        'module-b',
        NodeType.MODULE,
        testData.MODULE_NAMES[1],
        testWorkspacePath,
        testData.FILE_NAMES[1]
      );

      const moduleC = createTestNode(
        'module-c',
        NodeType.MODULE,
        testData.MODULE_NAMES[2],
        testWorkspacePath,
        testData.FILE_NAMES[2]
      );

      detector.addNode(moduleA);
      detector.addNode(moduleB);
      detector.addNode(moduleC);

      detector.addRelationship({
        id: 'a-to-b',
        type: RelationType.IMPORTS,
        sourceId: 'module-a',
        targetId: 'module-b',
      });

      detector.addRelationship({
        id: 'b-to-c',
        type: RelationType.IMPORTS,
        sourceId: 'module-b',
        targetId: 'module-c',
      });

      detector.addRelationship({
        id: 'c-to-a',
        type: RelationType.IMPORTS,
        sourceId: 'module-c',
        targetId: 'module-a',
      });

      const antiPatterns = detector.detectAntiPatterns();
      const circularDep = antiPatterns.find(p => p.type === AntiPatternType.CIRCULAR_DEPENDENCY);

      assert.ok(circularDep, 'Should detect Circular Dependency');
      assert.strictEqual(circularDep!.confidence, ANTI_PATTERN_THRESHOLDS.CIRCULAR_DEPENDENCY.CONFIDENCE);
      assert.ok(circularDep!.nodes.length >= 3);
      assert.ok(circularDep!.description.includes('Circular dependency'));
      assert.ok(circularDep!.recommendation.includes(ANTI_PATTERN_RECOMMENDATIONS.CIRCULAR_DEPENDENCY));

      console.log(`✓ Circular Dependency detected: ${circularDep!.description}`);
    });

    test('Should detect Feature Envy anti-pattern', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const testData = ANTI_PATTERN_TEST_DATA.FEATURE_ENVY;

      const envyFunction = createTestNode(
        'envy-func',
        NodeType.FUNCTION,
        testData.FUNCTION_NAME,
        testWorkspacePath,
        testData.FILE_NAME,
        testData.LINE_NUMBER
      );

      detector.addNode(envyFunction);

      // Create target methods in external class
      for (let i = 0; i < testData.CALL_COUNT; i++) {
        const targetMethod = createTestNode(
          `target-${i}`,
          NodeType.FUNCTION,
          `getPrice${i}`,
          testWorkspacePath,
          testData.TARGET_FILE,
          10 + i,
          {
            className: testData.TARGET_CLASS,
          }
        );

        detector.addNode(targetMethod);

        detector.addRelationship({
          id: `call-${i}`,
          type: RelationType.CALLS,
          sourceId: 'envy-func',
          targetId: `target-${i}`,
        });
      }

      const antiPatterns = detector.detectAntiPatterns();
      const featureEnvy = antiPatterns.find(p => p.type === AntiPatternType.FEATURE_ENVY);

      assert.ok(featureEnvy, 'Should detect Feature Envy');
      assert.strictEqual(featureEnvy!.nodes[0].name, testData.FUNCTION_NAME);
      assert.ok(featureEnvy!.metrics?.externalCalls! >= ANTI_PATTERN_THRESHOLDS.FEATURE_ENVY.CALL_THRESHOLD);
      assert.ok(featureEnvy!.description.includes(testData.TARGET_CLASS));
      assert.ok(featureEnvy!.recommendation.includes(ANTI_PATTERN_RECOMMENDATIONS.FEATURE_ENVY));

      console.log(`✓ Feature Envy detected: ${featureEnvy!.description}`);
    });

    test('Should detect Shotgun Surgery anti-pattern', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const testData = ANTI_PATTERN_TEST_DATA.SHOTGUN_SURGERY;

      // Create feature scattered across multiple files
      for (let i = 0; i < testData.FILE_COUNT; i++) {
        const node = createTestNode(
          `auth-node-${i}`,
          NodeType.FUNCTION,
          `authFunction${i}`,
          testWorkspacePath,
          `file${i}.ts`,
          1,
          {
            feature: testData.FEATURE_NAME,
          }
        );

        detector.addNode(node);
      }

      const antiPatterns = detector.detectAntiPatterns();
      const shotgunSurgery = antiPatterns.find(p => p.type === AntiPatternType.SHOTGUN_SURGERY);

      assert.ok(shotgunSurgery, 'Should detect Shotgun Surgery');
      assert.ok(shotgunSurgery!.metrics?.affectedFiles! >= ANTI_PATTERN_THRESHOLDS.SHOTGUN_SURGERY.FILE_THRESHOLD);
      assert.ok(shotgunSurgery!.description.includes(testData.FEATURE_NAME));
      assert.ok(shotgunSurgery!.recommendation.includes(ANTI_PATTERN_RECOMMENDATIONS.SHOTGUN_SURGERY));

      console.log(`✓ Shotgun Surgery detected: ${shotgunSurgery!.description}`);
    });

    test('Should detect Long Parameter List anti-pattern', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const testData = ANTI_PATTERN_TEST_DATA.LONG_PARAMETER_LIST;

      const longParamFunction = createTestNode(
        'long-param-func',
        NodeType.FUNCTION,
        testData.FUNCTION_NAME,
        testWorkspacePath,
        testData.FILE_NAME,
        testData.LINE_NUMBER,
        {
          parameters: [...testData.PARAMETERS],
        }
      );

      detector.addNode(longParamFunction);

      const antiPatterns = detector.detectAntiPatterns();
      const longParamList = antiPatterns.find(p => p.type === AntiPatternType.LONG_PARAMETER_LIST);

      assert.ok(longParamList, 'Should detect Long Parameter List');
      assert.strictEqual(longParamList!.nodes[0].name, testData.FUNCTION_NAME);
      assert.strictEqual(longParamList!.metrics?.parameterCount, testData.PARAMETERS.length);
      assert.ok(longParamList!.recommendation.includes(ANTI_PATTERN_RECOMMENDATIONS.LONG_PARAMETER_LIST));

      console.log(`✓ Long Parameter List detected: ${longParamList!.description}`);
    });

    test('Should detect Data Clumps anti-pattern', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const testData = ANTI_PATTERN_TEST_DATA.DATA_CLUMPS;

      // Create multiple functions with same parameter group
      for (let i = 0; i < testData.FUNCTION_COUNT; i++) {
        const func = createTestNode(
          `func-${i}`,
          NodeType.FUNCTION,
          `process${i}`,
          testWorkspacePath,
          `processor${i}.ts`,
          testData.LINE_NUMBER,
          {
            parameters: [...testData.COMMON_PARAMS, `extra${i}`],
          }
        );

        detector.addNode(func);
      }

      const antiPatterns = detector.detectAntiPatterns();
      const dataClumps = antiPatterns.find(p => p.type === AntiPatternType.DATA_CLUMPS);

      assert.ok(dataClumps, 'Should detect Data Clumps');
      assert.ok(dataClumps!.nodes.length >= ANTI_PATTERN_THRESHOLDS.DATA_CLUMPS.MIN_OCCURRENCES);
      assert.ok(dataClumps!.description.includes(testData.COMMON_PARAMS.join(',')));
      assert.ok(dataClumps!.recommendation.includes(ANTI_PATTERN_RECOMMENDATIONS.DATA_CLUMPS));

      console.log(`✓ Data Clumps detected: ${dataClumps!.description}`);
    });
  });
});

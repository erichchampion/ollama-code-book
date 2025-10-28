/**
 * Pattern Identification - Architecture Patterns Tests
 * Tests detection of common architectural patterns
 *
 * Tests architecture pattern detection for:
 * - MVC pattern
 * - Repository pattern
 * - Singleton pattern
 * - Factory pattern
 * - Observer pattern
 * - Strategy pattern
 * - Decorator pattern
 * - Adapter pattern
 */

import * as assert from 'assert';
import * as path from 'path';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import {
  PROVIDER_TEST_TIMEOUTS,
  PATTERN_DETECTION_SCORING,
  PATTERN_TEST_DATA,
} from '../helpers/test-constants';
import { NodeType, GraphNode } from '../helpers/graph-types';

/**
 * Pattern types
 */
enum PatternType {
  MVC = 'mvc',
  REPOSITORY = 'repository',
  SINGLETON = 'singleton',
  FACTORY = 'factory',
  OBSERVER = 'observer',
  STRATEGY = 'strategy',
  DECORATOR = 'decorator',
  ADAPTER = 'adapter',
}

/**
 * Pattern detection result
 */
interface PatternMatch {
  type: PatternType;
  confidence: number; // 0-1
  nodes: GraphNode[];
  description: string;
  location: {
    filePath: string;
    lineNumber: number;
  };
}

/**
 * Pattern signature for detection
 */
interface PatternSignature {
  type: PatternType;
  requiredNodes: {
    type: NodeType;
    namePattern: RegExp;
  }[];
  requiredMethods?: string[];
  description: string;
}

/**
 * Pattern Detector
 */
class PatternDetector {
  private nodes: Map<string, GraphNode> = new Map();
  private patterns: PatternSignature[] = [];

  constructor() {
    this.initializePatternSignatures();
  }

  /**
   * Initialize pattern signatures
   */
  private initializePatternSignatures(): void {
    // MVC Pattern
    this.patterns.push({
      type: PatternType.MVC,
      requiredNodes: [
        { type: NodeType.CLASS, namePattern: /Controller$/i },
        { type: NodeType.CLASS, namePattern: /Model$/i },
        { type: NodeType.CLASS, namePattern: /View$/i },
      ],
      description: 'Model-View-Controller architectural pattern',
    });

    // Repository Pattern
    this.patterns.push({
      type: PatternType.REPOSITORY,
      requiredNodes: [
        { type: NodeType.CLASS, namePattern: /Repository$/i },
        { type: NodeType.INTERFACE, namePattern: /I.*Repository$/i },
      ],
      requiredMethods: ['findById', 'save', 'delete'],
      description: 'Repository pattern for data access abstraction',
    });

    // Singleton Pattern
    this.patterns.push({
      type: PatternType.SINGLETON,
      requiredNodes: [
        { type: NodeType.CLASS, namePattern: /Singleton$|.*Connection$|.*Manager$/i },
      ],
      requiredMethods: ['getInstance'],
      description: 'Singleton pattern ensuring single instance',
    });

    // Factory Pattern
    this.patterns.push({
      type: PatternType.FACTORY,
      requiredNodes: [
        { type: NodeType.CLASS, namePattern: /Factory$/i },
      ],
      requiredMethods: ['create', 'make'],
      description: 'Factory pattern for object creation',
    });

    // Observer Pattern
    this.patterns.push({
      type: PatternType.OBSERVER,
      requiredNodes: [
        { type: NodeType.CLASS, namePattern: /Subject$|Observable$/i },
        { type: NodeType.CLASS, namePattern: /Observer$/i },
      ],
      requiredMethods: ['subscribe', 'notify', 'update'],
      description: 'Observer pattern for event handling',
    });

    // Strategy Pattern
    this.patterns.push({
      type: PatternType.STRATEGY,
      requiredNodes: [
        { type: NodeType.INTERFACE, namePattern: /Strategy$/i },
        { type: NodeType.CLASS, namePattern: /.*Strategy$/i },
      ],
      requiredMethods: ['execute'],
      description: 'Strategy pattern for algorithm selection',
    });

    // Decorator Pattern
    this.patterns.push({
      type: PatternType.DECORATOR,
      requiredNodes: [
        { type: NodeType.CLASS, namePattern: /Decorator$/i },
      ],
      description: 'Decorator pattern for dynamic behavior extension',
    });

    // Adapter Pattern
    this.patterns.push({
      type: PatternType.ADAPTER,
      requiredNodes: [
        { type: NodeType.CLASS, namePattern: /Adapter$/i },
      ],
      requiredMethods: ['adapt', 'convert'],
      description: 'Adapter pattern for interface conversion',
    });
  }

  /**
   * Add node to detector
   */
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  /**
   * Detect patterns in the codebase
   */
  detectPatterns(): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const signature of this.patterns) {
      const match = this.detectPattern(signature);
      if (match) {
        matches.push(match);
      }
    }

    return matches;
  }

  /**
   * Detect a specific pattern
   */
  private detectPattern(signature: PatternSignature): PatternMatch | null {
    const matchingNodes: GraphNode[] = [];
    let confidence = 0;

    // Check required nodes
    for (const requirement of signature.requiredNodes) {
      const found = Array.from(this.nodes.values()).find(
        node =>
          node.type === requirement.type &&
          requirement.namePattern.test(node.name)
      );

      if (!found) {
        return null; // Pattern not matched
      }

      matchingNodes.push(found);
      confidence += PATTERN_DETECTION_SCORING.NODE_MATCH_WEIGHT;
    }

    // Check required methods
    if (signature.requiredMethods) {
      const methodCount = signature.requiredMethods.length;
      let foundMethods = 0;

      for (const node of matchingNodes) {
        // Check methods in metadata
        if (node.metadata?.methods) {
          const methods = node.metadata.methods as string[];
          foundMethods += signature.requiredMethods.filter(m =>
            methods.some(nodeMethod => nodeMethod.toLowerCase().includes(m.toLowerCase()))
          ).length;
        }
      }

      if (foundMethods > 0) {
        confidence += (foundMethods / methodCount) * PATTERN_DETECTION_SCORING.METHOD_MATCH_WEIGHT;
      }
    }

    // Normalize confidence to 0-1
    confidence = Math.min(confidence, PATTERN_DETECTION_SCORING.MAX_CONFIDENCE);

    // Only return if confidence is reasonable
    if (confidence < PATTERN_DETECTION_SCORING.MIN_CONFIDENCE) {
      return null;
    }

    const primaryNode = matchingNodes[0];
    return {
      type: signature.type,
      confidence,
      nodes: matchingNodes,
      description: signature.description,
      location: {
        filePath: primaryNode.filePath,
        lineNumber: primaryNode.lineNumber,
      },
    };
  }

  /**
   * Clear all nodes
   */
  clear(): void {
    this.nodes.clear();
  }
}

/**
 * Generic helper: Create a graph node
 */
function createNode(
  id: string,
  type: NodeType,
  name: string,
  testWorkspacePath: string,
  dir: string,
  file: string,
  lineNumber: number,
  methods: readonly string[],
  description?: string
): GraphNode {
  return {
    id,
    type,
    name,
    filePath: path.join(testWorkspacePath, dir, file),
    lineNumber,
    metadata: {
      methods,
      ...(description && { description }),
    },
  };
}

/**
 * Helper: Create MVC pattern nodes
 */
function createMVCPattern(testWorkspacePath: string, detector: PatternDetector): void {
  const { CONTROLLER, MODEL, VIEW } = PATTERN_TEST_DATA.MVC;

  detector.addNode(
    createNode(
      'user-controller',
      NodeType.CLASS,
      'UserController',
      testWorkspacePath,
      CONTROLLER.DIR,
      CONTROLLER.FILE,
      CONTROLLER.LINE_NUMBER,
      CONTROLLER.METHODS
    )
  );

  detector.addNode(
    createNode(
      'user-model',
      NodeType.CLASS,
      'UserModel',
      testWorkspacePath,
      MODEL.DIR,
      MODEL.FILE,
      MODEL.LINE_NUMBER,
      MODEL.METHODS
    )
  );

  detector.addNode(
    createNode(
      'user-view',
      NodeType.CLASS,
      'UserView',
      testWorkspacePath,
      VIEW.DIR,
      VIEW.FILE,
      VIEW.LINE_NUMBER,
      VIEW.METHODS
    )
  );
}

/**
 * Helper: Create Repository pattern nodes
 */
function createRepositoryPattern(testWorkspacePath: string, detector: PatternDetector): void {
  const { INTERFACE, CLASS } = PATTERN_TEST_DATA.REPOSITORY;

  detector.addNode(
    createNode(
      'user-repo-interface',
      NodeType.INTERFACE,
      'IUserRepository',
      testWorkspacePath,
      INTERFACE.DIR,
      INTERFACE.FILE,
      INTERFACE.LINE_NUMBER,
      INTERFACE.METHODS
    )
  );

  detector.addNode(
    createNode(
      'user-repo',
      NodeType.CLASS,
      'UserRepository',
      testWorkspacePath,
      CLASS.DIR,
      CLASS.FILE,
      CLASS.LINE_NUMBER,
      CLASS.METHODS
    )
  );
}

/**
 * Helper: Create Singleton pattern nodes
 */
function createSingletonPattern(testWorkspacePath: string, detector: PatternDetector): void {
  const singleton = PATTERN_TEST_DATA.SINGLETON;

  detector.addNode(
    createNode(
      'db-connection',
      NodeType.CLASS,
      'DatabaseConnection',
      testWorkspacePath,
      singleton.DIR,
      singleton.FILE,
      singleton.LINE_NUMBER,
      singleton.METHODS,
      singleton.DESCRIPTION
    )
  );
}

/**
 * Helper: Create Factory pattern nodes
 */
function createFactoryPattern(testWorkspacePath: string, detector: PatternDetector): void {
  const factory = PATTERN_TEST_DATA.FACTORY;

  detector.addNode(
    createNode(
      'user-factory',
      NodeType.CLASS,
      'UserFactory',
      testWorkspacePath,
      factory.DIR,
      factory.FILE,
      factory.LINE_NUMBER,
      factory.METHODS
    )
  );
}

/**
 * Helper: Create Observer pattern nodes
 */
function createObserverPattern(testWorkspacePath: string, detector: PatternDetector): void {
  const { SUBJECT, OBSERVER } = PATTERN_TEST_DATA.OBSERVER;

  detector.addNode(
    createNode(
      'event-subject',
      NodeType.CLASS,
      'EventSubject',
      testWorkspacePath,
      SUBJECT.DIR,
      SUBJECT.FILE,
      SUBJECT.LINE_NUMBER,
      SUBJECT.METHODS
    )
  );

  detector.addNode(
    createNode(
      'event-observer',
      NodeType.CLASS,
      'EventObserver',
      testWorkspacePath,
      OBSERVER.DIR,
      OBSERVER.FILE,
      OBSERVER.LINE_NUMBER,
      OBSERVER.METHODS
    )
  );
}

/**
 * Helper: Create Strategy pattern nodes
 */
function createStrategyPattern(testWorkspacePath: string, detector: PatternDetector): void {
  const { INTERFACE, CLASS } = PATTERN_TEST_DATA.STRATEGY;

  detector.addNode(
    createNode(
      'payment-strategy-interface',
      NodeType.INTERFACE,
      'PaymentStrategy',
      testWorkspacePath,
      INTERFACE.DIR,
      INTERFACE.FILE,
      INTERFACE.LINE_NUMBER,
      INTERFACE.METHODS
    )
  );

  detector.addNode(
    createNode(
      'credit-card-strategy',
      NodeType.CLASS,
      'CreditCardStrategy',
      testWorkspacePath,
      CLASS.DIR,
      CLASS.FILE,
      CLASS.LINE_NUMBER,
      CLASS.METHODS
    )
  );
}

/**
 * Helper: Create Decorator pattern nodes
 */
function createDecoratorPattern(testWorkspacePath: string, detector: PatternDetector): void {
  const decorator = PATTERN_TEST_DATA.DECORATOR;

  detector.addNode(
    createNode(
      'logger-decorator',
      NodeType.CLASS,
      'LoggerDecorator',
      testWorkspacePath,
      decorator.DIR,
      decorator.FILE,
      decorator.LINE_NUMBER,
      decorator.METHODS
    )
  );
}

/**
 * Helper: Create Adapter pattern nodes
 */
function createAdapterPattern(testWorkspacePath: string, detector: PatternDetector): void {
  const adapter = PATTERN_TEST_DATA.ADAPTER;

  detector.addNode(
    createNode(
      'legacy-adapter',
      NodeType.CLASS,
      'LegacySystemAdapter',
      testWorkspacePath,
      adapter.DIR,
      adapter.FILE,
      adapter.LINE_NUMBER,
      adapter.METHODS
    )
  );
}

/**
 * Generic helper: Test pattern detection
 */
function testPatternDetection(
  testContext: Mocha.Context,
  testWorkspacePath: string,
  detector: PatternDetector,
  patternType: PatternType,
  createPatternFn: (path: string, det: PatternDetector) => void,
  minNodes: number,
  expectedNodeNames: string[]
): void {
  testContext.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

  createPatternFn(testWorkspacePath, detector);

  const patterns = detector.detectPatterns();
  const pattern = patterns.find(p => p.type === patternType);

  // Assertions
  assert.ok(pattern, `Should detect ${patternType} pattern`);
  assert.strictEqual(pattern!.type, patternType);
  assert.ok(
    pattern!.confidence >= PATTERN_DETECTION_SCORING.MIN_CONFIDENCE,
    'Should have reasonable confidence'
  );
  assert.ok(pattern!.nodes.length >= minNodes, `Should identify at least ${minNodes} nodes`);

  // Check for expected node names
  for (const nodeName of expectedNodeNames) {
    assert.ok(
      pattern!.nodes.some(n => n.name.includes(nodeName)),
      `Should include ${nodeName}`
    );
  }

  console.log(`✓ ${patternType} pattern detected (confidence: ${pattern!.confidence.toFixed(2)})`);
  console.log(`  Nodes: ${pattern!.nodes.map(n => n.name).join(', ')}`);
}

suite('Pattern Identification - Architecture Patterns Tests', () => {
  let testWorkspacePath: string;
  let detector: PatternDetector;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('pattern-architecture-tests');
    detector = new PatternDetector();
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    detector.clear();
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Architecture Pattern Detection', () => {
    test('Should detect MVC pattern', async function () {
      testPatternDetection(
        this,
        testWorkspacePath,
        detector,
        PatternType.MVC,
        createMVCPattern,
        3,
        ['Controller', 'Model', 'View']
      );
    });

    test('Should detect Repository pattern', async function () {
      testPatternDetection(
        this,
        testWorkspacePath,
        detector,
        PatternType.REPOSITORY,
        createRepositoryPattern,
        2,
        ['Repository']
      );
    });

    test('Should detect Singleton pattern', async function () {
      testPatternDetection(
        this,
        testWorkspacePath,
        detector,
        PatternType.SINGLETON,
        createSingletonPattern,
        1,
        ['Connection']
      );

      // Additional assertion for getInstance method
      const patterns = detector.detectPatterns();
      const singletonPattern = patterns.find(p => p.type === PatternType.SINGLETON);
      assert.ok(
        singletonPattern!.nodes[0].metadata?.methods?.includes('getInstance'),
        'Should have getInstance method'
      );
    });

    test('Should detect Factory pattern', async function () {
      testPatternDetection(
        this,
        testWorkspacePath,
        detector,
        PatternType.FACTORY,
        createFactoryPattern,
        1,
        ['Factory']
      );
    });

    test('Should detect Observer pattern', async function () {
      testPatternDetection(
        this,
        testWorkspacePath,
        detector,
        PatternType.OBSERVER,
        createObserverPattern,
        2,
        ['Subject', 'Observer']
      );
    });

    test('Should detect Strategy pattern', async function () {
      testPatternDetection(
        this,
        testWorkspacePath,
        detector,
        PatternType.STRATEGY,
        createStrategyPattern,
        2,
        ['Strategy']
      );
    });

    test('Should detect Decorator pattern', async function () {
      testPatternDetection(
        this,
        testWorkspacePath,
        detector,
        PatternType.DECORATOR,
        createDecoratorPattern,
        1,
        ['Decorator']
      );
    });

    test('Should detect Adapter pattern', async function () {
      testPatternDetection(
        this,
        testWorkspacePath,
        detector,
        PatternType.ADAPTER,
        createAdapterPattern,
        1,
        ['Adapter']
      );
    });
  });
});

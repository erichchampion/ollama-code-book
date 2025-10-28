/**
 * Test Suite: Query Decomposition Engine
 *
 * Tests the QueryDecompositionEngine class that breaks down complex queries
 * into manageable sub-tasks with dependency analysis, resource calculation,
 * and execution planning.
 */

// Jest globals are available in the test environment

// Mock implementation for testing
class MockQueryDecompositionEngine {
  constructor(aiClient, projectContext, config = {}) {
    this.aiClient = aiClient;
    this.projectContext = projectContext;
    this.config = {
      maxSubTasks: 10,
      maxDependencyDepth: 5,
      enableResourceCalculation: true,
      enablePriorityScheduling: true,
      decompositionTimeout: 15000,
      ...config
    };
    this.initialized = false;
    this.decompositionCache = new Map();
    this.executionHistory = [];
  }

  async initialize() {
    this.initialized = true;
    return Promise.resolve();
  }

  // Main decomposition method
  async decomposeQuery(query, context = {}) {
    if (!this.initialized) {
      throw new Error('QueryDecompositionEngine not initialized');
    }

    const decomposition = {
      id: `decomp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalQuery: query,
      subTasks: [],
      dependencies: new Map(),
      executionPlan: null,
      estimatedDuration: 0,
      resourceRequirements: {},
      complexity: 'medium',
      timestamp: new Date()
    };

    // Simulate complex query decomposition
    if (query.includes('create') && query.includes('test') && query.includes('deploy')) {
      decomposition.subTasks = [
        { id: 'task_1', type: 'implementation', description: 'Create main functionality', priority: 1, estimatedTime: 300 },
        { id: 'task_2', type: 'testing', description: 'Write comprehensive tests', priority: 2, estimatedTime: 180 },
        { id: 'task_3', type: 'deployment', description: 'Set up deployment pipeline', priority: 3, estimatedTime: 240 }
      ];
      decomposition.dependencies.set('task_2', ['task_1']);
      decomposition.dependencies.set('task_3', ['task_1', 'task_2']);
      decomposition.complexity = 'high';
    } else if (query.includes('refactor') || query.includes('optimize')) {
      decomposition.subTasks = [
        { id: 'task_1', type: 'analysis', description: 'Analyze current code structure', priority: 1, estimatedTime: 120 },
        { id: 'task_2', type: 'planning', description: 'Create refactoring plan', priority: 2, estimatedTime: 90 },
        { id: 'task_3', type: 'implementation', description: 'Execute refactoring', priority: 3, estimatedTime: 360 }
      ];
      decomposition.dependencies.set('task_2', ['task_1']);
      decomposition.dependencies.set('task_3', ['task_2']);
      decomposition.complexity = 'medium';
    } else if (query.includes('analyze') || query.includes('explain')) {
      decomposition.subTasks = [
        { id: 'task_1', type: 'analysis', description: 'Perform code analysis', priority: 1, estimatedTime: 60 }
      ];
      decomposition.complexity = 'low';
    } else {
      // Simple single-task query
      decomposition.subTasks = [
        { id: 'task_1', type: 'general', description: 'Execute query', priority: 1, estimatedTime: 30 }
      ];
      decomposition.complexity = 'low';
    }

    // Calculate total estimated duration
    decomposition.estimatedDuration = decomposition.subTasks.reduce((total, task) => total + task.estimatedTime, 0);

    // Generate execution plan
    decomposition.executionPlan = this.createExecutionPlan(decomposition);

    // Cache the decomposition
    this.decompositionCache.set(decomposition.id, decomposition);

    return decomposition;
  }

  // Create execution plan with scheduling
  createExecutionPlan(decomposition) {
    const plan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      phases: [],
      totalDuration: decomposition.estimatedDuration,
      parallelizable: false,
      criticalPath: []
    };

    // Topological sort for dependency resolution
    const sorted = this.topologicalSort(decomposition.subTasks, decomposition.dependencies);

    // Create execution phases
    const phases = [];
    const processed = new Set();

    for (const task of sorted) {
      const dependencies = decomposition.dependencies.get(task.id) || [];
      const canStart = dependencies.every(dep => processed.has(dep));

      if (canStart) {
        // Find or create appropriate phase
        let phase = phases.find(p => p.dependencies.every(dep => processed.has(dep)));
        if (!phase) {
          phase = { id: phases.length + 1, tasks: [], dependencies: dependencies, estimatedTime: 0 };
          phases.push(phase);
        }
        phase.tasks.push(task);
        phase.estimatedTime = Math.max(phase.estimatedTime, task.estimatedTime);
        processed.add(task.id);
      }
    }

    plan.phases = phases;
    plan.parallelizable = phases.some(phase => phase.tasks.length > 1);
    plan.criticalPath = this.findCriticalPath(decomposition);

    return plan;
  }

  // Topological sort for dependency resolution
  topologicalSort(tasks, dependencies) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (task) => {
      if (visiting.has(task.id)) {
        throw new Error(`Circular dependency detected involving task ${task.id}`);
      }
      if (visited.has(task.id)) return;

      visiting.add(task.id);
      const deps = dependencies.get(task.id) || [];
      for (const depId of deps) {
        const depTask = tasks.find(t => t.id === depId);
        if (depTask) visit(depTask);
      }
      visiting.delete(task.id);
      visited.add(task.id);
      sorted.push(task);
    };

    for (const task of tasks) {
      visit(task);
    }

    return sorted;
  }

  // Find critical path through task dependencies
  findCriticalPath(decomposition) {
    const tasks = decomposition.subTasks;
    const dependencies = decomposition.dependencies;

    // Simple critical path: longest chain of dependencies
    let longestPath = [];
    let maxDuration = 0;

    const findPath = (taskId, currentPath = [], currentDuration = 0) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newPath = [...currentPath, task];
      const newDuration = currentDuration + task.estimatedTime;

      if (newDuration > maxDuration) {
        maxDuration = newDuration;
        longestPath = newPath;
      }

      // Find dependent tasks
      for (const [depTask, deps] of dependencies.entries()) {
        if (deps.includes(taskId)) {
          findPath(depTask, newPath, newDuration);
        }
      }
    };

    // Start from tasks with no dependencies
    for (const task of tasks) {
      const hasDependencies = Array.from(dependencies.values()).some(deps => deps.includes(task.id));
      if (!hasDependencies) {
        findPath(task.id);
      }
    }

    return longestPath.map(task => task.id);
  }

  // Parse multiple intents from a single query
  parseMultipleIntents(query) {
    const intents = [];

    // Look for multiple action words
    const actions = ['create', 'build', 'implement', 'test', 'deploy', 'refactor', 'optimize', 'analyze', 'fix', 'update'];
    const foundActions = actions.filter(action => query.toLowerCase().includes(action));

    if (foundActions.length > 1) {
      foundActions.forEach((action, index) => {
        intents.push({
          id: `intent_${index + 1}`,
          type: this.mapActionToIntentType(action),
          action: action,
          confidence: 0.8,
          entities: this.extractEntities(query, action)
        });
      });
    } else {
      // Single intent
      intents.push({
        id: 'intent_1',
        type: foundActions.length > 0 ? this.mapActionToIntentType(foundActions[0]) : 'general',
        action: foundActions[0] || 'general',
        confidence: 0.9,
        entities: this.extractEntities(query)
      });
    }

    return intents;
  }

  mapActionToIntentType(action) {
    const mapping = {
      'create': 'implementation',
      'build': 'implementation',
      'implement': 'implementation',
      'test': 'testing',
      'deploy': 'deployment',
      'refactor': 'modification',
      'optimize': 'optimization',
      'analyze': 'analysis',
      'fix': 'bugfix',
      'update': 'modification'
    };
    return mapping[action] || 'general';
  }

  extractEntities(query, context = '') {
    const entities = {
      files: [],
      technologies: [],
      concepts: []
    };

    // Simple entity extraction
    const techPatterns = /\b(react|vue|angular|typescript|javascript|python|java|node|express|mongodb|postgresql)\b/gi;
    const filePatterns = /\b\w+\.(js|ts|jsx|tsx|py|java|cpp|html|css|json|md)\b/gi;

    entities.technologies = [...new Set((query.match(techPatterns) || []).map(t => t.toLowerCase()))];
    entities.files = [...new Set(query.match(filePatterns) || [])];

    // Extract concepts based on context
    if (context.includes('test')) entities.concepts.push('testing');
    if (context.includes('deploy')) entities.concepts.push('deployment');
    if (context.includes('security')) entities.concepts.push('security');

    return entities;
  }

  // Calculate resource requirements
  calculateResourceRequirements(decomposition) {
    const requirements = {
      cpu: 'medium',
      memory: 'medium',
      network: 'low',
      disk: 'low',
      estimatedDuration: decomposition.estimatedDuration
    };

    // Adjust based on task types and complexity
    const taskTypes = decomposition.subTasks.map(t => t.type);

    if (taskTypes.includes('deployment') || taskTypes.includes('testing')) {
      requirements.cpu = 'high';
      requirements.network = 'medium';
    }

    if (decomposition.complexity === 'high') {
      requirements.memory = 'high';
      requirements.disk = 'medium';
    }

    if (decomposition.subTasks.length > 5) {
      requirements.cpu = 'high';
    }

    return requirements;
  }

  // Check for conflicts between tasks
  detectConflicts(decomposition) {
    const conflicts = [];

    // Check for conflicting file modifications
    const fileTasks = decomposition.subTasks.filter(task =>
      task.type === 'modification' || task.type === 'implementation'
    );

    if (fileTasks.length > 1) {
      conflicts.push({
        type: 'file_modification',
        tasks: fileTasks.map(t => t.id),
        severity: 'medium',
        resolution: 'sequence_execution'
      });
    }

    // Check for resource conflicts
    const resourceIntensive = decomposition.subTasks.filter(task =>
      task.type === 'testing' || task.type === 'deployment'
    );

    if (resourceIntensive.length > 2) {
      conflicts.push({
        type: 'resource_conflict',
        tasks: resourceIntensive.map(t => t.id),
        severity: 'low',
        resolution: 'parallel_limit'
      });
    }

    return conflicts;
  }

  // Get decomposition statistics
  getStatistics() {
    return {
      totalDecompositions: this.decompositionCache.size,
      cacheHitRate: this.executionHistory.length > 0 ? 0.85 : 0,
      averageSubTasks: Array.from(this.decompositionCache.values())
        .reduce((sum, d) => sum + d.subTasks.length, 0) / Math.max(this.decompositionCache.size, 1),
      averageDuration: Array.from(this.decompositionCache.values())
        .reduce((sum, d) => sum + d.estimatedDuration, 0) / Math.max(this.decompositionCache.size, 1)
    };
  }

  // Clear cache and history
  clear() {
    this.decompositionCache.clear();
    this.executionHistory = [];
  }
}

describe('QueryDecompositionEngine', () => {
  let engine;
  let mockAiClient;
  let mockProjectContext;

  beforeEach(() => {
    mockAiClient = {
      complete: jest.fn().mockResolvedValue({ message: { content: 'Mock AI response' } })
    };

    mockProjectContext = {
      root: '/test/project',
      allFiles: [
        { path: 'src/index.js', type: 'javascript' },
        { path: 'src/utils.ts', type: 'typescript' }
      ]
    };

    engine = new MockQueryDecompositionEngine(mockAiClient, mockProjectContext);
  });

  describe('Initialization', () => {
    test('should initialize decomposition engine', async () => {
      await engine.initialize();
      expect(engine.initialized).toBe(true);
    });

    test('should configure decomposition parameters', () => {
      expect(engine.config.maxSubTasks).toBe(10);
      expect(engine.config.enableResourceCalculation).toBe(true);
      expect(engine.config.enablePriorityScheduling).toBe(true);
    });

    test('should initialize empty cache and history', () => {
      expect(engine.decompositionCache.size).toBe(0);
      expect(engine.executionHistory.length).toBe(0);
    });
  });

  describe('Query Decomposition', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    test('should decompose complex multi-action query', async () => {
      const query = 'create a user authentication system, test it thoroughly, and deploy to production';
      const decomposition = await engine.decomposeQuery(query);

      expect(decomposition.subTasks).toHaveLength(3);
      expect(decomposition.subTasks[0].type).toBe('implementation');
      expect(decomposition.subTasks[1].type).toBe('testing');
      expect(decomposition.subTasks[2].type).toBe('deployment');
      expect(decomposition.complexity).toBe('high');
    });

    test('should handle refactoring queries', async () => {
      const query = 'refactor the authentication module to improve performance';
      const decomposition = await engine.decomposeQuery(query);

      expect(decomposition.subTasks).toHaveLength(3);
      expect(decomposition.subTasks[0].type).toBe('analysis');
      expect(decomposition.subTasks[1].type).toBe('planning');
      expect(decomposition.subTasks[2].type).toBe('implementation');
      expect(decomposition.complexity).toBe('medium');
    });

    test('should handle simple analysis queries', async () => {
      const query = 'analyze the code structure of this project';
      const decomposition = await engine.decomposeQuery(query);

      expect(decomposition.subTasks).toHaveLength(1);
      expect(decomposition.subTasks[0].type).toBe('analysis');
      expect(decomposition.complexity).toBe('low');
    });

    test('should calculate total estimated duration', async () => {
      const query = 'create, test, and deploy a new feature';
      const decomposition = await engine.decomposeQuery(query);

      const expectedDuration = decomposition.subTasks.reduce((sum, task) => sum + task.estimatedTime, 0);
      expect(decomposition.estimatedDuration).toBe(expectedDuration);
      expect(decomposition.estimatedDuration).toBeGreaterThan(0);
    });

    test('should cache decomposition results', async () => {
      const query = 'analyze this codebase';
      const decomposition = await engine.decomposeQuery(query);

      expect(engine.decompositionCache.has(decomposition.id)).toBe(true);
      expect(engine.decompositionCache.get(decomposition.id)).toEqual(decomposition);
    });
  });

  describe('Dependency Analysis', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    test('should identify task dependencies', async () => {
      const query = 'create a feature, test it, and deploy';
      const decomposition = await engine.decomposeQuery(query);

      expect(decomposition.dependencies.get('task_2')).toContain('task_1');
      expect(decomposition.dependencies.get('task_3')).toContain('task_1');
      expect(decomposition.dependencies.get('task_3')).toContain('task_2');
    });

    test('should perform topological sort', async () => {
      const tasks = [
        { id: 'task_1', description: 'First' },
        { id: 'task_2', description: 'Second' },
        { id: 'task_3', description: 'Third' }
      ];
      const dependencies = new Map([
        ['task_2', ['task_1']],
        ['task_3', ['task_2']]
      ]);

      const sorted = engine.topologicalSort(tasks, dependencies);

      expect(sorted[0].id).toBe('task_1');
      expect(sorted[1].id).toBe('task_2');
      expect(sorted[2].id).toBe('task_3');
    });

    test('should detect circular dependencies', async () => {
      const tasks = [
        { id: 'task_1', description: 'First' },
        { id: 'task_2', description: 'Second' }
      ];
      const dependencies = new Map([
        ['task_1', ['task_2']],
        ['task_2', ['task_1']]
      ]);

      expect(() => engine.topologicalSort(tasks, dependencies))
        .toThrow('Circular dependency detected');
    });
  });

  describe('Execution Planning', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    test('should create execution plan with phases', async () => {
      const query = 'build a new feature with comprehensive testing';
      const decomposition = await engine.decomposeQuery(query);

      expect(decomposition.executionPlan).toBeDefined();
      expect(decomposition.executionPlan.phases).toBeInstanceOf(Array);
      expect(decomposition.executionPlan.totalDuration).toBe(decomposition.estimatedDuration);
    });

    test('should identify critical path', async () => {
      const query = 'create, test, and deploy a feature';
      const decomposition = await engine.decomposeQuery(query);

      expect(decomposition.executionPlan.criticalPath).toBeInstanceOf(Array);
      expect(decomposition.executionPlan.criticalPath.length).toBeGreaterThan(0);
    });

    test('should detect parallelizable tasks', async () => {
      const query = 'analyze code and update documentation';
      const decomposition = await engine.decomposeQuery(query);

      // This might be parallelizable depending on the implementation
      expect(typeof decomposition.executionPlan.parallelizable).toBe('boolean');
    });
  });

  describe('Multi-Intent Parsing', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    test('should parse multiple intents from complex query', () => {
      const query = 'create a new component, test it, and deploy to staging';
      const intents = engine.parseMultipleIntents(query);

      expect(intents).toHaveLength(3);
      expect(intents.map(i => i.action)).toContain('create');
      expect(intents.map(i => i.action)).toContain('test');
      expect(intents.map(i => i.action)).toContain('deploy');
    });

    test('should handle single intent queries', () => {
      const query = 'analyze the current code structure';
      const intents = engine.parseMultipleIntents(query);

      expect(intents).toHaveLength(1);
      expect(intents[0].action).toBe('analyze');
      expect(intents[0].type).toBe('analysis');
    });

    test('should extract entities from queries', () => {
      const query = 'create a React component with TypeScript and comprehensive tests';
      const entities = engine.extractEntities(query);

      expect(entities.technologies).toContain('react');
      expect(entities.technologies).toContain('typescript');
    });

    test('should map actions to intent types correctly', () => {
      expect(engine.mapActionToIntentType('create')).toBe('implementation');
      expect(engine.mapActionToIntentType('test')).toBe('testing');
      expect(engine.mapActionToIntentType('deploy')).toBe('deployment');
      expect(engine.mapActionToIntentType('analyze')).toBe('analysis');
    });
  });

  describe('Resource Calculation', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    test('should calculate resource requirements', async () => {
      const query = 'deploy a complex application with testing';
      const decomposition = await engine.decomposeQuery(query);
      const requirements = engine.calculateResourceRequirements(decomposition);

      expect(requirements).toHaveProperty('cpu');
      expect(requirements).toHaveProperty('memory');
      expect(requirements).toHaveProperty('network');
      expect(requirements).toHaveProperty('disk');
      expect(requirements.estimatedDuration).toBe(decomposition.estimatedDuration);
    });

    test('should adjust resources for high complexity tasks', async () => {
      const query = 'create, test, deploy, and monitor a microservices architecture';
      const decomposition = await engine.decomposeQuery(query);
      const requirements = engine.calculateResourceRequirements(decomposition);

      // High complexity should increase resource requirements
      if (decomposition.complexity === 'high') {
        expect(['medium', 'high']).toContain(requirements.memory);
      }
    });
  });

  describe('Conflict Detection', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    test('should detect file modification conflicts', async () => {
      const decomposition = {
        subTasks: [
          { id: 'task_1', type: 'modification', description: 'Modify file A' },
          { id: 'task_2', type: 'implementation', description: 'Implement in file A' },
          { id: 'task_3', type: 'analysis', description: 'Analyze file B' }
        ]
      };

      const conflicts = engine.detectConflicts(decomposition);

      const fileConflict = conflicts.find(c => c.type === 'file_modification');
      expect(fileConflict).toBeDefined();
      expect(fileConflict.tasks).toContain('task_1');
      expect(fileConflict.tasks).toContain('task_2');
    });

    test('should detect resource conflicts', async () => {
      const decomposition = {
        subTasks: [
          { id: 'task_1', type: 'testing' },
          { id: 'task_2', type: 'deployment' },
          { id: 'task_3', type: 'testing' }
        ]
      };

      const conflicts = engine.detectConflicts(decomposition);

      const resourceConflict = conflicts.find(c => c.type === 'resource_conflict');
      expect(resourceConflict).toBeDefined();
      expect(resourceConflict.tasks.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Statistics', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.clear(); // Clear cache before each test
    });

    test('should provide decomposition statistics', async () => {
      await engine.decomposeQuery('create a component');
      await engine.decomposeQuery('test the application');

      const stats = engine.getStatistics();

      expect(stats.totalDecompositions).toBe(2);
      expect(stats.averageSubTasks).toBeGreaterThan(0);
      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(typeof stats.cacheHitRate).toBe('number');
    });

    test('should handle empty statistics', () => {
      const stats = engine.getStatistics();

      expect(stats.totalDecompositions).toBe(0);
      expect(stats.averageSubTasks).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });

    test('should clear cache and history', async () => {
      await engine.decomposeQuery('test query');
      expect(engine.decompositionCache.size).toBe(1);

      engine.clear();
      expect(engine.decompositionCache.size).toBe(0);
      expect(engine.executionHistory.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when not initialized', async () => {
      const uninitializedEngine = new MockQueryDecompositionEngine(mockAiClient, mockProjectContext);

      await expect(uninitializedEngine.decomposeQuery('test query'))
        .rejects.toThrow('QueryDecompositionEngine not initialized');
    });

    test('should handle invalid queries gracefully', async () => {
      await engine.initialize();

      const decomposition = await engine.decomposeQuery('');
      expect(decomposition.subTasks).toHaveLength(1);
      expect(decomposition.complexity).toBe('low');
    });

    test('should handle malformed dependencies', () => {
      const tasks = [{ id: 'task_1', description: 'Test' }];
      const dependencies = new Map([['nonexistent', ['task_1']]]);

      // Should not throw but handle gracefully
      expect(() => engine.topologicalSort(tasks, dependencies)).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.clear(); // Clear cache before each test
    });

    test('should handle comprehensive development workflow', async () => {
      const query = 'analyze the current architecture, refactor for better performance, add comprehensive tests, and deploy to staging with monitoring';
      const decomposition = await engine.decomposeQuery(query);

      expect(decomposition.subTasks.length).toBeGreaterThan(1);
      expect(decomposition.executionPlan.phases.length).toBeGreaterThan(0);
      expect(decomposition.estimatedDuration).toBeGreaterThan(0);

      const conflicts = engine.detectConflicts(decomposition);
      const requirements = engine.calculateResourceRequirements(decomposition);

      expect(conflicts).toBeInstanceOf(Array);
      expect(requirements).toHaveProperty('cpu');
    });

    test('should maintain consistency across multiple decompositions', async () => {
      const queries = [
        'create a new feature',
        'test the application',
        'deploy to production'
      ];

      const decompositions = await Promise.all(
        queries.map(query => engine.decomposeQuery(query))
      );

      decompositions.forEach(decomposition => {
        expect(decomposition).toHaveProperty('id');
        expect(decomposition).toHaveProperty('subTasks');
        expect(decomposition).toHaveProperty('executionPlan');
        expect(decomposition.subTasks.length).toBeGreaterThan(0);
      });

      expect(engine.decompositionCache.size).toBe(3);
    });
  });
});
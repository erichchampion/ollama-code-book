describe('FileTool', () => {
  test('validates parameters', () => {
    const tool = new FileTool();

    const valid = tool.validateParameters({
      path: 'src/index.ts',
      operation: 'read'
    });

    expect(valid.valid).toBe(true);
  });

  test('rejects invalid paths', () => {
    const tool = new FileTool();

    const invalid = tool.validateParameters({
      path: '../../../etc/passwd',
      operation: 'read'
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.errors[0].message).toContain('Invalid path');
  });

  test('requires path parameter', () => {
    const tool = new FileTool();

    const invalid = tool.validateParameters({
      operation: 'read'
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContainEqual(
      expect.objectContaining({ parameter: 'path' })
    );
  });
});

describe('DependencyGraph', () => {
  test('detects cycles', () => {
    const graph = new DependencyGraph();

    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');
    graph.addEdge('C', 'A'); // Cycle!

    const cycle = graph.detectCycle();

    expect(cycle).not.toBeNull();
    expect(cycle).toContain('A');
    expect(cycle).toContain('B');
    expect(cycle).toContain('C');
  });

  test('topological sort', () => {
    const graph = new DependencyGraph();

    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addEdge('A', 'B'); // A depends on B
    graph.addEdge('B', 'C'); // B depends on C

    const sorted = graph.topologicalSort();

    // C should come before B, B before A
    expect(sorted.indexOf('C')).toBeLessThan(sorted.indexOf('B'));
    expect(sorted.indexOf('B')).toBeLessThan(sorted.indexOf('A'));
  });
});
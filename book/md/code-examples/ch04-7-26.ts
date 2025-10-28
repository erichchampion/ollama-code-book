/**
 * Represents a directed acyclic graph (DAG) of tool dependencies
 */
export class DependencyGraph {
  private nodes = new Map<string, DependencyNode>();

  /**
   * Add a node to the graph
   */
  addNode(callId: string, toolName: string, dependencies: string[] = []): void {
    const node: DependencyNode = {
      callId,
      toolName,
      dependencies,
      dependents: []
    };

    this.nodes.set(callId, node);

    // Update dependents
    for (const depId of dependencies) {
      const depNode = this.nodes.get(depId);
      if (depNode) {
        depNode.dependents.push(callId);
      }
    }
  }

  /**
   * Get a node by call ID
   */
  getNode(callId: string): DependencyNode | undefined {
    return this.nodes.get(callId);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): DependencyNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Detect circular dependencies
   * Returns the cycle path if found, null otherwise
   */
  detectCycle(): string[] | null {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const hasCycle = (callId: string): boolean => {
      visited.add(callId);
      recursionStack.add(callId);
      path.push(callId);

      const node = this.nodes.get(callId);
      if (!node) return false;

      for (const dep of node.dependencies) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          // Found cycle
          path.push(dep);
          return true;
        }
      }

      recursionStack.delete(callId);
      path.pop();
      return false;
    };

    for (const callId of this.nodes.keys()) {
      if (!visited.has(callId)) {
        if (hasCycle(callId)) {
          return path;
        }
      }
    }

    return null;
  }

  /**
   * Topological sort - returns execution order
   * Throws error if cycle detected
   */
  topologicalSort(): string[] {
    // Detect cycles first
    const cycle = this.detectCycle();
    if (cycle) {
      throw new Error(
        `Circular dependency detected: ${cycle.join(' -> ')}`
      );
    }

    const sorted: string[] = [];
    const visited = new Set<string>();

    const visit = (callId: string) => {
      if (visited.has(callId)) return;
      visited.add(callId);

      const node = this.nodes.get(callId);
      if (!node) return;

      // Visit dependencies first (depth-first)
      for (const dep of node.dependencies) {
        visit(dep);
      }

      sorted.push(callId);
    };

    // Visit all nodes
    for (const callId of this.nodes.keys()) {
      visit(callId);
    }

    return sorted;
  }

  /**
   * Get execution levels for parallel execution
   * Returns groups of calls that can execute in parallel
   */
  getExecutionLevels(): string[][] {
    const sorted = this.topologicalSort();
    const levels: string[][] = [];
    const nodeLevel = new Map<string, number>();

    // Calculate level for each node
    for (const callId of sorted) {
      const node = this.nodes.get(callId)!;

      // Node's level is max(dependency levels) + 1
      let level = 0;
      for (const dep of node.dependencies) {
        const depLevel = nodeLevel.get(dep) || 0;
        level = Math.max(level, depLevel + 1);
      }

      nodeLevel.set(callId, level);

      // Add to level group
      if (!levels[level]) {
        levels[level] = [];
      }
      levels[level].push(callId);
    }

    return levels;
  }

  /**
   * Get calls that have no dependencies (can execute immediately)
   */
  getRootNodes(): string[] {
    return this.getAllNodes()
      .filter(node => node.dependencies.length === 0)
      .map(node => node.callId);
  }

  /**
   * Get calls that depend on a specific call
   */
  getDependents(callId: string): string[] {
    const node = this.nodes.get(callId);
    return node ? node.dependents : [];
  }
}

interface DependencyNode {
  callId: string;
  toolName: string;
  dependencies: string[];
  dependents: string[];
}
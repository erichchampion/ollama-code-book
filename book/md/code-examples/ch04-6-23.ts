/**
 * Central registry of all available tools
 */
export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    // Validate tool
    if (!tool.name) {
      throw new Error('Tool must have a name');
    }

    if (!tool.description) {
      throw new Error(`Tool ${tool.name} must have a description`);
    }

    if (!tool.parameters) {
      throw new Error(`Tool ${tool.name} must define parameters`);
    }

    // Check for name conflicts
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`);
    }

    // Validate dependencies exist (will check later after all tools registered)
    this.tools.set(tool.name, tool);
    this.logger.debug(`Registered tool: ${tool.name}`);
  }

  /**
   * Register multiple tools
   */
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }

    // Validate all dependencies exist
    this.validateDependencies();
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool;
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool metadata for AI context
   * Returns tool definitions in the format AI models expect
   */
  getToolsForAI(): Array<{
    name: string;
    description: string;
    parameters: ToolParameters;
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  /**
   * Validate that all tool dependencies exist
   */
  private validateDependencies(): void {
    for (const [name, tool] of this.tools) {
      if (!tool.dependencies) continue;

      for (const dep of tool.dependencies) {
        if (!this.tools.has(dep)) {
          throw new Error(
            `Tool ${name} depends on ${dep}, but ${dep} is not registered`
          );
        }
      }
    }
  }

  /**
   * Get dependency graph for a tool
   * Returns all tools this tool depends on (recursively)
   */
  getDependencies(toolName: string): string[] {
    const tool = this.get(toolName);
    if (!tool.dependencies || tool.dependencies.length === 0) {
      return [];
    }

    const allDeps = new Set<string>();
    const visited = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const t = this.get(name);
      if (!t.dependencies) return;

      for (const dep of t.dependencies) {
        allDeps.add(dep);
        visit(dep);
      }
    };

    visit(toolName);
    return Array.from(allDeps);
  }

  /**
   * Get statistics about registered tools
   */
  getStats(): {
    totalTools: number;
    byCategory: Record<string, number>;
    requireApproval: number;
    cacheable: number;
  } {
    const stats = {
      totalTools: this.tools.size,
      byCategory: {} as Record<string, number>,
      requireApproval: 0,
      cacheable: 0
    };

    for (const tool of this.tools.values()) {
      // Count approval requirements
      if (tool.requiresApproval) {
        stats.requireApproval++;
      }

      // Count cacheable tools
      if (tool.cacheable) {
        stats.cacheable++;
      }

      // Categorize by type (inferred from name)
      const category = this.inferCategory(tool.name);
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    }

    return stats;
  }

  private inferCategory(toolName: string): string {
    if (toolName.startsWith('git_')) return 'Git';
    if (toolName.includes('file')) return 'File System';
    if (toolName.includes('search') || toolName.includes('analyze')) return 'Code Analysis';
    if (toolName.includes('github') || toolName.includes('api')) return 'External';
    return 'Other';
  }
}
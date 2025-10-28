/**
 * Bootstrap the tool registry with all available tools
 */
export function createToolRegistry(logger: Logger): ToolRegistry {
  const registry = new ToolRegistry(logger);

  // Register file system tools
  registry.register(new ReadFileTool());
  registry.register(new WriteFileTool());
  registry.register(new ListFilesTool());

  // Register git tools
  registry.register(new GitStatusTool());
  registry.register(new GitCommitTool());

  // Register code analysis tools
  registry.register(new SearchCodeTool());

  // Log statistics
  const stats = registry.getStats();
  logger.info(`Tool registry initialized: ${stats.totalTools} tools registered`);
  logger.debug(`Categories: ${JSON.stringify(stats.byCategory)}`);
  logger.debug(`Require approval: ${stats.requireApproval}, Cacheable: ${stats.cacheable}`);

  return registry;
}
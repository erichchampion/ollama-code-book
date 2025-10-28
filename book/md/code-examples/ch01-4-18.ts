// Sandbox tool execution
export class SandboxedToolExecutor {
  async execute(tool: Tool, parameters: Record<string, any>): Promise<ToolResult> {
    // Validate path is within project
    if (parameters.path && !this.isPathSafe(parameters.path)) {
      throw new SecurityError('Path outside project boundaries');
    }

    // Validate no shell injection
    if (parameters.command && this.hasShellInjection(parameters.command)) {
      throw new SecurityError('Potential shell injection detected');
    }

    // Execute with timeout
    const result = await Promise.race([
      tool.execute(parameters),
      this.timeout(30000)
    ]);

    return result;
  }

  private isPathSafe(path: string): boolean {
    const resolved = resolve(this.projectRoot, path);
    return resolved.startsWith(this.projectRoot);
  }
}
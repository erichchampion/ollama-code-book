export class WriteFileTool implements Tool {
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    // Imperative - tool shouldn't handle this
    const approved = await this.requestApproval(params);
    if (!approved) {
      throw new Error('Approval denied');
    }

    // Imperative - orchestrator should handle caching
    const cached = await this.checkCache(params);
    if (cached) return cached;

    await fs.writeFile(params.path, params.content);
  }
}
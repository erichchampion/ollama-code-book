export class WriteFileTool implements Tool {
  name = 'write_file';
  description = 'Write content to a file';
  requiresApproval = true; // Declarative
  cacheable = false; // Declarative
  dependencies = ['read_file']; // Declarative

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    // Just do the work, orchestrator handles approval/caching/dependencies
    await fs.writeFile(params.path, params.content);
    return { success: true, data: { bytesWritten: params.content.length } };
  }
}
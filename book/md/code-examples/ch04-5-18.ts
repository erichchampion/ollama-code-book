export class WriteFileTool implements Tool {
  readonly name = 'write_file';
  readonly description = 'Write content to a file (creates or overwrites)';
  readonly requiresApproval = true; // Destructive operation
  readonly cacheable = false;
  readonly retryable = false; // Don't retry writes
  readonly dependencies = ['read_file']; // May need to read before overwriting

  readonly parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to write (relative to working directory)'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)',
        enum: ['utf-8', 'ascii', 'base64']
      },
      createDirectories: {
        type: 'boolean',
        description: 'Create parent directories if they don\'t exist (default: true)'
      }
    },
    required: ['path', 'content']
  };

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const encoding = params.encoding || 'utf-8';
    const createDirs = params.createDirectories !== false;
    const filePath = path.resolve(context.workingDirectory, params.path);

    try {
      // Security: Ensure file is within working directory
      if (!filePath.startsWith(context.workingDirectory)) {
        return {
          callId: params.callId,
          toolName: this.name,
          success: false,
          error: {
            message: `Access denied: ${params.path} is outside working directory`,
            code: 'ACCESS_DENIED',
            recoverable: false
          },
          metadata: {
            durationMs: Date.now() - startTime,
            cached: false,
            timestamp: new Date()
          }
        };
      }

      // Create parent directories if needed
      if (createDirs) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
      }

      // Write file
      await fs.writeFile(filePath, params.content, encoding);
      const stats = await fs.stat(filePath);

      context.logger.info(`Wrote file: ${params.path} (${stats.size} bytes)`);

      return {
        callId: params.callId,
        toolName: this.name,
        success: true,
        data: {
          path: params.path,
          size: stats.size,
          encoding
        },
        metadata: {
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date(),
          approvalGranted: true
        }
      };
    } catch (error: any) {
      return {
        callId: params.callId,
        toolName: this.name,
        success: false,
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
          recoverable: false // Don't retry writes
        },
        metadata: {
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date()
        }
      };
    }
  }

  estimateCost(params: any): number {
    // Cost proportional to content size
    return Math.ceil(params.content.length / 1000);
  }
}
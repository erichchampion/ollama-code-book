import * as fs from 'fs/promises';
import * as path from 'path';

export class ReadFileTool implements Tool {
  readonly name = 'read_file';
  readonly description = 'Read the contents of a file';
  readonly requiresApproval = false;
  readonly cacheable = true;
  readonly retryable = true;

  readonly parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read (relative to working directory)'
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)',
        enum: ['utf-8', 'ascii', 'base64']
      }
    },
    required: ['path']
  };

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const encoding = params.encoding || 'utf-8';
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
            recoverable: false,
            suggestion: 'Provide a path relative to the working directory'
          },
          metadata: {
            durationMs: Date.now() - startTime,
            cached: false,
            timestamp: new Date()
          }
        };
      }

      // Read file
      const content = await fs.readFile(filePath, encoding);
      const stats = await fs.stat(filePath);

      context.logger.debug(`Read file: ${params.path} (${stats.size} bytes)`);

      return {
        callId: params.callId,
        toolName: this.name,
        success: true,
        data: {
          content,
          size: stats.size,
          lastModified: stats.mtime,
          encoding
        },
        metadata: {
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date()
        }
      };
    } catch (error: any) {
      // Handle specific errors
      if (error.code === 'ENOENT') {
        return {
          callId: params.callId,
          toolName: this.name,
          success: false,
          error: {
            message: `File not found: ${params.path}`,
            code: 'FILE_NOT_FOUND',
            recoverable: false,
            suggestion: 'Check the file path and try again'
          },
          metadata: {
            durationMs: Date.now() - startTime,
            cached: false,
            timestamp: new Date()
          }
        };
      } else if (error.code === 'EACCES') {
        return {
          callId: params.callId,
          toolName: this.name,
          success: false,
          error: {
            message: `Permission denied: ${params.path}`,
            code: 'PERMISSION_DENIED',
            recoverable: false,
            suggestion: 'Check file permissions'
          },
          metadata: {
            durationMs: Date.now() - startTime,
            cached: false,
            timestamp: new Date()
          }
        };
      }

      // Unknown error
      return {
        callId: params.callId,
        toolName: this.name,
        success: false,
        error: {
          message: error.message,
          code: 'UNKNOWN_ERROR',
          recoverable: true,
          stack: error.stack
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
    // Cost proportional to file size (if known)
    // For read operations, cost is low
    return 1;
  }
}
export class ListFilesTool implements Tool {
  readonly name = 'list_files';
  readonly description = 'List files in a directory';
  readonly requiresApproval = false;
  readonly cacheable = true;
  readonly retryable = true;

  readonly parameters: ToolParameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path (default: current directory)'
      },
      recursive: {
        type: 'boolean',
        description: 'List files recursively (default: false)'
      },
      pattern: {
        type: 'string',
        description: 'Glob pattern to filter files (e.g., "*.ts")'
      },
      includeHidden: {
        type: 'boolean',
        description: 'Include hidden files (default: false)'
      }
    }
  };

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const dirPath = path.resolve(
      context.workingDirectory,
      params.path || '.'
    );

    try {
      const files = await this.listFiles(
        dirPath,
        params.recursive || false,
        params.pattern,
        params.includeHidden || false
      );

      context.logger.debug(`Listed ${files.length} files in ${params.path || '.'}`);

      return {
        callId: params.callId,
        toolName: this.name,
        success: true,
        data: {
          files,
          count: files.length
        },
        metadata: {
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date()
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
          recoverable: true
        },
        metadata: {
          durationMs: Date.now() - startTime,
          cached: false,
          timestamp: new Date()
        }
      };
    }
  }

  private async listFiles(
    dir: string,
    recursive: boolean,
    pattern?: string,
    includeHidden?: boolean
  ): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      // Skip hidden files if not included
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (recursive) {
          const subFiles = await this.listFiles(
            fullPath,
            recursive,
            pattern,
            includeHidden
          );
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        // Apply pattern filter if specified
        if (!pattern || this.matchesPattern(entry.name, pattern)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob matching (in production, use a library like minimatch)
    const regex = new RegExp(
      pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
    );
    return regex.test(filename);
  }

  estimateCost(params: any): number {
    // Recursive listing is more expensive
    return params.recursive ? 5 : 1;
  }
}
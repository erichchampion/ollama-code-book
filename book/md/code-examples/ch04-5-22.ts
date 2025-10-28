export class SearchCodeTool implements Tool {
  readonly name = 'search_code';
  readonly description = 'Search for code patterns using regex';
  readonly requiresApproval = false;
  readonly cacheable = true;
  readonly retryable = true;
  readonly timeoutMs = 30000; // 30 second timeout

  readonly parameters: ToolParameters = {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Regex pattern to search for'
      },
      path: {
        type: 'string',
        description: 'Path to search in (default: current directory)'
      },
      filePattern: {
        type: 'string',
        description: 'File pattern to search (e.g., "*.ts")'
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Case sensitive search (default: false)'
      },
      includeContext: {
        type: 'boolean',
        description: 'Include surrounding lines (default: false)'
      },
      contextLines: {
        type: 'number',
        description: 'Number of context lines before/after match (default: 2)'
      }
    },
    required: ['pattern']
  };

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const searchPath = path.resolve(
      context.workingDirectory,
      params.path || '.'
    );

    try {
      // Build grep command (using ripgrep if available, fallback to grep)
      const useRg = await this.hasRipgrep();
      const results = useRg
        ? await this.searchWithRipgrep(searchPath, params)
        : await this.searchWithGrep(searchPath, params);

      context.logger.debug(`Found ${results.length} matches for pattern: ${params.pattern}`);

      return {
        callId: params.callId,
        toolName: this.name,
        success: true,
        data: {
          matches: results,
          count: results.length
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
          code: 'SEARCH_ERROR',
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

  private async hasRipgrep(): Promise<boolean> {
    try {
      await execAsync('which rg');
      return true;
    } catch {
      return false;
    }
  }

  private async searchWithRipgrep(
    searchPath: string,
    params: any
  ): Promise<Array<{ file: string; line: number; content: string; context?: string[] }>> {
    // Build ripgrep command
    let cmd = 'rg --json';

    if (!params.caseSensitive) cmd += ' -i';
    if (params.filePattern) cmd += ` -g "${params.filePattern}"`;
    if (params.includeContext) cmd += ` -C ${params.contextLines || 2}`;

    cmd += ` "${params.pattern}" "${searchPath}"`;

    const { stdout } = await execAsync(cmd);

    // Parse ripgrep JSON output
    const results = [];
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;

      try {
        const match = JSON.parse(line);
        if (match.type === 'match') {
          results.push({
            file: match.data.path.text,
            line: match.data.line_number,
            content: match.data.lines.text,
            context: match.data.context?.lines?.map((l: any) => l.text)
          });
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    return results;
  }

  private async searchWithGrep(
    searchPath: string,
    params: any
  ): Promise<Array<{ file: string; line: number; content: string }>> {
    // Fallback to standard grep
    let cmd = 'grep -rn';

    if (!params.caseSensitive) cmd += ' -i';
    if (params.filePattern) cmd += ` --include="${params.filePattern}"`;

    cmd += ` "${params.pattern}" "${searchPath}"`;

    const { stdout } = await execAsync(cmd);

    // Parse grep output: file:line:content
    const results = [];
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;

      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (match) {
        results.push({
          file: match[1],
          line: parseInt(match[2], 10),
          content: match[3]
        });
      }
    }

    return results;
  }

  estimateCost(params: any): number {
    // Recursive search is expensive
    return 10;
  }
}
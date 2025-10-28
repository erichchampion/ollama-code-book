/**
 * Search Tool
 *
 * Provides advanced search capabilities for text content, file names,
 * and project-wide searches with relevance ranking.
 */

import { promises as fs } from 'fs';
import { normalizeError } from '../utils/error-utils.js';
import path from 'path';
import { BaseTool, ToolMetadata, ToolResult, ToolExecutionContext } from './types.js';
import { logger } from '../utils/logger.js';
import { getGitIgnoreParser } from '../utils/gitignore-parser.js';
import { getDefaultExcludePatterns } from '../config/file-patterns.js';
import { isPathSafe } from '../utils/path-security.js';
import { createExclusionChecker } from '../utils/file-exclusion.js';
import { globToRegex } from '../utils/regex-cache.js';

interface SearchMatch {
  file: string;
  line: number;
  column: number;
  content: string;
  context: {
    before: string[];
    after: string[];
  };
}

interface SearchResult {
  query: string;
  matches: SearchMatch[];
  totalMatches: number;
  filesSearched: number;
  executionTime: number;
}

export class SearchTool extends BaseTool {
  metadata: ToolMetadata = {
    name: 'search',
    description: 'Search for text WITHIN FILE CONTENTS (NOT for checking if files exist). By default searches file contents to find code, imports, and usage patterns. Use type="filename" only when looking for files by name. To check if a specific file exists, use the filesystem tool with operation="exists" instead.',
    category: 'core',
    version: '1.0.0',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'IMPORTANT: Use ONLY the exact identifier/keyword as it appears in code. DO NOT add words like "usage", "import", "function", etc. CORRECT: "firestore", "useState", "express". INCORRECT: "firestore usage", "how useState works", "express server". Just the bare keyword.',
        required: true
      },
      {
        name: 'path',
        type: 'string',
        description: 'Path to search in. IMPORTANT: Omit this parameter to search the entire project (recommended). Only specify if you need to limit to a specific subdirectory that you KNOW exists.',
        required: false,
        default: '.'
      },
      {
        name: 'type',
        type: 'string',
        description: 'Search type: "content" searches within file contents (default), "filename" searches only filenames, "both" searches both',
        required: false,
        default: 'content',
        enum: ['content', 'filename', 'both'],
        validation: (value) => ['content', 'filename', 'both'].includes(value)
      },
      {
        name: 'filePattern',
        type: 'string',
        description: 'File pattern to filter search (e.g., *.ts, *.js)',
        required: false
      },
      {
        name: 'caseSensitive',
        type: 'boolean',
        description: 'Whether search should be case sensitive',
        required: false,
        default: false
      },
      {
        name: 'useRegex',
        type: 'boolean',
        description: 'Whether to treat query as regex pattern',
        required: false,
        default: false
      },
      {
        name: 'contextLines',
        type: 'number',
        description: 'Number of context lines to include around matches',
        required: false,
        default: 2
      },
      {
        name: 'maxResults',
        type: 'number',
        description: 'Maximum number of results to return',
        required: false,
        default: 100
      },
      {
        name: 'excludePatterns',
        type: 'array',
        description: 'Patterns to exclude from search (e.g., node_modules, .git)',
        required: false,
        default: 'getDefaultExcludePatterns()'
      },
      {
        name: 'respectGitIgnore',
        type: 'boolean',
        description: 'Whether to respect .gitignore files when searching (default: true)',
        required: false,
        default: true
      }
    ],
    examples: [
      {
        description: 'CORRECT: Find where firestore is imported or used',
        parameters: {
          query: 'firestore'
          // NO path parameter - searches entire project
          // NO "firestore usage" - just the keyword
        }
      },
      {
        description: 'CORRECT: Find React hooks usage',
        parameters: {
          query: 'useState'
          // NO "useState usage" or "how useState" - just the keyword
        }
      },
      {
        description: 'CORRECT: Find express server code',
        parameters: {
          query: 'express'
          // NO "express server" - just the keyword
        }
      },
      {
        description: 'CORRECT: Search for API endpoints',
        parameters: {
          query: '/api/'
        }
      },
      {
        description: 'Find imports from a specific library',
        parameters: {
          query: 'from "axios"'
          // Searching for the import statement pattern
        }
      }
    ]
  };

  async execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!this.validateParameters(parameters)) {
        return {
          success: false,
          error: 'Invalid parameters provided'
        };
      }

      const {
        query,
        path: searchPath = '.',
        type = 'content',
        filePattern,
        caseSensitive = false,
        useRegex = false,
        contextLines = 2,
        maxResults = 100,
        excludePatterns = getDefaultExcludePatterns(),
        respectGitIgnore = true
      } = parameters;

      const resolvedPath = path.resolve(context.workingDirectory, searchPath);

      // Security check
      if (!isPathSafe(resolvedPath, context.projectRoot)) {
        return {
          success: false,
          error: 'Search path is outside project boundaries'
        };
      }

      let searchRegex: RegExp;
      try {
        if (useRegex) {
          searchRegex = new RegExp(query, caseSensitive ? 'g' : 'gi');
        } else {
          const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          searchRegex = new RegExp(escapedQuery, caseSensitive ? 'g' : 'gi');
        }
      } catch (error) {
        return {
          success: false,
          error: `Invalid regex pattern: ${error}`
        };
      }

      const result = await this.performSearch(resolvedPath, {
        query,
        searchRegex,
        type,
        filePattern,
        contextLines,
        maxResults,
        excludePatterns,
        respectGitIgnore,
        projectRoot: context.projectRoot
      });

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          resourcesUsed: {
            filesSearched: result.filesSearched,
            totalMatches: result.totalMatches
          }
        }
      };

    } catch (error) {
      logger.error(`Search tool error: ${error}`);
      return {
        success: false,
        error: normalizeError(error).message,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  private async performSearch(
    searchPath: string,
    options: {
      query: string;
      searchRegex: RegExp;
      type: string;
      filePattern?: string;
      contextLines: number;
      maxResults: number;
      excludePatterns: string[];
      respectGitIgnore?: boolean;
      projectRoot?: string;
    }
  ): Promise<SearchResult> {
    const matches: SearchMatch[] = [];
    let filesSearched = 0;
    const startTime = Date.now();

    const filePatternRegex = options.filePattern
      ? globToRegex(options.filePattern)
      : null;

    // Set up gitignore parser if enabled
    let gitIgnoreParser: ReturnType<typeof getGitIgnoreParser> | null = null;
    if (options.respectGitIgnore && options.projectRoot) {
      try {
        gitIgnoreParser = getGitIgnoreParser(options.projectRoot);
      } catch (error) {
        logger.warn('Failed to load .gitignore parser for searching', error);
      }
    }

    // Create exclusion checker
    const shouldExclude = createExclusionChecker(options.excludePatterns, gitIgnoreParser);

    const searchDirectory = async (dirPath: string): Promise<void> => {
      if (matches.length >= options.maxResults) return;

      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (matches.length >= options.maxResults) break;

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(searchPath, fullPath);

        if (shouldExclude(relativePath)) continue;

        if (entry.isDirectory()) {
          await searchDirectory(fullPath);
        } else if (entry.isFile()) {
          // Check filename match if requested
          if (options.type === 'filename' || options.type === 'both') {
            if (options.searchRegex.test(entry.name)) {
              matches.push({
                file: relativePath,
                line: 0,
                column: 0,
                content: entry.name,
                context: { before: [], after: [] }
              });
            }
          }

          // Check file pattern
          if (filePatternRegex && !filePatternRegex.test(entry.name)) {
            continue;
          }

          // Search file content if requested
          if (options.type === 'content' || options.type === 'both') {
            await this.searchFileContent(fullPath, relativePath, options, matches);
            filesSearched++;
          }
        }
      }
    };

    await searchDirectory(searchPath);

    return {
      query: options.query,
      matches,
      totalMatches: matches.length,
      filesSearched,
      executionTime: Date.now() - startTime
    };
  }

  private async searchFileContent(
    filePath: string,
    relativePath: string,
    options: {
      searchRegex: RegExp;
      contextLines: number;
      maxResults: number;
    },
    matches: SearchMatch[]
  ): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= options.maxResults) break;

        const line = lines[i];

        // Use matchAll for proper regex handling (no stateful lastIndex issues)
        const lineMatches = Array.from(line.matchAll(options.searchRegex));

        for (const match of lineMatches) {
          if (matches.length >= options.maxResults) break;

          const contextBefore = lines.slice(
            Math.max(0, i - options.contextLines),
            i
          );
          const contextAfter = lines.slice(
            i + 1,
            Math.min(lines.length, i + 1 + options.contextLines)
          );

          matches.push({
            file: relativePath,
            line: i + 1,
            column: (match.index || 0) + 1,
            content: line,
            context: {
              before: contextBefore,
              after: contextAfter
            }
          });
        }
      }
    } catch (error) {
      // Skip files that can't be read (binary files, permission issues, etc.)
      logger.debug(`Skipping file ${filePath}: ${error}`);
    }
  }
}

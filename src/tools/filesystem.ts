/**
 * File System Tool
 *
 * Provides comprehensive file system operations with enhanced capabilities
 * for reading, writing, searching, and managing files and directories.
 */

import { promises as fs } from 'fs';
import { normalizeError } from '../utils/error-utils.js';
import path from 'path';
import { BaseTool, ToolMetadata, ToolResult, ToolExecutionContext } from './types.js';
import { logger } from '../utils/logger.js';
import { getGitIgnoreParserSafe } from '../utils/gitignore-parser.js';
import { getDefaultExcludePatterns } from '../config/file-patterns.js';
import { isPathSafe } from '../utils/path-security.js';
import { createMultiPathExclusionChecker } from '../utils/file-exclusion.js';
import { globToRegex } from '../utils/regex-cache.js';

export class FileSystemTool extends BaseTool {
  metadata: ToolMetadata = {
    name: 'filesystem',
    description: 'CRITICAL: Use this tool for ALL file operations. For informational queries: Use operation="list" with path="." to list files when user asks "What files are in this project?", "What files are here?", "List files", or "What files are in the current directory?". Use operation="read" with path="filename" when user asks "Show me the contents of X", "Read file X", or "What\'s in file X?". For file creation: Use operation="write" with path and content to create/update files. NEVER use execution tool with echo/cat/printf to create files. Use operation="exists" to check if a file exists. Use operation="create" for directories. Examples: "What files are here?" use operation="list" path=".", "Show me math.js" use operation="read" path="math.js", "Create server.js" use operation="write" path="server.js" with content parameter.',
    category: 'core',
    version: '1.0.0',
    parameters: [
      {
        name: 'operation',
        type: 'string',
        description: 'The file operation to perform. CRITICAL: Use "list" with path="." when user asks about files in project/current directory. Use "read" with path="filename" when user asks to see/show/read file contents. Use "write" = create/update FILE with content (REQUIRED content parameter), "create" = make empty DIRECTORY, "delete" = remove file/dir, "search" = find files, "exists" = check if path exists.',
        required: true,
        enum: ['read', 'write', 'list', 'create', 'delete', 'search', 'exists'],
        validation: (value) => ['read', 'write', 'list', 'create', 'delete', 'search', 'exists'].includes(value)
      },
      {
        name: 'path',
        type: 'string',
        description: 'The file or directory path. CRITICAL: Use "." (current directory) when user asks about files "in this project", "in the current directory", "here", or "in the project". Use specific filename like "math.js" when user asks to read/show a specific file. Examples: For "What files are here?" use path=".", for "Show me math.js" use path="math.js".',
        required: true
      },
      {
        name: 'content',
        type: 'string',
        description: 'File content to write. REQUIRED when operation="write". Contains the actual code/text for the file. Not used for operation="create" (directories) or "read".',
        required: false
      },
      {
        name: 'encoding',
        type: 'string',
        description: 'File encoding (default: utf8)',
        required: false,
        default: 'utf8'
      },
      {
        name: 'pattern',
        type: 'string',
        description: 'Search pattern for file searches',
        required: false
      },
      {
        name: 'recursive',
        type: 'boolean',
        description: 'Whether to perform recursive operations',
        required: false,
        default: false
      },
      {
        name: 'createBackup',
        type: 'boolean',
        description: 'Create backup before writing (default: true)',
        required: false,
        default: true
      },
      {
        name: 'excludePatterns',
        type: 'array',
        description: 'Patterns to exclude from listing/searching (e.g., .git, node_modules)',
        required: false,
        default: 'getDefaultExcludePatterns()'
      },
      {
        name: 'respectGitIgnore',
        type: 'boolean',
        description: 'Whether to respect .gitignore files when listing/searching (default: true)',
        required: false,
        default: true
      }
    ],
    examples: [
      {
        description: 'Read a file',
        parameters: { operation: 'read', path: 'src/index.ts' }
      },
      {
        description: 'Create a new code file (write operation with content)',
        parameters: {
          operation: 'write',
          path: 'src/api/users.js',
          content: 'const express = require("express");\nconst router = express.Router();\n\nrouter.post("/users", async (req, res) => {\n  // Implementation here\n});\n\nmodule.exports = router;'
        }
      },
      {
        description: 'Update existing file with new content',
        parameters: {
          operation: 'write',
          path: 'src/config.js',
          content: 'module.exports = { port: 3000 };',
          createBackup: true
        }
      },
      {
        description: 'Create a new directory (create operation, no content)',
        parameters: {
          operation: 'create',
          path: 'src/api'
        }
      },
      {
        description: 'List directory contents recursively',
        parameters: { operation: 'list', path: 'src', recursive: true }
      },
      {
        description: 'Search for files matching pattern',
        parameters: { operation: 'search', path: 'src', pattern: '*.ts', recursive: true }
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

      const { operation, path: filePath } = parameters;
      const resolvedPath = path.resolve(context.workingDirectory, filePath);

      // Security check: ensure path is within project boundaries
      if (!isPathSafe(resolvedPath, context.projectRoot)) {
        return {
          success: false,
          error: 'Path is outside project boundaries'
        };
      }

      // Validate write operation has content
      if (operation === 'write' && !parameters.content) {
        return {
          success: false,
          error: 'operation="write" requires content parameter. To create an empty directory, use operation="create" instead.'
        };
      }

      // Catch common mistake: using create for files instead of write
      if (operation === 'create' && filePath.includes('.')) {
        const ext = path.extname(filePath);
        if (ext) {
          logger.warn(`Detected potential mistake: using operation="create" for file "${filePath}". Use operation="write" with content parameter for files.`);
          return {
            success: false,
            error: `To create a file like "${filePath}", use operation="write" with content parameter. operation="create" is only for directories.`
          };
        }
      }

      let result: any;

      switch (operation) {
        case 'read':
          result = await this.readFile(resolvedPath, parameters.encoding || 'utf8');
          break;
        case 'write':
          result = await this.writeFile(resolvedPath, parameters.content || '', {
            encoding: parameters.encoding || 'utf8',
            createBackup: parameters.createBackup !== false
          });
          break;
        case 'list':
          result = await this.listDirectory(
            resolvedPath,
            parameters.recursive || false,
            parameters.excludePatterns || getDefaultExcludePatterns(),
            parameters.respectGitIgnore !== false,
            context.projectRoot
          );
          break;
        case 'create':
          result = await this.createPath(resolvedPath);
          break;
        case 'delete':
          result = await this.deletePath(resolvedPath);
          break;
        case 'search':
          result = await this.searchFiles(
            resolvedPath,
            parameters.pattern,
            parameters.recursive || false,
            parameters.excludePatterns || getDefaultExcludePatterns(),
            parameters.respectGitIgnore !== false,
            context.projectRoot
          );
          break;
        case 'exists':
          result = await this.pathExists(resolvedPath);
          break;
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`
          };
      }

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          resourcesUsed: { operation, path: resolvedPath }
        }
      };

    } catch (error) {
      logger.error(`FileSystem tool error: ${error}`);
      return {
        success: false,
        error: normalizeError(error).message,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  private async readFile(filePath: string, encoding: string): Promise<any> {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, encoding as BufferEncoding);

    return {
      content,
      size: stats.size,
      modified: stats.mtime,
      encoding
    };
  }

  private async writeFile(filePath: string, content: string, options: {
    encoding: string;
    createBackup: boolean;
  }): Promise<any> {
    // Create backup if file exists and backup is requested
    if (options.createBackup && await this.pathExists(filePath)) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);
      logger.debug(`Created backup: ${backupPath}`);
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, content, options.encoding as BufferEncoding);

    const stats = await fs.stat(filePath);
    return {
      path: filePath,
      size: stats.size,
      written: new Date()
    };
  }

  private async listDirectory(dirPath: string, recursive: boolean, excludePatterns: string[] = [], respectGitIgnore: boolean = true, projectRoot?: string): Promise<any> {
    const items: any[] = [];

    // Set up gitignore parser if enabled
    const gitIgnoreParser = getGitIgnoreParserSafe(projectRoot, respectGitIgnore, 'listing');

    // Create exclusion checker
    const shouldExclude = createMultiPathExclusionChecker(excludePatterns, gitIgnoreParser);

    const processDirectory = async (currentPath: string): Promise<void> => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(dirPath, fullPath);

        // Skip excluded paths
        if (shouldExclude(fullPath, relativePath, entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          items.push({
            name: entry.name,
            path: relativePath,
            type: 'directory',
            isDirectory: true,
            isFile: false
          });

          if (recursive) {
            await processDirectory(fullPath);
          }
        } else {
          const stats = await fs.stat(fullPath);
          items.push({
            name: entry.name,
            path: relativePath,
            type: 'file',
            isDirectory: false,
            isFile: true,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
    };

    await processDirectory(dirPath);
    return items;
  }

  private async createPath(targetPath: string): Promise<any> {
    await fs.mkdir(targetPath, { recursive: true });
    return { created: targetPath };
  }

  private async deletePath(targetPath: string): Promise<any> {
    const stats = await fs.stat(targetPath);
    if (stats.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: true });
    } else {
      await fs.unlink(targetPath);
    }
    return { deleted: targetPath };
  }

  private async searchFiles(dirPath: string, pattern?: string, recursive: boolean = false, excludePatterns: string[] = [], respectGitIgnore: boolean = true, projectRoot?: string): Promise<any> {
    const matches: any[] = [];
    const regex = pattern ? globToRegex(pattern) : null;

    // Set up gitignore parser if enabled
    const gitIgnoreParser = getGitIgnoreParserSafe(projectRoot, respectGitIgnore, 'searching');

    // Create exclusion checker
    const shouldExclude = createMultiPathExclusionChecker(excludePatterns, gitIgnoreParser);

    const searchDirectory = async (currentPath: string): Promise<void> => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(dirPath, fullPath);

        // Skip excluded paths
        if (shouldExclude(fullPath, relativePath, entry.name)) {
          continue;
        }

        if (entry.isFile()) {
          if (!regex || regex.test(entry.name)) {
            const stats = await fs.stat(fullPath);
            matches.push({
              name: entry.name,
              path: relativePath,
              fullPath,
              size: stats.size,
              modified: stats.mtime
            });
          }
        } else if (entry.isDirectory() && recursive) {
          await searchDirectory(fullPath);
        }
      }
    };

    await searchDirectory(dirPath);
    return matches;
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}

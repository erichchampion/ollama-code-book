/**
 * Lazy Project Context
 *
 * A ProjectContext implementation that defers expensive operations
 * until they are actually needed, improving startup performance.
 */

import { logger } from '../utils/logger.js';
import { ProjectContext, FileInfo, ProjectStructure } from '../ai/context.js';
import { CONSTANTS } from './constants.js';
import * as path from 'path';
import { promises as fs } from 'fs';

export class LazyProjectContext extends ProjectContext {
  private initialized = false;
  private initPromise?: Promise<void>;
  private lightweightCache = new Map<string, any>();
  private structureCache?: ProjectStructure;

  constructor(projectRoot: string, maxTokens: number = 32000) {
    super(projectRoot, maxTokens);
  }

  /**
   * Override: Lazy initialization only when needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.initPromise) {
      this.initPromise = this.performInitialization();
    }

    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Get files with lightweight pattern matching when possible
   */
  async getFiles(pattern?: string): Promise<FileInfo[]> {
    if (!pattern) {
      // Full file list requires initialization
      await this.ensureInitialized();
      return this.allFiles;
    }

    // Try lightweight pattern matching first
    const cacheKey = `files:${pattern}`;
    if (this.lightweightCache.has(cacheKey)) {
      return this.lightweightCache.get(cacheKey);
    }

    try {
      const files = await this.getFilesLight(pattern);
      this.lightweightCache.set(cacheKey, files);
      return files;
    } catch (error) {
      // Fallback to full initialization
      logger.debug('Lightweight file search failed, falling back to full initialization:', error);
      await this.ensureInitialized();
      return this.allFiles.filter(file =>
        file.relativePath.includes(pattern) || file.path.includes(pattern)
      );
    }
  }

  /**
   * Get project structure with lazy loading
   */
  async getStructure(): Promise<ProjectStructure> {
    if (this.structureCache) {
      return this.structureCache;
    }

    // Try to build minimal structure first
    try {
      const minimalStructure = await this.buildMinimalStructure();
      this.structureCache = minimalStructure;
      return minimalStructure;
    } catch (error) {
      // Fallback to full initialization
      await this.ensureInitialized();
      // Access the structure through a protected accessor or rebuild it
      return this.buildMinimalStructure();
    }
  }

  /**
   * Fast file lookup by extension
   */
  async findFilesByExtension(extensions: string[]): Promise<FileInfo[]> {
    const cacheKey = `ext:${extensions.join(',')}`;
    if (this.lightweightCache.has(cacheKey)) {
      return this.lightweightCache.get(cacheKey);
    }

    try {
      const { glob } = await import('glob');
      const patterns = extensions.map(ext => `**/*.${ext.replace('.', '')}`);

      const allFiles: string[] = [];
      for (const pattern of patterns) {
        const files = await glob(pattern, {
          cwd: this.root,
          absolute: true,
          ignore: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.git/**',
            '**/coverage/**'
          ]
        });
        allFiles.push(...files);
      }

      const fileInfos = await Promise.all(
        allFiles.slice(0, CONSTANTS.MAX_ERROR_CONTEXT_LINES * 20).map(async (file) => { // Limit to reasonable sample
          try {
            const stat = await fs.stat(file);
            return {
              path: file,
              relativePath: path.relative(this.root, file),
              size: stat.size,
              modified: stat.mtime,
              type: 'file' as const
            };
          } catch {
            return null;
          }
        })
      );

      const validFiles = fileInfos.filter(Boolean) as FileInfo[];
      this.lightweightCache.set(cacheKey, validFiles);
      return validFiles;
    } catch (error) {
      logger.debug('Extension-based file search failed:', error);
      // Fallback to full search
      await this.ensureInitialized();
      const allFiles = this.allFiles;
      return allFiles.filter(file => {
        const ext = path.extname(file.path).slice(1);
        return extensions.includes(ext);
      });
    }
  }

  /**
   * Quick project info without full analysis
   */
  async getQuickInfo(): Promise<{
    root: string;
    hasPackageJson: boolean;
    hasGit: boolean;
    estimatedFileCount: number;
    primaryLanguage?: string;
  }> {
    const cacheKey = 'quickInfo';
    if (this.lightweightCache.has(cacheKey)) {
      return this.lightweightCache.get(cacheKey);
    }

    try {
      const [packageExists, gitExists] = await Promise.all([
        this.fileExists('package.json'),
        this.fileExists('.git')
      ]);

      // Quick file count estimation
      const estimatedCount = await this.estimateFileCount();

      // Detect primary language
      const primaryLanguage = await this.detectPrimaryLanguage();

      const info = {
        root: this.root,
        hasPackageJson: packageExists,
        hasGit: gitExists,
        estimatedFileCount: estimatedCount,
        primaryLanguage
      };

      this.lightweightCache.set(cacheKey, info);
      return info;
    } catch (error) {
      logger.debug('Quick info gathering failed:', error);
      return {
        root: this.root,
        hasPackageJson: false,
        hasGit: false,
        estimatedFileCount: 0
      };
    }
  }

  /**
   * Ensure full initialization when needed
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    if (!this.initPromise) {
      this.initPromise = this.performInitialization();
    }

    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Perform the actual full initialization
   */
  private async performInitialization(): Promise<void> {
    logger.info(`Performing full project context initialization for: ${this.root}`);
    await super.initialize();
  }

  /**
   * Lightweight file search using glob
   */
  private async getFilesLight(pattern: string): Promise<FileInfo[]> {
    const { glob } = await import('glob');

    const files = await glob(pattern, {
      cwd: this.root,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**'
      ]
    });

    return files.slice(0, 50).map(file => ({ // Limit results
      path: file,
      relativePath: path.relative(this.root, file),
      size: 0, // Lazy load size when needed
      modified: new Date(),
      type: 'file' as const
    }));
  }

  /**
   * Build minimal project structure
   */
  private async buildMinimalStructure(): Promise<ProjectStructure> {
    const files = new Map<string, FileInfo>();
    const directories: string[] = [];

    // Get basic directory structure
    try {
      const entries = await fs.readdir(this.root, { withFileTypes: true });

      for (const entry of entries.slice(0, 20)) { // Limit to first 20 entries
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          directories.push(entry.name);
        } else if (entry.isFile()) {
          const fullPath = path.join(this.root, entry.name);
          const stat = await fs.stat(fullPath).catch(() => null);

          if (stat) {
            files.set(fullPath, {
              path: fullPath,
              relativePath: entry.name,
              size: stat.size,
              modified: stat.mtime,
              type: 'file'
            });
          }
        }
      }
    } catch (error) {
      logger.debug('Failed to build minimal structure:', error);
    }

    return {
      root: this.root,
      files,
      directories,
      dependencies: new Map(),
      entryPoints: [],
      configFiles: [],
      testFiles: [],
      documentationFiles: []
    };
  }

  /**
   * Check if a file exists quickly
   */
  private async fileExists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.root, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Estimate total file count without full scan
   */
  private async estimateFileCount(): Promise<number> {
    try {
      // Sample a few directories to estimate
      const entries = await fs.readdir(this.root, { withFileTypes: true });
      let fileCount = entries.filter(e => e.isFile()).length;

      // Rough estimation based on directory structure
      const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules');

      if (dirs.length > 0) {
        // Sample first directory
        try {
          const sampleDir = dirs[0];
          const sampleEntries = await fs.readdir(
            path.join(this.root, sampleDir.name),
            { withFileTypes: true }
          );
          const sampleFiles = sampleEntries.filter(e => e.isFile()).length;
          fileCount += sampleFiles * dirs.length; // Rough estimate
        } catch {
          // Ignore sampling errors
        }
      }

      return Math.min(fileCount, CONSTANTS.MAX_FILE_COUNT_ESTIMATE); // Cap estimate
    } catch {
      return 0;
    }
  }

  /**
   * Detect primary programming language
   */
  private async detectPrimaryLanguage(): Promise<string | undefined> {
    try {
      const files = await this.findFilesByExtension(['ts', 'js', 'py', 'java', 'go', 'rs', 'cpp', 'c']);

      if (files.length === 0) return undefined;

      // Count by extension
      const counts = new Map<string, number>();
      for (const file of files) {
        const ext = path.extname(file.path).slice(1);
        counts.set(ext, (counts.get(ext) || 0) + 1);
      }

      // Find most common
      let maxCount = 0;
      let primaryExt = '';
      for (const [ext, count] of counts) {
        if (count > maxCount) {
          maxCount = count;
          primaryExt = ext;
        }
      }

      // Map extensions to language names
      const langMap: Record<string, string> = {
        ts: 'TypeScript',
        js: 'JavaScript',
        py: 'Python',
        java: 'Java',
        go: 'Go',
        rs: 'Rust',
        cpp: 'C++',
        c: 'C'
      };

      return langMap[primaryExt];
    } catch {
      return undefined;
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.lightweightCache.clear();
    this.structureCache = undefined;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    lightweightEntries: number;
    hasStructureCache: boolean;
    initialized: boolean;
  } {
    return {
      lightweightEntries: this.lightweightCache.size,
      hasStructureCache: !!this.structureCache,
      initialized: this.initialized
    };
  }
}
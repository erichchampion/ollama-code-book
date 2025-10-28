/**
 * GitIgnore Parser Utility
 *
 * Parses .gitignore files and provides functionality to check if files/directories
 * should be ignored based on gitignore patterns.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger.js';

export interface GitIgnoreRule {
    pattern: string;
    isNegation: boolean;
    isDirectory: boolean;
    regex: RegExp;
}

export class GitIgnoreParser {
    private rules: GitIgnoreRule[] = [];
    private projectRoot: string;

    constructor(projectRoot: string) {
        this.projectRoot = path.resolve(projectRoot);
        this.loadGitIgnoreFiles();
    }

    /**
     * Load and parse all .gitignore files in the project hierarchy
     */
    private loadGitIgnoreFiles(): void {
        this.rules = [];

        // Start from project root and walk up to find all .gitignore files
        let currentDir = this.projectRoot;
        const MAX_DEPTH = 10; // Safety limit for directory traversal
        let depth = 0;

        while (depth < MAX_DEPTH) {
            const gitignorePath = path.join(currentDir, '.gitignore');

            if (fs.existsSync(gitignorePath)) {
                try {
                    const content = fs.readFileSync(gitignorePath, 'utf8');
                    const rules = this.parseGitIgnoreContent(content, currentDir);
                    this.rules.push(...rules);
                } catch (error) {
                    logger.warn(`Could not read .gitignore at ${gitignorePath}`, { error });
                }
            }

            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                // Reached filesystem root
                break;
            }
            currentDir = parentDir;
            depth++;
        }

        if (depth >= MAX_DEPTH) {
            logger.warn(`Reached maximum depth (${MAX_DEPTH}) while searching for .gitignore files`);
        }

        // Add global gitignore if it exists
        this.loadGlobalGitIgnore();
    }

    /**
     * Load global .gitignore file
     */
    private loadGlobalGitIgnore(): void {
        try {
            const homeDir = process.env.HOME || process.env.USERPROFILE;
            if (!homeDir) return;

            // Check for common global gitignore filenames
            const globalGitignoreNames = [
                '.gitignore_global',
                '.gitignore-global',
                '.global_gitignore',
                '.config/git/ignore'  // XDG config location
            ];

            for (const filename of globalGitignoreNames) {
                const globalGitIgnorePath = path.join(homeDir, filename);
                if (fs.existsSync(globalGitIgnorePath)) {
                    try {
                        const content = fs.readFileSync(globalGitIgnorePath, 'utf8');
                        const rules = this.parseGitIgnoreContent(content, this.projectRoot);
                        this.rules.push(...rules);
                        logger.debug(`Loaded global gitignore from ${globalGitIgnorePath}`);
                        break; // Only load the first found global gitignore
                    } catch (error) {
                        logger.debug(`Could not read global gitignore at ${globalGitIgnorePath}`, { error });
                    }
                }
            }
        } catch (error) {
            // Silently ignore global gitignore errors
            logger.debug('Error loading global gitignore', { error });
        }
    }

    /**
     * Parse .gitignore content into rules
     */
    private parseGitIgnoreContent(content: string, basePath: string): GitIgnoreRule[] {
        const rules: GitIgnoreRule[] = [];
        const lines = content.split('\n');

        for (let line of lines) {
            line = line.trim();

            // Skip empty lines and comments
            if (!line || line.startsWith('#')) {
                continue;
            }

            const isNegation = line.startsWith('!');
            if (isNegation) {
                line = line.substring(1);
            }

            const isDirectory = line.endsWith('/');
            if (isDirectory) {
                line = line.substring(0, line.length - 1);
            }

            // Convert gitignore pattern to regex
            const regex = this.createRegexFromPattern(line, isDirectory);

            rules.push({
                pattern: line,
                isNegation,
                isDirectory,
                regex
            });
        }

        return rules;
    }

    /**
     * Convert gitignore pattern to regular expression
     */
    private createRegexFromPattern(pattern: string, isDirectory: boolean): RegExp {
        // Escape special regex characters except * and ?
        let regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*\*/g, '___DOUBLESTAR___')
            .replace(/\*/g, '[^/]*')
            .replace(/___DOUBLESTAR___/g, '.*')
            .replace(/\?/g, '[^/]');

        // Handle leading slash (absolute path from repo root)
        if (regexPattern.startsWith('/')) {
            regexPattern = '^' + regexPattern.substring(1);
        } else {
            // Pattern can match anywhere in the path
            regexPattern = '(^|/)' + regexPattern;
        }

        // Handle trailing patterns
        if (isDirectory) {
            regexPattern += '(/.*)?$';
        } else {
            regexPattern += '(/.*)??$';
        }

        return new RegExp(regexPattern);
    }

    /**
     * Check if a file or directory should be ignored
     */
    public isIgnored(filePath: string): boolean {
        // Convert to relative path from project root
        const relativePath = path.relative(this.projectRoot, path.resolve(filePath));

        // Don't ignore paths outside the project
        if (relativePath.startsWith('..')) {
            return false;
        }

        // Normalize path separators
        const normalizedPath = relativePath.replace(/\\/g, '/');

        let isIgnored = false;

        // Apply rules in order (later rules can override earlier ones)
        for (const rule of this.rules) {
            if (rule.regex.test(normalizedPath)) {
                isIgnored = !rule.isNegation;
            }
        }

        return isIgnored;
    }

    /**
     * Get all ignore patterns as strings (for compatibility with existing systems)
     */
    public getIgnorePatterns(): string[] {
        return this.rules
            .filter(rule => !rule.isNegation)
            .map(rule => rule.pattern);
    }

    /**
     * Check if a directory should be ignored
     */
    public isDirectoryIgnored(dirPath: string): boolean {
        // For directories, we check both the directory itself and with trailing slash
        return this.isIgnored(dirPath) || this.isIgnored(dirPath + '/');
    }

    /**
     * Filter an array of file paths, removing ignored ones
     */
    public filterIgnored(filePaths: string[]): string[] {
        return filePaths.filter(filePath => !this.isIgnored(filePath));
    }

    /**
     * Get debug information about loaded rules
     */
    public getDebugInfo(): { ruleCount: number; rules: GitIgnoreRule[] } {
        return {
            ruleCount: this.rules.length,
            rules: [...this.rules]
        };
    }

    /**
     * Reload .gitignore files (useful if they change during execution)
     */
    public reload(): void {
        this.loadGitIgnoreFiles();
    }
}

// Cache parser instances by project root
const parserCache = new Map<string, GitIgnoreParser>();

/**
 * Get or create a GitIgnoreParser for a project root
 */
export function getGitIgnoreParser(projectRoot: string): GitIgnoreParser {
    const normalizedRoot = path.resolve(projectRoot);

    if (!parserCache.has(normalizedRoot)) {
        parserCache.set(normalizedRoot, new GitIgnoreParser(normalizedRoot));
    }

    return parserCache.get(normalizedRoot)!;
}

/**
 * Safely get a GitIgnoreParser with error handling
 *
 * @param projectRoot - The root directory of the project
 * @param respectGitIgnore - Whether to respect .gitignore files
 * @param operation - The operation being performed (for logging)
 * @returns GitIgnoreParser instance or null if disabled or on error
 *
 * @example
 * ```typescript
 * const parser = getGitIgnoreParserSafe('/project/root', true, 'listing');
 * if (parser) {
 *   const isIgnored = parser.isIgnored('node_modules/file.js');
 * }
 * ```
 */
export function getGitIgnoreParserSafe(
    projectRoot: string | undefined,
    respectGitIgnore: boolean,
    operation: string
): GitIgnoreParser | null {
    if (!respectGitIgnore || !projectRoot) {
        return null;
    }

    try {
        return getGitIgnoreParser(projectRoot);
    } catch (error) {
        logger.warn(`Failed to load .gitignore parser for ${operation}`, error);
        return null;
    }
}

/**
 * Clear the parser cache (useful for testing)
 */
export function clearParserCache(): void {
    parserCache.clear();
}
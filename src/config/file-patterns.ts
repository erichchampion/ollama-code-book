/**
 * Centralized File Pattern Management
 *
 * Provides a single source of truth for file patterns used throughout the application,
 * eliminating duplication and ensuring consistency across all tools and analyzers.
 */

import { getPerformanceConfig } from './performance.js';

/**
 * Get the default exclude patterns from centralized configuration
 * These patterns are used to filter out files and directories during analysis
 */
export function getDefaultExcludePatterns(): string[] {
    const config = getPerformanceConfig();

    // Convert glob patterns from config to simple patterns for compatibility
    // The config uses glob patterns like 'node_modules/**', but some parts expect 'node_modules'
    const patterns = config.filePatterns.excludePatterns.map(pattern => {
        // Remove trailing /** for directory patterns
        return pattern.replace(/\/\*\*$/, '').replace(/^\*\*\//, '');
    });

    // Add additional patterns that may not be in the config
    const additionalPatterns = [
        // Package managers and dependencies
        'node_modules',
        'vendor',
        'packages',

        // Build artifacts
        'dist',
        'build',
        'out',
        'target',
        '.next',
        '.nuxt',
        '.output',

        // Version control
        '.git',
        '.svn',
        '.hg',

        // IDE and editor configs
        '.vscode',
        '.idea',
        '.cursor',
        '.vs',

        // CI/CD and automation
        '.github',
        '.gitlab',
        '.circleci',
        '.travis',
        '.buildkite',

        // Configuration directories
        '.claude',
        '.specify',
        '.eslintcache',

        // Testing and coverage
        'coverage',
        '.nyc_output',
        'test-results',
        'playwright-report',

        // Logs and temporary files
        'logs',
        '*.log',
        '.tmp',
        '.temp',
        'temp',
        'tmp',

        // Minified and generated files
        '*.min.js',
        '*.bundle.js',
        '*.map',
        '*.min.css',

        // OS files
        '.DS_Store',
        'Thumbs.db',
        'desktop.ini',

        // Python
        '__pycache__',
        '*.pyc',
        '.pytest_cache',

        // Java
        '*.class',
        'target',

        // Others
        '*.swp',
        '*.swo',
        '*~',
        '.cache'
    ];

    // Combine and deduplicate patterns
    const allPatterns = [...new Set([...patterns, ...additionalPatterns])];

    return allPatterns;
}

/**
 * Convert a glob pattern to a regular expression
 * Centralizes the logic for pattern conversion used across multiple tools
 */
export function globToRegex(pattern: string): RegExp {
    // Handle special glob patterns
    let regexPattern = pattern
        // Escape special regex characters except * and ?
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        // Handle ** (matches any number of directories)
        .replace(/\*\*/g, '___DOUBLE_STAR___')
        // Handle * (matches any characters except /)
        .replace(/\*/g, '[^/]*')
        // Restore ** pattern
        .replace(/___DOUBLE_STAR___/g, '.*')
        // Handle ? (matches single character except /)
        .replace(/\?/g, '[^/]');

    return new RegExp(regexPattern);
}

/**
 * Convert an array of glob patterns to regex patterns
 */
export function globPatternsToRegexes(patterns: string[]): RegExp[] {
    return patterns.map(pattern => globToRegex(pattern));
}

/**
 * Check if a path matches any of the exclude patterns
 */
export function isPathExcluded(path: string, patterns: string[]): boolean {
    const regexes = globPatternsToRegexes(patterns);
    return regexes.some(regex => regex.test(path));
}

/**
 * Get high priority file patterns (files that should be analyzed first)
 */
export function getHighPriorityPatterns(): string[] {
    const config = getPerformanceConfig();
    return config.filePatterns.highPriorityPatterns;
}

/**
 * Get include patterns (file types to include in analysis)
 */
export function getIncludePatterns(): string[] {
    const config = getPerformanceConfig();
    return config.filePatterns.includePatterns;
}

/**
 * Check if a file should be included based on include patterns
 */
export function shouldIncludeFile(filePath: string): boolean {
    const includePatterns = getIncludePatterns();
    return isPathIncluded(filePath, includePatterns);
}

/**
 * Check if a path matches any of the include patterns
 */
function isPathIncluded(path: string, patterns: string[]): boolean {
    // If no include patterns specified, include everything
    if (patterns.length === 0) return true;

    const regexes = globPatternsToRegexes(patterns);
    return regexes.some(regex => regex.test(path));
}

/**
 * Get a compact list of exclude patterns suitable for display or command-line use
 */
export function getCompactExcludePatterns(): string[] {
    // Return a minimal set of the most common exclude patterns
    return [
        'node_modules',
        '.git',
        'dist',
        'build',
        '.vscode',
        '.idea',
        'coverage',
        '*.log',
        '.DS_Store'
    ];
}
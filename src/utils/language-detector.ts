/**
 * Language Detection Utility
 *
 * Centralized language detection to eliminate code duplication across the codebase.
 * Provides consistent language identification based on file extensions and content analysis.
 */

import * as path from 'path';

export interface LanguageInfo {
  language: string;
  category: 'programming' | 'markup' | 'data' | 'config' | 'documentation';
  isSupported: boolean;
  extensions: string[];
}

export const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  typescript: {
    language: 'typescript',
    category: 'programming',
    isSupported: true,
    extensions: ['.ts', '.tsx']
  },
  javascript: {
    language: 'javascript',
    category: 'programming',
    isSupported: true,
    extensions: ['.js', '.jsx', '.mjs']
  },
  python: {
    language: 'python',
    category: 'programming',
    isSupported: true,
    extensions: ['.py', '.pyw']
  },
  java: {
    language: 'java',
    category: 'programming',
    isSupported: true,
    extensions: ['.java']
  },
  cpp: {
    language: 'cpp',
    category: 'programming',
    isSupported: true,
    extensions: ['.cpp', '.cc', '.cxx', '.c++', '.c', '.h', '.hpp']
  },
  csharp: {
    language: 'csharp',
    category: 'programming',
    isSupported: true,
    extensions: ['.cs']
  },
  go: {
    language: 'go',
    category: 'programming',
    isSupported: true,
    extensions: ['.go']
  },
  rust: {
    language: 'rust',
    category: 'programming',
    isSupported: true,
    extensions: ['.rs']
  },
  php: {
    language: 'php',
    category: 'programming',
    isSupported: true,
    extensions: ['.php']
  },
  ruby: {
    language: 'ruby',
    category: 'programming',
    isSupported: true,
    extensions: ['.rb']
  },
  swift: {
    language: 'swift',
    category: 'programming',
    isSupported: true,
    extensions: ['.swift']
  },
  kotlin: {
    language: 'kotlin',
    category: 'programming',
    isSupported: true,
    extensions: ['.kt', '.kts']
  },
  html: {
    language: 'html',
    category: 'markup',
    isSupported: true,
    extensions: ['.html', '.htm']
  },
  css: {
    language: 'css',
    category: 'markup',
    isSupported: true,
    extensions: ['.css', '.scss', '.sass', '.less']
  },
  json: {
    language: 'json',
    category: 'data',
    isSupported: true,
    extensions: ['.json']
  },
  yaml: {
    language: 'yaml',
    category: 'config',
    isSupported: true,
    extensions: ['.yml', '.yaml']
  },
  xml: {
    language: 'xml',
    category: 'markup',
    isSupported: true,
    extensions: ['.xml']
  },
  markdown: {
    language: 'markdown',
    category: 'documentation',
    isSupported: true,
    extensions: ['.md', '.markdown']
  },
  sql: {
    language: 'sql',
    category: 'data',
    isSupported: true,
    extensions: ['.sql']
  },
  shell: {
    language: 'shell',
    category: 'programming',
    isSupported: true,
    extensions: ['.sh', '.bash', '.zsh']
  }
};

// Create reverse mapping from extensions to languages
const EXTENSION_TO_LANGUAGE: Record<string, string> = {};
for (const [language, info] of Object.entries(LANGUAGE_MAP)) {
  for (const ext of info.extensions) {
    EXTENSION_TO_LANGUAGE[ext] = language;
  }
}

/**
 * Detect programming language from file path
 */
export function detectLanguageFromPath(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || null;
}

/**
 * Detect programming language from file extension
 */
export function detectLanguageFromExtension(extension: string): string | null {
  const normalizedExt = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  return EXTENSION_TO_LANGUAGE[normalizedExt] || null;
}

/**
 * Get language information
 */
export function getLanguageInfo(language: string): LanguageInfo | null {
  return LANGUAGE_MAP[language] || null;
}

/**
 * Check if language is supported for analysis
 */
export function isLanguageSupported(language: string): boolean {
  const info = getLanguageInfo(language);
  return info?.isSupported || false;
}

/**
 * Get all supported programming languages
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_MAP).filter(lang => LANGUAGE_MAP[lang].isSupported);
}

/**
 * Get languages by category
 */
export function getLanguagesByCategory(category: LanguageInfo['category']): string[] {
  return Object.entries(LANGUAGE_MAP)
    .filter(([_, info]) => info.category === category)
    .map(([lang, _]) => lang);
}

/**
 * Detect language with fallback options
 */
export function detectLanguageWithFallback(filePath: string, fallback = 'text'): string {
  return detectLanguageFromPath(filePath) || fallback;
}

/**
 * Check if file is a test file based on path patterns
 */
export function isTestFile(filePath: string): boolean {
  const normalizedPath = filePath.toLowerCase();
  return (
    normalizedPath.includes('/test/') ||
    normalizedPath.includes('/tests/') ||
    normalizedPath.includes('/__test__/') ||
    normalizedPath.includes('/__tests__/') ||
    normalizedPath.includes('.test.') ||
    normalizedPath.includes('.spec.') ||
    normalizedPath.endsWith('.test.ts') ||
    normalizedPath.endsWith('.test.js') ||
    normalizedPath.endsWith('.spec.ts') ||
    normalizedPath.endsWith('.spec.js')
  );
}

/**
 * Determine artifact type from file path
 */
export function determineArtifactType(filePath: string): 'code' | 'test' | 'documentation' | 'config' {
  if (isTestFile(filePath)) return 'test';

  const normalizedPath = filePath.toLowerCase();
  if (normalizedPath.includes('doc') || normalizedPath.endsWith('.md')) return 'documentation';
  if (normalizedPath.includes('config') || normalizedPath.endsWith('.json') || normalizedPath.endsWith('.yml') || normalizedPath.endsWith('.yaml')) return 'config';

  return 'code';
}

/**
 * Get file category for organizational purposes
 */
export function getFileCategory(filePath: string): string {
  const language = detectLanguageFromPath(filePath);
  if (!language) return 'unknown';

  const info = getLanguageInfo(language);
  return info?.category || 'unknown';
}
/**
 * File Operations Constants
 *
 * Centralized configuration values for file operations to eliminate hardcoded values
 */

export const FILE_OPERATION_CONSTANTS = {
  // Confidence thresholds
  COMMAND_CONFIDENCE_THRESHOLD: 0.8,
  TASK_CONFIDENCE_THRESHOLD: 0.6,
  FUZZY_THRESHOLD: 0.8,
  PATTERN_MATCH_CONFIDENCE: 0.8,
  RECENT_FILE_CONFIDENCE: 0.6,

  // File size limits
  LARGE_FILE_THRESHOLD: 100000, // 100KB

  // Limits and counts
  RECENT_FILES_LIMIT: 3,
  MULTIPLE_FILES_THRESHOLD: 5,
  MODERATE_FILES_THRESHOLD: 2,
  MAX_DIRECTORY_DEPTH: 3,

  // Defaults
  DEFAULT_TEST_FRAMEWORK: 'jest',
  DEFAULT_TIMEOUT: 10000, // 10 seconds

  // File extensions and languages
  LANGUAGE_EXTENSIONS: {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'bash',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.md': 'markdown'
  } as const,

  // Programming languages
  PROGRAMMING_LANGUAGES: [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c',
    'go', 'rust', 'php', 'ruby'
  ] as const,

  // Frameworks
  FRAMEWORKS: [
    'react', 'vue', 'angular', 'express', 'django', 'flask',
    'spring', 'laravel'
  ] as const,

  // System files
  SYSTEM_FILES: [
    'package.json', 'package-lock.json', 'yarn.lock',
    'tsconfig.json', 'jsconfig.json',
    '.gitignore', '.git',
    'Dockerfile', 'docker-compose.yml',
    'Makefile', 'CMakeLists.txt'
  ] as const,

  // Config file patterns
  CONFIG_PATTERNS: [
    /config\./i,
    /\.config\./i,
    /settings\./i,
    /\.env/i,
    /webpack\./i,
    /babel\./i,
    /eslint/i
  ] as const,

  // Safety levels (ordered by risk)
  SAFETY_LEVELS: ['safe', 'cautious', 'risky', 'dangerous'] as const,

  // File operation keywords
  FILE_OPERATION_KEYWORDS: [
    'create', 'make', 'generate', 'build',
    'edit', 'modify', 'change', 'update', 'fix',
    'delete', 'remove', 'drop',
    'move', 'rename', 'relocate',
    'copy', 'duplicate',
    'refactor', 'restructure',
    'test', 'spec'
  ] as const
} as const;

export type SafetyLevel = typeof FILE_OPERATION_CONSTANTS.SAFETY_LEVELS[number];
export type ProgrammingLanguage = typeof FILE_OPERATION_CONSTANTS.PROGRAMMING_LANGUAGES[number];
export type Framework = typeof FILE_OPERATION_CONSTANTS.FRAMEWORKS[number];
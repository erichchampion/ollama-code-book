/**
 * Default Configuration Values
 *
 * Centralized default configuration values to replace hardcoded values
 * throughout the application. All timeouts, limits, and thresholds should
 * be defined here.
 */

import { AppConfig } from './types.js';
import { TIMEOUT_CONSTANTS } from './constants.js';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AppConfig = {
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes (was hardcoded in enhanced-intent-analyzer.ts:503)
    maxSize: 1000,
    cleanupInterval: 60 * 1000, // 1 minute
    enabled: true
  },

  timeouts: {
    aiCompletion: 120 * 1000, // 2 minutes (from constants.ts:48)
    fileOperation: 10 * 1000, // 10 seconds (from constants.ts:57)
    serverHealth: 5 * 1000, // 5 seconds (from constants.ts:60)
    networkRequest: 30 * 1000, // 30 seconds
    analysis: 30 * 1000 // 30 seconds
  },

  performance: {
    memory: {
      gcDelay: 100, // was hardcoded in memory-manager.ts:182
      warningThreshold: 512, // 512 MB
      limitThreshold: 1024 // 1 GB
    },

    polling: {
      interval: 500, // was hardcoded in enhanced-mode.ts:806
      maxInterval: 5000,
      minInterval: 100
    },

    filesystem: {
      maxConcurrentOps: 10,
      chunkSize: 64 * 1024, // 64 KB
      enableCaching: true
    }
  },

  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false,
    maxFileSize: 10, // 10 MB
    maxFiles: 5
  },

  security: {
    enableSanitization: true,
    maxInputLength: 10000,
    allowedExtensions: [
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.pyw',
      '.java', '.kt',
      '.cs',
      '.cpp', '.cc', '.cxx', '.c', '.h',
      '.rs',
      '.go',
      '.php',
      '.rb',
      '.swift',
      '.dart',
      '.scala',
      '.clj', '.cljs',
      '.hs',
      '.elm',
      '.vue',
      '.svelte',
      '.json', '.yaml', '.yml',
      '.md', '.txt',
      '.html', '.htm', '.css', '.scss',
      '.sql',
      '.sh', '.bash', '.zsh',
      '.ps1',
      '.dockerfile', '.makefile'
    ],
    blockedPatterns: [
      '.git/**',
      '.svn/**',
      '.hg/**',
      '.bzr/**',
      '.vscode/**',
      '.idea/**',
      '.vs/**',
      '.cursor/**',
      '.claude/**',
      '.github/**',
      '.gitlab/**',
      '.specfy/**',
      'node_modules/**',
      '.npm/**',
      '.yarn/**',
      'dist/**',
      'build/**',
      'out/**',
      '.next/**',
      '.cache/**',
      '.tmp/**',
      '.temp/**',
      'coverage/**',
      '.nyc_output/**'
    ]
  },

  integrations: {
    ollama: {
      url: 'http://localhost:11434',
      timeout: TIMEOUT_CONSTANTS.MEDIUM,
      enableHealthChecks: true,
      healthCheckInterval: 2 * 1000 // was in constants.ts:66
    },

    telemetry: {
      enabled: false,
      submissionInterval: 30 * 60 * 1000, // was in constants.ts:99
      maxBufferSize: 1000
    }
  },

  development: {
    debug: false,
    verbose: false,
    enableProfiling: false,
    mockServices: false
  }
};
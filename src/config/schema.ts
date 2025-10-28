/**
 * Configuration Schema
 * 
 * Defines the structure and validation rules for the application configuration.
 * Uses Zod for runtime type validation.
 */

import { z } from 'zod';
import { TIMEOUT_CONSTANTS, RETRY_CONSTANTS } from './constants.js';
import {
  DEFAULT_OLLAMA_URL,
  AI_COMPLETION_TIMEOUT,
  DEFAULT_MAX_RETRIES,
  DEFAULT_INITIAL_RETRY_DELAY,
  DEFAULT_MAX_RETRY_DELAY,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  DEFAULT_TOP_K,
  DEFAULT_REPEAT_PENALTY,
  DEFAULT_INDEX_DEPTH,
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_INCLUDE_PATTERNS,
  MAX_CODE_ANALYSIS_FILE_SIZE,
  CODE_ANALYSIS_TIMEOUT,
  DEFAULT_TAB_WIDTH
} from '../constants.js';

// Define log level enum
const LogLevel = z.enum(['error', 'warn', 'info', 'verbose', 'debug', 'trace']);

// API configuration schema
const ApiConfigSchema = z.object({
  key: z.string().optional(),
  baseUrl: z.string().url().optional(),
  version: z.string().optional(),
  timeout: z.number().positive().optional()
});

// Ollama configuration schema
const OllamaConfigSchema = z.object({
  baseUrl: z.string().url().default(DEFAULT_OLLAMA_URL),
  timeout: z.number().positive().default(AI_COMPLETION_TIMEOUT),
  retryOptions: z.object({
    maxRetries: z.number().default(DEFAULT_MAX_RETRIES),
    initialDelayMs: z.number().default(DEFAULT_INITIAL_RETRY_DELAY),
    maxDelayMs: z.number().default(DEFAULT_MAX_RETRY_DELAY)
  }).default({
    maxRetries: DEFAULT_MAX_RETRIES,
    initialDelayMs: DEFAULT_INITIAL_RETRY_DELAY,
    maxDelayMs: DEFAULT_MAX_RETRY_DELAY
  })
});

// AI model configuration schema
const AiConfigSchema = z.object({
  defaultModel: z.string().default(DEFAULT_MODEL),
  defaultTemperature: z.number().min(0).max(2).default(DEFAULT_TEMPERATURE),
  defaultTopP: z.number().min(0).max(1).default(DEFAULT_TOP_P),
  defaultTopK: z.number().default(DEFAULT_TOP_K),
  defaultRepeatPenalty: z.number().default(DEFAULT_REPEAT_PENALTY)
});

// Telemetry configuration schema
const TelemetryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  anonymizeData: z.boolean().default(true),
  errorReporting: z.boolean().default(true)
});

// Terminal configuration schema
const TerminalConfigSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).default('system'),
  showProgressIndicators: z.boolean().default(true),
  useColors: z.boolean().default(true),
  codeHighlighting: z.boolean().default(true),
  maxHeight: z.number().positive().optional(),
  maxWidth: z.number().positive().optional()
});

// Code analysis configuration schema
const CodeAnalysisConfigSchema = z.object({
  indexDepth: z.number().int().positive().default(3),
  excludePatterns: z.array(z.string()).default([
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '**/*.min.js',
    '**/*.bundle.js'
  ]),
  includePatterns: z.array(z.string()).default(['**/*']),
  maxFileSize: z.number().int().positive().default(1024 * 1024), // 1MB
  scanTimeout: z.number().int().positive().default(30000) // 30s
});

// Git configuration schema
const GitConfigSchema = z.object({
  preferredRemote: z.string().default('origin'),
  preferredBranch: z.string().optional(),
  useSsh: z.boolean().default(false),
  useGpg: z.boolean().default(false),
  signCommits: z.boolean().default(false)
});

// Editor configuration schema
const EditorConfigSchema = z.object({
  preferredLauncher: z.string().optional(),
  tabWidth: z.number().int().positive().default(2),
  insertSpaces: z.boolean().default(true),
  formatOnSave: z.boolean().default(true)
});

// Paths configuration schema - will be populated at runtime
const PathsConfigSchema = z.object({
  home: z.string().optional(),
  app: z.string().optional(),
  cache: z.string().optional(),
  logs: z.string().optional(),
  workspace: z.string().optional()
});

// Main configuration schema
export const configSchema = z.object({
  // Basic configuration
  workspace: z.string().optional(),
  logLevel: LogLevel.default('info'),
  
  // Subsystem configurations
  api: ApiConfigSchema.default({}),
  ollama: OllamaConfigSchema.default({
    baseUrl: 'http://localhost:11434',
    timeout: TIMEOUT_CONSTANTS.LONG,
    retryOptions: {
      maxRetries: RETRY_CONSTANTS.DEFAULT_MAX_RETRIES,
      initialDelayMs: RETRY_CONSTANTS.BASE_RETRY_DELAY,
      maxDelayMs: 5000
    }
  }),
  ai: AiConfigSchema.default({
    defaultModel: 'qwen2.5-coder:latest',
    defaultTemperature: 0.7,
    defaultTopP: 0.9,
    defaultTopK: 40,
    defaultRepeatPenalty: 1.1
  }),
  telemetry: TelemetryConfigSchema.default({
    enabled: true,
    anonymizeData: true,
    errorReporting: true
  }),
  terminal: TerminalConfigSchema.default({
    theme: 'system',
    showProgressIndicators: true,
    useColors: true,
    codeHighlighting: true
  }),
  codeAnalysis: CodeAnalysisConfigSchema.default({
    indexDepth: 3,
    excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    includePatterns: ['**/*'],
    maxFileSize: 1024 * 1024,
    scanTimeout: 30000
  }),
  git: GitConfigSchema.default({
    preferredRemote: 'origin',
    useSsh: false,
    useGpg: false,
    signCommits: false
  }),
  editor: EditorConfigSchema.default({
    tabWidth: 2,
    insertSpaces: true,
    formatOnSave: true
  })
});

// MCP configuration schema
const MCPServerConfigSchema = z.object({
  enabled: z.boolean().default(false),
  port: z.number().int().positive().default(3001),
  autoStart: z.boolean().default(false),
  tools: z.object({
    enabled: z.boolean().default(true),
    allowedTools: z.array(z.string()).default(['*']),
    maxConcurrent: z.number().int().positive().default(5)
  }).default({
    enabled: true,
    allowedTools: ['*'],
    maxConcurrent: 5
  }),
  resources: z.object({
    enabled: z.boolean().default(true),
    allowedResources: z.array(z.string()).default(['*']),
    cacheTTL: z.number().int().positive().default(300000) // 5 minutes
  }).default({
    enabled: true,
    allowedResources: ['*'],
    cacheTTL: 300000
  }),
  security: z.object({
    requireAuth: z.boolean().default(false),
    allowedHosts: z.array(z.string()).default(['*']),
    maxRequestSize: z.number().int().positive().default(10485760) // 10MB
  }).default({
    requireAuth: false,
    allowedHosts: ['*'],
    maxRequestSize: 10485760
  }),
  logging: z.object({
    enabled: z.boolean().default(false),
    level: LogLevel.default('info'),
    logFile: z.string().default('mcp-server.log')
  }).default({
    enabled: false,
    level: 'info',
    logFile: 'mcp-server.log'
  })
});

const MCPClientConnectionSchema = z.object({
  name: z.string(),
  enabled: z.boolean().default(true),
  command: z.string(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).default({}),
  cwd: z.string().optional(),
  timeout: z.number().int().positive().default(30000), // 30 seconds
  retryCount: z.number().int().min(0).default(3),
  retryDelay: z.number().int().positive().default(1000) // 1 second
});

const MCPClientConfigSchema = z.object({
  enabled: z.boolean().default(false),
  connections: z.array(MCPClientConnectionSchema).default([]),
  globalTimeout: z.number().int().positive().default(60000), // 1 minute
  maxConcurrentConnections: z.number().int().positive().default(3),
  logging: z.object({
    enabled: z.boolean().default(false),
    level: LogLevel.default('info'),
    logFile: z.string().default('mcp-client.log')
  }).default({
    enabled: false,
    level: 'info',
    logFile: 'mcp-client.log'
  })
});

const MCPConfigSchema = z.object({
  server: MCPServerConfigSchema.default({
    enabled: false,
    port: 3001,
    autoStart: false,
    tools: { enabled: true, allowedTools: ['*'], maxConcurrent: 5 },
    resources: { enabled: true, allowedResources: ['*'], cacheTTL: 300000 },
    security: { requireAuth: false, allowedHosts: ['*'], maxRequestSize: 10485760 },
    logging: { enabled: false, level: 'info', logFile: 'mcp-server.log' }
  }),
  client: MCPClientConfigSchema.default({
    enabled: false,
    connections: [],
    globalTimeout: 60000,
    maxConcurrentConnections: 3,
    logging: { enabled: false, level: 'info', logFile: 'mcp-client.log' }
  })
});


// Extended configuration schema with MCP and other features
export const extendedConfigSchema = configSchema.extend({
  // MCP configuration
  mcp: MCPConfigSchema.default({
    server: {
      enabled: false,
      port: 3001,
      autoStart: false,
      tools: { enabled: true, allowedTools: ['*'], maxConcurrent: 5 },
      resources: { enabled: true, allowedResources: ['*'], cacheTTL: 300000 },
      security: { requireAuth: false, allowedHosts: ['*'], maxRequestSize: 10485760 },
      logging: { enabled: false, level: 'info', logFile: 'mcp-server.log' }
    },
    client: {
      enabled: false,
      connections: [],
      globalTimeout: 60000,
      maxConcurrentConnections: 3,
      logging: { enabled: false, level: 'info', logFile: 'mcp-client.log' }
    }
  }),

  // Runtime configuration
  paths: PathsConfigSchema.optional(),

  // Persistent data
  lastUpdateCheck: z.number().optional(),
  recentWorkspaces: z.array(z.string()).default([])
});

// Type definition generated from schema
export type ConfigType = z.infer<typeof configSchema>;

// Export sub-schemas for modular validation
export {
  LogLevel,
  ApiConfigSchema,
  OllamaConfigSchema,
  AiConfigSchema,
  TelemetryConfigSchema,
  TerminalConfigSchema,
  CodeAnalysisConfigSchema,
  GitConfigSchema,
  EditorConfigSchema,
  PathsConfigSchema,
  MCPConfigSchema,
  MCPServerConfigSchema,
  MCPClientConfigSchema,
  MCPClientConnectionSchema
}; 
# Adding llama.cpp as an Alternative Model Provider

This document provides detailed implementation instructions for adding llama.cpp support to ollama-code, enabling users to run GGUF models directly via llama-server without requiring Ollama.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Implementation Guide](#implementation-guide)
   - [Phase 1: Core Infrastructure](#phase-1-core-infrastructure)
   - [Phase 2: Client and Provider](#phase-2-client-and-provider)
   - [Phase 3: Integration](#phase-3-integration)
   - [Phase 4: Commands](#phase-4-commands)
5. [Testing](#testing)
6. [Configuration Reference](#configuration-reference)

---

## Overview

### Why llama.cpp?

llama.cpp is a popular C++ implementation for running LLaMA models with several advantages:
- Direct support for GGUF model files
- Excellent performance with GPU acceleration
- No dependency on external services like Ollama
- Fine-grained control over model parameters

### Recommended Approach

Use **llama-server** (the built-in HTTP server from llama.cpp) with its OpenAI-compatible API:

| Approach | Pros | Cons |
|----------|------|------|
| **llama-server** (Recommended) | Familiar HTTP pattern, process isolation, no native modules | Requires separate binary |
| node-llama-cpp | Direct integration, lowest latency | Native compilation issues, platform-specific |
| Direct CLI | Simplest | High overhead, no streaming |

The llama-server approach follows the same pattern as the existing Ollama integration.

---

## Architecture

### Current Provider Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BaseAIProvider (abstract)                 │
│  src/ai/providers/base-provider.ts                          │
├─────────────────────────────────────────────────────────────┤
│  Methods:                                                    │
│  - getName(): string                                         │
│  - getCapabilities(): ProviderCapabilities                   │
│  - initialize(): Promise<void>                               │
│  - testConnection(): Promise<boolean>                        │
│  - complete(prompt, options): Promise<AICompletionResponse>  │
│  - completeStream(prompt, options, onEvent): Promise<void>   │
│  - listModels(): Promise<AIModel[]>                          │
│  - getModel(modelId): Promise<AIModel | null>                │
│  - calculateCost(promptTokens, completionTokens): number     │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ OllamaProvider  │ │ OpenAIProvider  │ │ LlamaCppProvider│
│                 │ │                 │ │   (NEW)         │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Provider Factory

The factory in `src/ai/providers/index.ts` creates providers:

```typescript
export function createProvider(type: string, config: ProviderConfig): BaseAIProvider {
  switch (type.toLowerCase()) {
    case 'ollama':
      return new OllamaProvider(config);
    case 'llamacpp':  // NEW
      return new LlamaCppProvider(config);
    // ...
  }
}
```

---

## Prerequisites

### llama-server Installation

Users must install llama.cpp and build llama-server:

```bash
# Clone and build llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make llama-server

# Or with GPU support (CUDA)
make llama-server GGML_CUDA=1

# Or with Metal (macOS)
make llama-server GGML_METAL=1
```

The binary will be at `./llama-server` (or `./build/bin/llama-server` with CMake).

### Running llama-server

```bash
# Basic usage
./llama-server -m /path/to/model.gguf --port 8080

# With GPU offloading
./llama-server -m /path/to/model.gguf --port 8080 -ngl 99

# With more options
./llama-server \
  -m /path/to/model.gguf \
  --port 8080 \
  --ctx-size 8192 \
  --n-gpu-layers 99 \
  --flash-attn \
  --threads 8
```

### llama-server API Endpoints

llama-server provides OpenAI-compatible endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | Chat completions (streaming supported) |
| `/v1/models` | GET | List loaded model |
| `/health` | GET | Server health check |
| `/slots` | GET | Server slot status |

---

## Implementation Guide

### Phase 1: Core Infrastructure

#### 1.1 Add Constants (`src/constants.ts`)

Add these constants alongside the existing Ollama constants:

```typescript
// =============================================================================
// LLAMA.CPP CONSTANTS
// =============================================================================

/** Default llama-server base URL */
export const DEFAULT_LLAMACPP_URL = 'http://localhost:8080';

/** Default llama-server port */
export const DEFAULT_LLAMACPP_PORT = 8080;

/** Default context size for llama.cpp */
export const DEFAULT_LLAMACPP_CONTEXT_SIZE = 4096;

/** Default GPU layers (-1 = auto, 0 = CPU only) */
export const DEFAULT_LLAMACPP_GPU_LAYERS = -1;
```

#### 1.2 Create Configuration Schema (`src/config/llamacpp-config.ts`)

```typescript
/**
 * llama.cpp Configuration Schema
 */

import { z } from 'zod';

export const LlamaCppConfigSchema = z.object({
  /** Enable llama.cpp provider */
  enabled: z.boolean().default(false),

  /** Path to llama-server executable */
  executablePath: z.string().optional(),

  /** Path to the GGUF model file */
  modelPath: z.string().optional(),

  /** llama-server base URL */
  baseUrl: z.string().url().default('http://localhost:8080'),

  /** Context window size */
  contextSize: z.number().int().positive().default(4096),

  /** Number of GPU layers to offload (-1 = auto) */
  gpuLayers: z.number().int().min(-1).default(-1),

  /** Number of threads for CPU inference */
  threads: z.number().int().positive().optional(),

  /** Batch size for prompt processing */
  batchSize: z.number().int().positive().default(512),

  /** Enable flash attention */
  flashAttention: z.boolean().default(false),

  /** Default temperature */
  temperature: z.number().min(0).max(2).default(0.7),

  /** Default top_p */
  topP: z.number().min(0).max(1).default(0.9),

  /** Default top_k */
  topK: z.number().int().positive().default(40),
});

export type LlamaCppConfig = z.infer<typeof LlamaCppConfigSchema>;

/**
 * Get llama.cpp configuration from environment variables
 */
export function getLlamaCppConfigFromEnv(): Partial<LlamaCppConfig> {
  return {
    enabled: process.env.LLAMACPP_ENABLED === 'true',
    executablePath: process.env.LLAMACPP_EXECUTABLE,
    modelPath: process.env.LLAMACPP_MODEL_PATH,
    baseUrl: process.env.LLAMACPP_API_URL || undefined,
    contextSize: process.env.LLAMACPP_CONTEXT_SIZE
      ? parseInt(process.env.LLAMACPP_CONTEXT_SIZE, 10)
      : undefined,
    gpuLayers: process.env.LLAMACPP_GPU_LAYERS
      ? parseInt(process.env.LLAMACPP_GPU_LAYERS, 10)
      : undefined,
  };
}
```

#### 1.3 Create Server Manager (`src/utils/llamacpp-server.ts`)

Model this after `src/utils/ollama-server.ts`:

```typescript
/**
 * llama.cpp Server Manager
 *
 * Handles automatic startup and management of the llama-server.
 */

import { spawn, exec } from 'child_process';
import { normalizeError } from '../utils/error-utils.js';
import { logger } from './logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import {
  SERVER_HEALTH_TIMEOUT,
  SERVER_STARTUP_TIMEOUT,
  HEALTH_CHECK_INTERVAL,
  DEFAULT_LLAMACPP_URL
} from '../constants.js';
import { DELAY_CONSTANTS } from '../config/constants.js';

/**
 * Configuration for llama-server startup
 */
export interface LlamaCppServerConfig {
  /** Path to llama-server executable */
  executablePath?: string;

  /** Path to the GGUF model file */
  modelPath: string;

  /** Port to run on */
  port?: number;

  /** Context size */
  contextSize?: number;

  /** GPU layers to offload */
  gpuLayers?: number;

  /** Number of threads */
  threads?: number;

  /** Enable flash attention */
  flashAttention?: boolean;

  /** Health check interval in ms */
  healthCheckInterval?: number;

  /** Startup timeout in ms */
  startupTimeout?: number;
}

/**
 * Check if llama-server is running
 */
export async function isLlamaCppServerRunning(
  baseUrl: string = DEFAULT_LLAMACPP_URL
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(SERVER_HEALTH_TIMEOUT)
    });

    return response.ok;
  } catch (error) {
    logger.debug('llama-server health check failed', {
      error: normalizeError(error).message
    });
    return false;
  }
}

/**
 * Find llama-server executable
 */
export async function findLlamaCppExecutable(): Promise<string | null> {
  const possiblePaths = [
    'llama-server',                          // In PATH
    '/usr/local/bin/llama-server',           // Common install location
    '/opt/homebrew/bin/llama-server',        // Homebrew on Apple Silicon
    './llama-server',                        // Current directory
    './build/bin/llama-server',              // CMake build output
  ];

  for (const path of possiblePaths) {
    try {
      await new Promise<void>((resolve, reject) => {
        exec(`"${path}" --version`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      return path;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Check if llama-server is installed
 */
export async function isLlamaCppInstalled(): Promise<boolean> {
  const executable = await findLlamaCppExecutable();
  return executable !== null;
}

/**
 * Start llama-server in the background
 */
export async function startLlamaCppServer(config: LlamaCppServerConfig): Promise<void> {
  logger.info('Starting llama-server in the background...');

  const {
    executablePath,
    modelPath,
    port = 8080,
    contextSize = 4096,
    gpuLayers = -1,
    threads,
    flashAttention = false,
    healthCheckInterval = HEALTH_CHECK_INTERVAL,
    startupTimeout = SERVER_STARTUP_TIMEOUT * 2, // Models take longer to load
  } = config;

  // Find executable if not specified
  const executable = executablePath || await findLlamaCppExecutable();
  if (!executable) {
    throw createUserError('llama-server not found', {
      category: ErrorCategory.SERVER,
      resolution: 'Please install llama.cpp and ensure llama-server is in your PATH, or set LLAMACPP_EXECUTABLE.'
    });
  }

  // Validate model path
  if (!modelPath) {
    throw createUserError('No model path specified', {
      category: ErrorCategory.CONFIGURATION,
      resolution: 'Set LLAMACPP_MODEL_PATH or configure modelPath in settings.'
    });
  }

  // Build command arguments
  const args: string[] = [
    '-m', modelPath,
    '--port', port.toString(),
    '--ctx-size', contextSize.toString(),
  ];

  if (gpuLayers !== 0) {
    args.push('-ngl', gpuLayers.toString());
  }

  if (threads) {
    args.push('--threads', threads.toString());
  }

  if (flashAttention) {
    args.push('--flash-attn');
  }

  logger.debug('Starting llama-server with args:', { executable, args });

  return new Promise((resolve, reject) => {
    const serverProcess = spawn(executable, args, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;
    let startupTimeoutHandle: NodeJS.Timeout | null = null;
    let healthCheckIntervalHandle: NodeJS.Timeout | null = null;
    let healthCheckRetries = 0;
    const maxHealthCheckRetries = Math.ceil(startupTimeout / healthCheckInterval);

    const cleanup = () => {
      if (startupTimeoutHandle) {
        clearTimeout(startupTimeoutHandle);
        startupTimeoutHandle = null;
      }
      if (healthCheckIntervalHandle) {
        clearInterval(healthCheckIntervalHandle);
        healthCheckIntervalHandle = null;
      }
    };

    const resolveOnce = (message: string) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        logger.info(message);
        resolve();
      }
    };

    const rejectOnce = (error: any) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        serverProcess.kill();
        reject(error);
      }
    };

    // Timeout for server startup
    startupTimeoutHandle = setTimeout(() => {
      rejectOnce(createUserError(
        `llama-server failed to start within ${startupTimeout / 1000} seconds`,
        {
          category: ErrorCategory.SERVER,
          resolution: 'Model loading may take longer. Try starting llama-server manually.'
        }
      ));
    }, startupTimeout);

    // Periodic health checks
    healthCheckIntervalHandle = setInterval(async () => {
      if (resolved) return;

      healthCheckRetries++;
      logger.debug(`llama-server health check ${healthCheckRetries}/${maxHealthCheckRetries}`);

      try {
        const isRunning = await isLlamaCppServerRunning(
          `http://localhost:${port}`
        );
        if (isRunning) {
          resolveOnce('llama-server started successfully');
        }
      } catch (error) {
        logger.debug(`Health check ${healthCheckRetries} failed:`, error);
      }
    }, healthCheckInterval);

    // Monitor output
    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      logger.debug('llama-server:', output);

      // Look for startup indicators
      if (output.includes('HTTP server listening') ||
          output.includes('llama server listening')) {
        resolveOnce('llama-server started (output detection)');
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      logger.debug('llama-server stderr:', output);

      // Model loading progress
      if (output.includes('model loaded')) {
        logger.info('Model loaded successfully');
      }
    });

    serverProcess.on('error', (error) => {
      rejectOnce(createUserError(`Failed to start llama-server: ${error.message}`, {
        cause: error,
        category: ErrorCategory.SERVER,
        resolution: 'Ensure llama-server is properly installed.'
      }));
    });

    serverProcess.on('exit', (code) => {
      if (!resolved) {
        rejectOnce(createUserError(`llama-server exited with code ${code}`, {
          category: ErrorCategory.SERVER,
          resolution: 'Check model path and server configuration.'
        }));
      }
    });

    serverProcess.unref();
  });
}

/**
 * Ensure llama-server is running with the specified model
 */
export async function ensureLlamaCppServerRunning(
  config: LlamaCppServerConfig
): Promise<void> {
  const baseUrl = `http://localhost:${config.port || 8080}`;

  logger.debug('Checking if llama-server is running...');

  const isRunning = await isLlamaCppServerRunning(baseUrl);
  if (isRunning) {
    logger.debug('llama-server is already running');
    return;
  }

  logger.info('llama-server is not running, attempting to start...');

  const isInstalled = await isLlamaCppInstalled();
  if (!isInstalled) {
    throw createUserError('llama-server is not installed', {
      category: ErrorCategory.SERVER,
      resolution: 'Install llama.cpp from https://github.com/ggerganov/llama.cpp'
    });
  }

  await startLlamaCppServer(config);

  await new Promise(resolve => setTimeout(resolve, DELAY_CONSTANTS.LONG_DELAY));

  const isNowRunning = await isLlamaCppServerRunning(baseUrl);
  if (!isNowRunning) {
    throw createUserError('Failed to start llama-server', {
      category: ErrorCategory.SERVER,
      resolution: 'Try starting llama-server manually with: llama-server -m /path/to/model.gguf'
    });
  }

  logger.info('llama-server is now running');
}
```

### Phase 2: Client and Provider

#### 2.1 Create HTTP Client (`src/ai/llamacpp-client.ts`)

```typescript
/**
 * llama.cpp HTTP Client
 *
 * Client for interacting with llama-server's OpenAI-compatible API.
 */

import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { withTimeout, withRetry } from '../utils/async.js';
import { ensureLlamaCppServerRunning } from '../utils/llamacpp-server.js';
import {
  DEFAULT_LLAMACPP_URL,
  AI_COMPLETION_TIMEOUT,
  DEFAULT_MAX_RETRIES,
  DEFAULT_INITIAL_RETRY_DELAY,
  DEFAULT_MAX_RETRY_DELAY,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  USER_AGENT
} from '../constants.js';

// OpenAI-compatible types for llama-server
export interface LlamaCppMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LlamaCppCompletionOptions {
  model?: string;  // Ignored by llama-server (uses loaded model)
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  stopSequences?: string[];
  stream?: boolean;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface LlamaCppCompletionRequest {
  model: string;
  messages: LlamaCppMessage[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  stop?: string[];
  stream?: boolean;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface LlamaCppCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: 'stop' | 'length' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LlamaCppStreamEvent {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: 'stop' | 'length' | null;
  }>;
}

export interface LlamaCppModel {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

interface LlamaCppClientConfig {
  apiBaseUrl: string;
  timeout: number;
  retryOptions: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  defaultTemperature: number;
  defaultTopP: number;
}

const DEFAULT_CONFIG: LlamaCppClientConfig = {
  apiBaseUrl: DEFAULT_LLAMACPP_URL,
  timeout: AI_COMPLETION_TIMEOUT,
  retryOptions: {
    maxRetries: DEFAULT_MAX_RETRIES,
    initialDelayMs: DEFAULT_INITIAL_RETRY_DELAY,
    maxDelayMs: DEFAULT_MAX_RETRY_DELAY
  },
  defaultTemperature: DEFAULT_TEMPERATURE,
  defaultTopP: DEFAULT_TOP_P
};

/**
 * llama.cpp HTTP client for llama-server
 */
export class LlamaCppClient {
  private config: LlamaCppClientConfig;
  private baseUrl: string;

  constructor(config: Partial<LlamaCppClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseUrl = this.config.apiBaseUrl;

    logger.debug('LlamaCpp client created', { baseUrl: this.baseUrl });
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT
    };
  }

  /**
   * Check if server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models (returns the currently loaded model)
   */
  async listModels(): Promise<LlamaCppModel[]> {
    const response = await fetch(`${this.baseUrl}/v1/models`, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw createUserError(`Failed to list models: ${response.statusText}`, {
        category: ErrorCategory.API
      });
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Send a completion request (non-streaming)
   */
  async complete(
    messages: LlamaCppMessage[],
    options: LlamaCppCompletionOptions = {}
  ): Promise<LlamaCppCompletionResponse> {
    const request: LlamaCppCompletionRequest = {
      model: 'llama',  // llama-server ignores this, uses loaded model
      messages,
      temperature: options.temperature ?? this.config.defaultTemperature,
      top_p: options.topP ?? this.config.defaultTopP,
      max_tokens: options.maxTokens,
      stop: options.stopSequences,
      stream: false
    };

    if (options.topK !== undefined) {
      (request as any).top_k = options.topK;
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw createUserError(`Completion failed: ${response.statusText} - ${errorText}`, {
        category: ErrorCategory.API
      });
    }

    return await response.json();
  }

  /**
   * Send a streaming completion request
   */
  async completeStream(
    messages: LlamaCppMessage[],
    options: LlamaCppCompletionOptions,
    onEvent: (event: LlamaCppStreamEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const request: LlamaCppCompletionRequest = {
      model: 'llama',
      messages,
      temperature: options.temperature ?? this.config.defaultTemperature,
      top_p: options.topP ?? this.config.defaultTopP,
      max_tokens: options.maxTokens,
      stop: options.stopSequences,
      stream: true
    };

    if (options.topK !== undefined) {
      (request as any).top_k = options.topK;
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      signal: abortSignal || AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw createUserError(`Streaming completion failed: ${response.statusText}`, {
        category: ErrorCategory.API
      });
    }

    if (!response.body) {
      throw createUserError('No response body for streaming', {
        category: ErrorCategory.API
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const event = JSON.parse(trimmed.slice(6)) as LlamaCppStreamEvent;
              onEvent(event);
            } catch (parseError) {
              logger.debug('Failed to parse SSE event:', trimmed);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
```

#### 2.2 Create Provider (`src/ai/providers/llamacpp-provider.ts`)

```typescript
/**
 * llama.cpp Provider Implementation
 *
 * Implements BaseAIProvider for llama-server (llama.cpp's HTTP server).
 */

import { logger } from '../../utils/logger.js';
import { normalizeError } from '../../utils/error-utils.js';
import {
  isLlamaCppServerRunning,
  ensureLlamaCppServerRunning
} from '../../utils/llamacpp-server.js';
import { TIMEOUT_CONSTANTS, RETRY_CONSTANTS } from '../../config/constants.js';
import {
  BaseAIProvider,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse,
  AIStreamEvent,
  AIModel,
  AICapability,
  ProviderCapabilities,
  ProviderConfig,
  ProviderConnectionError
} from './base-provider.js';
import {
  LlamaCppClient,
  LlamaCppMessage,
  LlamaCppStreamEvent
} from '../llamacpp-client.js';
import { DEFAULT_LLAMACPP_URL } from '../../constants.js';

export interface LlamaCppProviderConfig extends ProviderConfig {
  /** Path to GGUF model file (for auto-starting server) */
  modelPath?: string;

  /** Context size */
  contextSize?: number;

  /** GPU layers */
  gpuLayers?: number;
}

/**
 * llama.cpp AI Provider
 */
export class LlamaCppProvider extends BaseAIProvider {
  private client: LlamaCppClient;
  private baseUrl: string;
  private modelPath?: string;
  private contextSize: number;
  private gpuLayers: number;

  constructor(config: LlamaCppProviderConfig) {
    const defaultConfig = {
      name: config.name || 'llamacpp',
      baseUrl: config.baseUrl || DEFAULT_LLAMACPP_URL,
      timeout: TIMEOUT_CONSTANTS.MEDIUM,
      retryOptions: {
        maxRetries: RETRY_CONSTANTS.DEFAULT_MAX_RETRIES,
        initialDelayMs: RETRY_CONSTANTS.BASE_RETRY_DELAY,
        maxDelayMs: RETRY_CONSTANTS.MAX_BACKOFF_DELAY
      },
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 1000,
        tokensPerMinute: 100000
      },
      caching: {
        enabled: true,
        ttlMs: 300000
      }
    };

    super({ ...defaultConfig, ...config });

    this.baseUrl = this.config.baseUrl!;
    this.modelPath = config.modelPath;
    this.contextSize = config.contextSize || 4096;
    this.gpuLayers = config.gpuLayers ?? -1;

    this.client = new LlamaCppClient({
      apiBaseUrl: this.baseUrl
    });
  }

  getName(): string {
    return 'llama.cpp';
  }

  getDisplayName(): string {
    return 'llama.cpp (Local)';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxContextWindow: this.contextSize,
      supportedCapabilities: [
        AICapability.TEXT_COMPLETION,
        AICapability.CHAT,
        AICapability.CODE_GENERATION,
        AICapability.CODE_ANALYSIS,
        AICapability.STREAMING,
        AICapability.REASONING
      ],
      rateLimits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 100000
      },
      features: {
        streaming: true,
        functionCalling: false,  // Model-dependent
        imageInput: false,       // Model-dependent
        documentInput: false,
        customInstructions: true
      }
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing llama.cpp provider');

    try {
      const connectionSuccess = await this.testConnection();

      if (!connectionSuccess) {
        throw new ProviderConnectionError(
          'llamacpp',
          new Error('Failed to connect to llama-server')
        );
      }

      this.isInitialized = true;
      this.health.status = 'healthy';

      logger.info('llama.cpp provider initialized successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize llama.cpp provider:', error);
      this.isInitialized = false;
      this.health.status = 'unhealthy';
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    logger.debug('Testing connection to llama-server');

    try {
      const isHealthy = await this.client.healthCheck();
      if (isHealthy) {
        logger.debug('llama-server connection test successful');
        return true;
      }
    } catch (error) {
      logger.debug('llama-server connection test failed', error);
    }

    // Try to start server if we have a model path
    if (this.modelPath) {
      try {
        logger.info('Attempting to start llama-server...');
        await ensureLlamaCppServerRunning({
          modelPath: this.modelPath,
          contextSize: this.contextSize,
          gpuLayers: this.gpuLayers
        });

        const isHealthy = await this.client.healthCheck();
        if (isHealthy) {
          logger.info('llama-server started and connection test successful');
          return true;
        }
      } catch (startupError) {
        logger.error('Failed to start llama-server', startupError);
      }
    }

    return false;
  }

  async complete(
    prompt: string | AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const requestId = `llamacpp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const messages = this.formatMessages(prompt, options.system);

      const response = await this.client.complete(messages, {
        temperature: options.temperature,
        topP: options.topP,
        topK: options.topK,
        maxTokens: options.maxTokens,
        stopSequences: options.stopSequences
      });

      const processingTime = Date.now() - startTime;
      const choice = response.choices[0];

      this.updateMetrics(
        true,
        processingTime,
        response.usage?.total_tokens || 0,
        0  // Local inference is free
      );

      return {
        content: choice?.message?.content || '',
        model: response.model,
        finishReason: this.mapFinishReason(choice?.finish_reason),
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        metadata: {
          requestId,
          processingTime,
          provider: 'llamacpp'
        }
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, processingTime);
      throw error;
    }
  }

  async completeStream(
    prompt: string | AIMessage[],
    options: AICompletionOptions,
    onEvent: (event: AIStreamEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const messages = this.formatMessages(prompt, options.system);
    let fullContent = '';

    await this.client.completeStream(
      messages,
      {
        temperature: options.temperature,
        topP: options.topP,
        topK: options.topK,
        maxTokens: options.maxTokens,
        stopSequences: options.stopSequences
      },
      (event: LlamaCppStreamEvent) => {
        const choice = event.choices[0];
        const delta = choice?.delta?.content || '';
        fullContent += delta;

        onEvent({
          content: fullContent,
          done: choice?.finish_reason !== null,
          delta
        });
      },
      abortSignal
    );
  }

  async listModels(): Promise<AIModel[]> {
    try {
      const models = await this.client.listModels();

      return models.map(model => ({
        id: model.id,
        name: model.id,
        provider: 'llamacpp',
        capabilities: [
          AICapability.TEXT_COMPLETION,
          AICapability.CHAT,
          AICapability.CODE_GENERATION,
          AICapability.STREAMING
        ],
        contextWindow: this.contextSize,
        costPerToken: { input: 0, output: 0 },  // Local is free
        averageResponseTime: 1000,
        qualityScore: 0.8,
        lastUpdated: new Date()
      }));
    } catch (error) {
      logger.error('Failed to list llama.cpp models:', error);
      return [];
    }
  }

  async getModel(modelId: string): Promise<AIModel | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  calculateCost(promptTokens: number, completionTokens: number): number {
    return 0;  // Local inference is free
  }

  private formatMessages(
    prompt: string | AIMessage[],
    system?: string
  ): LlamaCppMessage[] {
    const messages: LlamaCppMessage[] = [];

    if (system) {
      messages.push({ role: 'system', content: system });
    }

    if (typeof prompt === 'string') {
      messages.push({ role: 'user', content: prompt });
    } else {
      for (const msg of prompt) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    return messages;
  }

  private mapFinishReason(
    reason: string | null | undefined
  ): 'stop' | 'length' | 'content_filter' | 'function_call' | 'error' {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      default: return 'stop';
    }
  }
}
```

### Phase 3: Integration

#### 3.1 Update Provider Registry (`src/ai/providers/index.ts`)

Add to existing file:

```typescript
// Add import
export { LlamaCppProvider } from './llamacpp-provider.js';

// Update createProvider function
export function createProvider(type: string, config: ProviderConfig): BaseAIProvider {
  switch (type.toLowerCase()) {
    case 'ollama':
      return new OllamaProvider(config);
    case 'llamacpp':
      return new LlamaCppProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    // ... rest unchanged
  }
}

// Update getAvailableProviderTypes
export function getAvailableProviderTypes(): string[] {
  return ['ollama', 'llamacpp', 'openai', 'anthropic', 'google', 'custom-local'];
}

// Update validateProviderConfig
export function validateProviderConfig(type: string, config: ProviderConfig): boolean {
  if (!config.name) return false;

  switch (type.toLowerCase()) {
    case 'ollama':
      return !!config.baseUrl;
    case 'llamacpp':
      // llama.cpp requires baseUrl OR modelPath (for auto-start)
      return !!(config.baseUrl || (config as any).modelPath);
    // ... rest unchanged
  }
}
```

#### 3.2 Update Main Config Schema (`src/config/schema.ts`)

Add llama.cpp section to the main config schema:

```typescript
import { LlamaCppConfigSchema } from './llamacpp-config.js';

// In your main config schema:
export const AppConfigSchema = z.object({
  // ... existing fields

  /** Active provider: 'ollama' | 'llamacpp' | 'anthropic' etc. */
  provider: z.enum(['ollama', 'llamacpp', 'openai', 'anthropic', 'google'])
    .default('ollama'),

  /** llama.cpp configuration */
  llamacpp: LlamaCppConfigSchema.optional(),

  // ... rest of config
});
```

### Phase 4: Commands

#### 4.1 Add Provider Commands (`src/commands/register.ts`)

Add these command registrations:

```typescript
/**
 * Register provider management commands
 */
function registerProviderCommands(): void {
  // set-provider command
  registry.register({
    name: 'set-provider',
    description: 'Switch the active AI provider',
    usage: 'set-provider <provider-name>',
    examples: [
      'set-provider ollama',
      'set-provider llamacpp'
    ],
    handler: async (args) => {
      const providerName = args[0]?.toLowerCase();
      const validProviders = ['ollama', 'llamacpp', 'openai', 'anthropic', 'google'];

      if (!providerName || !validProviders.includes(providerName)) {
        console.log(`Usage: set-provider <${validProviders.join('|')}>`);
        return;
      }

      // Update config
      const config = await loadConfig();
      config.provider = providerName;
      await saveConfig(config);

      console.log(`Active provider set to: ${providerName}`);
    }
  });

  // show-provider command
  registry.register({
    name: 'show-provider',
    description: 'Show the current active provider and its status',
    usage: 'show-provider',
    handler: async () => {
      const config = await loadConfig();
      const provider = config.provider || 'ollama';

      console.log(`Active provider: ${provider}`);

      // Check provider health
      try {
        const providerInstance = createProvider(provider, {
          name: provider,
          baseUrl: getProviderUrl(provider, config)
        });

        const isHealthy = await providerInstance.testConnection();
        console.log(`Status: ${isHealthy ? 'Connected' : 'Not connected'}`);
      } catch (error) {
        console.log(`Status: Error - ${error.message}`);
      }
    }
  });

  // llamacpp-status command
  registry.register({
    name: 'llamacpp-status',
    description: 'Show llama-server status and loaded model',
    usage: 'llamacpp-status',
    handler: async () => {
      const config = await loadConfig();
      const baseUrl = config.llamacpp?.baseUrl || DEFAULT_LLAMACPP_URL;

      const isRunning = await isLlamaCppServerRunning(baseUrl);

      if (!isRunning) {
        console.log('llama-server is not running');
        return;
      }

      console.log('llama-server is running');

      // Get loaded model
      try {
        const client = new LlamaCppClient({ apiBaseUrl: baseUrl });
        const models = await client.listModels();

        if (models.length > 0) {
          console.log(`Loaded model: ${models[0].id}`);
        }
      } catch (error) {
        console.log('Could not get model info');
      }
    }
  });

  // llamacpp-load command
  registry.register({
    name: 'llamacpp-load',
    description: 'Load a GGUF model file (restarts server)',
    usage: 'llamacpp-load <path-to-model.gguf>',
    examples: [
      'llamacpp-load ~/models/qwen2.5-coder-7b.gguf'
    ],
    handler: async (args) => {
      const modelPath = args[0];

      if (!modelPath) {
        console.log('Usage: llamacpp-load <path-to-model.gguf>');
        return;
      }

      // Resolve path
      const resolvedPath = path.resolve(modelPath.replace('~', os.homedir()));

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        console.log(`Model file not found: ${resolvedPath}`);
        return;
      }

      console.log(`Loading model: ${resolvedPath}`);
      console.log('Note: This will restart llama-server...');

      // Update config
      const config = await loadConfig();
      if (!config.llamacpp) config.llamacpp = {};
      config.llamacpp.modelPath = resolvedPath;
      await saveConfig(config);

      // Start server with new model
      try {
        await startLlamaCppServer({
          modelPath: resolvedPath,
          contextSize: config.llamacpp.contextSize,
          gpuLayers: config.llamacpp.gpuLayers
        });

        console.log('Model loaded successfully');
      } catch (error) {
        console.log(`Failed to load model: ${error.message}`);
      }
    }
  });
}
```

---

## Testing

### Unit Tests

Create `tests/unit/ai/llamacpp-provider.test.cjs`:

```javascript
const { LlamaCppProvider } = require('../../../dist/src/ai/providers/llamacpp-provider.js');

describe('LlamaCppProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new LlamaCppProvider({
      name: 'test-llamacpp',
      baseUrl: 'http://localhost:8080'
    });
  });

  test('getName returns correct name', () => {
    expect(provider.getName()).toBe('llama.cpp');
  });

  test('getCapabilities returns expected capabilities', () => {
    const caps = provider.getCapabilities();
    expect(caps.features.streaming).toBe(true);
    expect(caps.supportedCapabilities).toContain('streaming');
  });

  test('calculateCost returns 0 for local inference', () => {
    expect(provider.calculateCost(1000, 500)).toBe(0);
  });
});
```

### Integration Tests

Create `tests/integration/llamacpp/server.test.cjs`:

```javascript
const { isLlamaCppServerRunning } = require('../../../dist/src/utils/llamacpp-server.js');

describe('llama-server integration', () => {
  // Skip if server not available
  const serverAvailable = process.env.LLAMACPP_TEST_SERVER === 'true';

  (serverAvailable ? test : test.skip)('server health check', async () => {
    const isRunning = await isLlamaCppServerRunning('http://localhost:8080');
    expect(isRunning).toBe(true);
  });
});
```

### Manual Testing Checklist

1. **Server Management**
   ```bash
   # Start llama-server manually
   llama-server -m /path/to/model.gguf --port 8080

   # Test status command
   ollama-code llamacpp-status
   ```

2. **Provider Switching**
   ```bash
   # Switch to llama.cpp
   ollama-code set-provider llamacpp

   # Verify
   ollama-code show-provider
   ```

3. **Completions**
   ```bash
   # Simple completion
   ollama-code ask "What is 2+2?"

   # Code generation
   ollama-code ask "Write a Python function to calculate factorial"
   ```

---

## Configuration Reference

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLAMACPP_API_URL` | llama-server URL | `http://localhost:8080` |
| `LLAMACPP_MODEL_PATH` | Path to GGUF model | None |
| `LLAMACPP_EXECUTABLE` | Path to llama-server | Auto-detect |
| `LLAMACPP_GPU_LAYERS` | GPU layers (-1=auto) | -1 |
| `LLAMACPP_CONTEXT_SIZE` | Context window | 4096 |
| `LLAMACPP_ENABLED` | Enable provider | false |

### Config File (`~/.ollama-code/config.json`)

```json
{
  "provider": "llamacpp",
  "llamacpp": {
    "enabled": true,
    "executablePath": "/usr/local/bin/llama-server",
    "modelPath": "~/models/qwen2.5-coder-7b-q4_k_m.gguf",
    "baseUrl": "http://localhost:8080",
    "contextSize": 8192,
    "gpuLayers": -1,
    "threads": 8,
    "flashAttention": true,
    "temperature": 0.7,
    "topP": 0.9
  }
}
```

### llama-server Command Reference

```bash
# Basic usage
llama-server -m <model.gguf> [options]

# Common options
-m, --model <path>      Path to GGUF model file
--port <port>           HTTP server port (default: 8080)
--ctx-size <n>          Context size (default: 4096)
-ngl, --n-gpu-layers <n> GPU layers to offload (-1=auto, 0=CPU)
--threads <n>           Number of CPU threads
--flash-attn            Enable flash attention
--host <host>           Host to bind (default: 127.0.0.1)
```

---

## Key Differences from Ollama

| Feature | Ollama | llama.cpp |
|---------|--------|-----------|
| Model format | Ollama-specific | GGUF files |
| Model download | `ollama pull` | Manual download |
| Multi-model | Runtime switching | One model per server |
| API format | Ollama API | OpenAI-compatible |
| Model switch | Instant | Requires restart |
| Setup | Install Ollama | Build from source |

---

## Troubleshooting

### Server Won't Start

1. Check if model file exists and is a valid GGUF
2. Ensure llama-server binary has execute permissions
3. Check if port 8080 is available
4. Review llama-server output for errors

### Slow Responses

1. Enable GPU offloading: `-ngl 99`
2. Enable flash attention: `--flash-attn`
3. Reduce context size if not needed
4. Use quantized models (Q4_K_M, Q5_K_M)

### Memory Issues

1. Use smaller quantization (Q4_K_M instead of Q8)
2. Reduce context size
3. Reduce GPU layers if GPU memory limited

---

## Future Enhancements

1. **node-llama-cpp Integration**: Add native bindings as alternative transport
2. **Model Discovery**: Scan directories for GGUF files
3. **Model Switching**: Hot-swap models without full restart
4. **Multi-Model**: Support multiple llama-server instances
5. **Embeddings**: Support embedding endpoint

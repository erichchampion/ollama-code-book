/**
 * llama.cpp Configuration Schema
 *
 * Defines the structure and validation rules for llama.cpp provider configuration.
 * Uses Zod for runtime type validation.
 */

import { z } from 'zod';
import {
  DEFAULT_LLAMACPP_URL,
  DEFAULT_LLAMACPP_CONTEXT_SIZE,
  DEFAULT_LLAMACPP_GPU_LAYERS
} from '../constants.js';

/**
 * llama.cpp configuration schema
 */
export const LlamaCppConfigSchema = z.object({
  /** Whether llama.cpp provider is enabled */
  enabled: z.boolean().default(false),

  /** Base URL for llama-server */
  baseUrl: z.string().url().default(DEFAULT_LLAMACPP_URL),

  /** Path to GGUF model file */
  modelPath: z.string().optional(),

  /** Path to llama-server executable (auto-detected if not specified) */
  executablePath: z.string().optional(),

  /** Number of GPU layers to offload (-1 = auto/all) */
  gpuLayers: z.number().int().default(DEFAULT_LLAMACPP_GPU_LAYERS),

  /** Context window size */
  contextSize: z.number().int().positive().default(DEFAULT_LLAMACPP_CONTEXT_SIZE),

  /** Enable flash attention */
  flashAttention: z.boolean().default(false),

  /** Number of threads for CPU inference */
  threads: z.number().int().positive().optional(),

  /** Number of parallel sequences */
  parallel: z.number().int().positive().default(1),

  /** Custom llama-server arguments */
  serverArgs: z.array(z.string()).default([])
});

/**
 * Type definition for llama.cpp configuration
 */
export type LlamaCppConfig = z.infer<typeof LlamaCppConfigSchema>;

/**
 * Load llama.cpp configuration from environment variables
 */
export function getLlamaCppConfigFromEnv(): Partial<LlamaCppConfig> {
  const config: Partial<LlamaCppConfig> = {};

  // LLAMACPP_ENABLED
  if (process.env.LLAMACPP_ENABLED !== undefined) {
    config.enabled = process.env.LLAMACPP_ENABLED === 'true' || process.env.LLAMACPP_ENABLED === '1';
  }

  // LLAMACPP_API_URL
  if (process.env.LLAMACPP_API_URL) {
    config.baseUrl = process.env.LLAMACPP_API_URL;
  }

  // LLAMACPP_MODEL_PATH
  if (process.env.LLAMACPP_MODEL_PATH) {
    config.modelPath = process.env.LLAMACPP_MODEL_PATH;
  }

  // LLAMACPP_EXECUTABLE
  if (process.env.LLAMACPP_EXECUTABLE) {
    config.executablePath = process.env.LLAMACPP_EXECUTABLE;
  }

  // LLAMACPP_GPU_LAYERS
  if (process.env.LLAMACPP_GPU_LAYERS !== undefined) {
    const gpuLayers = parseInt(process.env.LLAMACPP_GPU_LAYERS, 10);
    if (!isNaN(gpuLayers)) {
      config.gpuLayers = gpuLayers;
    }
  }

  // LLAMACPP_CONTEXT_SIZE
  if (process.env.LLAMACPP_CONTEXT_SIZE !== undefined) {
    const contextSize = parseInt(process.env.LLAMACPP_CONTEXT_SIZE, 10);
    if (!isNaN(contextSize) && contextSize > 0) {
      config.contextSize = contextSize;
    }
  }

  // LLAMACPP_FLASH_ATTENTION
  if (process.env.LLAMACPP_FLASH_ATTENTION !== undefined) {
    config.flashAttention = process.env.LLAMACPP_FLASH_ATTENTION === 'true' || process.env.LLAMACPP_FLASH_ATTENTION === '1';
  }

  // LLAMACPP_THREADS
  if (process.env.LLAMACPP_THREADS !== undefined) {
    const threads = parseInt(process.env.LLAMACPP_THREADS, 10);
    if (!isNaN(threads) && threads > 0) {
      config.threads = threads;
    }
  }

  // LLAMACPP_PARALLEL
  if (process.env.LLAMACPP_PARALLEL !== undefined) {
    const parallel = parseInt(process.env.LLAMACPP_PARALLEL, 10);
    if (!isNaN(parallel) && parallel > 0) {
      config.parallel = parallel;
    }
  }

  return config;
}

/**
 * Validate and parse llama.cpp configuration
 */
export function parseLlamaCppConfig(config: unknown): LlamaCppConfig {
  return LlamaCppConfigSchema.parse(config);
}

/**
 * Create default llama.cpp configuration
 */
export function getDefaultLlamaCppConfig(): LlamaCppConfig {
  return LlamaCppConfigSchema.parse({});
}

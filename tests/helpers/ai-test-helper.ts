/**
 * AI Testing Helper Utilities
 * Provides utilities for testing with real AI models vs mocks
 */

import {
  AI_TEST_TIMEOUTS,
  AI_TEST_DEFAULTS,
  OLLAMA_ENDPOINTS,
} from './ai-test-constants.js';
import { sleep } from '../shared/test-utils.js';

/**
 * Configuration for AI testing
 */
export interface AITestConfig {
  /** Use real AI model instead of mocks */
  useRealAI: boolean;
  /** Ollama test instance host URL */
  host: string;
  /** Default model to use for tests */
  model: string;
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Ollama model information
 */
interface OllamaModel {
  /** Model name (e.g., "tinyllama:latest") */
  name: string;
  /** Last modification timestamp (ISO 8601) */
  modified_at: string;
  /** Model size in bytes */
  size: number;
  /** Model digest/hash */
  digest?: string;
}

/**
 * Response from Ollama /api/tags endpoint
 */
interface OllamaTagsResponse {
  /** List of available models */
  models?: OllamaModel[];
}

/**
 * Get AI test configuration from environment variables
 */
export function getAITestConfig(): AITestConfig {
  return {
    useRealAI: process.env.USE_REAL_AI === 'true',
    host: process.env.OLLAMA_TEST_HOST || AI_TEST_DEFAULTS.HOST,
    model: process.env.OLLAMA_TEST_MODEL || AI_TEST_DEFAULTS.MODEL,
    timeout: parseInt(
      process.env.OLLAMA_TEST_TIMEOUT || String(AI_TEST_DEFAULTS.TIMEOUT),
      10
    ),
  };
}

/**
 * Fetch Ollama tags with timeout
 * @internal
 */
async function fetchOllamaTags(
  host: string,
  timeout: number = AI_TEST_TIMEOUTS.OLLAMA_CHECK_TIMEOUT
): Promise<{ ok: boolean; data?: OllamaTagsResponse; error?: string }> {
  try {
    const response = await fetch(`${host}${OLLAMA_ENDPOINTS.TAGS}`, {
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = (await response.json()) as OllamaTagsResponse;
    return { ok: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { ok: false, error: errorMessage };
  }
}

/**
 * Check if Ollama test instance is available
 */
export async function isOllamaTestAvailable(
  config: AITestConfig = getAITestConfig()
): Promise<boolean> {
  const result = await fetchOllamaTags(config.host);
  return result.ok;
}

/**
 * Wait for Ollama test instance to be ready with exponential backoff
 */
export async function waitForOllamaReady(
  config: AITestConfig = getAITestConfig(),
  maxWaitMs: number = AI_TEST_TIMEOUTS.MAX_WAIT_TIMEOUT
): Promise<boolean> {
  const startTime = Date.now();
  let pollInterval = AI_TEST_TIMEOUTS.INITIAL_POLL_INTERVAL;

  while (Date.now() - startTime < maxWaitMs) {
    if (await isOllamaTestAvailable(config)) {
      return true;
    }

    await sleep(pollInterval);

    // Exponential backoff to avoid hammering the API
    pollInterval = Math.min(
      pollInterval * AI_TEST_TIMEOUTS.BACKOFF_MULTIPLIER,
      AI_TEST_TIMEOUTS.MAX_POLL_INTERVAL
    );
  }

  return false;
}

/**
 * Skip test if real AI is not available
 */
export function skipIfNoRealAI(testDescription: string = 'test'): void {
  const config = getAITestConfig();

  if (!config.useRealAI) {
    console.log(`⏭️  Skipping ${testDescription} (USE_REAL_AI=false)`);
    return;
  }
}

/**
 * Conditional test runner based on AI availability
 */
export function testWithAI(
  description: string,
  testFn: () => void | Promise<void>,
  options: { skipIfMock?: boolean; timeout?: number } = {}
): void {
  const config = getAITestConfig();

  if (options.skipIfMock && !config.useRealAI) {
    test.skip(description, testFn);
  } else {
    const timeout = options.timeout || config.timeout;
    test(description, testFn, timeout);
  }
}

/**
 * Test suite that runs only with real AI
 */
export function describeWithAI(
  description: string,
  suiteFn: () => void
): void {
  const config = getAITestConfig();

  if (config.useRealAI) {
    describe(description, suiteFn);
  } else {
    describe.skip(`${description} (requires real AI)`, suiteFn);
  }
}

/**
 * Validate AI test prerequisites
 */
export async function validateAITestPrerequisites(): Promise<{
  ready: boolean;
  issues: string[];
}> {
  const config = getAITestConfig();
  const issues: string[] = [];

  // Check if real AI testing is enabled
  if (!config.useRealAI) {
    return { ready: true, issues: [] }; // OK to use mocks
  }

  // Check if Ollama is available
  const ollamaAvailable = await isOllamaTestAvailable(config);
  if (!ollamaAvailable) {
    issues.push(
      `Ollama test instance not available at ${config.host}. ` +
      `Start with: cd tests/docker && docker-compose -f docker-compose.test.yml up -d`
    );
  }

  // Check if model is loaded
  const tagsResult = await fetchOllamaTags(config.host);

  if (!tagsResult.ok) {
    issues.push(`Failed to query models: ${tagsResult.error || 'Unknown error'}`);
  } else if (tagsResult.data) {
    const modelAvailable = tagsResult.data.models?.some((m) =>
      m.name.startsWith(config.model)
    );

    if (!modelAvailable) {
      issues.push(
        `Model '${config.model}' not found. ` +
          `Pull with: docker-compose -f docker-compose.test.yml exec ollama-test ollama pull ${config.model}`
      );
    }
  }

  return {
    ready: issues.length === 0,
    issues,
  };
}

/**
 * Setup hook for AI tests
 */
export async function setupAITests(): Promise<void> {
  const config = getAITestConfig();

  if (!config.useRealAI) {
    console.log('ℹ️  Using mock AI for tests');
    return;
  }

  console.log(`🤖 Setting up real AI tests with ${config.model} at ${config.host}`);

  const validation = await validateAITestPrerequisites();

  if (!validation.ready) {
    console.error('❌ AI test prerequisites not met:');
    validation.issues.forEach(issue => console.error(`   - ${issue}`));
    throw new Error('AI test environment not ready');
  }

  console.log('✅ AI test environment ready');
}

/**
 * Cleanup hook for AI tests
 */
export async function teardownAITests(): Promise<void> {
  const config = getAITestConfig();

  if (!config.useRealAI) {
    return;
  }

  console.log('🧹 Cleaning up AI test resources');
  // Add cleanup logic if needed (e.g., clear caches, reset state)
}

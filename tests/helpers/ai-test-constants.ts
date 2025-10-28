/**
 * AI Testing Constants
 * Centralized constants for AI testing infrastructure
 */

import * as path from 'path';

/**
 * AI testing timeout constants (milliseconds)
 */
export const AI_TEST_TIMEOUTS = {
  /** Quick Ollama availability check */
  OLLAMA_CHECK_TIMEOUT: 5000,
  /** Maximum wait for Ollama to be ready */
  MAX_WAIT_TIMEOUT: 60000,
  /** Polling interval for Ollama readiness */
  POLL_INTERVAL: 2000,
  /** Default timeout for AI test execution */
  DEFAULT_TEST_TIMEOUT: 30000,
  /** Initial polling interval for exponential backoff */
  INITIAL_POLL_INTERVAL: 1000,
  /** Maximum polling interval for exponential backoff */
  MAX_POLL_INTERVAL: 5000,
  /** Backoff multiplier for exponential polling */
  BACKOFF_MULTIPLIER: 1.5,
} as const;

/**
 * AI testing default configuration values
 */
export const AI_TEST_DEFAULTS = {
  /** Default Ollama test instance host */
  HOST: 'http://localhost:11435',
  /** Default model for testing */
  MODEL: 'tinyllama',
  /** Default request timeout in milliseconds */
  TIMEOUT: 30000,
  /** Default maximum age for fixtures in days */
  MAX_FIXTURE_AGE_DAYS: 180,
} as const;

/**
 * AI testing path constants
 */
export const AI_TEST_PATHS = {
  /** Base path for AI response fixtures */
  FIXTURES_BASE: path.join(process.cwd(), 'tests/fixtures/ai-responses'),
} as const;

/**
 * Ollama API endpoints
 */
export const OLLAMA_ENDPOINTS = {
  /** List available models and tags */
  TAGS: '/api/tags',
  /** Generate completion */
  GENERATE: '/api/generate',
  /** Pull a model */
  PULL: '/api/pull',
} as const;

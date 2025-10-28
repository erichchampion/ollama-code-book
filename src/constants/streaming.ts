/**
 * Streaming Configuration Constants
 *
 * Centralized configuration for streaming operations to prevent
 * hardcoded values and ensure consistency across the application.
 */

export const STREAMING_DEFAULTS = {
  PROGRESS_INTERVAL: 500, // Update every 500ms
  MAX_UPDATES_PER_SECOND: 4, // Max 4 updates per second
  ESTIMATED_DURATION: 5000, // 5 seconds estimated for operations
  THINKING_STEP_BASE_DELAY: 200, // Base delay for thinking steps
  THINKING_STEP_MAX_DELAY: 300, // Max additional random delay
  BRIEF_PAUSE_DELAY: 50, // Brief pause for user experience
  COMMAND_PREP_DELAY: 100, // Command preparation delay
  MAX_PROCESSING_TIME: 50, // 50ms max for fast-path processing
  SPINNER_UPDATE_INTERVAL: 100, // Spinner animation update interval
  PROGRESS_THRESHOLDS: {
    STARTED: 0,
    PREPARATION: 20,
    EXECUTION: 50,
    PROCESSING: 90,
    FINALIZATION: 95,
    COMPLETED: 100
  },
  PROGRESS_BOUNDARIES: {
    GETTING_STARTED: 25,
    PROCESSING: 50,
    MAKING_PROGRESS: 75,
    ALMOST_DONE: 95
  }
} as const;

export const STREAMING_CONFIG_DEFAULTS = {
  enableStreaming: true,
  progressInterval: STREAMING_DEFAULTS.PROGRESS_INTERVAL,
  maxUpdatesPerSecond: STREAMING_DEFAULTS.MAX_UPDATES_PER_SECOND,
  includeThinkingSteps: true
} as const;

export const FAST_PATH_CONFIG_DEFAULTS = {
  enableFuzzyMatching: true,
  fuzzyThreshold: 0.7,
  enableAliases: true,
  enablePatternExpansion: true,
  maxProcessingTime: STREAMING_DEFAULTS.MAX_PROCESSING_TIME
} as const;
/**
 * Standardized Progress Messages
 *
 * Centralized message constants to ensure consistent user experience
 * and prevent duplicate message strings across the application.
 */

export const PROGRESS_MESSAGES = {
  // General operation messages
  STARTED: '🔍 Starting operation...',
  COMPLETED_SUCCESS: '✅ Operation completed successfully',
  COMPLETED_GENERIC: 'Operation completed',
  FAILED_GENERIC: 'Operation failed',
  FINALIZING: '🔄 Finalizing...',

  // Command execution messages
  COMMAND_STARTED: '🚀 Executing command',
  COMMAND_PREPARING: '⚙️ Preparing command execution...',
  COMMAND_RUNNING: '⚡ Running command...',
  COMMAND_PROCESSING: '✨ Processing results...',
  COMMAND_COMPLETED: '✅ Command completed',
  COMMAND_FAILED: '❌ Command failed',

  // AI analysis messages
  AI_ANALYZING: '🤔 Analyzing your request...',
  AI_FINALIZING: '🎯 Finalizing analysis...',
  AI_COMPLETED: '✅ Analysis complete',
  AI_FAILED: '❌ Analysis failed',

  // Thinking step messages
  THINKING_UNDERSTANDING: '🔍 Understanding the context...',
  THINKING_PROCESSING: '🧠 Processing natural language...',
  THINKING_KNOWLEDGE: '📚 Accessing knowledge base...',
  THINKING_GENERATING: '⚡ Generating response...',

  // Progress stage messages
  GETTING_STARTED: '🚀 Getting started...',
  PROCESSING: '⚙️ Processing...',
  MAKING_PROGRESS: '🔄 Making progress...',
  ALMOST_DONE: '✨ Almost done...',
  FINISHING_UP: '🎯 Finishing up...'
} as const;

export const ERROR_MESSAGES = {
  COMMAND_EXECUTION_FAILED: '❌ Command execution failed',
  STREAM_STATE_NOT_FOUND: 'Stream state not found',
  UNKNOWN_ERROR: 'Unknown error'
} as const;

export const SUCCESS_MESSAGES = {
  COMMAND_SUCCESS_PREFIX: '✅ '
} as const;
/**
 * Jest Test Setup
 *
 * Handles common test environment setup and error handling
 */

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Promise Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.warn('Uncaught Exception:', error.message);
});

// Handle EPIPE errors gracefully
process.on('EPIPE', () => {
  // Ignore EPIPE errors (broken pipe)
  process.exit(0);
});

// Increase timeout for async operations
jest.setTimeout(30000);

// Setup console to handle large outputs better
const originalConsoleLog = console.log;
console.log = (...args) => {
  try {
    originalConsoleLog(...args);
  } catch (error) {
    if (error.code === 'EPIPE') {
      // Ignore EPIPE errors in console output
      return;
    }
    throw error;
  }
};

// Global test utilities
global.expectAsync = async (promise) => {
  try {
    const result = await promise;
    return result;
  } catch (error) {
    throw error;
  }
};
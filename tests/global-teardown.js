/**
 * Global teardown for Jest tests
 * Cleans up any remaining resources and timeouts
 */

export default async function globalTeardown() {
  try {
    // Clean up ComponentStatusTracker global instance
    const { resetStatusTracker } = await import('../dist/src/interactive/component-status.js');
    if (resetStatusTracker) {
      resetStatusTracker();
    }
    
    // Clean up ComponentFactory global instance
    const { clearGlobalFactory } = await import('../dist/src/interactive/component-factory.js');
    if (clearGlobalFactory) {
      clearGlobalFactory();
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    // Ignore errors during teardown
    console.warn('Global teardown warning:', error.message);
  }
}

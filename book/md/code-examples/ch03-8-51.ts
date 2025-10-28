// Bad: Scattered registration
async function someFunction() {
  if (!container.has('logger')) {
    container.register('logger', Logger);
  }
  // Hard to track what's registered when
}
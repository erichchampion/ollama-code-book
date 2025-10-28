// Bad: No retry or fallback
try {
  return await provider.complete(prompt);
} catch (error) {
  throw error; // User sees error
}
// Good: Parallel fusion requests (fast)
const results = await Promise.allSettled([
  provider1.complete(prompt),
  provider2.complete(prompt),
  provider3.complete(prompt)
]);

// 3x faster for fusion
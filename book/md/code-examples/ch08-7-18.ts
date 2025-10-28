// Benchmark: Cold start vs warm start

// Cold start (no caching, lazy loading)
console.time('cold-start');
const result1 = await router.route('commit my changes', context);
console.timeEnd('cold-start');
// cold-start: 847ms (AI classification + command load)

// Warm start (cached classification)
console.time('warm-start-1');
const result2 = await router.route('commit my changes', context);
console.timeEnd('warm-start-1');
// warm-start-1: 12ms (cache hit) - 70x faster!

// Warm start (different input, same intent)
console.time('warm-start-2');
const result3 = await router.route('commit the auth files', context);
console.timeEnd('warm-start-2');
// warm-start-2: 134ms (AI classification, cached command) - 6x faster!

// With preloading
await router.warmup();

console.time('preloaded');
const result4 = await router.route('review PR 123', context);
console.timeEnd('preloaded');
// preloaded: 142ms (only AI classification needed)
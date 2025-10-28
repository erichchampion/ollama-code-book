// Create benchmark suite
const suite = new BenchmarkSuite();

// Add benchmarks
suite
  .add('sequential-file-read', async () => {
    for (let i = 0; i < 10; i++) {
      await fs.readFile(`file${i}.txt`);
    }
  })
  .add('parallel-file-read', async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        fs.readFile(`file${i}.txt`)
      )
    );
  })
  .add('cached-ai-call', async () => {
    await cachedAI.complete(request);
  })
  .add('uncached-ai-call', async () => {
    await uncachedAI.complete(request);
  });

// Run benchmarks
const results = await suite.run(100);

// Compare
const comparison = suite.compare(
  'sequential-file-read',
  'parallel-file-read',
  results
);

console.log(`Parallel is ${comparison.improvement.toFixed(2)}% faster`);
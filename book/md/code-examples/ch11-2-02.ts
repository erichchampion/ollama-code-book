/**
 * Performance comparison: Before optimization
 */
async function analyzeCodebase_SLOW() {
  // Sequential execution - SLOW!
  const files = await listFiles('src/');        // 150ms

  for (const file of files) {                   // 10 files
    const content = await readFile(file);       // 50ms each = 500ms
    const analysis = await analyzeWithAI(content); // 1,500ms each = 15,000ms
    await saveAnalysis(file, analysis);         // 30ms each = 300ms
  }

  // Total: 15,950ms (~16 seconds) ❌
}

/**
 * Performance comparison: After optimization
 */
async function analyzeCodebase_FAST() {
  // Parallel execution with caching
  const files = await listFiles('src/');        // 150ms

  // Read all files in parallel
  const contents = await Promise.all(           // 50ms (parallelized)
    files.map(file => readFile(file))
  );

  // Analyze in parallel with caching
  const analyses = await Promise.all(           // 1,500ms (parallelized + cache hits)
    contents.map((content, i) => {
      const cacheKey = hashContent(content);
      return getCachedOrAnalyze(cacheKey, content);
    })
  );

  // Save in parallel
  await Promise.all(                            // 30ms (parallelized)
    analyses.map((analysis, i) =>
      saveAnalysis(files[i], analysis)
    )
  );

  // Total: 1,730ms (~1.7 seconds) ✓
  // 9.2x faster! 🚀
}
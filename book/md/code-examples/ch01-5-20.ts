// ❌ Weakness: CPU-intensive operations
// Node.js is single-threaded, not ideal for heavy computation
function analyzeComplexity(largeCodebase: string[]): ComplexityMetrics {
  // This could block the event loop for large codebases
  return heavyComputation(largeCodebase);
}

// ✅ Solution: Use worker threads or child processes
import { Worker } from 'worker_threads';

async function analyzeComplexity(largeCodebase: string[]): Promise<ComplexityMetrics> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./complexity-worker.js', {
      workerData: largeCodebase
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
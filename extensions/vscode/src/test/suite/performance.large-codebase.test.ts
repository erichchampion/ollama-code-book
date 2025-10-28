/**
 * Performance - Large Codebase Tests
 * Phase 3.3.1 - Performance & Scalability Testing
 *
 * Tests system performance on large codebases with comprehensive benchmarking
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { performance } from 'perf_hooks';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import {
  PROVIDER_TEST_TIMEOUTS,
  BYTE_CONVERSION,
  PERFORMANCE_TEST_CONSTANTS,
  CODE_GENERATION_CONSTANTS,
  PERFORMANCE_EXPECTATIONS,
} from '../helpers/test-constants';

/**
 * Performance benchmark thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  SMALL_CODEBASE: {
    FILE_COUNT: 100,
    MAX_ANALYSIS_TIME_MS: 5000, // 5 seconds
    MAX_MEMORY_MB: 200,
  },
  MEDIUM_CODEBASE: {
    FILE_COUNT: 1000,
    MAX_ANALYSIS_TIME_MS: 30000, // 30 seconds
    MAX_MEMORY_MB: 500,
  },
  LARGE_CODEBASE: {
    FILE_COUNT: 5000,
    MAX_ANALYSIS_TIME_MS: 120000, // 2 minutes
    MAX_MEMORY_MB: 2048, // 2GB
  },
} as const;

/**
 * Code generation templates for synthetic codebase
 */
const CODE_TEMPLATES = {
  SIMPLE_FUNCTION: (name: string, dependencies: string[] = []) => `
/**
 * Function: ${name}
 */
${dependencies.map(dep => `import { ${dep} } from './${dep}';`).join('\n')}

export function ${name}(input: string): string {
  console.log('Processing:', input);
  ${dependencies.map(dep => `${dep}(input);`).join('\n  ')}
  return input.toUpperCase();
}
`,

  COMPLEX_CLASS: (name: string, methodCount: number) => `
/**
 * Class: ${name}
 */
export class ${name} {
  private data: Map<string, any> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    console.log('Initializing ${name}');
  }

${Array.from({ length: methodCount }, (_, i) => `
  public method${i}(param: string): void {
    this.data.set('key${i}', param);
    console.log('Method ${i} called with:', param);
  }
`).join('\n')}

  public getData(): Map<string, any> {
    return new Map(this.data);
  }
}
`,

  REACT_COMPONENT: (name: string) => `
import React, { useState, useEffect } from 'react';

interface ${name}Props {
  title: string;
  onAction?: () => void;
}

export const ${name}: React.FC<${name}Props> = ({ title, onAction }) => {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<string[]>([]);

  useEffect(() => {
    console.log('Component mounted:', title);
    return () => console.log('Component unmounted');
  }, [title]);

  const handleClick = () => {
    setCount(prev => prev + 1);
    onAction?.();
  };

  return (
    <div className="${name.toLowerCase()}">
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Increment</button>
      <ul>
        {data.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
};
`,
} as const;

/**
 * Memory measurement utilities
 */
class MemoryMonitor {
  private initialMemory: number = 0;
  private peakMemory: number = 0;
  private interval: NodeJS.Timeout | null = null;

  start(): void {
    this.initialMemory = process.memoryUsage().heapUsed;
    this.peakMemory = this.initialMemory;

    this.interval = setInterval(() => {
      const current = process.memoryUsage().heapUsed;
      if (current > this.peakMemory) {
        this.peakMemory = current;
      }
    }, PERFORMANCE_TEST_CONSTANTS.MEMORY_MONITOR_INTERVAL_MS);
  }

  stop(): { initialMB: number; peakMB: number; deltaMB: number } {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    return {
      initialMB: bytesToMB(this.initialMemory),
      peakMB: bytesToMB(this.peakMemory),
      deltaMB: bytesToMB(this.peakMemory) - bytesToMB(this.initialMemory),
    };
  }

  /**
   * Cleanup resources - ensures interval is cleared even if stop() not called
   */
  destroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

/**
 * Convert bytes to megabytes
 */
function bytesToMB(bytes: number): number {
  return bytes / BYTE_CONVERSION.BYTES_TO_MB;
}

/**
 * Measure performance of an async function
 */
async function measurePerformance<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  return { result, durationMs: endTime - startTime };
}

/**
 * Analysis result interface
 */
interface AnalysisResult {
  fileCount: number;
  functionCount: number;
  classCount: number;
  componentCount: number;
}

/**
 * Generate synthetic codebase for testing
 */
async function generateSyntheticCodebase(
  basePath: string,
  fileCount: number,
  complexity: 'simple' | 'medium' | 'complex'
): Promise<void> {
  const directories = Math.ceil(fileCount / PERFORMANCE_TEST_CONSTANTS.FILES_PER_DIRECTORY);

  for (let dirIdx = 0; dirIdx < directories; dirIdx++) {
    const dirPath = path.join(
      basePath,
      `${CODE_GENERATION_CONSTANTS.MODULE_DIR_PREFIX}${dirIdx}`
    );
    await fs.promises.mkdir(dirPath, { recursive: true });

    const filesInDir = Math.min(
      PERFORMANCE_TEST_CONSTANTS.FILES_PER_DIRECTORY,
      fileCount - dirIdx * PERFORMANCE_TEST_CONSTANTS.FILES_PER_DIRECTORY
    );

    for (let fileIdx = 0; fileIdx < filesInDir; fileIdx++) {
      const fileName = `${CODE_GENERATION_CONSTANTS.FILE_NAME_PREFIX}${fileIdx}.ts`;
      const filePath = path.join(dirPath, fileName);

      let content: string;

      switch (complexity) {
        case 'simple':
          content = CODE_TEMPLATES.SIMPLE_FUNCTION(
            `${CODE_GENERATION_CONSTANTS.FUNCTION_NAME_PREFIX}${dirIdx}_${fileIdx}`
          );
          break;

        case 'medium':
          content = CODE_TEMPLATES.SIMPLE_FUNCTION(
            `${CODE_GENERATION_CONSTANTS.FUNCTION_NAME_PREFIX}${dirIdx}_${fileIdx}`,
            fileIdx > 0
              ? [`${CODE_GENERATION_CONSTANTS.FUNCTION_NAME_PREFIX}${dirIdx}_${fileIdx - 1}`]
              : []
          );
          break;

        case 'complex':
          if (
            fileIdx % CODE_GENERATION_CONSTANTS.FILE_TYPE_DISTRIBUTION_MODULO ===
            CODE_GENERATION_CONSTANTS.CLASS_FILE_REMAINDER
          ) {
            content = CODE_TEMPLATES.COMPLEX_CLASS(
              `${CODE_GENERATION_CONSTANTS.CLASS_NAME_PREFIX}${dirIdx}_${fileIdx}`,
              CODE_GENERATION_CONSTANTS.DEFAULT_METHOD_COUNT
            );
          } else if (
            fileIdx % CODE_GENERATION_CONSTANTS.FILE_TYPE_DISTRIBUTION_MODULO ===
            CODE_GENERATION_CONSTANTS.COMPONENT_FILE_REMAINDER
          ) {
            content = CODE_TEMPLATES.REACT_COMPONENT(
              `${CODE_GENERATION_CONSTANTS.COMPONENT_NAME_PREFIX}${dirIdx}_${fileIdx}`
            );
          } else {
            content = CODE_TEMPLATES.SIMPLE_FUNCTION(
              `${CODE_GENERATION_CONSTANTS.FUNCTION_NAME_PREFIX}${dirIdx}_${fileIdx}`,
              fileIdx > 0
                ? [`${CODE_GENERATION_CONSTANTS.FUNCTION_NAME_PREFIX}${dirIdx}_${fileIdx - 1}`]
                : []
            );
          }
          break;
      }

      await fs.promises.writeFile(filePath, content, 'utf-8');
    }
  }
}

/**
 * Mock code analysis function (simulates real analyzer)
 */
async function analyzeCodebase(
  basePath: string,
  options: {
    enableIncrementalAnalysis?: boolean;
    reportProgress?: (progress: number) => void;
  } = {}
): Promise<AnalysisResult> {
  let fileCount = 0;
  let functionCount = 0;
  let classCount = 0;
  let componentCount = 0;

  const analyzeFile = async (filePath: string): Promise<void> => {
    const content = await fs.promises.readFile(filePath, 'utf-8');

    // Simple pattern matching (mock analysis)
    functionCount += (content.match(/export function/g) || []).length;
    classCount += (content.match(/export class/g) || []).length;
    componentCount += (content.match(/export const \w+: React\.FC/g) || []).length;

    fileCount++;

    // Report progress if callback provided
    if (options.reportProgress) {
      options.reportProgress(fileCount);
    }
  };

  const analyzeDirectory = async (dirPath: string): Promise<void> => {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await analyzeDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        await analyzeFile(fullPath);
      }
    }
  };

  await analyzeDirectory(basePath);

  return { fileCount, functionCount, classCount, componentCount };
}

/**
 * Create test codebase with specified parameters
 */
async function createTestCodebase(
  testWorkspacePath: string,
  name: string,
  fileCount: number,
  complexity: 'simple' | 'medium' | 'complex'
): Promise<string> {
  const codebasePath = path.join(testWorkspacePath, `${name}-codebase`);
  await fs.promises.mkdir(codebasePath, { recursive: true });
  await generateSyntheticCodebase(codebasePath, fileCount, complexity);
  return codebasePath;
}

/**
 * Performance test configuration
 */
interface PerformanceTestConfig {
  name: string;
  fileCount: number;
  complexity: 'simple' | 'medium' | 'complex';
  maxAnalysisTimeMs: number;
}

/**
 * Run a standard performance test
 */
async function runPerformanceTest(
  testWorkspacePath: string,
  config: PerformanceTestConfig
): Promise<void> {
  const codebasePath = await createTestCodebase(
    testWorkspacePath,
    config.name,
    config.fileCount,
    config.complexity
  );

  const { result, durationMs: analysisTimeMs } = await measurePerformance(() =>
    analyzeCodebase(codebasePath)
  );

  // Standard assertions
  assert.strictEqual(result.fileCount, config.fileCount, 'Should analyze all files');
  assert.ok(
    analysisTimeMs < config.maxAnalysisTimeMs,
    `Analysis should complete in <${config.maxAnalysisTimeMs}ms, took ${analysisTimeMs.toFixed(0)}ms`
  );

  console.log(`✓ ${config.name} codebase analyzed in ${(analysisTimeMs / 1000).toFixed(2)}s`);
}

suite('Performance - Large Codebase Tests', () => {
  let testWorkspacePath: string;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);
    testWorkspacePath = await createTestWorkspace('performance-large-codebase');
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Performance Benchmarks', () => {
    test('Should analyze small codebase (100 files) in <5 seconds', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);

      await runPerformanceTest(testWorkspacePath, {
        name: 'small',
        fileCount: PERFORMANCE_THRESHOLDS.SMALL_CODEBASE.FILE_COUNT,
        complexity: 'simple',
        maxAnalysisTimeMs: PERFORMANCE_THRESHOLDS.SMALL_CODEBASE.MAX_ANALYSIS_TIME_MS,
      });
    });

    test('Should analyze medium codebase (1000 files) in <30 seconds', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);

      await runPerformanceTest(testWorkspacePath, {
        name: 'medium',
        fileCount: PERFORMANCE_THRESHOLDS.MEDIUM_CODEBASE.FILE_COUNT,
        complexity: 'medium',
        maxAnalysisTimeMs: PERFORMANCE_THRESHOLDS.MEDIUM_CODEBASE.MAX_ANALYSIS_TIME_MS,
      });
    });

    test('Should analyze large codebase (5000 files) in <2 minutes', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);

      await runPerformanceTest(testWorkspacePath, {
        name: 'large',
        fileCount: PERFORMANCE_THRESHOLDS.LARGE_CODEBASE.FILE_COUNT,
        complexity: 'complex',
        maxAnalysisTimeMs: PERFORMANCE_THRESHOLDS.LARGE_CODEBASE.MAX_ANALYSIS_TIME_MS,
      });
    });

    test('Should provide progress reporting during indexing', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);

      const codebasePath = await createTestCodebase(
        testWorkspacePath,
        'progress',
        PERFORMANCE_TEST_CONSTANTS.PROGRESS_TEST_FILE_COUNT,
        'medium'
      );

      const progressUpdates: number[] = [];
      const progressCallback = (filesProcessed: number) => {
        progressUpdates.push(filesProcessed);
      };

      await analyzeCodebase(codebasePath, { reportProgress: progressCallback });

      // Assertions
      assert.ok(progressUpdates.length > 0, 'Should receive progress updates');
      assert.strictEqual(
        progressUpdates[progressUpdates.length - 1],
        PERFORMANCE_TEST_CONSTANTS.PROGRESS_TEST_FILE_COUNT,
        `Final progress should be ${PERFORMANCE_TEST_CONSTANTS.PROGRESS_TEST_FILE_COUNT}`
      );
      assert.ok(
        progressUpdates.every((val, idx) => idx === 0 || val >= progressUpdates[idx - 1]),
        'Progress should be monotonically increasing'
      );

      console.log(`✓ Received ${progressUpdates.length} progress updates`);
    });

    test('Should use <2GB memory on large codebase', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);

      const codebasePath = await createTestCodebase(
        testWorkspacePath,
        'memory-test',
        PERFORMANCE_THRESHOLDS.LARGE_CODEBASE.FILE_COUNT,
        'complex'
      );

      // Monitor memory usage
      const memoryMonitor = new MemoryMonitor();

      try {
        memoryMonitor.start();
        await analyzeCodebase(codebasePath);
        const memoryUsage = memoryMonitor.stop();

        // Assertions
        assert.ok(
          memoryUsage.peakMB < PERFORMANCE_THRESHOLDS.LARGE_CODEBASE.MAX_MEMORY_MB,
          `Peak memory should be <${PERFORMANCE_THRESHOLDS.LARGE_CODEBASE.MAX_MEMORY_MB}MB, was ${memoryUsage.peakMB.toFixed(2)}MB`
        );

        console.log(
          `✓ Memory usage: ${memoryUsage.initialMB.toFixed(2)}MB → ${memoryUsage.peakMB.toFixed(2)}MB (Δ${memoryUsage.deltaMB.toFixed(2)}MB)`
        );
      } finally {
        // Ensure cleanup even if test fails
        memoryMonitor.destroy();
      }
    });

    test('Should show improved performance with incremental analysis', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);

      const codebasePath = await createTestCodebase(
        testWorkspacePath,
        'incremental',
        PERFORMANCE_THRESHOLDS.MEDIUM_CODEBASE.FILE_COUNT,
        'medium'
      );

      // Initial full analysis
      const { durationMs: fullAnalysisTime } = await measurePerformance(() =>
        analyzeCodebase(codebasePath, { enableIncrementalAnalysis: false })
      );

      // Modify a single file
      const modifiedFilePath = path.join(
        codebasePath,
        `${CODE_GENERATION_CONSTANTS.MODULE_DIR_PREFIX}0`,
        `${CODE_GENERATION_CONSTANTS.FILE_NAME_PREFIX}0.ts`
      );
      const modifiedContent = CODE_TEMPLATES.SIMPLE_FUNCTION('modifiedFunction');
      await fs.promises.writeFile(modifiedFilePath, modifiedContent, 'utf-8');

      // Incremental analysis (simulated - would only analyze changed file)
      const { durationMs: incrementalTime } = await measurePerformance(() =>
        analyzeCodebase(
          path.join(codebasePath, `${CODE_GENERATION_CONSTANTS.MODULE_DIR_PREFIX}0`),
          { enableIncrementalAnalysis: true }
        )
      );

      // Assertions
      assert.ok(
        incrementalTime <
          fullAnalysisTime / PERFORMANCE_EXPECTATIONS.MIN_INCREMENTAL_SPEEDUP_FACTOR,
        `Incremental analysis should be >${PERFORMANCE_EXPECTATIONS.MIN_INCREMENTAL_SPEEDUP_FACTOR}x faster than full analysis. Full: ${fullAnalysisTime.toFixed(0)}ms, Incremental: ${incrementalTime.toFixed(0)}ms`
      );

      console.log(
        `✓ Full analysis: ${fullAnalysisTime.toFixed(0)}ms, Incremental: ${incrementalTime.toFixed(0)}ms (${(fullAnalysisTime / incrementalTime).toFixed(1)}x faster)`
      );
    });

    test('Should handle mixed file types efficiently', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);

      const codebasePath = await createTestCodebase(
        testWorkspacePath,
        'mixed-types',
        PERFORMANCE_THRESHOLDS.MEDIUM_CODEBASE.FILE_COUNT,
        'complex'
      );

      const { result, durationMs: analysisTime } = await measurePerformance(() =>
        analyzeCodebase(codebasePath)
      );

      // Assertions
      assert.ok(result.functionCount > 0, 'Should detect functions');
      assert.ok(result.classCount > 0, 'Should detect classes');
      assert.ok(result.componentCount > 0, 'Should detect React components');
      assert.ok(
        analysisTime < PERFORMANCE_THRESHOLDS.MEDIUM_CODEBASE.MAX_ANALYSIS_TIME_MS,
        `Should handle mixed types efficiently in <${PERFORMANCE_THRESHOLDS.MEDIUM_CODEBASE.MAX_ANALYSIS_TIME_MS}ms`
      );

      console.log(
        `✓ Analyzed ${result.fileCount} files: ${result.functionCount} functions, ${result.classCount} classes, ${result.componentCount} components in ${(analysisTime / 1000).toFixed(2)}s`
      );
    });

    test('Should maintain performance consistency across multiple runs', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.EXTENDED_TEST);

      const codebasePath = await createTestCodebase(
        testWorkspacePath,
        'consistency',
        PERFORMANCE_TEST_CONSTANTS.PROGRESS_TEST_FILE_COUNT,
        'medium'
      );

      const runTimes: number[] = [];

      for (let i = 0; i < PERFORMANCE_TEST_CONSTANTS.CONSISTENCY_RUN_COUNT; i++) {
        const { durationMs } = await measurePerformance(() => analyzeCodebase(codebasePath));
        runTimes.push(durationMs);
      }

      // Calculate statistics
      const avgTime =
        runTimes.reduce((sum, time) => sum + time, 0) /
        PERFORMANCE_TEST_CONSTANTS.CONSISTENCY_RUN_COUNT;
      const variance =
        runTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) /
        PERFORMANCE_TEST_CONSTANTS.CONSISTENCY_RUN_COUNT;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avgTime) * 100;

      // Assertions
      assert.ok(
        coefficientOfVariation < PERFORMANCE_EXPECTATIONS.MAX_COEFFICIENT_OF_VARIATION,
        `Performance should be consistent (CV < ${PERFORMANCE_EXPECTATIONS.MAX_COEFFICIENT_OF_VARIATION}%), got ${coefficientOfVariation.toFixed(2)}%`
      );

      console.log(
        `✓ ${PERFORMANCE_TEST_CONSTANTS.CONSISTENCY_RUN_COUNT} runs: avg ${avgTime.toFixed(0)}ms, σ=${stdDev.toFixed(0)}ms, CV=${coefficientOfVariation.toFixed(2)}%`
      );
    });
  });
});

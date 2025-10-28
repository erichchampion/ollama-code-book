/**
 * Test Isolation Utilities
 *
 * Provides utilities to prevent test interference and ensure proper cleanup
 * for integration tests that spawn processes.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Track active processes for cleanup
const activeProcesses = new Set();
const tempDirectories = new Set();

/**
 * Create isolated test environment
 */
async function createTestEnvironment(testName) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `ollama-test-${testName}-`));
  tempDirectories.add(tempDir);

  // Set up isolated environment variables
  const testEnv = {
    ...process.env,
    OLLAMA_TEST_MODE: 'true',
    OLLAMA_DATA_DIR: path.join(tempDir, 'data'),
    OLLAMA_CONFIG_DIR: path.join(tempDir, 'config'),
    OLLAMA_CACHE_DIR: path.join(tempDir, 'cache'),
    HOME: tempDir, // Isolate home directory
    TMPDIR: tempDir,
    // Disable external connections
    OLLAMA_OFFLINE_MODE: 'true',
    // Use unique ports to avoid conflicts
    OLLAMA_TEST_PORT: String(3000 + Math.floor(Math.random() * 1000))
  };

  // Create necessary directories
  await fs.mkdir(testEnv.OLLAMA_DATA_DIR, { recursive: true });
  await fs.mkdir(testEnv.OLLAMA_CONFIG_DIR, { recursive: true });
  await fs.mkdir(testEnv.OLLAMA_CACHE_DIR, { recursive: true });

  return { tempDir, testEnv };
}

/**
 * Safe CLI execution with proper isolation
 */
async function execCLIIsolated(args = [], options = {}) {
  const {
    timeout = 10000,
    input = null,
    testEnv = {},
    expectError = false,
    testName = 'unknown'
  } = options;

  const { tempDir, testEnv: isolatedEnv } = await createTestEnvironment(testName);

  return new Promise((resolve, reject) => {
    const CLI_PATH = path.join(__dirname, '../../dist/src/cli-selector.js');

    const child = spawn('node', [CLI_PATH, ...args], {
      env: {
        ...isolatedEnv,
        ...testEnv
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false, // Keep as child process for easier cleanup
      cwd: tempDir
    });

    activeProcesses.add(child);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      child.kill('SIGTERM');
      // Force kill after 2 seconds if still running
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, 2000);

      activeProcesses.delete(child);
      reject(new Error(`Test timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', (exitCode) => {
      clearTimeout(timeoutHandle);
      activeProcesses.delete(child);

      const result = {
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: exitCode === 0
      };

      // Clean up test environment
      cleanupTestEnvironment(tempDir).catch(console.warn);

      if (expectError) {
        resolve(result);
      } else if (exitCode === 0 || exitCode === 1) {
        // Accept exit codes 0 or 1 for most CLI operations
        resolve(result);
      } else {
        reject(new Error(`CLI process failed with exit code ${exitCode}\nStderr: ${stderr}\nStdout: ${stdout}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeoutHandle);
      activeProcesses.delete(child);
      cleanupTestEnvironment(tempDir).catch(console.warn);
      reject(error);
    });

    // Send input if provided
    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    } else {
      child.stdin.end();
    }
  });
}

/**
 * Clean up test environment
 */
async function cleanupTestEnvironment(tempDir) {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
    tempDirectories.delete(tempDir);
  } catch (error) {
    console.warn(`Failed to cleanup test directory ${tempDir}:`, error.message);
  }
}

/**
 * Kill all active test processes
 */
async function killAllTestProcesses() {
  const killPromises = Array.from(activeProcesses).map(child => {
    return new Promise((resolve) => {
      if (child.killed) {
        resolve();
        return;
      }

      child.on('close', () => resolve());
      child.kill('SIGTERM');

      // Force kill after 3 seconds
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
        resolve();
      }, 3000);
    });
  });

  await Promise.allSettled(killPromises);
  activeProcesses.clear();
}

/**
 * Clean up all test environments
 */
async function cleanupAllTestEnvironments() {
  const cleanupPromises = Array.from(tempDirectories).map(cleanupTestEnvironment);
  await Promise.allSettled(cleanupPromises);
  tempDirectories.clear();
}

/**
 * Verify CLI output contains expected patterns
 */
function verifyOutput(output, expectedPatterns = []) {
  if (!Array.isArray(expectedPatterns)) {
    expectedPatterns = [expectedPatterns];
  }

  for (const pattern of expectedPatterns) {
    if (typeof pattern === 'string') {
      if (!output.includes(pattern)) {
        throw new Error(`Expected output to contain "${pattern}", but got: ${output}`);
      }
    } else if (pattern instanceof RegExp) {
      if (!pattern.test(output)) {
        throw new Error(`Expected output to match ${pattern}, but got: ${output}`);
      }
    }
  }
}

/**
 * Mock Ollama server for testing
 */
class MockOllamaServer {
  constructor(port = 11434) {
    this.port = port;
    this.server = null;
  }

  start() {
    // Create a minimal mock server that responds to basic Ollama API calls
    const http = require('http');

    this.server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url === '/api/tags') {
        res.writeHead(200);
        res.end(JSON.stringify({ models: [] }));
      } else if (req.url === '/api/version') {
        res.writeHead(200);
        res.end(JSON.stringify({ version: '0.1.0-test' }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            port: this.port,
            baseUrl: `http://localhost:${this.port}`,
            stop: () => this.stop()
          });
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Global cleanup on process exit
process.on('exit', () => {
  // Synchronous cleanup only
  for (const child of activeProcesses) {
    try {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
});

process.on('SIGINT', async () => {
  await killAllTestProcesses();
  await cleanupAllTestEnvironments();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await killAllTestProcesses();
  await cleanupAllTestEnvironments();
  process.exit(0);
});

module.exports = {
  createTestEnvironment,
  execCLIIsolated,
  cleanupTestEnvironment,
  killAllTestProcesses,
  cleanupAllTestEnvironments,
  verifyOutput,
  MockOllamaServer
};
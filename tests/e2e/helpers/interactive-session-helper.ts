/**
 * Interactive Session Helper
 *
 * Manages an interactive ollama-code session for E2E testing.
 * Provides utilities for sending messages, capturing output, and validating behavior.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import { TEST_PATHS } from '../config/test-constants';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: string;
  error?: string;
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_name?: string;
}

export interface InteractiveSessionOptions {
  /** Ollama API host (default: http://localhost:11434 for real Ollama, use 11435 for mock server) */
  ollamaHost?: string;
  /** Log level for the session (default: error) */
  logLevel?: string;
  /** Working directory for the session */
  workingDirectory?: string;
  /** Default timeout for operations in ms (default: 10000) */
  timeout?: number;
  /** Model to use (default: tinyllama) */
  model?: string;
  /** Whether to capture debug logs */
  captureDebugLogs?: boolean;
}

export class InteractiveSession extends EventEmitter {
  private process?: ChildProcess;
  private output: string = '';
  private errorOutput: string = '';
  private toolCalls: ToolCall[] = [];
  private conversationHistory: OllamaMessage[] = [];
  private options: Required<InteractiveSessionOptions>;
  private ready: boolean = false;
  private terminated: boolean = false;

  constructor(options: InteractiveSessionOptions = {}) {
    super();
    this.options = {
      // Default to real Ollama (11434), not mock server (11435)
      // Tests can override to use mock server if needed
      ollamaHost: options.ollamaHost || 'http://localhost:11434',
      logLevel: options.logLevel || 'error',
      workingDirectory: options.workingDirectory || process.cwd(),
      timeout: options.timeout || 10000,
      model: options.model || 'tinyllama',
      captureDebugLogs: options.captureDebugLogs ?? false
    };
  }

  /**
   * Start the interactive session
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Session already started');
    }

    const env = {
      ...process.env,
      OLLAMA_HOST: this.options.ollamaHost,
      LOG_LEVEL: this.options.logLevel,
      FORCE_COLOR: '0', // Disable colors for easier parsing
      OLLAMA_CODE_E2E_TEST: 'true' // Allow non-TTY interactive mode for testing
      // NOTE: Do NOT set OLLAMA_SKIP_ENHANCED_INIT - it causes immediate exit
      // We want to test the real interactive mode
    };

    // Spawn the CLI process
    this.process = spawn('node', [
      TEST_PATHS.CLI_ENTRY_POINT,
      '--mode', 'interactive',
      '--model', this.options.model
    ], {
      cwd: this.options.workingDirectory,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Set up output handlers
    this.process.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      this.output += chunk;
      this.parseOutput(chunk);
      this.emit('output', chunk);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      this.errorOutput += chunk;

      // Parse debug logs if enabled
      if (this.options.captureDebugLogs) {
        this.parseDebugLogs(chunk);
      }

      this.emit('error-output', chunk);
    });

    this.process.on('exit', (code, signal) => {
      this.terminated = true;
      this.emit('exit', { code, signal });

      // Log exit for debugging - ALWAYS log in test environment
      console.error(`[InteractiveSession] Process exited with code ${code}, signal ${signal}`);
      console.error(`[InteractiveSession] Output length: ${this.output.length} chars`);
      console.error(`[InteractiveSession] Error output length: ${this.errorOutput.length} chars`);

      // Show FULL output for debugging
      if (this.output) {
        console.error(`[InteractiveSession] FULL output:\n${this.output}`);
      }

      // Always show error output if present
      if (this.errorOutput) {
        console.error(`[InteractiveSession] Error output:\n${this.errorOutput}`);
      }
    });

    // Wait for initial prompt
    await this.waitForReady();
  }

  /**
   * Send a message to the AI
   */
  async sendMessage(message: string): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Session not started');
    }

    if (this.terminated) {
      throw new Error('Session terminated');
    }

    // Reset ready state
    this.ready = false;

    // Send the message
    this.process.stdin.write(message + '\n');

    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });
  }

  /**
   * Wait for specific output pattern
   */
  async waitForOutput(pattern: string | RegExp, timeout?: number): Promise<string> {
    const timeoutMs = timeout || this.options.timeout;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkOutput = () => {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        const match = this.output.match(regex);

        if (match) {
          resolve(match[0]);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timeout waiting for output matching: ${pattern}\n\nActual output:\n${this.output}`));
          return;
        }

        setTimeout(checkOutput, 100);
      };

      checkOutput();
    });
  }

  /**
   * Wait for AI to be ready for next message (prompt appears)
   */
  async waitForReady(timeout?: number): Promise<void> {
    const timeoutMs = timeout || this.options.timeout;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkReady = () => {
        if (this.ready) {
          resolve();
          return;
        }

        if (this.terminated) {
          reject(new Error('Session terminated while waiting for ready state'));
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timeout waiting for ready state\n\nLast output:\n${this.getLastOutput(500)}`));
          return;
        }

        setTimeout(checkReady, 100);
      };

      // Also listen for output events
      const outputListener = () => {
        if (this.ready) {
          this.off('output', outputListener);
          resolve();
        }
      };
      this.on('output', outputListener);

      checkReady();
    });
  }

  /**
   * Get all tool calls executed in this session
   */
  getToolCalls(): ToolCall[] {
    return [...this.toolCalls];
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): OllamaMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get all output captured so far
   */
  getOutput(): string {
    return this.output;
  }

  /**
   * Get last N characters of output
   */
  getLastOutput(chars: number = 200): string {
    return this.output.slice(-chars);
  }

  /**
   * Get error output (stderr)
   */
  getErrorOutput(): string {
    return this.errorOutput;
  }

  /**
   * Check if session is ready for input
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Check if session is terminated
   */
  isTerminated(): boolean {
    return this.terminated;
  }

  /**
   * Terminate the session cleanly
   */
  async terminate(): Promise<void> {
    if (!this.process || this.terminated) {
      return;
    }

    // Try graceful shutdown first
    if (this.process.stdin) {
      try {
        this.process.stdin.write('exit\n');
      } catch (e) {
        // Ignore errors on exit
      }
    }

    // Wait a bit for graceful exit
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force kill if still running
    if (!this.terminated && this.process) {
      this.process.kill('SIGTERM');

      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force kill if still alive
      if (!this.terminated && this.process) {
        this.process.kill('SIGKILL');
      }
    }

    this.terminated = true;
  }

  /**
   * Parse output to detect tool calls and ready state
   */
  private parseOutput(chunk: string): void {
    // Detect ready state (prompt appears)
    // Look for common prompt patterns
    if (chunk.includes('You:') || chunk.includes('> ') || chunk.match(/^[>\$#]\s*$/m)) {
      this.ready = true;
    }

    // Detect tool calls from formatted output
    // Example: "🔧 list: ." or "🔧 Executing: search"
    const toolCallMatch = chunk.match(/🔧\s+(?:Executing:\s+)?(\w+)(?::\s+(.+))?/);
    if (toolCallMatch) {
      const toolName = toolCallMatch[1];
      const toolArgs = toolCallMatch[2];

      // Try to find this tool call in our list or add it
      const existingCall = this.toolCalls.find(
        tc => tc.name === toolName && !tc.result && !tc.error
      );

      if (!existingCall) {
        this.toolCalls.push({
          id: `call_${this.toolCalls.length + 1}`,
          name: toolName,
          arguments: toolArgs ? { raw: toolArgs } : {}
        });
      }
    }

    // Detect tool completion
    // Example: "✓ completed"
    if (chunk.includes('✓ completed') || chunk.includes('✓ ✓ completed')) {
      const lastCall = this.toolCalls[this.toolCalls.length - 1];
      if (lastCall && !lastCall.result) {
        lastCall.result = 'completed';
      }
    }
  }

  /**
   * Parse debug logs to extract conversation history and detailed tool calls
   */
  private parseDebugLogs(chunk: string): void {
    // Look for debug log patterns
    // Example: [DEBUG] Tool call: {"name":"filesystem","arguments":{...}}

    const toolCallLogMatch = chunk.match(/Tool call:\s*(\{.*\})/);
    if (toolCallLogMatch) {
      try {
        const toolCallData = JSON.parse(toolCallLogMatch[1]);

        // Update existing tool call with full arguments
        const existingCall = this.toolCalls.find(
          tc => tc.name === toolCallData.name && typeof tc.arguments.raw !== 'undefined'
        );

        if (existingCall) {
          existingCall.arguments = toolCallData.arguments || {};
        } else {
          // Add new tool call with full data
          this.toolCalls.push({
            id: `call_${this.toolCalls.length + 1}`,
            name: toolCallData.name,
            arguments: toolCallData.arguments || {}
          });
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Look for conversation history logs
    const conversationLogMatch = chunk.match(/Conversation history:\s*(\[.*\])/s);
    if (conversationLogMatch) {
      try {
        const messages = JSON.parse(conversationLogMatch[1]);
        this.conversationHistory = messages;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }
}

/**
 * Helper function to create and start a session
 */
export async function createInteractiveSession(
  options?: InteractiveSessionOptions
): Promise<InteractiveSession> {
  const session = new InteractiveSession(options);
  await session.start();
  return session;
}

/**
 * Helper function to wait for a condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> {
  const timeout = options.timeout || 10000;
  const interval = options.interval || 100;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const result = await condition();
        if (result) {
          resolve();
          return;
        }
      } catch (e) {
        // Condition threw error, keep waiting
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(options.message || 'Timeout waiting for condition'));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Ollama API Mock Server
 *
 * HTTP server that mimics Ollama's API for E2E testing.
 * Returns fixture-based responses for deterministic testing.
 */

import * as http from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { TEST_PATHS } from '../config/test-constants';

export interface OllamaRequest {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: any;
  timestamp: number;
}

export interface OllamaToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OllamaStreamChunk {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
}

export interface FixtureTurn {
  userMessage: string;
  aiResponse: {
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  expectedToolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
  }>;
  toolResults?: Array<{
    tool_name: string;
    content: string;
  }>;
  finalResponse?: string;
}

export interface InteractiveFixture {
  id: string;
  description: string;
  turns: FixtureTurn[];
}

export interface OllamaMockServerOptions {
  /** Port to run the server on (default: 11435) */
  port?: number;
  /** Directory containing fixture files */
  fixturesDir?: string;
  /** Enable detailed logging */
  verbose?: boolean;
}

export class OllamaMockServer extends EventEmitter {
  private server?: http.Server;
  private options: Required<OllamaMockServerOptions>;
  private requests: OllamaRequest[] = [];
  private currentFixture?: InteractiveFixture;
  private currentTurnIndex: number = 0;
  private nextError?: { code: string; message: string };
  private started: boolean = false;

  constructor(options: OllamaMockServerOptions = {}) {
    super();
    this.options = {
      port: options.port || 11435,
      fixturesDir: options.fixturesDir || path.join(TEST_PATHS.FIXTURES_DIR, 'ai-responses', 'interactive'),
      verbose: options.verbose ?? false
    };
  }

  /**
   * Start the mock server
   */
  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Server already started');
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.options.port, () => {
        this.started = true;
        this.log(`Mock Ollama server started on port ${this.options.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    if (!this.server || !this.started) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.started = false;
        this.log('Mock Ollama server stopped');
        resolve();
      });
    });
  }

  /**
   * Load a fixture for a specific scenario
   */
  async loadFixture(scenarioName: string): Promise<void> {
    const fixturePath = path.join(this.options.fixturesDir, `${scenarioName}.json`);

    try {
      const content = await fs.readFile(fixturePath, 'utf-8');
      this.currentFixture = JSON.parse(content);
      this.currentTurnIndex = 0;
      this.log(`Loaded fixture: ${scenarioName}`);
    } catch (error) {
      throw new Error(`Failed to load fixture ${scenarioName}: ${error}`);
    }
  }

  /**
   * Get all requests received by the server
   */
  getRequests(): OllamaRequest[] {
    return [...this.requests];
  }

  /**
   * Clear request history
   */
  clearRequests(): void {
    this.requests = [];
  }

  /**
   * Inject an error for the next request
   */
  injectError(error: { code: string; message: string }): void {
    this.nextError = error;
  }

  /**
   * Reset server state
   */
  reset(): void {
    this.requests = [];
    this.currentFixture = undefined;
    this.currentTurnIndex = 0;
    this.nextError = undefined;
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url || '';
    const method = req.method || 'GET';

    this.log(`${method} ${url}`);

    // Collect request body
    const body = await this.collectBody(req);

    // Record request
    this.requests.push({
      method,
      url,
      headers: req.headers,
      body,
      timestamp: Date.now()
    });

    this.emit('request', { method, url, body });

    // Check for injected error
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = undefined;
      this.sendError(res, error.code, error.message);
      return;
    }

    // Route the request
    if (url === '/api/chat' && method === 'POST') {
      await this.handleChatRequest(body, res);
    } else if (url === '/api/tags' && method === 'GET') {
      this.handleTagsRequest(res);
    } else if (url === '/api/show' && method === 'POST') {
      this.handleShowRequest(body, res);
    } else {
      this.sendError(res, 'NOT_FOUND', `Unknown endpoint: ${method} ${url}`);
    }
  }

  /**
   * Handle /api/chat request (main LLM interaction)
   */
  private async handleChatRequest(body: any, res: http.ServerResponse): Promise<void> {
    if (!this.currentFixture) {
      this.sendError(res, 'NO_FIXTURE', 'No fixture loaded. Call loadFixture() first.');
      return;
    }

    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1];

    this.log(`Chat request with ${messages.length} messages`);
    if (lastMessage) {
      this.log(`Last message: ${lastMessage.role}: ${lastMessage.content?.substring(0, 50)}...`);
    }

    // Determine which turn we're on based on messages
    const userMessages = messages.filter((m: any) => m.role === 'user');
    const turnIndex = Math.min(userMessages.length - 1, this.currentFixture.turns.length - 1);

    if (turnIndex < 0 || turnIndex >= this.currentFixture.turns.length) {
      this.sendError(res, 'NO_TURN', `No fixture turn available for turn ${turnIndex}`);
      return;
    }

    const turn = this.currentFixture.turns[turnIndex];

    // Check if this is after tool execution (tool results present)
    const hasToolResults = messages.some((m: any) => m.role === 'tool');

    // Stream the response
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked'
    });

    if (hasToolResults && turn.finalResponse) {
      // This is the response after tools have executed
      await this.streamResponse(res, turn.finalResponse, false);
    } else if (turn.aiResponse.tool_calls && turn.aiResponse.tool_calls.length > 0) {
      // This is the initial response with tool calls
      await this.streamToolCalls(res, turn.aiResponse);
    } else {
      // This is a direct response (no tools)
      await this.streamResponse(res, turn.aiResponse.content, false);
    }

    // Send done message
    this.sendChunk(res, {
      model: body.model || 'tinyllama',
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: ''
      },
      done: true
    });

    res.end();

    this.currentTurnIndex = turnIndex + 1;
  }

  /**
   * Stream a text response chunk by chunk
   */
  private async streamResponse(
    res: http.ServerResponse,
    content: string,
    includeToolCalls: boolean = false
  ): Promise<void> {
    // Split into words for realistic streaming
    const words = content.split(' ');

    for (let i = 0; i < words.length; i++) {
      const word = i === words.length - 1 ? words[i] : words[i] + ' ';

      this.sendChunk(res, {
        model: 'tinyllama',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: word
        },
        done: false
      });

      // Small delay for realistic streaming
      await this.delay(10);
    }
  }

  /**
   * Stream a response with tool calls
   */
  private async streamToolCalls(
    res: http.ServerResponse,
    aiResponse: { content: string; tool_calls?: OllamaToolCall[] }
  ): Promise<void> {
    // First, stream the JSON representation of the tool call (if content is JSON)
    if (aiResponse.content) {
      const contentChunks = this.chunkString(aiResponse.content, 20);
      for (const chunk of contentChunks) {
        this.sendChunk(res, {
          model: 'tinyllama',
          created_at: new Date().toISOString(),
          message: {
            role: 'assistant',
            content: chunk
          },
          done: false
        });
        await this.delay(10);
      }
    }

    // Send the structured tool_calls in the final chunk before done
    if (aiResponse.tool_calls) {
      this.sendChunk(res, {
        model: 'tinyllama',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: '',
          tool_calls: aiResponse.tool_calls
        },
        done: false
      });
    }
  }

  /**
   * Handle /api/tags request (list available models)
   */
  private handleTagsRequest(res: http.ServerResponse): void {
    const response = {
      models: [
        {
          name: 'tinyllama',
          modified_at: '2024-01-01T00:00:00Z',
          size: 1000000,
          digest: 'mock-digest'
        }
      ]
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  /**
   * Handle /api/show request (show model info)
   */
  private handleShowRequest(body: any, res: http.ServerResponse): void {
    const response = {
      modelfile: 'FROM tinyllama',
      parameters: 'mock parameters',
      template: 'mock template'
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  /**
   * Send an error response
   */
  private sendError(res: http.ServerResponse, code: string, message: string): void {
    this.log(`Error: ${code} - ${message}`);

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code, message } }));
  }

  /**
   * Send a streaming chunk
   */
  private sendChunk(res: http.ServerResponse, chunk: OllamaStreamChunk): void {
    res.write(JSON.stringify(chunk) + '\n');
  }

  /**
   * Collect request body
   */
  private async collectBody(req: http.IncomingMessage): Promise<any> {
    const chunks: Buffer[] = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const body = Buffer.concat(chunks).toString();

    if (!body) {
      return null;
    }

    try {
      return JSON.parse(body);
    } catch (e) {
      return body;
    }
  }

  /**
   * Split string into chunks
   */
  private chunkString(str: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += chunkSize) {
      chunks.push(str.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message if verbose mode enabled
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[OllamaMockServer] ${message}`);
    }
  }
}

/**
 * Helper function to create and start a mock server
 */
export async function createOllamaMockServer(
  options?: OllamaMockServerOptions
): Promise<OllamaMockServer> {
  const server = new OllamaMockServer(options);
  await server.start();
  return server;
}

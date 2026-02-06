/**
 * Streaming Tool Orchestrator
 *
 * Coordinates streaming responses with real-time tool execution
 */

import { OllamaClient, OllamaToolCall, OllamaTool } from '../ai/ollama-client.js';
import type { TurnResult } from '../interactive/types.js';
import { ToolRegistry, ToolExecutionContext, ToolResult } from './types.js';
import { OllamaToolAdapter } from './ollama-adapter.js';
import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';
import { TOOL_ORCHESTRATION_DEFAULTS, TOOL_LIMITS, CODE_ANALYSIS_CONSTANTS, STREAMING_CONSTANTS, TOOL_MONITORING } from '../constants/tool-orchestration.js';
import { promptForApproval, ApprovalCache } from '../utils/approval-prompt.js';
import { truncateForLog, truncateForContext } from '../utils/text-utils.js';
import { safeParse } from '../utils/safe-json.js';
import { isDebugMode } from '../utils/debug.js';
import { shouldPromptForPlanApproval, requestPlanApproval } from '../interactive/plan-approval.js';

export interface Terminal {
  write(text: string): void;
  info(text: string): void;
  success(text: string): void;
  warn(text: string): void;
  error(text: string): void;
}

export interface StreamingToolOrchestratorConfig {
  enableToolCalling: boolean;
  maxToolsPerRequest: number;
  toolTimeout: number;
  requireApprovalForCategories?: string[];
  skipUnapprovedTools?: boolean;
  /** When true, prompt user to approve task plan before execute (skipped in E2E/non-interactive) */
  requirePlanApproval?: boolean;
}

interface CachedToolResult {
  result: ToolResult;
  timestamp: number;
}

export class StreamingToolOrchestrator {
  private config: StreamingToolOrchestratorConfig;
  private toolResults: Map<string, CachedToolResult> = new Map();
  private approvalCache: ApprovalCache = new ApprovalCache();
  private failedToolCalls: Map<string, number> = new Map(); // Track repeated failures
  private recentToolCalls: Map<string, { timestamp: number; success: boolean }> = new Map(); // Track recent tool calls with timestamp and result
  private consecutiveDuplicates: number = 0; // Track consecutive duplicate attempts
  private lastToolSignature: string = ''; // Track the last tool call signature
  private lastAttemptedToolSignature: string = ''; // Track the last attempted tool call signature (including failed ones)
  private consecutiveSuccessfulDuplicates: number = 0; // Track consecutive successful duplicate calls
  private blockedToolSignatures: Set<string> = new Set(); // Tool signatures to block after hitting duplicate limit
  private approvedPlanIds: Set<string> = new Set(); // Plan IDs approved by user for execution (when requirePlanApproval)
  private static readonly MAX_TOOL_RESULTS = TOOL_LIMITS.MAX_TOOL_RESULTS_CACHE;
  private static readonly MAX_FAILURE_COUNT = 2; // Max times to allow same failure
  private static readonly RAPID_DUPLICATE_TTL = 3000; // 3 seconds - block rapid duplicates
  private static readonly FAILED_CALL_TTL = 30000; // 30 seconds - block failed call retries
  private static readonly MAX_CONSECUTIVE_DUPLICATES = 3; // Stop and prompt for answer after this many duplicates
  private static readonly MAX_SUCCESSFUL_DUPLICATES = 3; // Stop after this many successful duplicates

  /**
   * Safely write to terminal with fallback
   */
  private safeTerminalWrite(text: string): void {
    try {
      if (this.terminal && typeof this.terminal.write === 'function') {
        this.terminal.write(text);
      } else {
        process.stdout.write(text);
      }
    } catch (error) {
      process.stdout.write(text);
    }
  }

  /**
   * Safely call terminal method with fallback
   */
  private safeTerminalCall(
    method: 'info' | 'success' | 'warn' | 'error',
    text: string
  ): void {
    try {
      const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
      
      if (this.terminal && typeof this.terminal[method] === 'function') {
        this.terminal[method](text);
        // In E2E mode, ensure messages are flushed by writing newline if needed
        // This helps test helpers capture tool execution messages and warnings
        if (e2eMode) {
          if (method === 'info' && text.includes('🔧')) {
            // Tool execution messages - ensure they're on their own line for better parsing
            if (!text.endsWith('\n')) {
              this.terminal[method]('\n');
            }
          } else if (method === 'warn' || method === 'error') {
            // Warnings and errors - ensure they end with newline for better parsing in E2E tests
            if (!text.endsWith('\n')) {
              this.terminal[method]('\n');
            }
          }
        }
      } else {
        const consoleMethods = {
          info: console.log,
          success: console.log,
          warn: console.warn,
          error: console.error
        };
        consoleMethods[method](text);
      }
    } catch (error) {
      console.log(text);
    }
  }

  constructor(
    private ollamaClient: OllamaClient,
    private toolRegistry: ToolRegistry,
    private terminal: Terminal,
    config?: Partial<StreamingToolOrchestratorConfig>
  ) {
    this.config = {
      enableToolCalling: TOOL_ORCHESTRATION_DEFAULTS.ENABLE_TOOL_CALLING,
      maxToolsPerRequest: TOOL_ORCHESTRATION_DEFAULTS.MAX_TOOLS_PER_REQUEST,
      toolTimeout: TOOL_ORCHESTRATION_DEFAULTS.TOOL_TIMEOUT,
      requireApprovalForCategories: [...TOOL_ORCHESTRATION_DEFAULTS.APPROVAL_REQUIRED_CATEGORIES],
      skipUnapprovedTools: TOOL_ORCHESTRATION_DEFAULTS.SKIP_UNAPPROVED_TOOLS,
      requirePlanApproval: false,
      ...config
    };
  }

  /**
   * Execute with streaming and maintain conversation history
   * Used by interactive mode to maintain multi-turn conversations
   * FIXED: Now includes multi-turn loop to allow AI to recover from tool errors
   */
  async executeWithStreamingAndHistory(
    conversationHistory: any[],
    context: ToolExecutionContext,
    options?: {
      specificTools?: string[];
      categories?: string[];
      model?: string;
    }
  ): Promise<TurnResult> {
    if (!this.config.enableToolCalling) {
      this.safeTerminalCall('warn', 'Tool calling is disabled');
      return { turnComplete: true };
    }

    // Get available tools
    let tools: OllamaTool[];

    if (options?.specificTools) {
      tools = OllamaToolAdapter.getSpecificTools(this.toolRegistry, options.specificTools);
    } else if (options?.categories) {
      tools = [];
      for (const category of options.categories) {
        tools.push(...OllamaToolAdapter.getToolsByCategory(this.toolRegistry, category));
      }
    } else {
      tools = OllamaToolAdapter.getAllTools(this.toolRegistry);
    }

    logger.info('Starting streaming tool execution with history', {
      historyLength: conversationHistory.length,
      toolCount: tools.length,
      model: options?.model,
      toolNames: tools.map(t => t.function.name).slice(0, 5) // Log first 5 tool names for debugging
    });
    
    // CRITICAL DEBUG: In E2E mode, log tool availability to help diagnose test failures
    const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
    if (e2eMode && tools.length > 0) {
      this.safeTerminalCall('info', `[DEBUG] Available tools: ${tools.map(t => t.function.name).join(', ')}\n`);
    }

    // DEBUG: Log tools being sent
    logger.debug('Tools being sent to model:', {
      toolNames: tools.map(t => t.function.name),
      firstToolSample: tools[0] ? truncateForContext(JSON.stringify(tools[0])) : 'none'
    });

    // DEBUG: Log conversation history being sent
    logger.debug('Conversation history being sent:', {
      messageCount: conversationHistory.length,
      messages: conversationHistory.map(m => ({
        role: m.role,
        contentPreview: truncateForLog(m.content || ''),
        hasToolCalls: !!m.tool_calls
      }))
    });

    try {
      const { generateToolCallingSystemPrompt, enhanceSystemPromptWithPlanning } = await import('../ai/prompts.js');
      let systemPrompt = generateToolCallingSystemPrompt();
      
      // Enhance prompt with planning suggestions if the request is complex
      // Extract the latest user message from conversation history
      const latestUserMessage = conversationHistory
        .slice()
        .reverse()
        .find(msg => msg.role === 'user');
      
      if (latestUserMessage?.content) {
        const userRequest = typeof latestUserMessage.content === 'string' 
          ? latestUserMessage.content 
          : String(latestUserMessage.content);
        systemPrompt = enhanceSystemPromptWithPlanning(systemPrompt, userRequest);
      }

      /** Result for this turn: turn complete (show prompt again) or session should end. */
      let turnResult: TurnResult = { turnComplete: true };

      // FIXED: Add multi-turn loop to allow AI to recover from tool errors
      let conversationComplete = false;
      let totalToolCalls = 0;
      const maxTurns = STREAMING_CONSTANTS.MAX_CONVERSATION_TURNS;
      let turnCount = 0;
      let consecutiveFailures = 0; // Track consecutive tool failures
      const maxConsecutiveFailures = 3; // Stop if too many failures in a row
      let consecutiveTurnsWithOnlyToolCalls = 0; // Track turns with only tool calls and no text
      const maxConsecutiveTurnsWithOnlyToolCalls = 2; // Force answer after 2 turns of only tool calls
      let maxToolCallsRecoveryTurnUsed = false; // One recovery turn when per-turn tool limit is hit
      let finalAnswerRequested = false; // Track if we've already requested a final answer to prevent loops

      while (!conversationComplete && turnCount < maxTurns) {
        turnCount++;
        logger.info(`🔄 Starting conversation turn ${turnCount}/${maxTurns}`, {
          conversationComplete,
          totalToolCallsSoFar: totalToolCalls,
          conversationHistoryLength: conversationHistory.length
        });

        // DEBUG: Log conversation history being sent to Ollama
        logger.debug('Conversation history for this turn:', {
          turn: turnCount,
          messageCount: conversationHistory.length,
          lastMessages: conversationHistory.slice(-3).map(m => ({
            role: m.role,
            hasContent: !!m.content,
            contentPreview: m.content ? truncateForLog(m.content) : '',
            hasToolCalls: !!(m as any).tool_calls,
            toolCallCount: (m as any).tool_calls?.length || 0,
            tool_name: (m as any).tool_name  // Ollama uses tool_name
          }))
        });

        // Process single turn with conversation history
        const turnToolCalls: OllamaToolCall[] = [];
        let assistantMessage: any = { role: 'assistant', content: '' };

        // Track synthetic tool calls to prevent duplicates
        const processedSyntheticCalls = new Set<string>();
        const syntheticToolCallPromises: Promise<any>[] = [];
        let lastProcessedPosition = 0; // Track where we've parsed up to
        let parseAttempts = 0; // Track parse attempts to prevent infinite loops
        const maxParseAttempts = STREAMING_CONSTANTS.MAX_STREAMING_PARSE_ATTEMPTS;
        let maxToolCallsExceeded = false; // Flag to track if tool limit was exceeded

        // CRITICAL FIX: If we had tool calls in previous turn and model didn't respond,
        // add timeout to prevent hanging. This is especially important for E2E tests.
        const MODEL_RESPONSE_TIMEOUT = 30000; // 30 seconds for model to respond after tool execution
        const hasPreviousToolCalls = turnCount > 1 && conversationHistory.some(
          (msg: any) => msg.tool_calls && msg.tool_calls.length > 0
        );
        
        let streamCompleted = false;
        const streamTimeout = hasPreviousToolCalls ? setTimeout(() => {
          if (!streamCompleted) {
            logger.warn('Model did not respond after tool execution within timeout, forcing turn completion', {
              turnCount,
              timeoutMs: MODEL_RESPONSE_TIMEOUT,
              hasPreviousToolCalls
            });
            // Force turn completion if model doesn't respond
            conversationComplete = true;
          }
        }, MODEL_RESPONSE_TIMEOUT) : null;

        try {
          // CRITICAL DEBUG: In E2E mode, log available tools before API call
          const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
          if (e2eMode && tools.length > 0) {
            const toolNames = tools.map(t => t.function?.name || 'unknown').join(', ');
            const debugMsg = `[DEBUG E2E] Available tools for this turn: ${toolNames}\n`;
            this.safeTerminalCall('info', debugMsg);
            console.error(debugMsg); // Backup
          }
          
          // CRITICAL DEBUG: Log that we're about to call Ollama API
          if (e2eMode) {
            const lastUserMsg = conversationHistory.slice().reverse().find(m => m.role === 'user');
            const userQuery = lastUserMsg?.content || 'unknown';
            const debugMsg = `[DEBUG E2E] About to call Ollama API with query: "${userQuery.substring(0, 50)}..."\n`;
            this.safeTerminalCall('info', debugMsg);
            console.error(debugMsg); // Backup
          }
          
          await this.ollamaClient.completeStreamWithTools(
          conversationHistory,
          tools,
          {
            model: options?.model,
            system: systemPrompt
          },
          {
            onContent: (chunk: string) => {
              // Detect if this chunk is part of a JSON tool call
              // Only show JSON if LOG_LEVEL=debug or LOG_LEVEL=0
              const debugMode = isDebugMode();
              const looksLikeJson = chunk.trim().match(/^[{\s]*"?(name|arguments)"?[\s:]/);

              // Hide JSON tool calls in normal mode
              if (!debugMode && looksLikeJson) {
                // Suppress JSON output, will show as formatted tool execution instead
                assistantMessage.content += chunk;
                return;
              }

              // CRITICAL: In E2E mode, log when we receive content chunks to help diagnose test failures
              const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
              if (e2eMode && chunk.trim().length > 0) {
                // Log ALL content chunks in E2E mode to see what model is responding with
                const debugMsg = `[DEBUG E2E] Content chunk received (length: ${chunk.length}): "${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}"\n`;
                this.safeTerminalCall('info', debugMsg);
                console.error(debugMsg); // Backup to ensure it's captured
              } else if (e2eMode) {
                // Log even empty/whitespace chunks to see if model is sending anything
                const debugMsg = `[DEBUG E2E] Empty/whitespace chunk received (length: ${chunk.length})\n`;
                console.error(debugMsg);
              }

              this.safeTerminalWrite(chunk);
              assistantMessage.content += chunk;

              // WORKAROUND: Some models output tool calls as JSON in content
              // Try to detect and parse them
              // Check if we have both fields anywhere in the accumulated content
              const hasName = assistantMessage.content.includes('"name"');
              const hasArguments = assistantMessage.content.includes('"arguments"');

              if (hasName && hasArguments) {
                try {
                  // Try to extract JSON objects from the accumulated content
                  // We need to find all complete JSON objects, not just the first one
                  const content = assistantMessage.content;

                  // Start searching from where we left off
                  let searchFrom = lastProcessedPosition;

                  // Find the next { starting from our last position
                  const startIndex = content.indexOf('{', searchFrom);
                  if (startIndex === -1) {
                    return; // No JSON object found
                  }

                  // Try to parse from this position
                  const jsonCandidate = content.substring(startIndex);

                  const toolCallData = safeParse<{ name?: string; arguments?: any }>(jsonCandidate);

                  if (toolCallData && toolCallData.name && toolCallData.arguments) {
                    // Reset parse attempts on successful parse
                    parseAttempts = 0;
                    // Create a unique key to prevent duplicate processing
                    const callKey = `${toolCallData.name}-${JSON.stringify(toolCallData.arguments)}`;

                    if (!processedSyntheticCalls.has(callKey)) {
                      processedSyntheticCalls.add(callKey);
                      totalToolCalls++;

                      // Check tool call limit for synthetic tool calls
                      if (totalToolCalls > this.config.maxToolsPerRequest) {
                        const errorMsg = `Exceeded maximum tool calls (${this.config.maxToolsPerRequest})`;
                        this.safeTerminalCall('error', errorMsg);
                        logger.error('Max tool calls exceeded (synthetic)', { totalToolCalls, max: this.config.maxToolsPerRequest });
                        maxToolCallsExceeded = true;
                        // Don't queue this tool call for execution - skip to next chunk
                        return;
                      }

                      logger.debug('Detected tool call in content, converting to tool call', toolCallData);

                      // Update our position to skip past this JSON object
                      // Find the actual end position by counting braces in the original content
                      let braceCount = 0;
                      let endPos = startIndex;
                      let inString = false;
                      let escaped = false;

                      for (let i = startIndex; i < content.length; i++) {
                        const char = content[i];

                        if (escaped) {
                          escaped = false;
                          continue;
                        }

                        if (char === '\\') {
                          escaped = true;
                          continue;
                        }

                        if (char === '"') {
                          inString = !inString;
                          continue;
                        }

                        if (!inString) {
                          if (char === '{') braceCount++;
                          if (char === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                              endPos = i + 1;
                              break;
                            }
                          }
                        }
                      }

                      lastProcessedPosition = endPos;

                      // Create a synthetic tool call
                      const syntheticToolCall: any = {
                        id: `${toolCallData.name}-${Date.now()}-${totalToolCalls}`,
                        function: {
                          name: toolCallData.name,
                          arguments: toolCallData.arguments
                        }
                      };

                      // Add to turn tool calls
                      turnToolCalls.push(syntheticToolCall);

                      // Execute it and track the promise
                      const executePromise = this.executeToolCall(syntheticToolCall, context)
                        .then(result => {
                          logger.debug('Synthetic tool call executed', {
                            name: toolCallData.name,
                            success: result.success
                          });
                          return result;
                        })
                        .catch(err => {
                          logger.error('Synthetic tool call failed', err);
                          return { success: false, error: err.message };
                        });

                      syntheticToolCallPromises.push(executePromise);
                    }
                  }
                } catch (e) {
                  /**
                   * CRITICAL: Infinite loop prevention
                   *
                   * Not valid JSON yet - this is expected during streaming as chunks arrive.
                   * We increment parse attempts on each failure and enforce a hard limit
                   * to prevent CPU spinning on pathological input (e.g., never-valid JSON).
                   *
                   * The maxParseAttempts limit (from STREAMING_CONSTANTS) ensures we:
                   * 1. Never spin indefinitely on malformed JSON
                   * 2. Reset the counter after warning to allow new turns
                   * 3. Continue processing subsequent chunks in new turns
                   */
                  parseAttempts++;

                  if (parseAttempts > maxParseAttempts) {
                    logger.warn('Exceeded maximum JSON parse attempts in streaming content', {
                      attempts: parseAttempts,
                      contentLength: assistantMessage.content.length,
                      error: e instanceof Error ? e.message : String(e),
                      maxAllowed: maxParseAttempts
                    });

                    // CRITICAL: Reset counter to allow processing new turns
                    // Don't return - just stop trying to parse for this turn
                    parseAttempts = 0; // Reset for next turn
                  }

                  // Silent ignore - will retry on next chunk (expected behavior)
                }
              }
            },

            onToolCall: async (toolCall: OllamaToolCall) => {
              totalToolCalls++;

              logger.debug('onToolCall callback invoked', {
                toolName: toolCall.function.name,
                count: totalToolCalls
              });
              
              // CRITICAL DEBUG: In E2E mode, log tool calls to help diagnose test failures
              const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
              if (e2eMode) {
                this.safeTerminalCall('info', `[DEBUG] Tool call received: ${toolCall.function.name}\n`);
              }

              if (totalToolCalls > this.config.maxToolsPerRequest) {
                const errorMsg = `Exceeded maximum tool calls (${this.config.maxToolsPerRequest})`;
                this.safeTerminalCall('error', errorMsg);
                throw new Error(errorMsg);
              }

              if (!toolCall.id) {
                toolCall.id = `${toolCall.function.name}-${Date.now()}-${totalToolCalls}`;
              }

              turnToolCalls.push(toolCall);

              const result = await this.executeToolCall(toolCall, context);
              return result;
            },

            onComplete: () => {
              streamCompleted = true;
              if (streamTimeout) {
                clearTimeout(streamTimeout);
              }
              const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
              logger.info('✅ Stream completed for turn', {
                turnCount,
                toolCallsThisTurn: turnToolCalls.length,
                assistantContentLength: assistantMessage.content?.length || 0,
                hasContent: !!assistantMessage.content?.trim()
              });
              
              // CRITICAL DEBUG: In E2E mode, log stream completion details
              if (e2eMode) {
                const debugMsg = `[DEBUG E2E] Stream completed - Turn: ${turnCount}, Tool calls: ${turnToolCalls.length}, Content length: ${assistantMessage.content?.length || 0}\n`;
                this.safeTerminalCall('info', debugMsg);
                console.error(debugMsg); // Backup to ensure it's captured
              }
            },

            onError: (error: Error) => {
              streamCompleted = true;
              if (streamTimeout) {
                clearTimeout(streamTimeout);
              }
              const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
              
              // CRITICAL DEBUG: In E2E mode, always log stream errors
              if (e2eMode) {
                const debugMsg = `[DEBUG E2E] Stream error occurred: ${error.message}\n[DEBUG E2E] Error name: ${error.name}\n[DEBUG E2E] Error stack: ${error.stack?.substring(0, 200)}\n`;
                this.safeTerminalCall('error', debugMsg);
                console.error(debugMsg); // Backup
              }
              
              logger.error('Streaming tool execution error', error);
              this.safeTerminalCall('error', `Error: ${error.message}`);
              // If we had previous tool calls and stream errored, force completion to prevent hanging
              if (hasPreviousToolCalls && !conversationComplete) {
                logger.warn('Stream errored after tool execution, forcing turn completion', {
                  turnCount,
                  error: error.message
                });
                conversationComplete = true;
              }
            }
          }
        );
        } catch (error) {
          streamCompleted = true;
          if (streamTimeout) {
            clearTimeout(streamTimeout);
          }
          // If stream failed and we had previous tool calls, force completion
          if (hasPreviousToolCalls && !conversationComplete) {
            logger.warn('Stream failed after tool execution, forcing turn completion', {
              turnCount,
              error: error instanceof Error ? error.message : String(error)
            });
            conversationComplete = true;
          }
          throw error;
        } finally {
          streamCompleted = true;
          if (streamTimeout) {
            clearTimeout(streamTimeout);
          }
        }

        // Wait for all synthetic tool calls to complete
        if (syntheticToolCallPromises.length > 0) {
          logger.debug(`Waiting for ${syntheticToolCallPromises.length} synthetic tool calls to complete`);
          await Promise.all(syntheticToolCallPromises);
          logger.debug('All synthetic tool calls completed');
        }

        // CRITICAL FIX: After stream completes, check if we had previous tool calls and model didn't respond
        // If so, force completion immediately to prevent hanging. This is especially important for E2E tests.
        // This handles the case where tools completed but model doesn't provide a text response.
        if (hasPreviousToolCalls && turnToolCalls.length === 0) {
          // We had tool calls in previous turn, but model didn't make new tool calls in this turn
          // Check if model provided text content
          const contentWithoutJson = assistantMessage.content
            ?.replace(/\{[^}]*"name"[^}]*"arguments"[^}]*\}/g, '')
            .trim();
          const hasTextContent = contentWithoutJson && contentWithoutJson.length > 20;
          
          if (!hasTextContent) {
            logger.warn('Model did not respond after tool execution (no tool calls, no text), forcing turn completion', {
              turnCount,
              hasPreviousToolCalls,
              hasTextContent,
              contentLength: assistantMessage.content?.length || 0
            });
            // Add assistant message to conversation history (even if empty) to maintain consistency
            if (assistantMessage.content || Object.keys(assistantMessage).length > 1) {
              conversationHistory.push(assistantMessage);
            }
            // Force turn completion - tool results were already provided, we can safely complete
            conversationComplete = true;
            // Break out of the loop immediately
            break;
          }
        }

        // If there were tool calls, add assistant message and tool results to conversation
        if (turnToolCalls.length > 0) {
          // Check if the assistant message has any meaningful text content (not just JSON tool calls)
          const contentWithoutJson = assistantMessage.content
            ?.replace(/\{[^}]*"name"[^}]*"arguments"[^}]*\}/g, '') // Remove JSON tool calls
            .trim();
          const hasTextContent = contentWithoutJson && contentWithoutJson.length > 20; // Arbitrary threshold

          logger.debug('Tool calls in response', {
            turnCount,
            toolCallCount: turnToolCalls.length,
            hasTextContent,
            contentLength: assistantMessage.content?.length || 0,
            contentWithoutJsonLength: contentWithoutJson?.length || 0
          });

          // Track consecutive turns with only tool calls (no meaningful text)
          // NOTE: We'll re-check this later after tool results are added, as text might
          // be added after tool calls complete. Don't increment counter yet - wait until
          // after we've checked for text content after tool execution completes.
          if (!hasTextContent) {
            logger.debug('Turn has tool calls, will check for text content after tool execution', {
              turnCount,
              initialHasTextContent: hasTextContent,
              contentLength: assistantMessage.content?.length || 0
            });
            // Don't increment counter yet - we'll check again after tool results are added
          } else {
            // Reset counter if this turn had meaningful text from the start
            consecutiveTurnsWithOnlyToolCalls = 0;
          }

          // Update conversation history with assistant's response
          assistantMessage.tool_calls = turnToolCalls;
          // NOTE: Keep the text content - Anthropic needs both text and tool_use in content blocks
          // The adapter will properly format this as content blocks when sending to Anthropic
          conversationHistory.push(assistantMessage);

          // Add tool results as separate messages with recovery suggestions
          for (const toolCall of turnToolCalls) {
            const callId = toolCall.id || `${toolCall.function.name}-${Date.now()}`;
            const cached = this.toolResults.get(callId);
            const result = cached?.result;

            // Format result in a clear, readable way for the model
            let resultContent: string;
            if (result && result.success) {
              // Success case - provide clear, unambiguous confirmation
              const toolName = toolCall.function.name;

              // Clear failure count on success
              const failureKey = `${toolName}:${JSON.stringify(toolCall.function.arguments)}`;
              this.failedToolCalls.delete(failureKey);

              // Reset duplicate counter on successful tool execution
              this.consecutiveDuplicates = 0;

              // Track consecutive successful duplicates
              const toolSignature = `${toolName}:${JSON.stringify(toolCall.function.arguments)}`;
              if (toolSignature === this.lastToolSignature) {
                this.consecutiveSuccessfulDuplicates++;
              } else {
                this.consecutiveSuccessfulDuplicates = 1;
                this.lastToolSignature = toolSignature;
              }

              if (toolName === 'filesystem') {
                const operation = (toolCall.function.arguments as any)?.operation || 'operation';
                const filePath = (toolCall.function.arguments as any)?.path || '';

                if (operation === 'list' && Array.isArray(result.data)) {
                  // Format list operation results in a readable way
                  const items = result.data;
                  const dirs = items.filter((item: any) => item.isDirectory);
                  const files = items.filter((item: any) => item.isFile);

                  const summary = `Found ${items.length} items (${dirs.length} directories, ${files.length} files)`;

                  // Show first 20 items to avoid overwhelming output
                  const displayItems = items.slice(0, 20);
                  const itemList = displayItems.map((item: any) =>
                    `  ${item.isDirectory ? '📁' : '📄'} ${item.name}${item.size ? ` (${item.size} bytes)` : ''}`
                  ).join('\n');

                  const moreItems = items.length > 20 ? `\n  ... and ${items.length - 20} more items` : '';

                  resultContent = `Tool execution successful. Directory listing completed.\n${summary}\n${itemList}${moreItems}`;
                } else if (operation === 'write' && result.data && result.data.path) {
                  // File write operation - be EXTREMELY explicit about success
                  resultContent = `✅ SUCCESS: File "${filePath}" has been CREATED and now EXISTS on disk. Size: ${result.data.size} bytes. The file write operation completed successfully. You do NOT need to create this file again - it already exists.`;
                } else if (operation === 'exists') {
                  // Exists check - be clear about the result
                  const exists = result.data === true || result.data?.exists === true;
                  resultContent = exists
                    ? `✅ CONFIRMED: File or directory "${filePath}" EXISTS.`
                    : `❌ File or directory "${filePath}" does NOT exist.`;
                } else if (result.data && result.data.path) {
                  // Other filesystem operations with path
                  resultContent = `Tool execution successful. The ${operation} operation completed successfully. File: ${result.data.path}, Size: ${result.data.size} bytes.`;
                } else if (result.data) {
                  resultContent = `Tool execution successful. Result: ${JSON.stringify(result.data)}`;
                } else {
                  resultContent = 'Tool execution successful. Operation completed.';
                }
              } else if (toolName === 'advanced-code-analysis' && result.data) {
                // Format code analysis results in a readable way
                const analysisData = result.data;

                if (analysisData.riskLevel !== undefined) {
                  // Security analysis result
                  const vulnCount = analysisData.vulnerabilities?.length || 0;
                  const riskEmoji = analysisData.riskLevel === 'Low' ? '🟢' : analysisData.riskLevel === 'Medium' ? '🟡' : '🔴';

                  let report = `✅ Security analysis completed.\n${riskEmoji} Risk Level: ${analysisData.riskLevel}\n`;
                  report += `📊 Checks: ${analysisData.checksPassed}/${analysisData.totalChecks} passed\n`;

                  if (vulnCount > 0) {
                    report += `\n⚠️ Found ${vulnCount} security issue(s):\n`;
                    const displayVulns = analysisData.vulnerabilities.slice(0, 5);
                    displayVulns.forEach((vuln: any, idx: number) => {
                      report += `  ${idx + 1}. ${vuln.type || 'Security Issue'} in ${vuln.file}:${vuln.line}\n`;
                      if (vuln.code) report += `     Code: ${vuln.code}\n`;
                      if (vuln.recommendation) report += `     Fix: ${vuln.recommendation}\n`;
                    });
                    if (vulnCount > 5) report += `  ... and ${vulnCount - 5} more\n`;
                  } else {
                    report += '\n✅ No security vulnerabilities detected.\n';
                  }

                  if (analysisData.recommendations && analysisData.recommendations.length > 0) {
                    report += `\n💡 Recommendations:\n`;
                    analysisData.recommendations.slice(0, 5).forEach((rec: string) => {
                      report += `  • ${rec}\n`;
                    });
                  }

                  resultContent = report;

                  // Softer instruction: allow follow-up filesystem writes when user asked to fix/apply
                  resultContent += `\n\nSummarize the findings for the user. If the user asked you to fix or apply these issues, use the filesystem tool with operation='write' to apply the changes to the relevant files, then summarize what you changed.`;
                } else {
                  // Other analysis types - use generic formatting
                  resultContent = `Tool execution successful. Analysis completed.\nResult: ${JSON.stringify(analysisData).slice(0, 500)}...`;
                }
              } else if (toolName === 'search' && result.data) {
                // Format search results in a readable way
                const searchData = result.data;
                const matchCount = searchData.totalMatches || 0;
                const filesSearched = searchData.filesSearched || 0;

                if (matchCount === 0) {
                  resultContent = `Tool execution successful. Search completed. No matches found for "${searchData.query}". Searched ${filesSearched} files.`;
                } else {
                  const matches = searchData.matches || [];
                  const displayMatches = matches.slice(0, 10); // Show first 10 matches

                  const matchList = displayMatches.map((match: any) => {
                    if (match.line === 0) {
                      // Filename match
                      return `  📄 ${match.file}`;
                    } else {
                      // Content match
                      return `  📄 ${match.file}:${match.line}:${match.column}\n     ${match.content.trim()}`;
                    }
                  }).join('\n');

                  const moreMatches = matchCount > 10 ? `\n  ... and ${matchCount - 10} more matches` : '';
                  resultContent = `Tool execution successful. Search completed.\nFound ${matchCount} matches in ${filesSearched} files for "${searchData.query}"\n${matchList}${moreMatches}`;
                }
              } else if (result.data) {
                resultContent = `Tool execution successful. Result: ${JSON.stringify(result.data)}`;
              } else {
                resultContent = 'Tool execution successful. Operation completed.';
              }
            } else if (result && result.error) {
              // Error case - provide clear error message with recovery suggestion
              const toolName = toolCall.function.name;

              // Check if this is a duplicate call error
              const isDuplicate = result.error.includes('already attempted') || result.error.includes('same call made');

              if (isDuplicate) {
                // Increment duplicate counter
                this.consecutiveDuplicates++;
              } else {
                // Reset duplicate counter for non-duplicate errors
                this.consecutiveDuplicates = 0;
              }

              // Track repeated failures
              const failureKey = `${toolName}:${JSON.stringify(toolCall.function.arguments)}`;
              const failCount = (this.failedToolCalls.get(failureKey) || 0) + 1;
              this.failedToolCalls.set(failureKey, failCount);

              // Add specific recovery suggestions for common errors
              let recoverySuggestion = '';
              if (toolName === 'advanced-code-analysis' && result.error.includes('does not exist')) {
                recoverySuggestion = ' To create the file or directory first, call the filesystem tool with operation "write" (for files with content) or "create" (for directories).';
              }

              // Warn about repeated failures
              if (failCount >= StreamingToolOrchestrator.MAX_FAILURE_COUNT) {
                recoverySuggestion += ` WARNING: This same tool call has failed ${failCount} times. Try a different approach instead of retrying the same operation.`;
              }

              resultContent = `Tool execution failed. Error: ${result.error}${recoverySuggestion}`;
            } else {
              // Unknown case - log warning and return generic error
              logger.warn('Unexpected tool result format', {
                tool: toolCall.function.name,
                result,
                hasSuccess: result && 'success' in result
              });
              resultContent = result ? JSON.stringify(result) : 'Tool execution failed with unknown error';
            }

            const toolResultMessage = {
              role: 'tool',
              tool_call_id: toolCall.id,           // Tool call ID for proper tracking
              tool_name: toolCall.function.name,   // Ollama uses tool_name, not tool_call_id
              content: resultContent
            };

            conversationHistory.push(toolResultMessage);

            logger.debug('Added tool result to conversation', {
              toolName: toolCall.function.name,
              success: result?.success,
              resultPreview: truncateForLog(resultContent)
            });

            // DEBUG: Log the actual formatted content being sent to model
            if (isDebugMode()) {
              console.log('\n========== 🔍 FORMATTED TOOL RESULT BEING SENT TO MODEL ==========');
              console.log('Tool:', toolCall.function.name);
              console.log('Content Length:', resultContent.length);
              console.log('Content Preview (first 500 chars):');
              console.log(resultContent.substring(0, 500));
              console.log('\nFull Tool Result Message:');
              console.log(JSON.stringify(toolResultMessage, null, 2));
              console.log('===================================================================\n');
            }

            // Track consecutive failures
            if (result && !result.success) {
              consecutiveFailures++;
            } else if (result && result.success) {
              consecutiveFailures = 0; // Reset on success
            }
          }

          // CRITICAL FIX: After ALL tool results are added, re-check if model provided text content.
          // Text might arrive AFTER tool execution completes via streaming, so we need to check again.
          // This is the FINAL check before deciding whether to continue or complete the turn.
          const finalContentCheck = assistantMessage.content
            ?.replace(/\{[^}]*"name"[^}]*"arguments"[^}]*\}/g, '')
            .trim();
          const finalHasTextContent = finalContentCheck && finalContentCheck.length > 20;
          
          // CRITICAL: Check if model provided text content FIRST, before any other checks
          // Use the final check we did above after tool results were added
          // This ensures we complete immediately if model responded, rather than injecting
          // system messages or continuing unnecessarily
          // NOTE: Assistant message was already added to conversationHistory at line 572,
          // so we don't need to add it again here
          if (finalHasTextContent) {
            // Model provided text - reset counter and complete turn
            consecutiveTurnsWithOnlyToolCalls = 0;
            finalAnswerRequested = false; // Reset flag since model responded
            conversationComplete = true;
            logger.debug('Model provided text content after tool calls, completing turn immediately', {
              turnCount,
              contentLength: assistantMessage.content?.length || 0,
              contentWithoutJsonLength: finalContentCheck?.length || 0
            });
            // Skip all other checks - we have text, so we're done
          } else {
            // No text content - FIRST check consecutive failures (highest priority)
            // This must be checked before any other conditions to prevent infinite loops
            if (consecutiveFailures >= maxConsecutiveFailures) {
              logger.warn(`Too many consecutive tool failures (${consecutiveFailures}), ending conversation`);
              this.safeTerminalCall('warn', `⚠️  Multiple consecutive tool failures detected. Ending conversation to prevent loops.`);
              turnResult = { turnComplete: false, sessionShouldEnd: true, reason: 'consecutive_failures' };
              conversationComplete = true;
              // CRITICAL: Break immediately to preserve turnResult - don't check other conditions
              break;
            }
            
            // Then check if we already requested a final answer
            // If so, force completion immediately to prevent loops
            if (finalAnswerRequested) {
              // We already requested a final answer but model didn't respond - force completion
              logger.warn(`Final answer was requested but model didn't respond, forcing completion`);
              conversationComplete = true;
              // Skip all other checks - we've already given the AI a chance to respond
            } else {
              // Check if we had planning tool calls (which take longer)
              // If planning completed but model didn't respond, force completion after reasonable wait
              const hadPlanningCalls = turnToolCalls.some(tc => tc.function.name === 'planning');
              
              // Check if any tools failed this turn
              const hadToolFailures = turnToolCalls.some(tc => {
                const cached = this.toolResults.get(`${tc.function.name}:${JSON.stringify(tc.function.arguments)}`);
                return cached && cached.result && !cached.result.success;
              });
              
              // Update consecutiveTurnsWithOnlyToolCalls based on final check (only increment once!)
              // CRITICAL: Don't increment if we've already requested a final answer
              if (turnToolCalls.length > 0 && !finalAnswerRequested) {
                // No text content but had tool calls - increment counter
                consecutiveTurnsWithOnlyToolCalls++;
                logger.debug('Turn had tool calls but no text content after execution', {
                  turnCount,
                  consecutiveTurnsWithOnlyToolCalls,
                  hadToolFailures,
                  contentLength: assistantMessage.content?.length || 0
                });
              }
              
              // Check planning calls and other conditions
              // CRITICAL FIX: After planning tool results are added, continue the loop to give the model
              // a chance to process the planning results. Only force completion if we've already given
              // the model multiple chances (turnCount >= 3) or if planning failed.
              if (hadPlanningCalls) {
                const planningCalls = turnToolCalls.filter(tc => tc.function.name === 'planning');
                const planningFailed = planningCalls.some(tc => {
                  const cached = this.toolResults.get(`${tc.function.name}:${JSON.stringify(tc.function.arguments)}`);
                  return cached && cached.result && !cached.result.success;
                });
                
                if (planningFailed) {
                  // Planning failed - complete turn
                  logger.warn('Planning tool failed, completing turn', {
                    turnCount,
                    hadPlanningCalls,
                    contentLength: assistantMessage.content?.length || 0
                  });
                  conversationComplete = true;
                } else if (turnCount >= 3) {
                  // Planning succeeded but model hasn't responded after 3+ turns - force completion
                  logger.warn('Planning tool completed but model did not provide text response after multiple turns, forcing turn completion', {
                    turnCount,
                    hadPlanningCalls,
                    contentLength: assistantMessage.content?.length || 0,
                    toolCallsThisTurn: turnToolCalls.length
                  });
                  conversationComplete = true;
                } else {
                  // Planning succeeded - continue loop to let model process results
                  logger.debug('Planning tool completed successfully, continuing conversation to allow model to process results', {
                    turnCount,
                    hadPlanningCalls,
                    contentLength: assistantMessage.content?.length || 0
                  });
                  conversationComplete = false; // Continue loop
                }
              } else if (!hadPlanningCalls && maxToolCallsExceeded) {
                // Check if tool call limit was exceeded during this turn
                if (maxToolCallsRecoveryTurnUsed) {
                  logger.warn(`Maximum tool calls (${this.config.maxToolsPerRequest}) exceeded, ending conversation`);
                  this.safeTerminalCall('warn', `⚠️  Maximum tool calls limit reached. Ending conversation.`);
                  turnResult = { turnComplete: false, sessionShouldEnd: true, reason: 'max_tool_calls' };
                  conversationComplete = true;
                } else {
                  logger.warn(`Maximum tool calls (${this.config.maxToolsPerRequest}) exceeded, prompting for final answer`);
                  this.safeTerminalCall('warn', `⚠️  Maximum tool calls limit reached. Requesting final answer...`);

                  conversationHistory.push({
                    role: 'system',
                    content: `You have reached the maximum number of tool calls for this turn (${this.config.maxToolsPerRequest}). Do NOT make any more tool calls. Provide your final answer to the user in plain text only. If you have already applied fixes to the codebase, summarize what you changed. If not, briefly state what was done and what the user should do next. No JSON, no further tool calls.`
                  });
                  maxToolCallsRecoveryTurnUsed = true;
                  conversationComplete = false;
                }
              } else if (!hadPlanningCalls && !hadToolFailures && consecutiveTurnsWithOnlyToolCalls >= maxConsecutiveTurnsWithOnlyToolCalls) {
                // No text content AND too many consecutive tool-only turns (but not planning, and no failures)
                // Only trigger this if tools succeeded - if tools failed, let the model respond to the error
                logger.warn(`Too many consecutive turns with only tool calls (${consecutiveTurnsWithOnlyToolCalls}), forcing final answer`);
                this.safeTerminalCall('warn', `⚠️  Multiple tool calls completed. Requesting final answer...`);

                // Inject a strong system message forcing the AI to provide a text answer
                conversationHistory.push({
                  role: 'system',
                  content: `You have called ${totalToolCalls} tools across ${turnCount} turns and received all the results. You have all the information you need. You MUST now provide your final answer to the user's question in plain text. DO NOT make any more tool calls. DO NOT output JSON. Analyze the tool results you received and provide a clear, text-based answer to the user's original question. Start your response immediately with the answer - no preamble, no JSON, just the answer.`
                });

                // Mark that we've requested a final answer
                finalAnswerRequested = true;
                // Reset the counter
                consecutiveTurnsWithOnlyToolCalls = 0;

                // Continue one more turn to get the final answer
                conversationComplete = false;
              } else if (this.consecutiveSuccessfulDuplicates >= StreamingToolOrchestrator.MAX_SUCCESSFUL_DUPLICATES) {
              // Model didn't provide text (we already checked above) - inject system message
              logger.warn(`Too many consecutive successful duplicate calls (${this.consecutiveSuccessfulDuplicates}), prompting for answer`);
                this.safeTerminalCall('warn', `⚠️  Detected repeated successful duplicate tool calls. Prompting for final answer...`);

                // Block this tool signature from being called again
                this.blockedToolSignatures.add(this.lastToolSignature);
                logger.debug(`Blocked tool signature: ${this.lastToolSignature}`);

                // Inject a system message telling the LLM to provide an answer
                conversationHistory.push({
                  role: 'system',
                  content: `You have called the same tool "${this.lastToolSignature.split(':')[0]}" ${this.consecutiveSuccessfulDuplicates} times with the same parameters and received the same results. The tool has already provided all the information it can. You must now analyze the results you received and provide your final answer to the user. Do NOT call this tool again - you already have all the data you need.`
                });

                // Reset the counter
                this.consecutiveSuccessfulDuplicates = 0;
                this.lastToolSignature = '';

                // Continue one more turn to get the final answer
                conversationComplete = false;
              } else if (this.consecutiveDuplicates >= StreamingToolOrchestrator.MAX_CONSECUTIVE_DUPLICATES) {
              // Model didn't provide text (we already checked above) - inject system message
              logger.warn(`Too many consecutive duplicate calls (${this.consecutiveDuplicates}), prompting for answer`);
                this.safeTerminalCall('warn', `⚠️  Detected repeated duplicate tool calls. Prompting for final answer...`);

                // Inject a system message telling the LLM to provide an answer
                conversationHistory.push({
                  role: 'system',
                  content: 'You have attempted to call the same tools multiple times, but the operations have already been completed successfully. You have all the information needed to answer the user\'s question. Please provide your final answer now based on the tool results you already received. Do not make any more tool calls.'
                });

                // Reset the counter
                this.consecutiveDuplicates = 0;

                // Continue one more turn to get the final answer
                conversationComplete = false;
              } else {
                // Continue the conversation - AI will get a chance to see the tool results and respond
                logger.info('📝 Conversation will continue - AI will respond to tool results', {
                  toolCallsThisTurn: turnToolCalls.length,
                  turnCount,
                  totalToolCalls,
                  consecutiveTurnsWithOnlyToolCalls,
                  hasTextContent
                });
                
                // NOTE: The logic for determining conversationComplete is now handled above
                // in the else block where we check for text content before checking consecutive turns.
                // This ensures we complete immediately if model provided text, rather than
                // continuing unnecessarily.
              }
            }
          }
        }
        
        // Handle case where there were no tool calls in this turn
        if (turnToolCalls.length === 0) {
          // No tool calls in this turn - check if model responded with text
          const contentWithoutJson = assistantMessage.content
            ?.replace(/\{[^}]*"name"[^}]*"arguments"[^}]*\}/g, '')
            .trim();
          const hasTextContent = contentWithoutJson && contentWithoutJson.length > 20;
          
          // CRITICAL FIX: If we had tool calls in previous turns but model didn't respond in this turn,
          // force completion to prevent hanging. This handles the case where tools completed but
          // model doesn't provide a text response in the follow-up turn.
          if (turnCount >= 2 && !hasTextContent) {
            // Check if there were tool calls in previous turns
            const previousTurnHadToolCalls = conversationHistory.some(
              (msg: any) => msg.tool_calls && msg.tool_calls.length > 0
            );
            
            if (previousTurnHadToolCalls) {
              logger.warn('Model did not respond after tool execution (no tool calls, no text in follow-up turn), forcing turn completion', {
                turnCount,
                previousTurnHadToolCalls,
                hasTextContent,
                contentLength: assistantMessage.content?.length || 0,
                conversationHistoryLength: conversationHistory.length
              });
              // Add assistant message to conversation history even if empty
              if (assistantMessage.content || Object.keys(assistantMessage).length > 1) {
                conversationHistory.push(assistantMessage);
              }
              // Force turn completion - tool results were provided, model should have responded
              conversationComplete = true;
              break;
            }
          }
          
          // If model provided text content, add it to conversation history and complete turn
          // Re-check content here as well to catch any text that arrived after initial check
          const finalContentCheck = assistantMessage.content
            ?.replace(/\{[^}]*"name"[^}]*"arguments"[^}]*\}/g, '')
            .trim();
          const finalHasTextContent = finalContentCheck && finalContentCheck.length > 20;
          
          if (finalHasTextContent) {
            conversationHistory.push(assistantMessage);
            conversationComplete = true;
          } else if (assistantMessage.content && assistantMessage.content.trim().length > 0) {
            // Even if content is short, add it and complete
            conversationHistory.push(assistantMessage);
            conversationComplete = true;
          } else {
            // No content at all - check if we had previous tool calls
            // If so, we should complete anyway (tool results were provided)
            const hadPreviousToolCalls = conversationHistory.some(
              (msg: any) => msg.tool_calls && msg.tool_calls.length > 0
            );
            if (hadPreviousToolCalls || turnCount >= 2) {
              // Had tool calls or multiple turns - complete to prevent hanging
              logger.debug('Completing turn with no text content (had tool calls or multiple turns)', {
                turnCount,
                hadPreviousToolCalls,
                contentLength: assistantMessage.content?.length || 0
              });
              // Add empty message to maintain conversation structure
              if (Object.keys(assistantMessage).length > 1 || assistantMessage.content) {
                conversationHistory.push(assistantMessage);
              }
              conversationComplete = true;
            } else {
              // First turn with no content - this shouldn't happen, but complete anyway
              conversationHistory.push(assistantMessage);
              conversationComplete = true;
              
              // Check if we got an empty or meaningless response on first turn
              const hasContent = assistantMessage.content && assistantMessage.content.trim().length > 0;
              if (!hasContent && turnCount === 1) {
                // Model gave no response on first turn - likely confused or unable to help
                logger.warn('Model provided no response and no tool calls', {
                  content: assistantMessage.content
                });
                this.safeTerminalCall('warn',
                  '\nThe AI model did not provide a response. This may happen with complex or unclear requests.\n' +
                  'Try:\n' +
                  '  • Breaking down the request into smaller, specific tasks\n' +
                  '  • Asking about one thing at a time\n' +
                  '  • Rephrasing the question more specifically\n'
                );
              }
            }
          }
          
          // Check if tool call limit was exceeded (even though no tool calls were added)
          if (maxToolCallsExceeded) {
            if (maxToolCallsRecoveryTurnUsed) {
              logger.warn(`Maximum tool calls (${this.config.maxToolsPerRequest}) exceeded, ending conversation`);
              this.safeTerminalCall('warn', `⚠️  Maximum tool calls limit reached. Ending conversation.`);
              turnResult = { turnComplete: false, sessionShouldEnd: true, reason: 'max_tool_calls' };
              conversationComplete = true;
            } else {
              logger.warn(`Maximum tool calls (${this.config.maxToolsPerRequest}) exceeded, prompting for final answer`);
              this.safeTerminalCall('warn', `⚠️  Maximum tool calls limit reached. Requesting final answer...`);

              conversationHistory.push({
                role: 'system',
                content: `You have reached the maximum number of tool calls for this turn (${this.config.maxToolsPerRequest}). Do NOT make any more tool calls. Provide your final answer to the user in plain text only. If you have already applied fixes to the codebase, summarize what you changed. If not, briefly state what was done and what the user should do next. No JSON, no further tool calls.`
              });
              maxToolCallsRecoveryTurnUsed = true;
              conversationComplete = false;
            }
          } else {
            // No tool calls means conversation is complete (turn complete; session continues)
            conversationComplete = true;
          }

          // Check if we got an empty or meaningless response
          const hasContent = assistantMessage.content && assistantMessage.content.trim().length > 0;
          const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
          
          // CRITICAL: In E2E mode, always log when model doesn't make tool calls (regardless of query type)
          if (e2eMode && turnToolCalls.length === 0 && tools.length > 0) {
            const lastUserMessage = conversationHistory
              .slice()
              .reverse()
              .find(m => m.role === 'user');
            const userQuery = lastUserMessage?.content || 'unknown';
            const contentPreview = (assistantMessage.content || '').substring(0, 200);
            
            // Always log in E2E mode to help diagnose test failures
            // Use both safeTerminalCall and console.error to ensure output is captured
            const debugMsg = `\n[DEBUG E2E] Model did not make tool calls\n` +
              `[DEBUG E2E] User query: "${userQuery.substring(0, 100)}"\n` +
              `[DEBUG E2E] Tools available: ${tools.length}\n` +
              `[DEBUG E2E] Model response length: ${assistantMessage.content?.length || 0}\n` +
              (assistantMessage.content && assistantMessage.content.trim().length > 0
                ? `[DEBUG E2E] Model response content: "${contentPreview}${assistantMessage.content.length > 200 ? '...' : ''}"\n`
                : `[DEBUG E2E] Model response content: (empty or whitespace only)\n`);
            
            this.safeTerminalCall('warn', debugMsg);
            console.error(debugMsg); // Backup to ensure it's captured
          }
          
          if (!hasContent && turnToolCalls.length === 0) {
            // Model gave no response and no tool calls - this is a problem
            logger.warn('Model provided no response and no tool calls', {
              content: assistantMessage.content,
              contentLength: assistantMessage.content?.length || 0,
              toolCallsThisTurn: turnToolCalls.length,
              toolsAvailable: tools.length
            });
            
            // In E2E mode, always show this warning to help diagnose test failures
            const warningMsg = e2eMode 
              ? `\n⚠️  Model provided no response and no tool calls (tools were available: ${tools.length}). This may indicate the model is not following instructions.\n`
              : '\nThe AI model did not provide a response. This may happen with complex or unclear requests.\n' +
                'Try:\n' +
                '  • Breaking down the request into smaller, specific tasks\n' +
                '  • Asking about one thing at a time\n' +
                '  • Rephrasing the question more specifically';
            this.safeTerminalCall('warn', warningMsg);
          }
        }
      }

      if (turnCount >= maxTurns) {
        logger.warn('Conversation reached maximum turn limit');
        this.safeTerminalCall('warn', 'Reached maximum conversation turns');
        turnResult = { turnComplete: false, sessionShouldEnd: true, reason: 'max_turns' };
      }

      logger.info('🏁 Streaming tool execution completed', {
        totalToolCalls,
        resultsCount: this.toolResults.size,
        turns: turnCount,
        conversationComplete,
        reason: turnCount >= maxTurns ? 'max_turns' : conversationComplete ? 'completed_naturally' : 'unknown'
      });

      // CRITICAL FIX: Ensure output ends with newline before returning
      // This fixes the issue where prompt doesn't appear after command output
      // because the cursor is left in the middle of a line
      // In E2E mode (pipes), isTTY is false, but we still need to write the newline
      const e2eMode = process.env.OLLAMA_CODE_E2E_TEST === 'true';
      if (typeof process.stdout.write === 'function') {
        try {
          // Always add a newline to ensure prompt appears correctly (both TTY and E2E mode)
          process.stdout.write('\n');
        } catch (e) {
          // Ignore errors - write may fail in some environments
        }
      }

      // CRITICAL FIX: Flush stdout/stderr before returning to ensure all output is written
      // This is especially important for E2E tests that need to detect the ready prompt
      if (typeof process.stdout.write === 'function') {
        // Force flush by writing empty string (if supported)
        try {
          process.stdout.write('');
        } catch (e) {
          // Ignore errors - flush may not be supported in all environments
        }
      }
      if (typeof process.stderr.write === 'function') {
        try {
          process.stderr.write('');
        } catch (e) {
          // Ignore errors
        }
      }

      return turnResult;
    } catch (error) {
      const normalizedError = normalizeError(error);
      logger.error('executeWithStreamingAndHistory failed', normalizedError);
      this.safeTerminalCall('error', `Failed to execute: ${normalizedError.message}`);
      throw error;
    }
  }

  /**
   * Execute a user prompt with streaming tool calling
   * Implements multi-turn conversation to handle tool results
   */
  async executeWithStreaming(
    userPrompt: string,
    context: ToolExecutionContext,
    options?: {
      specificTools?: string[];
      categories?: string[];
      model?: string;
    }
  ): Promise<void> {
    if (!this.config.enableToolCalling) {
      // Fallback to regular streaming without tools
      this.safeTerminalCall('warn', 'Tool calling is disabled');
      return;
    }

    // Get available tools
    let tools: OllamaTool[];

    if (options?.specificTools) {
      tools = OllamaToolAdapter.getSpecificTools(
        this.toolRegistry,
        options.specificTools
      );
    } else if (options?.categories) {
      tools = [];
      for (const category of options.categories) {
        tools.push(...OllamaToolAdapter.getToolsByCategory(this.toolRegistry, category));
      }
    } else {
      // Get all available tools
      tools = OllamaToolAdapter.getAllTools(this.toolRegistry);
    }

    logger.info('Starting streaming tool execution', {
      prompt: truncateForLog(userPrompt),
      toolCount: tools.length,
      model: options?.model
    });

    // Reset tool results
    this.toolResults.clear();

    try {
      // Import the tool-calling system prompt
      const { generateToolCallingSystemPrompt, enhanceSystemPromptWithPlanning } = await import('../ai/prompts.js');
      let systemPrompt = generateToolCallingSystemPrompt();
      
      // Enhance prompt with planning suggestions if the request is complex
      // Use the userPrompt directly since this method receives it as a parameter
      if (userPrompt) {
        systemPrompt = enhanceSystemPromptWithPlanning(systemPrompt, userPrompt);
      }

      // Debug logging
      logger.debug('System prompt being sent:', {
        promptLength: systemPrompt.length,
        preview: truncateForLog(systemPrompt)
      });
      logger.debug('Tools being sent:', {
        toolNames: tools.map(t => t.function.name),
        toolCount: tools.length
      });

      // Initialize conversation with few-shot examples and user message
      const messages: any[] = [
        // Few-shot example 1: Demonstrate CORRECT file creation with filesystem tool
        {
          role: 'user',
          content: 'Create a file called hello.txt with content "Hello World"'
        },
        {
          role: 'assistant',
          content: '',
          tool_calls: [{
            function: {
              name: 'filesystem',
              arguments: {
                operation: 'write',
                path: 'hello.txt',
                content: 'Hello World'
              }
            }
          }]
        },
        {
          role: 'tool',
          content: 'Tool execution successful. The write operation completed successfully. File: hello.txt, Size: 11 bytes.'
        },
        {
          role: 'assistant',
          content: 'I created hello.txt with the content "Hello World".'
        },
        // Few-shot example 2: Demonstrate creating a code file (CORRECT way)
        {
          role: 'user',
          content: 'Create a server.js file with Express code'
        },
        {
          role: 'assistant',
          content: '',
          tool_calls: [{
            function: {
              name: 'filesystem',
              arguments: {
                operation: 'write',
                path: 'server.js',
                content: 'const express = require("express");\nconst app = express();\nconst port = 3000;\n\napp.listen(port, () => console.log(`Server running on port ${port}`));'
              }
            }
          }]
        },
        {
          role: 'tool',
          content: 'Tool execution successful. The write operation completed successfully. File: server.js, Size: 150 bytes.'
        },
        {
          role: 'assistant',
          content: 'I created server.js with the Express server code.'
        },
        // Now the actual user request
        { role: 'user', content: userPrompt }
      ];

      // Multi-turn conversation loop for tool calling
      let conversationComplete = false;
      let toolCallCount = 0;
      const maxTurns = STREAMING_CONSTANTS.MAX_CONVERSATION_TURNS;
      let turnCount = 0;
      let consecutiveFailures = 0; // Track consecutive tool failures
      const maxConsecutiveFailures = 3; // Stop if too many failures in a row

      while (!conversationComplete && turnCount < maxTurns) {
        turnCount++;
        logger.debug(`Conversation turn ${turnCount}`);

        // Collect tool calls and content from this turn
        const turnToolCalls: OllamaToolCall[] = [];
        let assistantMessage: any = { role: 'assistant', content: '' };

        // Make API request (system prompt in options, not messages)
        await this.ollamaClient.completeStreamWithTools(
          messages,
          tools,
          {
            model: options?.model,
            system: systemPrompt
          },
          {
            onContent: (chunk: string) => {
              // Detect if this chunk is part of a JSON tool call
              // Only show JSON if LOG_LEVEL=debug or LOG_LEVEL=0
              const debugMode = isDebugMode();
              const looksLikeJson = chunk.trim().match(/^[{\s]*"?(name|arguments)"?[\s:]/);

              // Hide JSON tool calls in normal mode - they'll be shown as formatted tool execution
              if (!debugMode && looksLikeJson) {
                assistantMessage.content += chunk;
                return;
              }

              // Stream AI response to terminal
              this.safeTerminalWrite(chunk);
              assistantMessage.content += chunk;
            },

            onToolCall: async (toolCall: OllamaToolCall) => {
              // Check tool call limit
              toolCallCount++;
              if (toolCallCount > this.config.maxToolsPerRequest) {
                const errorMsg = `Exceeded maximum tool calls (${this.config.maxToolsPerRequest})`;
                this.safeTerminalCall('error', errorMsg);
                throw new Error(errorMsg);
              }

              // Generate a consistent ID for this tool call
              if (!toolCall.id) {
                toolCall.id = `${toolCall.function.name}-${Date.now()}-${toolCallCount}`;
              }

              // Store tool call for this turn
              turnToolCalls.push(toolCall);

              // Execute the tool
              const result = await this.executeToolCall(toolCall, context);
              return result;
            },

            onComplete: () => {
              logger.info('✅ Stream completed for turn', {
                turnCount,
                toolCallsThisTurn: turnToolCalls.length,
                assistantContentLength: assistantMessage.content?.length || 0,
                hasContent: !!assistantMessage.content?.trim()
              });
            },

            onError: (error: Error) => {
              logger.error('Streaming tool execution error', error);
              this.safeTerminalCall('error', `Error: ${error.message}`);
            }
          }
        );

        // If there were tool calls, add assistant message and tool results to conversation
        if (turnToolCalls.length > 0) {
          // Add assistant's message with tool calls
          assistantMessage.tool_calls = turnToolCalls;
          // NOTE: Keep the text content - Anthropic needs both text and tool_use in content blocks
          // The adapter will properly format this as content blocks when sending to Anthropic
          messages.push(assistantMessage);

          // Add tool results as separate messages
          for (const toolCall of turnToolCalls) {
            const callId = toolCall.id || `${toolCall.function.name}-${Date.now()}`;
            const cached = this.toolResults.get(callId);
            const result = cached?.result;

            // Format result in a clear, readable way for the model
            let resultContent: string;
            if (result && result.success) {
              // Success case - provide clear, unambiguous confirmation
              const toolName = toolCall.function.name;

              // Clear failure count on success
              const failureKey = `${toolName}:${JSON.stringify(toolCall.function.arguments)}`;
              this.failedToolCalls.delete(failureKey);

              // Reset duplicate counter on successful tool execution
              this.consecutiveDuplicates = 0;

              // Track consecutive successful duplicates
              const toolSignature = `${toolName}:${JSON.stringify(toolCall.function.arguments)}`;
              if (toolSignature === this.lastToolSignature) {
                this.consecutiveSuccessfulDuplicates++;
              } else {
                this.consecutiveSuccessfulDuplicates = 1;
                this.lastToolSignature = toolSignature;
              }

              if (toolName === 'filesystem') {
                const operation = (toolCall.function.arguments as any)?.operation || 'operation';
                const filePath = (toolCall.function.arguments as any)?.path || '';

                if (operation === 'list' && Array.isArray(result.data)) {
                  // Format list operation results in a readable way
                  const items = result.data;
                  const dirs = items.filter((item: any) => item.isDirectory);
                  const files = items.filter((item: any) => item.isFile);

                  const summary = `Found ${items.length} items (${dirs.length} directories, ${files.length} files)`;

                  // Show first 20 items to avoid overwhelming output
                  const displayItems = items.slice(0, 20);
                  const itemList = displayItems.map((item: any) =>
                    `  ${item.isDirectory ? '📁' : '📄'} ${item.name}${item.size ? ` (${item.size} bytes)` : ''}`
                  ).join('\n');

                  const moreItems = items.length > 20 ? `\n  ... and ${items.length - 20} more items` : '';

                  resultContent = `Tool execution successful. Directory listing completed.\n${summary}\n${itemList}${moreItems}`;
                } else if (operation === 'write' && result.data && result.data.path) {
                  // File write operation - be EXTREMELY explicit about success
                  resultContent = `✅ SUCCESS: File "${filePath}" has been CREATED and now EXISTS on disk. Size: ${result.data.size} bytes. The file write operation completed successfully. You do NOT need to create this file again - it already exists.`;
                } else if (operation === 'exists') {
                  // Exists check - be clear about the result
                  const exists = result.data === true || result.data?.exists === true;
                  resultContent = exists
                    ? `✅ CONFIRMED: File or directory "${filePath}" EXISTS.`
                    : `❌ File or directory "${filePath}" does NOT exist.`;
                } else if (result.data && result.data.path) {
                  // Other filesystem operations with path
                  resultContent = `Tool execution successful. The ${operation} operation completed successfully. File: ${result.data.path}, Size: ${result.data.size} bytes.`;
                } else if (result.data) {
                  resultContent = `Tool execution successful. Result: ${JSON.stringify(result.data)}`;
                } else {
                  resultContent = 'Tool execution successful. Operation completed.';
                }
              } else if (toolName === 'advanced-code-analysis' && result.data) {
                // Format code analysis results in a readable way
                const analysisData = result.data;

                if (analysisData.riskLevel !== undefined) {
                  // Security analysis result
                  const vulnCount = analysisData.vulnerabilities?.length || 0;
                  const riskEmoji = analysisData.riskLevel === 'Low' ? '🟢' : analysisData.riskLevel === 'Medium' ? '🟡' : '🔴';

                  let report = `✅ Security analysis completed.\n${riskEmoji} Risk Level: ${analysisData.riskLevel}\n`;
                  report += `📊 Checks: ${analysisData.checksPassed}/${analysisData.totalChecks} passed\n`;

                  if (vulnCount > 0) {
                    report += `\n⚠️ Found ${vulnCount} security issue(s):\n`;
                    const displayVulns = analysisData.vulnerabilities.slice(0, 5);
                    displayVulns.forEach((vuln: any, idx: number) => {
                      report += `  ${idx + 1}. ${vuln.type || 'Security Issue'} in ${vuln.file}:${vuln.line}\n`;
                      if (vuln.code) report += `     Code: ${vuln.code}\n`;
                      if (vuln.recommendation) report += `     Fix: ${vuln.recommendation}\n`;
                    });
                    if (vulnCount > 5) report += `  ... and ${vulnCount - 5} more\n`;
                  } else {
                    report += '\n✅ No security vulnerabilities detected.\n';
                  }

                  if (analysisData.recommendations && analysisData.recommendations.length > 0) {
                    report += `\n💡 Recommendations:\n`;
                    analysisData.recommendations.slice(0, 5).forEach((rec: string) => {
                      report += `  • ${rec}\n`;
                    });
                  }

                  resultContent = report;

                  // Softer instruction: allow follow-up filesystem writes when user asked to fix/apply
                  resultContent += `\n\nSummarize the findings for the user. If the user asked you to fix or apply these issues, use the filesystem tool with operation='write' to apply the changes to the relevant files, then summarize what you changed.`;
                } else {
                  // Other analysis types - use generic formatting
                  resultContent = `Tool execution successful. Analysis completed.\nResult: ${JSON.stringify(analysisData).slice(0, 500)}...`;
                }
              } else if (toolName === 'search' && result.data) {
                // Format search results in a readable way
                const searchData = result.data;
                const matchCount = searchData.totalMatches || 0;
                const filesSearched = searchData.filesSearched || 0;

                if (matchCount === 0) {
                  resultContent = `Tool execution successful. Search completed. No matches found for "${searchData.query}". Searched ${filesSearched} files.`;
                } else {
                  const matches = searchData.matches || [];
                  const displayMatches = matches.slice(0, 10); // Show first 10 matches

                  const matchList = displayMatches.map((match: any) => {
                    if (match.line === 0) {
                      // Filename match
                      return `  📄 ${match.file}`;
                    } else {
                      // Content match
                      return `  📄 ${match.file}:${match.line}:${match.column}\n     ${match.content.trim()}`;
                    }
                  }).join('\n');

                  const moreMatches = matchCount > 10 ? `\n  ... and ${matchCount - 10} more matches` : '';
                  resultContent = `Tool execution successful. Search completed.\nFound ${matchCount} matches in ${filesSearched} files for "${searchData.query}"\n${matchList}${moreMatches}`;
                }
              } else if (result.data) {
                resultContent = `Tool execution successful. Result: ${JSON.stringify(result.data)}`;
              } else {
                resultContent = 'Tool execution successful. Operation completed.';
              }
            } else if (result && result.error) {
              // Error case - provide clear error message with recovery suggestion
              const toolName = toolCall.function.name;

              // Check if this is a duplicate call error
              const isDuplicate = result.error.includes('already attempted') || result.error.includes('same call made');

              if (isDuplicate) {
                // Increment duplicate counter
                this.consecutiveDuplicates++;
              } else {
                // Reset duplicate counter for non-duplicate errors
                this.consecutiveDuplicates = 0;
              }

              // Track repeated failures
              const failureKey = `${toolName}:${JSON.stringify(toolCall.function.arguments)}`;
              const failCount = (this.failedToolCalls.get(failureKey) || 0) + 1;
              this.failedToolCalls.set(failureKey, failCount);

              // Add specific recovery suggestions for common errors
              let recoverySuggestion = '';
              if (toolName === 'advanced-code-analysis' && result.error.includes('does not exist')) {
                recoverySuggestion = ' To create the file or directory first, call the filesystem tool with operation "write" (for files with content) or "create" (for directories).';
              }

              // Warn about repeated failures
              if (failCount >= StreamingToolOrchestrator.MAX_FAILURE_COUNT) {
                recoverySuggestion += ` WARNING: This same tool call has failed ${failCount} times. Try a different approach instead of retrying the same operation.`;
              }

              resultContent = `Tool execution failed. Error: ${result.error}${recoverySuggestion}`;
            } else {
              // Unknown case - log warning and return generic error
              logger.warn('Unexpected tool result format', {
                tool: toolCall.function.name,
                result,
                hasSuccess: result && 'success' in result
              });
              resultContent = result ? JSON.stringify(result) : 'Tool execution failed with unknown error';
            }

            const toolResultMessage = {
              role: 'tool',
              tool_call_id: toolCall.id,           // Tool call ID for proper tracking
              tool_name: toolCall.function.name,   // Ollama uses tool_name, not tool_call_id
              content: resultContent
            };

            messages.push(toolResultMessage);
            logger.debug('Added tool result to conversation', {
              toolName: toolCall.function.name,
              success: result?.success,
              resultPreview: truncateForLog(resultContent)
            });

            // DEBUG: Log the actual formatted content being sent to model
            if (isDebugMode()) {
              console.log('\n========== 🔍 FORMATTED TOOL RESULT BEING SENT TO MODEL ==========');
              console.log('Tool:', toolCall.function.name);
              console.log('Content Length:', resultContent.length);
              console.log('Content Preview (first 500 chars):');
              console.log(resultContent.substring(0, 500));
              console.log('\nFull Tool Result Message:');
              console.log(JSON.stringify(toolResultMessage, null, 2));
              console.log('===================================================================\n');
            }

            // Track consecutive failures
            if (result && !result.success) {
              consecutiveFailures++;

              // Check if this was a blocked call (orchestrator intervened)
              if (result.error && result.error.includes('This tool call has been blocked because it was called too many times')) {
                logger.warn('Blocked tool call error detected, forcing end of conversation');
                this.safeTerminalCall('warn', `⚠️  Tool call blocked by orchestrator. Ending conversation to prevent loops.`);
                conversationComplete = true;
              }
            } else if (result && result.success) {
              consecutiveFailures = 0; // Reset on success
            }
          }

          // Check for too many consecutive successful duplicates
          if (this.consecutiveSuccessfulDuplicates >= StreamingToolOrchestrator.MAX_SUCCESSFUL_DUPLICATES) {
            logger.warn(`Too many consecutive successful duplicate calls (${this.consecutiveSuccessfulDuplicates}), prompting for answer`);
            this.safeTerminalCall('warn', `⚠️  Detected repeated successful duplicate tool calls. Prompting for final answer...`);

            // Block this tool signature from being called again
            this.blockedToolSignatures.add(this.lastToolSignature);
            logger.debug(`Blocked tool signature: ${this.lastToolSignature}`);

            // Inject a system message telling the LLM to provide an answer
            messages.push({
              role: 'system',
              content: `You have called the same tool "${this.lastToolSignature.split(':')[0]}" ${this.consecutiveSuccessfulDuplicates} times with the same parameters and received the same results. The tool has already provided all the information it can. You must now analyze the results you received and provide your final answer to the user. Do NOT call this tool again - you already have all the data you need.`
            });

            // Reset the counter
            this.consecutiveSuccessfulDuplicates = 0;
            this.lastToolSignature = '';

            // Continue one more turn to get the final answer
            conversationComplete = false;
          } else if (this.consecutiveDuplicates >= StreamingToolOrchestrator.MAX_CONSECUTIVE_DUPLICATES) {
            logger.warn(`Too many consecutive duplicate calls (${this.consecutiveDuplicates}), prompting for answer`);
            this.safeTerminalCall('warn', `⚠️  Detected repeated duplicate tool calls. Prompting for final answer...`);

            // Block this tool signature from being called again
            if (this.lastAttemptedToolSignature) {
              this.blockedToolSignatures.add(this.lastAttemptedToolSignature);
              logger.debug(`Blocked failing tool signature: ${this.lastAttemptedToolSignature}`);
            }

            // Inject a system message telling the LLM to provide an answer
            messages.push({
              role: 'system',
              content: 'You have attempted to call the same tools multiple times, but the operations have already been completed successfully. You have all the information needed to answer the user\'s question. Please provide your final answer now based on the tool results you already received. Do not make any more tool calls.'
            });

            // Reset the counter
            this.consecutiveDuplicates = 0;

            // Continue one more turn to get the final answer
            conversationComplete = false;
          } else if (consecutiveFailures >= maxConsecutiveFailures) {
            logger.warn(`Too many consecutive tool failures (${consecutiveFailures}), ending conversation`);
            this.safeTerminalCall('warn', `⚠️  Multiple consecutive tool failures detected. Ending conversation to prevent loops.`);
            conversationComplete = true;
          } else {
            // Continue the conversation with tool results
            conversationComplete = false;
          }
        } else {
          // No tool calls means conversation is complete
          conversationComplete = true;
          logger.info('Streaming tool execution completed', {
            toolCallCount,
            resultsCount: this.toolResults.size,
            turns: turnCount
          });
        }
      }

      if (turnCount >= maxTurns) {
        logger.warn('Conversation reached maximum turn limit');
        this.safeTerminalCall('warn', 'Reached maximum conversation turns');
      }

    } catch (error) {
      const normalizedError = normalizeError(error);
      logger.error('executeWithStreaming failed', normalizedError);
      this.safeTerminalCall('error', `Failed to execute: ${normalizedError.message}`);
      throw error;
    }
  }

  /**
   * Execute a single tool call
   */
  private async executeToolCall(
    toolCall: OllamaToolCall,
    context: ToolExecutionContext
  ): Promise<any> {
    const toolName = toolCall.function.name;
    // Compute call ID early so we can store results before any early returns
    const callId = toolCall.id || `${toolName}-${Date.now()}`;
    const tool = this.toolRegistry.get(toolName);

    if (!tool) {
      const availableTools = this.toolRegistry.list().map(t => t.name);

      // Find similar tool names (simple string matching)
      const similar = availableTools.filter(name =>
        name.includes(toolName) || toolName.includes(name) ||
        this.levenshteinDistance(name, toolName) <= 3
      );

      let errorMsg = `Tool "${toolName}" does not exist. Available tools: ${availableTools.join(', ')}`;
      if (similar.length > 0) {
        errorMsg += `. Did you mean: ${similar.join(', ')}?`;
      }
      errorMsg += `. Please use one of the available tools only.`;

      this.safeTerminalCall('error', `✗ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Parse arguments first (needed for approval prompt and deduplication)
    let parameters: Record<string, any> = {};
    try {
      // Handle both string and object arguments
      if (typeof toolCall.function.arguments === 'string') {
        const parsed = safeParse<Record<string, any>>(toolCall.function.arguments, {});
        parameters = parsed || {};
      } else if (typeof toolCall.function.arguments === 'object') {
        parameters = toolCall.function.arguments;
      }

      logger.debug('Parsed tool parameters:', {
        toolName,
        parameters
      });
    } catch (parseError) {
      logger.error('Failed to parse tool arguments', {
        toolName,
        arguments: toolCall.function.arguments,
        error: parseError
      });

      // Return error instead of continuing with empty parameters
      this.safeTerminalCall('error', `Failed to parse arguments for ${toolName}`);
      const parseErrorResult = {
        success: false,
        error: `Failed to parse tool arguments: ${parseError}`
      };
      this.addToolResult(callId, parseErrorResult);
      return parseErrorResult;
    }

    // Check for duplicate tool calls with smarter logic
    const callSignature = `${toolName}:${JSON.stringify(parameters)}`;
    this.lastAttemptedToolSignature = callSignature;

    // Check if this tool signature has been blocked due to excessive duplicates
    if (this.blockedToolSignatures.has(callSignature)) {
      this.safeTerminalCall('warn', `⚠️  Blocking repeated tool call: ${toolName} has been called too many times with these parameters`);
      logger.warn('Blocked tool call due to excessive duplicates', { toolName, parameters });
      const blockErrorResult = {
        success: false,
        error: `This tool call has been blocked because it was called too many times with the same parameters. The tool has already provided all the information it can. Please analyze the previous results instead of calling this tool again.`
      };
      // Store the blocked result so it can be retrieved later
      this.addToolResult(callId, blockErrorResult);
      return blockErrorResult;
    }

    const now = Date.now();
    const lastCall = this.recentToolCalls.get(callSignature);

    if (lastCall) {
      const timeSinceLastCall = now - lastCall.timestamp;
      const timeSinceLastCallSec = Math.round(timeSinceLastCall / 1000);

      // Block rapid duplicates (within 3 seconds) regardless of success
      if (timeSinceLastCall < StreamingToolOrchestrator.RAPID_DUPLICATE_TTL) {
        this.safeTerminalCall('warn', `⚠️  Skipping rapid duplicate: ${toolName} (same call made ${timeSinceLastCallSec}s ago)`);
        logger.warn('Rapid duplicate tool call detected', { toolName, parameters, timeSinceLastCallSec });
        const rapidDuplicateResult = {
          success: false,
          error: `This exact tool call was just attempted ${timeSinceLastCallSec} seconds ago. Please wait before retrying.`
        };
        // Store the result so it can be retrieved later
        this.addToolResult(callId, rapidDuplicateResult);
        return rapidDuplicateResult;
      }

      // Block failed call retries within 30 seconds
      if (!lastCall.success && timeSinceLastCall < StreamingToolOrchestrator.FAILED_CALL_TTL) {
        this.safeTerminalCall('warn', `⚠️  Skipping failed call retry: ${toolName} (failed ${timeSinceLastCallSec}s ago)`);
        logger.warn('Duplicate failed tool call detected', { toolName, parameters, timeSinceLastCallSec });
        const failedRetryResult = {
          success: false,
          error: `This tool call failed ${timeSinceLastCallSec} seconds ago. Try a different approach with different parameters instead of retrying the same operation.`
        };
        // Store the result so it can be retrieved later
        this.addToolResult(callId, failedRetryResult);
        return failedRetryResult;
      }

      // If last call succeeded and enough time passed (>3s), allow retry
      // This enables legitimate follow-up searches or verification
    }

    // Temporarily record this call (will be updated with success status after execution)
    this.recentToolCalls.set(callSignature, { timestamp: now, success: false });

    // Cleanup old entries
    for (const [sig, call] of this.recentToolCalls.entries()) {
      const age = now - call.timestamp;
      const ttl = call.success ? StreamingToolOrchestrator.RAPID_DUPLICATE_TTL : StreamingToolOrchestrator.FAILED_CALL_TTL;
      if (age > ttl) {
        this.recentToolCalls.delete(sig);
      }
    }

    // Check if approval is required
    if (this.requiresApproval(tool.metadata.category)) {
      // Check approval cache first
      const cachedApproval = this.approvalCache.isApproved(toolName, tool.metadata.category);

      if (cachedApproval === false) {
        this.safeTerminalCall('info', `  Skipping ${toolName} - previously denied`);
        const skipResult = { success: false, error: 'Tool execution skipped - previously denied by user', approved: false, skipped: true };
        this.addToolResult(callId, skipResult);
        return skipResult;
      }

      if (cachedApproval !== true) {
        // Not cached, need to prompt user
        if (this.config.skipUnapprovedTools) {
          this.safeTerminalCall('info', `  Skipping ${toolName} - approval required but auto-skip enabled`);
          const skipResult = { success: false, error: 'Tool execution skipped - approval required but auto-skip enabled', approved: false, skipped: true };
          this.addToolResult(callId, skipResult);
          return skipResult;
        }

        // Prompt for approval with timeout to prevent hanging
        try {
          const approvalTimeout = TOOL_ORCHESTRATION_DEFAULTS.APPROVAL_PROMPT_TIMEOUT;
          let timeoutId: NodeJS.Timeout | undefined;

          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error(`Approval prompt timed out after ${approvalTimeout / 1000} seconds`));
            }, approvalTimeout);
          });

          const approvalPromise = promptForApproval({
            toolName,
            category: tool.metadata.category,
            description: tool.metadata.description,
            parameters,
            defaultResponse: 'no'
          });

          let result;
          try {
            result = await Promise.race([approvalPromise, timeoutPromise]);

            // Clear timeout after successful approval
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          } finally {
            // Ensure timeout is always cleared
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }

          // Cache the decision
          this.approvalCache.setApproval(toolName, tool.metadata.category, result.approved);

          if (!result.approved) {
            this.safeTerminalCall('info', `  User denied execution of ${toolName}`);
            const denyResult = { success: false, error: 'Tool execution denied by user', approved: false, skipped: true };
            this.addToolResult(callId, denyResult);
            return denyResult;
          }

          this.safeTerminalCall('success', `  User approved execution of ${toolName}`);
        } catch (promptError) {
          const errorMsg = promptError instanceof Error ? promptError.message : String(promptError);
          logger.error('Approval prompt failed', promptError);
          this.safeTerminalCall('error', `  Failed to get approval for ${toolName}: ${errorMsg}`);
          const errorResult = { success: false, error: `Failed to get approval: ${errorMsg}`, approved: false, skipped: true };
          this.addToolResult(callId, errorResult);
          return errorResult;
        }
      } else {
        this.safeTerminalCall('info', `  Using cached approval for ${toolName}`);
      }
    }

    // Plan approval: block execute unless plan was approved (when requirePlanApproval)
    if (
      toolName === 'planning' &&
      parameters.operation === 'execute' &&
      this.config.requirePlanApproval
    ) {
      const planId = parameters.planId as string | undefined;
      if (planId && !this.approvedPlanIds.has(planId)) {
        const errorResult = {
          success: false,
          error: 'Plan was not approved. Create a plan and approve it when prompted before executing.',
          metadata: { executionTime: 0 },
        };
        this.addToolResult(callId, errorResult);
        this.safeTerminalCall('warn', '✗ Plan execution skipped (plan not approved).');
        return errorResult;
      }
      // Clear after use so same plan cannot be executed again without re-approval
      if (planId) this.approvedPlanIds.delete(planId);
    }

    // Show execution start - format differently for debug vs normal mode
    const debugMode = isDebugMode();
    if (debugMode) {
      // Debug mode: show tool name and parameters
      this.safeTerminalCall('info', `🔧 Tool Call: ${toolName}`);
      this.safeTerminalCall('info', JSON.stringify(parameters, null, 2));
      this.safeTerminalCall('info', `🔧 Executing: ${toolName}`);
    } else {
      // Normal mode: show clean, readable execution message
      if (toolName === 'execution' && parameters.command) {
        this.safeTerminalCall('info', `🔧 Running: ${parameters.command}`);
      } else if (toolName === 'filesystem' && parameters.operation && parameters.path) {
        const operation = parameters.operation;
        const path = parameters.path;
        if (operation === 'write') {
          this.safeTerminalCall('info', `🔧 Creating file: ${path}`);
        } else if (operation === 'read') {
          this.safeTerminalCall('info', `🔧 Reading file: ${path}`);
        } else if (operation === 'create') {
          this.safeTerminalCall('info', `🔧 Creating directory: ${path}`);
        } else {
          this.safeTerminalCall('info', `🔧 ${operation}: ${path}`);
        }
      } else {
        this.safeTerminalCall('info', `🔧 Executing: ${toolName}`);
      }
    }

    try {
      // Validate parameters
      if (!tool.validateParameters(parameters)) {
        throw new Error(`Invalid parameters for tool: ${toolName}`);
      }

      // Execute with timeout and measure execution time
      const startTime = Date.now();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Tool execution timeout (${this.config.toolTimeout}ms)`)),
          this.config.toolTimeout
        )
      );

      let result: ToolResult = await Promise.race([
        tool.execute(parameters, context),
        timeoutPromise
      ]);

      // Interactive plan approval: after planning "create" succeeds, optionally prompt
      if (
        toolName === 'planning' &&
        parameters.operation === 'create' &&
        result.success &&
        result.data &&
        this.config.requirePlanApproval
      ) {
        const planId = result.data.planId as string | undefined;
        if (planId && shouldPromptForPlanApproval({ requirePlanApproval: true, nonInteractive: false })) {
          const planLike = {
            id: planId,
            title: result.data.title,
            description: result.data.description,
            tasks: result.data.tasks ?? [],
            dependencies: new Map((result.data.dependencies as [string, string[]][]) ?? []),
            estimatedDuration: result.data.estimatedDuration ?? 0,
            status: result.data.status ?? 'planning',
            progress: result.data.progress ?? { completed: 0, total: 0, percentage: 0 },
            created: new Date(),
            metadata: result.data.metadata ?? { complexity: 'simple', confidence: 0, adaptations: 0 },
            riskLevel: result.data.riskLevel ?? 'low',
          };
          const approved = await requestPlanApproval({
            plan: planLike as import('../ai/task-planner.js').TaskPlan,
            terminal: this.terminal,
          });
          if (!approved) {
            result = {
              success: true,
              data: {
                ...result.data,
                executionDeclined: true,
                message: 'Plan created. User declined execution. Say "execute" with this planId when ready, or ask to modify the plan.',
              },
              metadata: result.metadata,
            };
          } else {
            this.approvedPlanIds.add(planId);
          }
        }
      }

      const executionTime = Math.round((Date.now() - startTime) / 1000);

      // Store result with bounds checking (callId computed earlier in function)
      this.addToolResult(callId, result);

      // Update duplicate detection record with actual success status
      const callRecord = this.recentToolCalls.get(callSignature);
      if (callRecord) {
        callRecord.success = result.success;
      }

      // Show result with execution time
      if (result.success) {
        if (debugMode) {
          this.safeTerminalCall('success', `✓ ${toolName} completed`);
        } else {
          // Show execution time for long-running commands
          const slowThresholdSeconds = TOOL_MONITORING.SLOW_TOOL_THRESHOLD / 1000;

          // Special handling for filesystem write - show file details
          if (toolName === 'filesystem' && parameters.operation === 'write' && result.data && result.data.path) {
            const sizeKB = (result.data.size / 1024).toFixed(2);
            this.safeTerminalCall('success', `✅ File created: ${result.data.path} (${sizeKB} KB)`);
          } else if (executionTime > slowThresholdSeconds) {
            this.safeTerminalCall('success', `✓ completed (${executionTime}s)`);
          } else {
            this.safeTerminalCall('success', `✓ completed`);
          }
        }

        // Show command output if tool has displayOutput flag
        if (tool.metadata.displayOutput && result.data) {
          if (result.data.stdout) {
            this.safeTerminalCall('info', `\n${result.data.stdout}`);
          }
          if (result.data.stderr) {
            this.safeTerminalCall('warn', `stderr: ${result.data.stderr}`);
          }
        }

        if (result.metadata?.warnings && result.metadata.warnings.length > 0) {
          for (const warning of result.metadata.warnings) {
            this.safeTerminalCall('warn', `  ⚠️  ${warning}`);
          }
        }
      } else {
        this.safeTerminalCall('error', `✗ ${toolName} failed: ${result.error}`);
      }

      return result;

    } catch (error) {
      const normalizedError = normalizeError(error);
      logger.error(`Tool execution failed: ${toolName}`, normalizedError);
      this.safeTerminalCall('error', `✗ ${toolName} failed: ${normalizedError.message}`);

      const failureResult: ToolResult = {
        success: false,
        error: normalizedError.message
      };

      // Store the failure result (callId computed earlier in function)
      this.addToolResult(callId, failureResult);

      // Update duplicate detection record to mark as failed
      // Note: callSignature might not exist if error happened early
      try {
        const callRecord = this.recentToolCalls.get(callSignature);
        if (callRecord) {
          callRecord.success = false;
        }
      } catch (e) {
        // Ignore - callSignature may not be defined if error happened early
      }

      return failureResult;
    }
  }

  /**
   * Add tool result with bounds checking to prevent memory leaks
   */
  /**
   * Clean up old tool results based on TTL
   */
  private cleanupOldResults(): void {
    const now = Date.now();
    const ttl = CODE_ANALYSIS_CONSTANTS.TOOL_RESULT_TTL;

    for (const [callId, cached] of this.toolResults.entries()) {
      if (now - cached.timestamp > ttl) {
        this.toolResults.delete(callId);
        logger.debug('Evicted expired tool result', { callId, age: now - cached.timestamp });
      }
    }
  }

  private addToolResult(callId: string, result: ToolResult): void {
    // Hard limit check first - evict using LRU strategy instead of FIFO
    while (this.toolResults.size >= StreamingToolOrchestrator.MAX_TOOL_RESULTS) {
      // Find least recently used entry (oldest timestamp)
      let lruKey: string | null = null;
      let oldestTime = Date.now();

      for (const [key, cached] of this.toolResults.entries()) {
        if (cached.timestamp < oldestTime) {
          oldestTime = cached.timestamp;
          lruKey = key;
        }
      }

      if (lruKey) {
        this.toolResults.delete(lruKey);
        logger.debug('Evicted tool result using LRU strategy', {
          callId: lruKey,
          age: Date.now() - oldestTime
        });
      } else {
        break; // Safety break if no key found
      }
    }

    // Then cleanup expired entries
    this.cleanupOldResults();

    this.toolResults.set(callId, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Check if a tool category requires approval
   */
  private requiresApproval(category: string): boolean {
    return this.config.requireApprovalForCategories?.includes(category) || false;
  }

  /**
   * Get all tool results from the last execution
   */
  getToolResults(): Map<string, ToolResult> {
    const results = new Map<string, ToolResult>();
    for (const [callId, cached] of this.toolResults.entries()) {
      results.set(callId, cached.result);
    }
    return results;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StreamingToolOrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get approval cache statistics
   */
  getApprovalStats(): { totalApprovals: number; categoryApprovals: number } {
    return this.approvalCache.getStats();
  }

  /**
   * Clear all cached approvals
   */
  clearApprovals(): void {
    this.approvalCache.clear();
    logger.info('Cleared all cached tool approvals');
  }

  /**
   * Pre-approve a specific tool for this session
   */
  preApprove(toolName: string, category: string): void {
    this.approvalCache.setApproval(toolName, category, true);
    logger.info(`Pre-approved tool: ${toolName} (${category})`);
  }

  /**
   * Pre-approve all tools in a category for this session
   */
  preApproveCategory(category: string): void {
    this.approvalCache.setCategoryApproval(category, true);
    logger.info(`Pre-approved category: ${category}`);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Used for finding similar tool names when a tool is not found
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

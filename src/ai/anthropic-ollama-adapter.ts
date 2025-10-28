/**
 * Anthropic-to-Ollama Adapter
 *
 * Wraps AnthropicProvider to provide an OllamaClient-compatible interface
 * This allows using Anthropic's Claude models with existing Ollama-based code
 */

import { AnthropicProvider } from './providers/anthropic-provider.js';
import { OllamaClient, OllamaToolCall, OllamaTool, OllamaMessage, OllamaModel } from './ollama-client.js';
import { logger } from '../utils/logger.js';

export class AnthropicOllamaAdapter extends OllamaClient {
  private anthropicProvider: AnthropicProvider;
  private configuredModel: string;
  private toolCallIdMap: Map<string, string> = new Map();

  constructor(config: any = {}) {
    // Call parent constructor with dummy config (we won't use OllamaClient's methods)
    super({ ...config, baseUrl: 'http://localhost:11434' });

    // Store the configured model
    this.configuredModel = config.model || 'claude-3-5-sonnet-20241022';

    // Create Anthropic provider
    this.anthropicProvider = new AnthropicProvider({
      name: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || config.apiKey || '',
      timeout: config.timeout || 300000,
      retryOptions: config.retryOptions
    });

    logger.info('Created Anthropic-to-Ollama adapter', { model: this.configuredModel });
  }

  /**
   * Test connection (for Anthropic, just check if API key exists)
   */
  override async testConnection(): Promise<boolean> {
    try {
      // Anthropic uses API key authentication, not server connection
      // Just verify the provider is initialized
      return this.anthropicProvider !== null && !!process.env.ANTHROPIC_API_KEY;
    } catch (error) {
      logger.error('Anthropic connection test failed:', error);
      return false;
    }
  }

  /**
   * List available models
   */
  override async listModels(): Promise<OllamaModel[]> {
    try {
      const models = await this.anthropicProvider.listModels();
      // Convert AI provider models to Ollama format
      return models.map(m => ({
        name: m.id,
        model: m.id,
        modified_at: new Date().toISOString(),
        size: 0,
        digest: '',
        details: {
          format: 'anthropic',
          family: 'claude',
          families: ['claude'],
          parameter_size: m.contextWindow ? `${m.contextWindow}` : 'unknown',
          quantization_level: ''
        }
      }));
    } catch (error) {
      logger.error('Failed to list Anthropic models:', error);
      return [];
    }
  }

  /**
   * Stream completion with tools
   * This is the key method used by StreamingToolOrchestrator
   */
  override async completeStreamWithTools(
    messages: OllamaMessage[],
    tools: OllamaTool[],
    options: any = {},
    callbacks: {
      onContent?: (content: string) => void;
      onToolCall?: (toolCall: OllamaToolCall) => Promise<any>;
      onComplete?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    try {
      logger.debug('AnthropicOllamaAdapter: Starting streaming completion with tools', {
        model: options.model,
        messageCount: messages.length,
        toolCount: tools.length
      });

      // Convert Ollama messages to Anthropic format
      const anthropicMessages = messages
        .filter(m => m.role !== 'system') // System messages go in separate field
        .map((m, index) => {
          // Handle assistant messages with tool calls
          if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
            const contentBlocks: any[] = [];

            // Add text content if present
            if (m.content && m.content.trim()) {
              contentBlocks.push({ type: 'text', text: m.content });
            }

            // Add tool_use blocks for each tool call
            for (const toolCall of m.tool_calls) {
              // Get the Anthropic ID from our mapping, or use the Ollama ID
              const anthropicId = this.toolCallIdMap.get(toolCall.id) || toolCall.id;

              let input = {};
              try {
                input = JSON.parse(toolCall.function.arguments);
              } catch (error) {
                logger.warn('Failed to parse tool call arguments', {
                  toolCall: toolCall.id,
                  error
                });
              }

              contentBlocks.push({
                type: 'tool_use',
                id: anthropicId,
                name: toolCall.function.name,
                input
              });
            }

            // If no content blocks, return with empty string (last assistant message can be empty)
            return {
              role: 'assistant' as const,
              content: contentBlocks.length > 0 ? contentBlocks : ''
            };
          }

          // Handle tool result messages
          if (m.role === 'tool') {
            // Tool results must be sent as user messages with tool_result content blocks
            const toolCallId = m.tool_call_id || '';

            if (!toolCallId) {
              logger.error('Tool result message missing tool_call_id', {
                toolName: m.tool_name,
                contentPreview: m.content.substring(0, 100)
              });
              throw new Error('Tool result message must have tool_call_id for Anthropic');
            }

            // Get the Anthropic ID from our mapping
            const anthropicId = this.toolCallIdMap.get(toolCallId);

            if (!anthropicId) {
              logger.error('Failed to find Anthropic tool call ID mapping', {
                ollamaId: toolCallId,
                toolName: m.tool_name,
                availableMappings: Array.from(this.toolCallIdMap.entries())
              });
              throw new Error(`No Anthropic ID mapping found for tool call ID: ${toolCallId}`);
            }

            logger.debug('Mapping tool result to Anthropic format', {
              ollamaId: toolCallId,
              anthropicId,
              toolName: m.tool_name
            });

            return {
              role: 'user' as const,
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: anthropicId,
                  content: m.content
                }
              ]
            };
          }

          // Handle regular user/assistant messages
          return {
            role: m.role as 'user' | 'assistant',
            content: m.content
          };
        });

      // Get system message if present
      const systemMessage = messages.find(m => m.role === 'system');

      // Convert Ollama tools to Anthropic format
      const anthropicTools = tools.map(tool => {
        const params = tool.function.parameters;

        return {
          name: tool.function.name,
          description: tool.function.description,
          input_schema: {
            type: 'object' as const,
            properties: params.properties || {},
            required: params.required || []
          }
        };
      });

      logger.debug('Converted tools to Anthropic format', {
        ollamaToolCount: tools.length,
        anthropicToolCount: anthropicTools.length,
        toolNames: anthropicTools.map(t => t.name)
      });

      // Use Anthropic provider's streaming API
      // Use configured model as fallback if not specified in options
      const modelToUse = options.model || this.configuredModel;

      logger.debug('Using model for Anthropic request with tools', {
        modelToUse,
        toolCount: anthropicTools.length
      });

      await this.anthropicProvider.completeStream(
        anthropicMessages as any,
        {
          model: modelToUse,
          system: options.system || systemMessage?.content,
          temperature: options.temperature,
          maxTokens: options.maxTokens || 4096,
          tools: anthropicTools.length > 0 ? anthropicTools : undefined
        },
        async (event: any) => {
          // AnthropicProvider emits events with: { content, done, delta, metadata, toolCalls }

          // Handle text content deltas
          if (!event.done && event.delta && callbacks.onContent) {
            callbacks.onContent(event.delta);
          }

          // Handle tool calls from Anthropic
          if (event.toolCalls && event.toolCalls.length > 0 && callbacks.onToolCall) {
            // Collect all tool call promises so we can wait for them
            const toolCallPromises: Promise<any>[] = [];

            for (const anthropicToolCall of event.toolCalls) {
              // Generate Ollama-style ID and store mapping
              const ollamaId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              this.toolCallIdMap.set(ollamaId, anthropicToolCall.id);

              // Convert to Ollama format
              const ollamaToolCall: OllamaToolCall = {
                id: ollamaId,
                type: 'function',
                function: {
                  name: anthropicToolCall.name,
                  arguments: JSON.stringify(anthropicToolCall.input)
                }
              };

              // Call the callback and collect the promise
              const toolCallPromise = callbacks.onToolCall(ollamaToolCall).catch(error => {
                logger.error('Tool call callback error:', error);
                return undefined; // Return undefined on error so Promise.all doesn't fail
              });
              toolCallPromises.push(toolCallPromise);
            }

            // CRITICAL: Wait for all tool calls to complete before continuing
            await Promise.all(toolCallPromises);
          }

          // Handle completion - only called AFTER all tool calls finish
          if (event.done && callbacks.onComplete) {
            callbacks.onComplete();
          }
        }
      );
    } catch (error) {
      logger.error('AnthropicOllamaAdapter streaming error:', error);
      if (callbacks.onError) {
        callbacks.onError(error as Error);
      }
      throw error;
    }
  }
}

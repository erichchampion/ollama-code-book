/**
 * Provider Commands
 *
 * Commands for managing AI providers including llama.cpp, Ollama, and others.
 */

import { commandRegistry, ArgType, CommandDef } from './index.js';
import { logger } from '../utils/logger.js';
import { normalizeError } from '../utils/error-utils.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { formatErrorForDisplay } from '../errors/formatter.js';
import { createSpinner } from '../utils/spinner.js';
import { isNonEmptyString } from '../utils/validation.js';
import { getAvailableProviderTypes } from '../ai/providers/index.js';
import { isLlamaCppServerRunning } from '../utils/llamacpp-server.js';
import { LlamaCppClient } from '../ai/llamacpp-client.js';
import { DEFAULT_LLAMACPP_URL } from '../constants.js';

/**
 * Register all provider-related commands
 */
export function registerProviderCommands(): void {
  registerSetProviderCommand();
  registerShowProviderCommand();
  registerLlamaCppStatusCommand();
  registerLlamaCppLoadCommand();
}

/**
 * Register set-provider command
 */
function registerSetProviderCommand(): void {
  const command: CommandDef = {
    name: 'set-provider',
    description: 'Switch the active AI provider',
    category: 'Providers',
    handler: async (args) => {
      try {
        const { provider } = args;

        if (!isNonEmptyString(provider)) {
          // List available providers
          const providers = getAvailableProviderTypes();
          console.log('Available AI providers:');
          console.log('=======================');
          for (const p of providers) {
            const description = getProviderDescription(p);
            console.log(`  ${p.padEnd(15)} - ${description}`);
          }
          console.log('\nUsage: set-provider <provider-name>');
          return;
        }

        const normalizedProvider = provider.toLowerCase();
        const availableProviders = getAvailableProviderTypes();

        if (!availableProviders.includes(normalizedProvider)) {
          throw createUserError(`Unknown provider: ${provider}`, {
            category: ErrorCategory.VALIDATION,
            resolution: `Available providers: ${availableProviders.join(', ')}`
          });
        }

        // Update the configuration
        const configModule = await import('../config/index.js');
        const currentConfig = await configModule.loadConfig();

        // Note: This is session-only; persistent changes would require file modification
        (currentConfig as any).provider = normalizedProvider;

        console.log(`✅ Active provider set to: ${normalizedProvider}`);
        console.log(`\nProvider details:`);
        console.log(`  Name: ${normalizedProvider}`);
        console.log(`  Description: ${getProviderDescription(normalizedProvider)}`);

        // Provide next steps
        console.log('\nNote: This change is only for the current session.');
        console.log('To make this permanent, set AI_PROVIDER environment variable or update your config file.');

        if (normalizedProvider === 'llamacpp') {
          console.log('\nFor llama.cpp, also set:');
          console.log('  LLAMACPP_MODEL_PATH=<path-to-your-gguf-model>');
          console.log('  LLAMACPP_API_URL=http://localhost:8080 (if using custom port)');
        }
      } catch (error) {
        console.error('Error setting provider:', formatErrorForDisplay(error));
        throw error;
      }
    },
    args: [
      {
        name: 'provider',
        description: 'Provider name (ollama, llamacpp, openai, anthropic, google)',
        type: ArgType.STRING,
        position: 0,
        required: false
      }
    ],
    examples: [
      'set-provider',
      'set-provider ollama',
      'set-provider llamacpp',
      'set-provider openai'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register show-provider command
 */
function registerShowProviderCommand(): void {
  const command: CommandDef = {
    name: 'show-provider',
    description: 'Display current provider and status',
    category: 'Providers',
    handler: async () => {
      try {
        const configModule = await import('../config/index.js');
        const currentConfig = await configModule.loadConfig();

        const provider = (currentConfig as any).provider || 'ollama';

        console.log('Current AI Provider Configuration');
        console.log('==================================');
        console.log(`Active Provider: ${provider}`);
        console.log(`Description: ${getProviderDescription(provider)}`);

        // Show provider-specific info
        if (provider === 'ollama') {
          const ollamaConfig = (currentConfig as any).ollama || {};
          console.log(`\nOllama Configuration:`);
          console.log(`  Base URL: ${ollamaConfig.baseUrl || 'http://localhost:11434'}`);
          console.log(`  Timeout: ${ollamaConfig.timeout || 'default'}ms`);
        } else if (provider === 'llamacpp') {
          const llamacppConfig = (currentConfig as any).llamacpp || {};
          console.log(`\nllama.cpp Configuration:`);
          console.log(`  Enabled: ${llamacppConfig.enabled || false}`);
          console.log(`  Base URL: ${llamacppConfig.baseUrl || DEFAULT_LLAMACPP_URL}`);
          console.log(`  Model Path: ${llamacppConfig.modelPath || 'Not set'}`);
          console.log(`  Context Size: ${llamacppConfig.contextSize || 4096}`);
          console.log(`  GPU Layers: ${llamacppConfig.gpuLayers ?? -1}`);
          console.log(`  Flash Attention: ${llamacppConfig.flashAttention || false}`);
        }

        console.log('\nAvailable Providers:');
        const providers = getAvailableProviderTypes();
        for (const p of providers) {
          const marker = p === provider ? '* ' : '  ';
          console.log(`${marker}${p}`);
        }
      } catch (error) {
        console.error('Error showing provider:', formatErrorForDisplay(error));
        throw error;
      }
    },
    examples: [
      'show-provider'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register llamacpp-status command
 */
function registerLlamaCppStatusCommand(): void {
  const command: CommandDef = {
    name: 'llamacpp-status',
    description: 'Show llama-server status',
    category: 'Providers',
    handler: async (args) => {
      try {
        const configModule = await import('../config/index.js');
        const currentConfig = await configModule.loadConfig();
        const llamacppConfig = (currentConfig as any).llamacpp || {};

        const baseUrl = args.url || llamacppConfig.baseUrl || DEFAULT_LLAMACPP_URL;

        console.log('llama.cpp Server Status');
        console.log('=======================');
        console.log(`Server URL: ${baseUrl}`);

        const spinner = createSpinner('Checking server status...');
        spinner.start();

        try {
          const isRunning = await isLlamaCppServerRunning(baseUrl);

          if (isRunning) {
            spinner.succeed('Server is running');

            // Get detailed health status
            const client = new LlamaCppClient({ baseUrl });
            const healthStatus = await client.getHealthStatus();

            if (healthStatus) {
              console.log(`\nHealth Status:`);
              console.log(`  Status: ${healthStatus.status}`);
              if (healthStatus.model) {
                console.log(`  Model: ${healthStatus.model}`);
              }
              if (healthStatus.slots_idle !== undefined) {
                console.log(`  Idle Slots: ${healthStatus.slots_idle}`);
              }
              if (healthStatus.slots_processing !== undefined) {
                console.log(`  Processing Slots: ${healthStatus.slots_processing}`);
              }
            }

            // List models
            try {
              const models = await client.listModels();
              if (models.length > 0) {
                console.log(`\nLoaded Models:`);
                for (const model of models) {
                  console.log(`  - ${model.id}`);
                }
              }
            } catch (modelError) {
              logger.debug('Could not list models', modelError);
            }
          } else {
            spinner.fail('Server is not running');
            console.log('\nTo start the server, either:');
            console.log('1. Run: llama-server -m <path-to-model.gguf>');
            console.log('2. Set LLAMACPP_MODEL_PATH and the provider will auto-start');
          }
        } catch (error) {
          spinner.fail('Failed to check server status');
          throw error;
        }
      } catch (error) {
        console.error('Error checking llama-server status:', formatErrorForDisplay(error));
        throw error;
      }
    },
    args: [
      {
        name: 'url',
        description: 'llama-server URL (default: http://localhost:8080)',
        type: ArgType.STRING,
        shortFlag: 'u'
      }
    ],
    examples: [
      'llamacpp-status',
      'llamacpp-status --url http://localhost:8080'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register llamacpp-load command
 */
function registerLlamaCppLoadCommand(): void {
  const command: CommandDef = {
    name: 'llamacpp-load',
    description: 'Load a GGUF model file',
    category: 'Providers',
    handler: async (args) => {
      try {
        const { model } = args;

        if (!isNonEmptyString(model)) {
          throw createUserError('Model path is required', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Provide the path to a GGUF model file'
          });
        }

        // Check if file exists
        const fs = await import('fs/promises');
        const path = await import('path');

        const resolvedPath = path.resolve(model.replace(/^~/, process.env.HOME || ''));

        try {
          await fs.access(resolvedPath);
        } catch {
          throw createUserError(`Model file not found: ${resolvedPath}`, {
            category: ErrorCategory.VALIDATION,
            resolution: 'Check the file path and try again'
          });
        }

        console.log(`Loading model: ${resolvedPath}`);
        console.log('\nTo use this model with llama.cpp:');
        console.log('1. Start llama-server manually:');
        console.log(`   llama-server -m "${resolvedPath}" --port 8080`);
        console.log('\n2. Or set the environment variable:');
        console.log(`   export LLAMACPP_MODEL_PATH="${resolvedPath}"`);
        console.log('   export AI_PROVIDER=llamacpp');
        console.log('\n3. Then run ollama-code and the server will auto-start');

        // Also show how to add to config file
        console.log('\nAlternatively, add to your .ollama-code.json:');
        console.log(JSON.stringify({
          provider: 'llamacpp',
          llamacpp: {
            enabled: true,
            modelPath: resolvedPath
          }
        }, null, 2));
      } catch (error) {
        console.error('Error loading model:', formatErrorForDisplay(error));
        throw error;
      }
    },
    args: [
      {
        name: 'model',
        description: 'Path to GGUF model file',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ],
    examples: [
      'llamacpp-load ~/models/qwen2.5-coder-7b-q4_k_m.gguf',
      'llamacpp-load /path/to/model.gguf'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Get provider description
 */
function getProviderDescription(provider: string): string {
  const descriptions: Record<string, string> = {
    'ollama': 'Local AI with Ollama (default)',
    'llamacpp': 'Local AI with llama.cpp/llama-server (GGUF models)',
    'openai': 'OpenAI API (GPT-4, etc.)',
    'anthropic': 'Anthropic API (Claude)',
    'google': 'Google AI API (Gemini)',
    'custom-local': 'Custom local provider'
  };

  return descriptions[provider] || 'Unknown provider';
}

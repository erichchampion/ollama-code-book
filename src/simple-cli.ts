#!/usr/bin/env node
/**
 * Simple Ollama Code CLI
 * 
 * A simplified version of the Ollama Code CLI for testing purposes.
 */

import { OllamaClient } from './ai/ollama-client.js';
import { normalizeError } from './utils/error-utils.js';
import { ensureOllamaServerRunning } from './utils/ollama-server.js';

// Simple command line argument parsing
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Ollama Code CLI v0.1.0

A command-line interface for interacting with Ollama AI for local code assistance.

Usage:
  ollama-code <command> [arguments]

Available Commands:
  ask <question>     - Ask Ollama a question
  list-models        - List available models
  pull-model <name>  - Download a model
  help               - Show this help

Examples:
  ollama-code ask "How do I implement a binary search?"
  ollama-code list-models
  ollama-code pull-model llama3.2
`);
  process.exit(0);
}

const command = args[0];
const commandArgs = args.slice(1);

async function main() {
  try {
    // Ensure Ollama server is running before creating client
    console.log('Ensuring Ollama server is running...');
    await ensureOllamaServerRunning();
    
    const client = new OllamaClient();
    
    switch (command) {
      case 'ask':
        if (commandArgs.length === 0) {
          console.error('Please provide a question to ask.');
          console.log('Example: ollama-code ask "How do I implement a binary search?"');
          process.exit(1);
        }
        
        const question = commandArgs.join(' ');
        console.log('Asking Ollama...\n');
        
        const result = await client.complete(question);
        console.log(result.message?.content || 'No response received');
        break;
        
      case 'list-models':
        console.log('Fetching available models...\n');
        
        const models = await client.listModels();
        
        if (models.length === 0) {
          console.log('No models found. Use "pull-model <name>" to download a model.');
          return;
        }
        
        console.log('Available models:');
        console.log('================');
        
        for (const model of models) {
          const sizeInGB = (model.size / (1024 * 1024 * 1024)).toFixed(2);
          const modifiedDate = new Date(model.modified_at).toLocaleDateString();
          
          console.log(`📦 ${model.name}`);
          console.log(`   Size: ${sizeInGB} GB`);
          console.log(`   Modified: ${modifiedDate}`);
          console.log('');
        }
        
        console.log(`Total: ${models.length} model(s) available`);
        break;
        
      case 'pull-model':
        if (commandArgs.length === 0) {
          console.error('Please provide a model name to download.');
          console.log('Example: ollama-code pull-model llama3.2');
          process.exit(1);
        }
        
        const modelName = commandArgs[0];
        console.log(`Downloading model: ${modelName}`);
        console.log('This may take several minutes depending on model size...\n');
        
        await client.pullModel(modelName);
        
        console.log(`✅ Successfully downloaded model: ${modelName}`);
        console.log('You can now use this model with the ask command.');
        break;
        
      case 'help':
        console.log(`
Ollama Code CLI v0.1.0

Available Commands:
  ask <question>     - Ask Ollama a question
  list-models        - List available models
  pull-model <name>  - Download a model
  help               - Show this help

Examples:
  ollama-code ask "How do I implement a binary search?"
  ollama-code list-models
  ollama-code pull-model llama3.2
`);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use "ollama-code help" to see available commands.');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', normalizeError(error).message);
    
    if (error instanceof Error && error.message.includes('fetch')) {
      console.log('\nMake sure Ollama is running:');
      console.log('  1. Install Ollama: https://ollama.ai');
      console.log('  2. Start the server: ollama serve');
      console.log('  3. Try again');
    }
    
    process.exit(1);
  }
}

main();

#!/usr/bin/env node
/**
 * Simple Ollama Code CLI
 * 
 * A simplified version of the Ollama Code CLI for testing purposes.
 */

import { runSimpleMode } from './simple-mode.js';
import { normalizeError } from './utils/error-utils.js';

// Simple command line argument parsing
const args = process.argv.slice(2);

// Handle help and empty args
if (args.length === 0 || args.includes('help') || args.includes('--help') || args.includes('-h')) {
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
    await runSimpleMode(command, commandArgs);
  } catch (error) {
    console.error('Error:', normalizeError(error).message);
    process.exit(1);
  }
}

main();

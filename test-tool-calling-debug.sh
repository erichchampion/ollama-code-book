#!/bin/bash

# Test script to debug tool calling flow with full logging

# Save the script directory FIRST before any cd commands
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CLI_PATH="$SCRIPT_DIR/dist/src/cli-selector.js"

echo "==================================================="
echo "Tool Calling Debug Test"
echo "==================================================="
echo ""
echo "This will test the 'What files are in this project?' question"
echo "with full debug logging to capture exact API communication."
echo ""

# Create a test directory with known files
TEST_DIR="/tmp/ollama-code-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Create some test files
echo "console.log('test');" > test.js
echo "print('hello')" > test.py
echo "# Test" > README.md
mkdir src
echo "export const foo = 'bar';" > src/index.ts

echo "Created test directory: $TEST_DIR"
echo "Files in test directory:"
ls -la
echo ""
echo "CLI path: $CLI_PATH"
echo ""
echo "Running with LOG_LEVEL=debug..."
echo ""

# Pipe the question and exit command
echo -e "What files are in this project?\nexit" | LOG_LEVEL=debug node "$CLI_PATH" --mode interactive 2>&1 | tee "$TEST_DIR/debug-log.txt"

echo ""
echo "==================================================="
echo "Test complete. Debug log saved to:"
echo "$TEST_DIR/debug-log.txt"
echo "==================================================="
echo ""
echo "Search for key patterns:"
echo "  - '===== OLLAMA API REQUEST =====' - Messages sent to Ollama"
echo "  - '===== OLLAMA STREAM EVENT =====' - Responses from Ollama"
echo "  - 'role.*tool' - Tool result messages"
echo "  - 'tool_call_id' - Tool call ID tracking"
echo ""

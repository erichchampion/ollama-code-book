# Integration Tests

This directory contains integration tests for the Ollama Code CLI application. These tests verify that top-level commands work correctly without requiring an actual Ollama server.

## Test Structure

### Test Categories

1. **Assistance Commands** (`assistance.test.js`)
   - `ask` - Question asking functionality
   - `explain` - Code explanation
   - `fix` - Bug fixing assistance

2. **Code Generation Commands** (`code-generation.test.js`)
   - `generate` - Code generation from prompts
   - `refactor` - Code refactoring

3. **Models Commands** (`models.test.js`)
   - `list-models` - List available models
   - `pull-model` - Download models
   - `set-model` - Set default model

4. **Session Commands** (`session.test.js`)
   - `help` - Help system
   - `commands` - Command listing
   - `clear` - Clear session
   - `history` - View history
   - `reset` - Reset context
   - `exit`/`quit` - Exit application

5. **System Commands** (`system.test.js`)
   - `config` - Configuration management
   - `edit` - File editing
   - `git` - Git operations
   - `run` - Shell command execution
   - `search` - Codebase search
   - `theme` - UI theme control
   - `verbosity` - Logging level control

## Test Approach

### Smoke Testing
These are **smoke tests** that verify:
- Commands can be invoked without crashing
- Proper error handling for invalid inputs
- Expected output patterns for valid inputs
- Graceful handling of missing dependencies (like Ollama server)

### Mocking Strategy
- Tests run without requiring an actual Ollama server
- Network calls are expected to fail gracefully
- File operations use temporary files
- Focus on CLI interface and command parsing

### Test Utilities (`setup.js`)
- `execCLI()` - Execute CLI commands and capture output
- `verifyOutput()` - Verify output contains expected patterns
- `createTempFile()` / `cleanupTempFile()` - Temporary file management
- Mock environment variables for consistent testing

## Running Tests

### All Integration Tests
```bash
npm run test:integration
```

### Individual Test Categories
```bash
# Assistance commands
npm run test:integration -- assistance.test.js

# Code generation commands
npm run test:integration -- code-generation.test.js

# Models commands
npm run test:integration -- models.test.js

# Session commands
npm run test:integration -- session.test.js

# System commands
npm run test:integration -- system.test.js
```

### Run with Verbose Output
```bash
npm run test:integration -- --verbose
```

### Run Specific Test
```bash
npm run test:integration -- --testNamePattern="ask command"
```

## Test Environment

### Environment Variables
- `NODE_ENV=test` - Test environment
- `OLLAMA_API_URL=http://localhost:11434` - Default Ollama URL
- `OLLAMA_TELEMETRY=0` - Disable telemetry
- `CI=true` - Indicates CI environment

### Expected Failures
Many tests **expect failure** because:
- No actual Ollama server is running
- Network connections will be refused
- Commands that require Ollama will fail at the connection stage

This is **intentional** - we're testing that:
1. Commands parse correctly
2. Proper error messages are shown
3. Application doesn't crash
4. Help and validation work correctly

## Adding New Tests

### Command Test Template
```javascript
describe('new-command command', () => {
  test('should show error when no parameter provided', async () => {
    const result = await execCLI(['--mode', 'advanced', 'new-command'], {
      expectError: true,
      env: testEnv
    });

    verifyOutput(result.stderr, [
      'Please provide required parameter'
    ]);
    expect(result.exitCode).toBe(1);
  });

  test('should handle valid input', async () => {
    const result = await execCLI(['--mode', 'advanced', 'new-command', 'valid-input'], {
      timeout: 15000,
      expectError: true, // If command requires Ollama
      env: testEnv
    });

    verifyOutput(result.stderr, [
      'Processing valid-input'
    ]);
  });
});
```

### Best Practices
1. **Use appropriate timeouts** - Commands may take time to fail
2. **Clean up temp files** - Use `afterAll()` cleanup
3. **Test error cases** - Invalid inputs, missing files, etc.
4. **Verify output patterns** - Don't rely on exact matches
5. **Handle both success and failure** - Commands may succeed or fail based on environment

## Coverage Goals

These integration tests aim to provide:
- **95%+ command coverage** - All major commands tested
- **Error path testing** - Invalid inputs handled gracefully
- **Mode compatibility** - Commands work across simple/advanced/interactive modes
- **Regression prevention** - Catch breaking changes to CLI interface

## Limitations

### What These Tests DON'T Cover
- Actual AI/LLM functionality (requires Ollama server)
- Real file editing (requires interactive terminal)
- Complex git workflows (requires git repository state)
- Network-dependent operations (intentionally mocked)
- Performance under load
- UI/interactive elements (terminal colors, progress bars)

### What These Tests DO Cover
- CLI argument parsing
- Command registration and routing
- Error handling and validation
- Help system functionality
- File path resolution
- Basic command execution flow
# Interactive Mode E2E Tests

End-to-end tests for ollama-code's interactive mode using **real Ollama**.

## Philosophy

These tests are designed to catch real-world issues that unit tests miss. They:

- ✅ Use real Ollama (not mocked)
- ✅ Test actual tool execution
- ✅ Validate conversation flow and message structure
- ✅ Check for infinite loops and duplicates
- ✅ Ensure proper error handling

## Why Real Ollama?

The whole point of E2E tests is to catch integration issues. We've had multiple cases where:
- Unit tests passed ✅
- Real interactive mode failed ❌

Examples:
- `tool_call_id` vs `tool_name` bug - unit tests passed, interactive mode infinite looped
- Non-empty `content` with `tool_calls` - unit tests passed, Ollama ignored tool results
- Search tool choosing `type: "filename"` - unit tests passed, real LLM made poor choices

**Using real Ollama catches these issues.**

## Prerequisites

### 1. Ollama Running Locally

```bash
# Start Ollama
ollama serve

# In another terminal, verify it's running
curl http://localhost:11434/api/tags
```

### 2. Install the Default Model

The tests use the same model configured in the application (`qwen2.5-coder:latest` by default):

```bash
# Install the default model
ollama pull qwen2.5-coder:latest
```

You can override the model for tests using the `OLLAMA_TEST_MODEL` environment variable:

```bash
# Use a different model for tests
export OLLAMA_TEST_MODEL=tinyllama
ollama pull tinyllama
```

Why qwen2.5-coder?
- **Code-optimized**: Specifically trained for coding tasks
- **Good with tools**: Understands function calling well
- **Same as production**: Tests match real usage
- **Local**: No API costs or rate limits

## Running the Tests

### Run all interactive E2E tests

```bash
yarn test:e2e:interactive
```

### Run with debug output

```bash
LOG_LEVEL=debug yarn test:e2e:interactive
```

### Run specific test file

```bash
yarn playwright test tests/e2e/interactive/tool-calling.e2e.test.ts
```

### Run specific test

```bash
yarn playwright test -g "should list files without infinite loop"
```

### Run in headed mode (see browser, if using playwright's UI)

```bash
yarn playwright test --headed
```

## Test Structure

### Tool Calling Tests (`tool-calling.e2e.test.ts`)

Tests core tool calling functionality:
- ✅ No infinite loops
- ✅ Correct tool selection
- ✅ Proper parameter construction
- ✅ Tool result processing
- ✅ Conversation history structure
- ✅ Multi-turn conversations
- ✅ Error handling

### Assertions Strategy

#### 1. Structural Assertions (Deterministic)

These validate the structure and flow, not the exact content:

```typescript
// ✅ Good - Validates structure
expect(assistantMsg.content).toBe(''); // When tool_calls present

// ✅ Good - Validates no infinite loop
expect(listCalls.length).toBeLessThanOrEqual(2);

// ✅ Good - Validates message format
expect(toolResult.tool_name).toBeDefined();
```

#### 2. Pattern Matching (Flexible)

Since LLM responses vary, use pattern matching:

```typescript
// ✅ Good - Flexible pattern
expect(output).toMatch(/index\.js|main file|entry point/i);

// ❌ Bad - Too specific
expect(output).toBe('The file index.js is the main entry point.');
```

#### 3. Behavioral Assertions (What Matters)

Focus on behavior, not exact output:

```typescript
// ✅ Good - Checks behavior
const searchCalls = toolCalls.filter(tc => tc.name === 'search');
expect(searchCalls.length).toBeGreaterThan(0);

// ✅ Good - Validates no duplicates
expect(callCounts[toolName]).toBeLessThanOrEqual(2);
```

## Writing New Tests

### Template

```typescript
test('should [describe expected behavior]', async () => {
  // 1. Send user message
  await session.sendMessage('Your question here');

  // 2. Wait for response
  await session.waitForReady();

  // 3. Assert on structure
  const toolCalls = session.getToolCalls();
  expect(toolCalls.length).toBeGreaterThan(0);

  // 4. Assert on behavior
  const output = session.getOutput();
  expect(output).toMatch(/expected pattern/i);

  // 5. Assert on conversation structure (if needed)
  const messages = session.getConversationHistory();
  // ... validate message structure
});
```

### Best Practices

#### ✅ DO

- Use pattern matching for output validation
- Test structural correctness (message format, tool_name vs tool_call_id)
- Validate no infinite loops (tool call counts)
- Check error handling
- Use reasonable timeouts
- Test multi-turn conversations
- Validate conversation history structure

#### ❌ DON'T

- Expect exact LLM responses (non-deterministic)
- Test LLM quality (that's Ollama's job)
- Use overly tight timeouts (LLMs vary in speed)
- Test UI formatting details (too brittle)
- Mock the Ollama API (defeats the purpose)

### Example: Testing for Infinite Loop Bug

The bug we fixed where tool_call_id vs tool_name caused infinite loops:

```typescript
test('should not infinite loop on file list', async () => {
  await session.sendMessage('What files are here?');
  await session.waitForReady();

  const toolCalls = session.getToolCalls();

  // Count how many times filesystem/list was called
  const listCalls = toolCalls.filter(
    tc => tc.name === 'filesystem' || tc.name === 'list'
  );

  // Should call once (or maybe retry once), but NOT infinite loop
  expect(listCalls.length).toBeLessThanOrEqual(2);

  // Also validate conversation structure
  const messages = session.getConversationHistory();
  const assistantMsg = messages.find(m => m.role === 'assistant' && m.tool_calls);

  if (assistantMsg) {
    // This was the bug - non-empty content caused Ollama to ignore tool_calls
    expect(assistantMsg.content).toBe('');
  }

  const toolResults = messages.filter(m => m.role === 'tool');
  for (const result of toolResults) {
    // This was the bug - tool_call_id instead of tool_name
    expect(result.tool_name).toBeDefined();
    expect((result as any).tool_call_id).toBeUndefined();
  }
});
```

This test would have caught both bugs:
1. Non-empty `content` when `tool_calls` present
2. Using `tool_call_id` instead of `tool_name`

## Debugging Failing Tests

### 1. Enable Debug Logging

```bash
LOG_LEVEL=debug yarn test:e2e:interactive
```

This shows:
- Full conversation history
- Tool call details
- API requests/responses

### 2. Check Session Output

```typescript
test('debug test', async () => {
  await session.sendMessage('Your message');
  await session.waitForReady();

  // Print everything
  console.log('=== OUTPUT ===');
  console.log(session.getOutput());

  console.log('\n=== TOOL CALLS ===');
  console.log(JSON.stringify(session.getToolCalls(), null, 2));

  console.log('\n=== CONVERSATION ===');
  console.log(JSON.stringify(session.getConversationHistory(), null, 2));
});
```

### 3. Use Longer Timeouts

If tests timeout, increase the timeout:

```typescript
session = new InteractiveSession({
  timeout: 60000 // 60 seconds
});
```

### 4. Test with Different Models

Try a different model if needed:

```bash
# Test with a different model
OLLAMA_TEST_MODEL=mistral yarn test:e2e:interactive
```

Or set it programmatically in a specific test:

```typescript
session = new InteractiveSession({
  model: 'mistral' // Override for this specific test
});
```

## Common Issues

### "Timeout waiting for ready state"

**Cause**: Session didn't show prompt after response

**Solutions**:
- Increase timeout
- Check if Ollama is running
- Verify model is pulled
- Look at raw output to see what's happening

### "Session terminated while waiting"

**Cause**: Process crashed or exited unexpectedly

**Solutions**:
- Check error output: `session.getErrorOutput()`
- Run CLI manually to see what's failing
- Check Ollama logs

### Tests are flaky

**Cause**: LLM responses vary, or timing issues

**Solutions**:
- Use pattern matching instead of exact strings
- Increase timeouts
- Make assertions more flexible
- Focus on structure, not content

## Performance

With qwen2.5-coder:latest on a modern laptop:
- Simple question: 3-8 seconds
- Tool calling: 8-15 seconds
- Multi-turn: 15-30 seconds
- Full test suite: ~3-5 minutes

Using a smaller/faster model like `tinyllama` (via `OLLAMA_TEST_MODEL=tinyllama`):
- Simple question: 2-5 seconds
- Tool calling: 5-10 seconds
- Multi-turn: 10-20 seconds
- Full test suite: ~2-3 minutes

## CI/CD Integration

### Option 1: Run with Ollama in CI

```yaml
# .github/workflows/e2e.yml
- name: Start Ollama
  run: |
    docker run -d -p 11434:11434 ollama/ollama
    docker exec ollama ollama pull qwen2.5-coder:latest

- name: Run E2E tests
  run: yarn test:e2e:interactive

# For faster CI, use a smaller model
- name: Run E2E tests (fast)
  run: |
    docker exec ollama ollama pull tinyllama
    OLLAMA_TEST_MODEL=tinyllama yarn test:e2e:interactive
```

### Option 2: Skip in CI, run locally

Add to package.json:

```json
{
  "scripts": {
    "test:e2e:interactive": "playwright test tests/e2e/interactive",
    "test:e2e:interactive:ci": "echo 'Skipping E2E - requires Ollama'"
  }
}
```

### Option 3: Conditional in CI

```bash
# Only run if OLLAMA_HOST is set
if [ ! -z "$OLLAMA_HOST" ]; then
  yarn test:e2e:interactive
fi
```

## Future Enhancements

- [ ] Add test fixtures for known-content projects (for search validation)
- [ ] Record and replay mode (for fast regression tests)
- [ ] Performance benchmarks (track response times)
- [ ] Visual regression testing (terminal output)
- [ ] More models (test with different model sizes)
- [ ] Parallel test execution (multiple sessions)

## Contributing

When adding new tests:

1. Test against real Ollama (no mocks)
2. Use pattern matching for flexible assertions
3. Focus on structural correctness
4. Add comments explaining what bug the test prevents
5. Keep tests fast (use tinyllama)
6. Document any special setup needed

## Questions?

See the main design doc: `E2E_INTERACTIVE_TEST_FRAMEWORK.md`

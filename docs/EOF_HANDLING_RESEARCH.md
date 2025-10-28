# EOF Handling Research for getUserInput()

## Problem Statement

The `getUserInput()` method in `optimized-enhanced-mode.ts` is designed for interactive TTY sessions where it waits indefinitely for user input. In E2E test scenarios using pipes, stdin reaches EOF when no more test input is available, causing the process to hang or exit unexpectedly.

### Current Behavior

**TTY Mode (Normal Interactive Use):**
```
User types → readline emits 'line' event → process input → loop continues → readline waits for next input
```

**Pipe Mode (E2E Tests):**
```
Test sends line 1 → readline emits 'line' → process input → loop continues → readline waits...
                                                                           ↓
                                                                    stdin hits EOF
                                                                           ↓
                                                                  NO 'close' HANDLER
                                                                           ↓
                                                                   Process hangs/exits
```

### Evidence from Test Output

From Playwright E2E test run:
```
What files are in this project?
{"name": "filesystem
```

The output cuts off mid-JSON stream, indicating the process terminated while the AI was streaming its tool call response, likely when `getUserInput()` was called the second time and hit EOF.

## Root Cause Analysis

### Current Code Structure

1. **First call to getUserInput()**:
   - Test helper sends "What files are in this project?\n"
   - readline receives the line, processes it immediately (E2E mode)
   - Returns the input, closes readline interface

2. **AI processes input**:
   - Begins streaming response with tool calls
   - Starts outputting JSON: `{"name": "filesystem"`

3. **Second call to getUserInput()**:
   - Creates new readline interface
   - Stdin is still open but has no more data (EOF state)
   - readline waits indefinitely or triggers undefined behavior
   - Process exits/crashes

### Missing EOF Handling

The current code has no handler for the readline `'close'` event that would gracefully handle EOF. When stdin reaches EOF in pipe mode:

1. No new lines will arrive
2. The readline interface doesn't automatically emit 'line' or resolve the promise
3. The input timeout (if configured) might eventually trigger
4. Or the process might exit unexpectedly

## Proposed Solution

### Approach 1: Add 'close' Event Handler with Queue System (RECOMMENDED)

**Architecture:**
- Maintain an input queue for E2E test mode
- When in E2E mode, buffer all available input immediately on start
- Serve input from queue instead of waiting for readline each time

**Implementation:**

```typescript
private inputQueue: string[] = [];
private eofReached: boolean = false;

private async getUserInput(): Promise<string> {
  if (!this.terminal) {
    throw new Error('Terminal not available');
  }

  const allowNonTTY = process.env.OLLAMA_CODE_E2E_TEST === 'true';

  if (!this.terminal.isInteractive && !allowNonTTY) {
    logger.warn('Terminal is not interactive, exiting gracefully');
    this.running = false;
    return '';
  }

  // E2E mode: use input queue
  if (allowNonTTY) {
    return this.getUserInputFromQueue();
  }

  // Normal TTY mode: use readline as before
  return this.getUserInputFromReadline();
}

private async getUserInputFromQueue(): Promise<string> {
  // If queue is empty and we haven't populated it yet, do so now
  if (this.inputQueue.length === 0 && !this.eofReached) {
    await this.populateInputQueue();
  }

  // If queue has items, return the next one
  if (this.inputQueue.length > 0) {
    const input = this.inputQueue.shift()!;
    logger.debug(`[E2E] Returning queued input: ${input.substring(0, 50)}...`);
    return input;
  }

  // Queue is empty and EOF reached - exit gracefully
  if (this.eofReached) {
    logger.info('[E2E] EOF reached, no more input available');
    this.running = false;
    return '';
  }

  // Fallback: should not reach here
  logger.warn('[E2E] Unexpected state in getUserInputFromQueue');
  this.running = false;
  return '';
}

private async populateInputQueue(): Promise<void> {
  const readline = await import('readline');

  return new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false // Don't treat as terminal in E2E mode
    });

    rl.on('line', (line: string) => {
      this.inputQueue.push(line);
      logger.debug(`[E2E] Queued input line: ${line.substring(0, 50)}...`);
    });

    rl.on('close', () => {
      this.eofReached = true;
      logger.debug(`[E2E] EOF reached, queue has ${this.inputQueue.length} items`);
      resolve();
    });

    // Handle errors
    rl.on('error', (error) => {
      logger.error('[E2E] Error reading input:', error);
      this.eofReached = true;
      resolve();
    });
  });
}

private async getUserInputFromReadline(): Promise<string> {
  // Existing TTY implementation...
  // (Keep current readline logic for normal interactive mode)
}
```

**Advantages:**
- Clear separation between E2E and TTY modes
- All input is buffered upfront, avoiding EOF issues
- Simple queue-based logic that's easy to test
- No race conditions with streaming AI responses

**Disadvantages:**
- Requires refactoring getUserInput into multiple methods
- Different code paths for TTY vs E2E mode

### Approach 2: Single Persistent Readline Instance

**Architecture:**
- Create readline interface once at session start
- Reuse it for all getUserInput() calls
- Handle EOF by detecting when no more lines are available

**Implementation:**

```typescript
private rl: readline.Interface | null = null;
private stdinClosed: boolean = false;

async start(): Promise<void> {
  // Initialize persistent readline in E2E mode
  if (process.env.OLLAMA_CODE_E2E_TEST === 'true') {
    await this.initializeE2EReadline();
  }

  // ... rest of start logic
}

private async initializeE2EReadline(): Promise<void> {
  const readline = await import('readline');

  this.rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  this.rl.on('close', () => {
    logger.debug('[E2E] stdin closed (EOF)');
    this.stdinClosed = true;
  });
}

private async getUserInput(): Promise<string> {
  const allowNonTTY = process.env.OLLAMA_CODE_E2E_TEST === 'true';

  if (allowNonTTY) {
    if (this.stdinClosed) {
      logger.info('[E2E] stdin closed, exiting gracefully');
      this.running = false;
      return '';
    }

    return new Promise((resolve) => {
      if (!this.rl) {
        resolve('');
        return;
      }

      const lineHandler = (line: string) => {
        this.rl?.off('line', lineHandler);
        resolve(line);
      };

      this.rl.on('line', lineHandler);
    });
  }

  // Normal TTY mode...
}
```

**Advantages:**
- Simpler - single readline instance
- Automatically detects EOF via 'close' event

**Disadvantages:**
- Mixing persistent and one-shot readline patterns
- Potential for event listener leaks if not managed carefully

### Approach 3: Test Helper Modification

**Architecture:**
- Modify test helper to keep stdin open until explicitly closed
- Send special EOF marker instead of closing stdin

**Implementation in Test Helper:**

```typescript
class InteractiveSession {
  async sendMessage(message: string): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Session not started');
    }

    // Send message
    this.process.stdin.write(message + '\n');

    // Add to history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });
  }

  async sendEOF(): Promise<void> {
    if (this.process && this.process.stdin) {
      // Send special marker then close
      this.process.stdin.write('__EOF__\n');
      this.process.stdin.end();
    }
  }
}
```

**In getUserInput():**

```typescript
if (allowNonTTY) {
  // Check for EOF marker
  if (line === '__EOF__') {
    logger.info('[E2E] EOF marker received');
    this.running = false;
    return '';
  }

  rl.close();
  resolve(line);
  return;
}
```

**Advantages:**
- Explicit control over when to end the session
- Tests can send multiple messages before ending

**Disadvantages:**
- Requires modifying test helper
- Special marker could conflict with real input

## Recommendation

**Use Approach 1 (Queue System)** for the following reasons:

1. **Clean Separation**: E2E and TTY modes have fundamentally different behaviors - queue-based buffering vs. interactive waiting
2. **Predictable**: All input is known upfront in E2E tests
3. **Testable**: Easy to verify queue state in tests
4. **Robust**: Avoids EOF timing issues entirely
5. **Maintainable**: Clear code paths for each mode

## Implementation Plan

### Phase 1: Add Queue Infrastructure
- Add `inputQueue`, `eofReached` properties to OptimizedEnhancedMode class
- Implement `populateInputQueue()` method
- Implement `getUserInputFromQueue()` method

### Phase 2: Refactor getUserInput()
- Split into `getUserInput()` (dispatcher) and `getUserInputFromReadline()` (TTY mode)
- Add mode detection logic
- Route to appropriate implementation

### Phase 3: Testing
- Test with single message (current scenario)
- Test with multiple messages
- Test with immediate EOF
- Test with delayed EOF
- Verify TTY mode unchanged

### Phase 4: Integration
- Update E2E tests to send multiple commands
- Verify conversation flow works correctly
- Add timeout handling for queue mode

## Code Changes Required

### Files to Modify:
1. `src/interactive/optimized-enhanced-mode.ts`
   - Add queue properties
   - Add queue methods
   - Refactor getUserInput()

### Files to Test:
1. `tests/e2e/interactive/tool-calling.e2e.test.ts`
   - Verify multi-turn conversations
   - Verify EOF handling

### Estimated Complexity:
- **Low-Medium**: ~50-100 lines of new code
- **Risk**: Low - E2E mode is separate code path
- **Testing**: Medium - need to verify both modes work

## Alternative: Stream-Based Approach

Instead of queue, could use async generator:

```typescript
private async *readLines(): AsyncGenerator<string> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    yield line;
  }
}

private lineGenerator: AsyncGenerator<string> | null = null;

private async getUserInputFromStream(): Promise<string> {
  if (!this.lineGenerator) {
    this.lineGenerator = this.readLines();
  }

  const result = await this.lineGenerator.next();

  if (result.done) {
    logger.info('[E2E] Stream exhausted (EOF)');
    this.running = false;
    return '';
  }

  return result.value;
}
```

This is more elegant but requires Node.js 10+ async iteration support.

## Conclusion

The EOF handling issue is solvable with relatively straightforward queue-based buffering for E2E mode. The key insight is that E2E tests have fundamentally different input characteristics (all known upfront) than interactive TTY sessions (unknown, user-driven), so different implementations are appropriate.

The recommended queue-based approach provides clear separation, predictable behavior, and easy testing while maintaining full compatibility with existing TTY mode.

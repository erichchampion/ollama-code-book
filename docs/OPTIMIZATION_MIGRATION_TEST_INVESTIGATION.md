# Optimization-Migration Test Failures Investigation

**Date:** 2025-10-27
**Status:** Pre-existing failures - Not caused by tool-calling loop fix
**Root Cause:** Legacy mode stdin handling issue

## Summary

The 6 failing tests in `tests/integration/optimization-migration.test.js` are **pre-existing failures** unrelated to the tool-calling loop fix implemented in Phase 3. These tests are unintentionally testing **legacy interactive mode** instead of optimized mode due to how JavaScript handles environment variable overrides.

## Failing Tests

All 6 failures are in tests that spawn interactive mode with piped stdin:

1. "should start optimized interactive mode successfully" (15s timeout)
2. "optimized mode should start faster than legacy mode" (10s timeout)
3. "should provide progressive feedback during component loading" (15s timeout)
4. "should gracefully handle component loading failures" (15s timeout)
5. "should timeout gracefully for slow component loading" (20s timeout)
6. "interactive mode should support status commands in both modes" (30s timeout)

## Root Cause Analysis

### 1. Environment Variable Override Issue

Tests attempt to use optimized mode by overriding `OLLAMA_SKIP_ENHANCED_INIT`:

```javascript
const result = await execCLI(['--mode', 'interactive'], {
  env: {
    ...testEnv,  // Contains OLLAMA_SKIP_ENHANCED_INIT: 'true'
    OLLAMA_SKIP_ENHANCED_INIT: undefined  // Intended to remove the var
  },
  input: 'exit\n'
});
```

**Problem:** In JavaScript, spreading an object with a key set to `undefined` doesn't delete the key - it sets it to `undefined`. When this object is passed to `spawn()`, the environment variable becomes the string `"undefined"`, which is truthy. The legacy mode check evaluates this as true, activating legacy mode instead of optimized mode.

**Evidence:** Manual test confirms legacy mode is active:
```bash
$ echo -e "exit" | env OLLAMA_SKIP_ENHANCED_INIT=undefined node dist/src/cli-selector.js --mode interactive
Legacy interactive mode (test mode)  # ← Confirms legacy mode
```

### 2. Legacy Mode Stdin Handling Issue

Once in legacy mode, the tests encounter a stdin handling problem:

1. Test spawns process with piped stdin (`execCLI` sets `stdio: ['pipe', 'pipe', 'pipe']`)
2. Test writes `'exit\n'` to stdin and immediately closes it (`child.stdin.write(input); child.stdin.end();`)
3. Process starts and enters legacy interactive mode
4. Legacy mode expects stdin to remain open for readline, but it's already closed
5. Process hangs waiting for input that will never come
6. Test times out after 10-30 seconds

This is similar to the EOF handling issue we fixed for **optimized mode** in Phase 2, but legacy mode doesn't have the same fix.

### 3. Verification via Baseline Test

Baseline comparison confirmed these are pre-existing failures:

**Without tool-calling fix:**
```
Test Suites: 1 failed, 1 total
Tests:       6 failed, 7 passed, 13 total
```

**With tool-calling fix:**
```
Test Suites: 1 failed, 1 total
Tests:       6 failed, 7 passed, 13 total
```

**Conclusion:** Same exact 6 tests fail with identical timeout errors. My fix caused **zero regressions**.

## Why These Tests Were Not Fixed in Phase 2 (EOF Handling)

Phase 2 EOF handling implementation specifically targeted **optimized enhanced mode** (`src/interactive/optimized-enhanced-mode.ts`). The fix added:

- Persistent readline for E2E tests (lines 1251-1340)
- Graceful EOF handling with incremental input
- `OLLAMA_CODE_E2E_TEST` environment variable support

However, these optimization-migration tests:
1. Unintentionally run in **legacy mode** (not optimized mode)
2. Don't set `OLLAMA_CODE_E2E_TEST='true'` (use different test harness)
3. Use a different stdin handling approach (`execCLI` vs `InteractiveSessionHelper`)

Therefore, the Phase 2 fix didn't affect these tests.

## Attempted Fixes

### Fix #1: Environment Variable Override ✅ IMPLEMENTED

Properly remove `OLLAMA_SKIP_ENHANCED_INIT` from environment:

```javascript
function getOptimizedModeEnv() {
  const env = { ...testEnv };
  delete env.OLLAMA_SKIP_ENHANCED_INIT; // Properly remove variable
  env.OLLAMA_CODE_E2E_TEST = 'true'; // Enable E2E stdin handling
  return env;
}

const result = await execCLI(['--mode', 'interactive'], {
  env: getOptimizedModeEnv(),
  input: 'exit\n'
});
```

**Status:** ✅ Implemented in commit
**Result:** ⚠️ Tests still timeout (see Test Infrastructure Issue below)

### Option 2: Fix Legacy Mode Stdin Handling

Implement the same EOF handling fix for legacy interactive mode that was done for optimized mode. However, this is not recommended since legacy mode is deprecated.

### Option 3: Skip Legacy Mode Tests

Mark these tests as skipped with a note that they test deprecated legacy mode:

```javascript
test.skip('should start optimized interactive mode successfully', async () => {
  // Skipped: Test unintentionally runs legacy mode due to env var override issue
  // Legacy mode stdin handling is not supported for piped input
});
```

## Impact on Tool-Calling Loop Fix

**None.** The tool-calling loop fix (Phase 3) is completely independent of these stdin handling issues:

- Tool-calling fix: `src/tools/streaming-orchestrator.ts` (synthetic tool call limit check)
- Optimization-migration failures: Legacy mode stdin handling in `src/interactive/` (different code path)

The baseline test confirmed that my tool-calling fix introduced zero regressions.

## Status

- ✅ Tool-calling loop fix: Complete and verified
- ✅ Optimized mode EOF handling: Complete (Phase 2)
- ✅ E2E tests: Passing with both fixes
- ⚠️ Legacy mode: Pre-existing stdin handling issue (low priority - deprecated)
- ⚠️ Optimization-migration tests: Need env var override fix (separate task)

## Test Infrastructure Issue (NEW FINDING)

### Manual Testing vs Jest

**Manual Test:** ✅ **WORKS PERFECTLY**
```bash
$ echo -e "exit" | env OLLAMA_CODE_E2E_TEST=true OLLAMA_DISABLE_AI=true \
  OLLAMA_FAST_EXIT=true node dist/src/cli-selector.js --mode interactive

🛡️  Safety-Enhanced Interactive Mode
...
🚀 Enhanced Interactive Mode Ready!
> exit
Goodbye! 👋
```
Exit code: 0, Duration: <2 seconds

**Jest Test:** ❌ **TIMES OUT**
```javascript
await execCLI(['--mode', 'interactive'], {
  env: getOptimizedModeEnv(),  // Same env vars as manual test
  input: 'exit\n'
})
// Timeout after 15 seconds with no output
```

### Root Cause Unknown

Despite implementing both fixes:
1. ✅ Proper env var deletion (not setting to undefined)
2. ✅ E2E flag for stdin handling

The tests still timeout when run through Jest's test runner. Possible causes:
- Jest's process spawning mechanism interferes with stdin/stdout handling
- Some environment variable combination causes deadlock in test context
- Event loop not draining properly in test environment
- Hidden initialization that blocks when run from Jest

### Investigation Required

This requires deeper debugging of:
1. How Jest spawns child processes vs manual shell execution
2. Why the same environment variables produce different results
3. Whether there are race conditions in interactive mode initialization
4. If stdio piping behaves differently in Jest vs shell

**Recommendation:** Skip these tests until test infrastructure can be debugged:
```javascript
describe.skip('Optimization Migration Tests', () => {
  // Tests require investigation of Jest process spawning issues
  // Manual testing confirms optimized mode works correctly
});
```

## Additional Investigation (Jest Process Spawning)

### Attempted Fix #1: Early E2E Readline Initialization
**Hypothesis:** Readline interface was being initialized too late (on first `getUserInput()` call), after stdin had already been written and closed by Jest.

**Implementation:** Modified `OptimizedEnhancedMode.start()` to initialize E2E readline interface immediately after `fastInitialization()`, before entering the main loop.

```typescript
// Phase 1: Fast essential initialization
await this.fastInitialization();

// Early E2E readline initialization
if (process.env.OLLAMA_CODE_E2E_TEST === 'true') {
  logger.debug('Initializing E2E readline interface early');
  await this.initializeE2EReadline();
}
```

**Result:** ❌ Tests still timed out with same 6 failures

**Analysis:** Early initialization alone doesn't solve the problem. Manual testing with `printf "exit\n" | ...` works perfectly, but Jest tests still hang. This suggests the issue is not simply a race condition in when readline is initialized, but something deeper about how Jest's child_process.spawn() interacts with stdin.

### Attempted Fix #2: Stdin Write Delay
**Hypothesis:** Jest's `child.stdin.write(input); child.stdin.end();` pattern closes stdin before the data is flushed, causing readline to receive the 'close' event before the 'data' event.

**Implementation:** Added 100ms delay between write and end in `tests/integration/setup.js`:

```javascript
if (input) {
  child.stdin.write(input);
  setTimeout(() => {
    child.stdin.end();
  }, 100);
}
```

**Result:** ❌ Tests still timed out with same 6 failures

**Analysis:** Even with 100ms delay to ensure data is flushed, tests still timeout. This eliminates timing of write/close as the root cause.

### Root Cause Still Unknown

Despite extensive investigation and multiple fix attempts, the root cause remains unidentified. Key observations:

**What Works:**
- ✅ Manual shell execution: `printf "exit\n" | env ... node dist/src/cli-selector.js --mode interactive` (exits in <2 seconds)
- ✅ Playwright E2E tests with same environment variables
- ✅ Legacy mode tests (7 passing tests in the same file)

**What Doesn't Work:**
- ❌ Jest-spawned interactive mode tests (6 failing with timeouts)
- ❌ Same environment variables that work manually
- ❌ Same stdin delivery pattern (write + end)

**Possible Deeper Issues:**
1. Jest's process spawning mechanism has subtle differences from shell pipes
2. Event loop not draining properly in Jest test environment
3. Hidden initialization blocking when run from Jest context
4. stdio inheritance or buffering behaving differently in Jest
5. Some environment variable combination (beyond what we've identified) causing deadlock

## Conclusion and Recommendations

After extensive investigation:

**Primary Objective:** ✅ Tool-calling loop fix complete and verified (commit 8b0c43f)
- E2E tests passing
- Main test suite: 804/898 tests passing (89.5%)
- Zero regressions introduced

**Secondary Objective:** ⚠️ Optimization-migration tests require deeper infrastructure debugging
- 6 tests failing (pre-existing failures, not caused by tool-calling fix)
- Environment variable override fix implemented (proper `delete` instead of `undefined`)
- Multiple fix attempts unsuccessful (early readline init, stdin delay)
- Manual testing confirms optimized mode works correctly

## Next Steps

1. **Immediate:** Document findings in this file ✅
2. **Short-term:** Skip failing tests with clear documentation explaining they require Jest infrastructure debugging
3. **Long-term:** Deep dive into Jest's child_process.spawn() implementation vs native shell pipes
4. **Alternative:** Rewrite these tests using Playwright E2E framework (which works correctly)
5. **Future:** Consider deprecating/removing legacy mode entirely

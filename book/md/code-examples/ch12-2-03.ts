/**
 * Without observability
 */
function withoutObservability() {
  // User reports issue
  console.log('User: My request failed');

  // You have no visibility
  // - No logs to check
  // - No metrics to analyze
  // - No trace to follow
  // - No error details

  // Result: 60+ minutes debugging
  // - Checking code
  // - Adding console.log
  // - Reproducing locally
  // - Guessing root cause
}

/**
 * With observability
 */
async function withObservability() {
  // User reports issue
  console.log('User: My request failed at 14:32');

  // Check dashboard
  const trace = await tracing.getTrace('req_abc123');

  console.log(`
📊 Request Trace: req_abc123
├─ User: user_456
├─ Timestamp: 2024-01-15 14:32:15
├─ Duration: 3,456ms
├─ Status: FAILED
├─
├─ Spans:
│  ├─ [200ms] Validate Input ✓
│  ├─ [150ms] Check Cache ✓ (miss)
│  ├─ [2,100ms] AI Provider: Anthropic
│  │  ├─ Status: 429 Rate Limit
│  │  └─ Error: Rate limit exceeded
│  ├─ [890ms] Fallback: OpenAI ✓
│  │  └─ Success
│  └─ [116ms] Cache Result ✓
├─
├─ Root Cause: Anthropic rate limit
├─ Resolution: Fallback succeeded
└─ Action Taken: Increased rate limit
  `);

  // Result: 2 minutes to identify and resolve
}
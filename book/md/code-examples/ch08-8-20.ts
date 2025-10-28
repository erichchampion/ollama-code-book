// User input: "commit my auth changes and run tests"
const result = await orchestrator.execute(
  "commit my auth changes and run tests",
  context
);

// Console output:
/*
📋 Workflow Progress:

✅ Step 1: commit
  ✓ Committed: fix(auth): resolve token refresh race condition

▶️  Step 2: test
  Running tests...

// After tests complete:

📋 Workflow Progress:

✅ Step 1: commit
  ✓ Committed: fix(auth): resolve token refresh race condition

✅ Step 2: test
  ✓ All tests passed (47 tests, 0 failures)
*/
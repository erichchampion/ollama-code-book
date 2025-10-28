# AI Testing Strategy

## Overview

This document defines the testing strategy for AI-powered features in ollama-code. It provides guidelines on when to use real AI models, mocks, or fixtures, and how to ensure reliable, fast, and comprehensive test coverage.

## Testing Approaches

### 1. Fixture-Based Testing (Default)

**Purpose:** Fast, deterministic testing of AI response parsing and processing logic

**When to Use:**
- ✅ Unit tests for response parsing
- ✅ Regression tests for known scenarios
- ✅ CI/CD pipelines (fast feedback)
- ✅ Offline development
- ✅ Edge case validation

**Advantages:**
- ⚡ Fast execution (<10ms)
- 🎯 Deterministic results
- 💰 No API costs
- 🔒 Works offline
- 📦 Version controlled

**Disadvantages:**
- ⚠️ May become outdated
- ⚠️ Doesn't test actual AI integration
- ⚠️ Limited to captured scenarios

**Example:**
```typescript
import { loadAIFixture } from '../helpers/ai-fixture-helper';

test('should parse code generation response', async () => {
  const fixture = await loadAIFixture('code-generation/simple-function.json');
  const parsed = parseCodeResponse(fixture.response);

  expect(parsed.code).toContain('function');
  expect(parsed.language).toBe('javascript');
});
```

---

### 2. Mock-Based Testing

**Purpose:** Test business logic without AI dependency

**When to Use:**
- ✅ Unit tests for AI provider interfaces
- ✅ Error handling logic
- ✅ Retry mechanisms
- ✅ Rate limiting logic
- ✅ Provider selection logic

**Advantages:**
- ⚡ Very fast (<1ms)
- 🎯 Full control over responses
- 🧪 Easy to test error scenarios
- 🔄 No external dependencies

**Disadvantages:**
- ⚠️ Doesn't test real AI behavior
- ⚠️ May not reflect actual API responses
- ⚠️ Requires manual mock updates

**Example:**
```typescript
const mockProvider = {
  complete: jest.fn().mockResolvedValue({
    content: 'function add(a, b) { return a + b; }',
    usage: { promptTokens: 10, completionTokens: 20 }
  })
};

test('should handle provider timeout', async () => {
  mockProvider.complete.mockRejectedValue(new Error('Timeout'));
  await expect(service.generateCode('add function')).rejects.toThrow('Timeout');
});
```

---

### 3. Real AI Testing (Integration)

**Purpose:** Validate actual AI integration and quality

**When to Use:**
- ✅ Integration tests (weekly/on-demand)
- ✅ Quality benchmarking
- ✅ Prompt engineering validation
- ✅ Model comparison
- ✅ Manual testing support

**Advantages:**
- ✅ Tests real behavior
- ✅ Validates prompt quality
- ✅ Detects API changes
- ✅ Quality assurance

**Disadvantages:**
- 🐌 Slow (500ms - 5s per test)
- 💰 May have API costs
- 🎲 Non-deterministic
- 📡 Requires network/model access
- ❌ Can be flaky

**Example:**
```typescript
import { testWithAI } from '../helpers/ai-test-helper';

testWithAI('should generate valid JavaScript function', async () => {
  const response = await aiProvider.complete(
    'Generate a function to calculate factorial'
  );

  expect(response).toMatch(/function.*factorial/i);
  expect(response).toMatch(/return/);
}, { skipIfMock: true, timeout: 10000 });
```

---

## Testing Decision Matrix

| Scenario | Recommended Approach | Why |
|----------|---------------------|-----|
| Response parsing logic | **Fixtures** | Fast, deterministic |
| Provider interface contracts | **Mocks** | No external deps needed |
| Error handling | **Mocks** | Easy to trigger errors |
| Prompt effectiveness | **Real AI** | Validates actual output |
| Integration with Ollama | **Real AI** | Tests real connection |
| CI/CD pipeline | **Fixtures** | Fast, reliable |
| Nightly quality tests | **Real AI** | Validates quality |
| Security vulnerability detection | **Fixtures + Real AI** | Both for coverage |
| Code generation quality | **Real AI (manual)** | Human validation needed |

---

## Test Organization

### Directory Structure

```
tests/
├── unit/                       # Unit tests (mocks/fixtures)
│   ├── ai/providers/          # Provider logic tests (mocks)
│   ├── ai/parsing/            # Response parsing (fixtures)
│   └── ai/validation/         # Input validation (mocks)
├── integration/               # Integration tests (real AI optional)
│   ├── ai-providers/          # Provider integration tests
│   └── ai-workflows/          # End-to-end AI workflows
├── fixtures/ai-responses/     # AI response fixtures
│   ├── code-generation/
│   ├── security-analysis/
│   └── code-explanation/
├── helpers/
│   ├── ai-test-helper.ts      # Real AI testing utilities
│   └── ai-fixture-helper.ts   # Fixture loading utilities
└── docker/                    # Docker test environment
    └── ollama-test.Dockerfile
```

---

## Environment Configuration

### Environment Variables

```bash
# Enable real AI testing (default: false)
USE_REAL_AI=true

# Ollama test instance URL (default: http://localhost:11435)
OLLAMA_TEST_HOST=http://localhost:11435

# Model to use for tests (default: tinyllama)
OLLAMA_TEST_MODEL=tinyllama

# Request timeout in ms (default: 30000)
OLLAMA_TEST_TIMEOUT=30000
```

### Running Tests

```bash
# Run all tests with fixtures (fast, default)
yarn test

# Run tests with real AI (slow, comprehensive)
USE_REAL_AI=true yarn test:ai-integration

# Run specific AI integration tests
USE_REAL_AI=true yarn test tests/integration/ai-providers/

# Run with specific model
OLLAMA_TEST_MODEL=llama3.2 USE_REAL_AI=true yarn test:ai-integration
```

---

## Test Writing Guidelines

### 1. Always Start with Fixtures

```typescript
// ✅ Good: Start with fixture-based test
test('should parse security analysis response', async () => {
  const fixture = await loadAIFixture('security-analysis/sql-injection-detected.json');
  const result = parseSecurityResponse(fixture.response);

  expect(result.vulnerabilities).toHaveLength(1);
  expect(result.vulnerabilities[0].type).toBe('SQL_INJECTION');
  expect(result.vulnerabilities[0].severity).toBe('CRITICAL');
});
```

### 2. Add Real AI Tests for Critical Features

```typescript
// ✅ Good: Add real AI test for integration validation
describeWithAI('Security Analysis Integration', () => {
  test('should detect SQL injection in real code', async () => {
    const code = `
      function getUser(id) {
        return db.query('SELECT * FROM users WHERE id = ' + id);
      }
    `;

    const result = await securityAnalyzer.analyze(code);

    expect(result.vulnerabilities.length).toBeGreaterThan(0);
    expect(result.vulnerabilities.some(v => v.type === 'SQL_INJECTION')).toBe(true);
  });
});
```

### 3. Use Conditional Testing

```typescript
// ✅ Good: Conditional test execution based on environment
testWithAI(
  'should generate high-quality factorial function',
  async () => {
    const response = await aiProvider.complete(
      'Generate a recursive factorial function in JavaScript'
    );

    expect(response).toMatch(/function.*factorial/i);
    expect(response).toMatch(/if.*<=.*1/); // Base case
    expect(response).toMatch(/factorial\(.*-.*1/); // Recursive call
  },
  { skipIfMock: true, timeout: 10000 }
);
```

### 4. Document Test Intent

```typescript
/**
 * Tests AI provider's ability to detect security vulnerabilities
 * Uses fixtures by default for speed, real AI when USE_REAL_AI=true
 *
 * Fixtures tested:
 * - SQL injection detection
 * - XSS vulnerability detection
 * - Hardcoded secrets detection
 *
 * Real AI tests validate:
 * - Actual detection accuracy
 * - Prompt effectiveness
 * - Response quality
 */
describe('Security Vulnerability Detection', () => {
  // Tests here...
});
```

---

## Fixture Management

### Creating New Fixtures

```typescript
// Capture a new fixture during development
import { captureAIResponse } from '../helpers/ai-fixture-helper';

test('capture factorial explanation fixture', async () => {
  const prompt = 'Explain how this factorial function works: ...';
  const response = await aiProvider.complete(prompt);

  await captureAIResponse('code-explanation/factorial-function.json', {
    prompt,
    response,
    model: 'tinyllama',
    tags: ['code-explanation', 'recursion', 'factorial'],
    validation: {
      expectedPatterns: ['recursive', 'base case'],
      shouldNotContain: ['error'],
      minLength: 200
    }
  });
});
```

### Updating Fixtures

```bash
# Update all fixtures with current model
USE_REAL_AI=true yarn test:capture-fixtures

# Review changes
git diff tests/fixtures/ai-responses/

# Commit if improved
git add tests/fixtures/ai-responses/
git commit -m "chore: update AI fixtures with improved model responses"
```

### Validating Fixtures

```typescript
import { validateAllFixtures } from '../helpers/ai-fixture-helper';

test('all fixtures should be valid', async () => {
  const validation = await validateAllFixtures();

  expect(validation.invalid).toHaveLength(0);

  if (validation.invalid.length > 0) {
    console.log('Invalid fixtures:', validation.invalid);
  }
});
```

---

## Performance Benchmarks

### Execution Time Targets

| Test Type | Target Time | Max Acceptable |
|-----------|-------------|----------------|
| Fixture-based | <10ms | 50ms |
| Mock-based | <1ms | 10ms |
| Real AI (TinyLlama) | 500ms - 1s | 5s |
| Real AI (Llama 3.2) | 1s - 3s | 10s |
| Real AI (CodeLlama) | 2s - 5s | 15s |

### Test Suite Targets

| Suite | Tests | Fixtures | Mocks | Real AI | Total Time |
|-------|-------|----------|-------|---------|------------|
| Unit | 500 | 200 | 300 | 0 | <5s |
| Integration | 100 | 50 | 0 | 50 | <30s (fixtures)<br>~2min (real AI) |
| E2E | 50 | 30 | 0 | 20 | ~1min (real AI) |

---

## Quality Metrics

### Test Coverage Targets

- **Fixture Coverage:** 80% of AI response scenarios
- **Integration Coverage:** 60% of AI workflows
- **Real AI Coverage:** 40% of critical features

### Quality Validation

```typescript
// Validate AI response quality against fixtures
test('real AI should match fixture quality', async () => {
  const fixture = await loadAIFixture('code-generation/factorial.json');

  if (process.env.USE_REAL_AI === 'true') {
    const realResponse = await aiProvider.complete(fixture.prompt);

    // Validate structure matches fixture
    const fixtureValidation = validateFixture(fixture);
    expect(fixtureValidation.valid).toBe(true);

    // Apply same validation to real response
    const mockFixture = { ...fixture, response: realResponse };
    const realValidation = validateFixture(mockFixture);

    expect(realValidation.valid).toBe(true);
  }
});
```

---

## CI/CD Integration

### Fast Feedback Loop (PR Checks)

```yaml
- name: Run Fast Tests (Fixtures)
  run: yarn test
  env:
    USE_REAL_AI: false
```

### Nightly Quality Validation

```yaml
- name: Start Ollama Test Instance
  run: |
    cd tests/docker
    docker-compose -f docker-compose.test.yml up -d

- name: Run AI Integration Tests
  run: yarn test:ai-integration
  env:
    USE_REAL_AI: true
    OLLAMA_TEST_HOST: http://localhost:11435
```

---

## Flakiness Management

### Strategies to Reduce Flakiness

1. **Use Deterministic Fixtures** for CI/CD
2. **Increase Timeouts** for real AI tests (5-10s)
3. **Retry Failed Tests** (max 2 retries for AI tests)
4. **Skip on Model Unavailable** instead of failing
5. **Validate Prerequisites** before running AI tests

### Handling Non-Deterministic Responses

```typescript
// Use flexible assertions for real AI
testWithAI('should generate valid code', async () => {
  const response = await aiProvider.complete('Generate add function');

  // Flexible assertions
  expect(response).toMatch(/function|const|let/); // Multiple patterns
  expect(response).toMatch(/\+|add|sum/); // Semantic variations
  expect(response.length).toBeGreaterThan(20); // Reasonable length
}, { skipIfMock: true });
```

---

## Troubleshooting

### Common Issues

#### 1. "Ollama test instance not available"

```bash
# Start test instance
cd tests/docker
docker-compose -f docker-compose.test.yml up -d

# Wait for ready
curl http://localhost:11435/api/tags
```

#### 2. "Model not found"

```bash
# Pull model
docker-compose -f docker-compose.test.yml exec ollama-test ollama pull tinyllama
```

#### 3. "Tests timing out"

```typescript
// Increase timeout for real AI tests
testWithAI('slow test', async () => {
  // ...
}, { timeout: 30000 }); // 30 seconds
```

#### 4. "Fixtures validation failing"

```bash
# Re-capture fixtures with current model
USE_REAL_AI=true yarn test:capture-fixtures
```

---

## Best Practices Summary

### Do's ✅

- ✅ Use fixtures for fast, deterministic tests
- ✅ Use real AI for integration validation
- ✅ Document test intent and approach
- ✅ Keep fixtures up-to-date
- ✅ Validate prerequisites before AI tests
- ✅ Use flexible assertions for real AI
- ✅ Tag tests appropriately
- ✅ Set reasonable timeouts

### Don'ts ❌

- ❌ Don't use real AI in unit tests
- ❌ Don't make tests depend on specific AI phrasing
- ❌ Don't ignore fixture validation failures
- ❌ Don't skip error case testing
- ❌ Don't use outdated fixtures
- ❌ Don't run real AI tests on every PR
- ❌ Don't hard-code API keys in tests
- ❌ Don't fail silently when AI unavailable

---

## Next Steps

1. **Phase 1:** Establish fixture library (20-30 fixtures)
2. **Phase 2:** Add real AI integration tests (critical paths)
3. **Phase 3:** Set up nightly AI quality validation
4. **Phase 4:** Implement automated fixture refresh
5. **Phase 5:** Build AI quality benchmarking dashboard

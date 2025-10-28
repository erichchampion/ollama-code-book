# AI Response Fixtures

This directory contains pre-captured AI responses for testing purposes.

## Purpose

AI response fixtures enable:
1. **Deterministic Testing** - Consistent results across test runs
2. **Fast Test Execution** - No real AI calls needed for most tests
3. **Offline Testing** - Tests work without AI model access
4. **Regression Detection** - Detect changes in response parsing logic

## Structure

```
ai-responses/
├── code-generation/     # Code generation responses
├── code-explanation/    # Code explanation responses
├── code-review/         # Code review responses
├── security-analysis/   # Security scan responses
├── refactoring/         # Refactoring suggestions
├── test-generation/     # Test generation responses
└── errors/             # Error and edge case responses
```

## Usage

### Loading Fixtures in Tests

```typescript
import { loadAIFixture, getFixturePath } from '../../helpers/ai-fixture-helper';

test('should parse code generation response', () => {
  const fixture = loadAIFixture('code-generation/simple-function.json');

  expect(fixture.prompt).toBeDefined();
  expect(fixture.response).toBeDefined();
  expect(fixture.metadata.model).toBe('tinyllama');
});
```

### Capturing New Fixtures

```typescript
import { captureAIResponse } from '../../helpers/ai-fixture-helper';

test('capture AI response for factorial function', async () => {
  const prompt = 'Generate a JavaScript function to calculate factorial';
  const response = await aiProvider.complete(prompt);

  await captureAIResponse('code-generation/factorial.json', {
    prompt,
    response,
    model: 'tinyllama',
    tags: ['code-generation', 'factorial', 'javascript']
  });
});
```

## Fixture Format

Each fixture is a JSON file with the following structure:

```json
{
  "id": "unique-fixture-id",
  "category": "code-generation",
  "prompt": "The input prompt sent to AI",
  "response": "The AI's complete response",
  "metadata": {
    "model": "tinyllama",
    "timestamp": "2025-01-01T00:00:00Z",
    "provider": "ollama",
    "temperature": 0.7,
    "maxTokens": 2048,
    "responseTime": 1234,
    "tags": ["tag1", "tag2"]
  },
  "validation": {
    "expectedPatterns": ["function", "return"],
    "shouldNotContain": ["error", "undefined"]
  }
}
```

## Fixture Categories

### Code Generation (`code-generation/`)
- Simple functions
- Class definitions
- React components
- API endpoints
- Algorithm implementations

### Code Explanation (`code-explanation/`)
- Function explanations
- Complex algorithm walkthroughs
- Architecture overviews
- API documentation

### Code Review (`code-review/`)
- Security issues
- Performance problems
- Best practice violations
- Code smell detection

### Security Analysis (`security-analysis/`)
- SQL injection detection
- XSS vulnerability detection
- Hardcoded secrets
- Insecure dependencies

### Refactoring (`refactoring/`)
- Extract method
- Simplify conditionals
- Remove duplication
- Improve naming

### Test Generation (`test-generation/`)
- Unit test generation
- Integration test generation
- Test case suggestions
- Edge case identification

### Errors (`errors/`)
- Timeout responses
- Rate limit errors
- Invalid prompts
- Malformed responses

## Maintenance

### Updating Fixtures

When AI models are updated, fixtures should be refreshed:

```bash
# Capture new responses with updated model
USE_REAL_AI=true yarn test:capture-fixtures

# Review changes
git diff tests/fixtures/ai-responses/

# Commit if responses improved
git add tests/fixtures/ai-responses/
git commit -m "chore: update AI response fixtures with improved model"
```

### Validating Fixtures

```bash
# Validate all fixtures match schema
yarn test:validate-fixtures

# Check for outdated fixtures (>6 months old)
yarn test:check-fixture-age
```

## Best Practices

1. **Keep fixtures realistic** - Capture from actual AI responses
2. **Include variety** - Cover happy paths and edge cases
3. **Document context** - Explain why fixture exists
4. **Update regularly** - Refresh when models improve
5. **Version control** - Track changes in git
6. **Minimize size** - Trim unnecessary tokens
7. **Validate schema** - Ensure fixtures match expected format

## Guidelines for New Fixtures

### When to Create a Fixture

Create a new fixture when:
- Testing new AI feature or capability
- Adding regression test for specific issue
- Documenting expected AI behavior
- Creating benchmark for quality comparison

### Fixture Naming Convention

```
{category}/{description}-{variant}.json

Examples:
- code-generation/react-component-simple.json
- security-analysis/sql-injection-detected.json
- code-review/performance-issue-loop.json
- errors/timeout-large-codebase.json
```

### Required Metadata

Every fixture must include:
- `id` - Unique identifier
- `category` - One of the predefined categories
- `prompt` - The input sent to AI
- `response` - The AI's response
- `metadata.model` - Which model generated the response
- `metadata.timestamp` - When it was captured
- `metadata.tags` - Searchable tags

## Testing Strategies

### Strategy 1: Fixture-First (Default)

Use fixtures for fast, deterministic tests:

```typescript
test('should extract function from code', () => {
  const fixture = loadAIFixture('code-generation/simple-function.json');
  const result = parseAIResponse(fixture.response);
  expect(result.type).toBe('function');
});
```

### Strategy 2: Real AI with Validation

Use real AI but validate against fixture expectations:

```typescript
testWithAI('should generate valid function', async () => {
  const fixture = loadAIFixture('code-generation/simple-function.json');
  const realResponse = await aiProvider.complete(fixture.prompt);

  // Validate structure matches fixture
  expect(realResponse).toMatchPattern(fixture.validation.expectedPatterns);
});
```

### Strategy 3: Snapshot Testing

Capture and compare AI responses:

```typescript
test('AI response should match snapshot', () => {
  const fixture = loadAIFixture('code-generation/factorial.json');
  expect(fixture.response).toMatchSnapshot();
});
```

## Performance Considerations

| Test Type | Fixture | Real AI (TinyLlama) |
|-----------|---------|---------------------|
| Load Time | <1ms | N/A |
| Execution | <10ms | 500ms-2s |
| Deterministic | ✅ Yes | ❌ No |
| Coverage | ✅ High | ✅ High |
| Realism | ⚠️ Dated | ✅ Current |

**Recommendation:** Use fixtures for CI/CD and regression tests. Use real AI for integration and quality validation.

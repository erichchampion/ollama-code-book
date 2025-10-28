# Streaming Tool Calling Integration Proposal

## Executive Summary

This proposal outlines how to leverage Ollama's new streaming tool calling capabilities to dramatically improve the responsiveness and capabilities of `ollama-code`. Based on the [Ollama streaming tool blog post](https://ollama.com/blog/streaming-tool), we can enable real-time tool execution with progressive feedback to users.

## Current State Analysis

### What We Have
1. **Existing Tool System** (`src/tools/`)
   - Well-defined tool interfaces (`BaseTool`, `ToolMetadata`)
   - Tool registry and orchestration
   - Categories: filesystem, search, execution, git, code analysis, testing

2. **Ollama Client** (`src/ai/ollama-client.ts`)
   - Basic streaming support (`completeStream`)
   - Currently only streams text responses
   - No tool calling integration

3. **Interactive Mode** (`src/interactive/`)
   - File operation routing
   - AI-powered responses
   - Manual tool execution based on routing

### Current Limitations
- **No real-time tool calling**: Tools are manually invoked based on intent classification
- **No progressive feedback**: Users wait for full response before seeing tool results
- **Limited streaming benefits**: Only used for text, not for tool execution
- **Routing overhead**: Separate NL router classifies intent, then triggers tools

## Proposed Architecture

### 1. Enhanced Ollama Client with Streaming Tool Support

**File**: `src/ai/ollama-client.ts`

#### New Interface Types
```typescript
export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

export interface OllamaToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface OllamaStreamEventWithTools extends OllamaStreamEvent {
  message?: {
    role: string;
    content: string;
    tool_calls?: OllamaToolCall[];
  };
}
```

#### Enhanced Streaming Method
```typescript
async completeStreamWithTools(
  prompt: string | OllamaMessage[],
  tools: OllamaTool[],
  options: CompletionOptions,
  callbacks: {
    onContent: (chunk: string) => void;
    onToolCall: (toolCall: OllamaToolCall) => Promise<any>;
    onComplete: () => void;
    onError: (error: Error) => void;
  },
  abortSignal?: AbortSignal
): Promise<void>
```

### 2. Tool Registry to Ollama Format Converter

**File**: `src/tools/ollama-adapter.ts` (new)

Convert existing tool definitions to Ollama's expected format:

```typescript
export class OllamaToolAdapter {
  /**
   * Convert BaseTool to Ollama tool format
   */
  static toOllamaFormat(tool: BaseTool): OllamaTool {
    return {
      type: 'function',
      function: {
        name: tool.metadata.name,
        description: tool.metadata.description,
        parameters: {
          type: 'object',
          properties: this.convertParameters(tool.metadata.parameters),
          required: tool.metadata.parameters
            .filter(p => p.required)
            .map(p => p.name)
        }
      }
    };
  }

  /**
   * Convert all registered tools
   */
  static getAllTools(registry: ToolRegistry): OllamaTool[] {
    return registry.list().map(metadata => {
      const tool = registry.get(metadata.name);
      return this.toOllamaFormat(tool!);
    });
  }
}
```

### 3. Streaming Tool Orchestrator

**File**: `src/tools/streaming-orchestrator.ts` (new)

Coordinates streaming responses with real-time tool execution:

```typescript
export class StreamingToolOrchestrator {
  constructor(
    private ollamaClient: OllamaClient,
    private toolRegistry: ToolRegistry,
    private terminal: Terminal
  ) {}

  async executeWithStreaming(
    userPrompt: string,
    context: ToolExecutionContext
  ): Promise<void> {
    // Get all available tools
    const tools = OllamaToolAdapter.getAllTools(this.toolRegistry);

    // Track tool results for follow-up
    const toolResults: Record<string, any> = {};

    await this.ollamaClient.completeStreamWithTools(
      userPrompt,
      tools,
      { /* options */ },
      {
        onContent: (chunk: string) => {
          // Stream text response to terminal
          this.terminal.write(chunk);
        },

        onToolCall: async (toolCall: OllamaToolCall) => {
          // Execute tool in real-time
          const tool = this.toolRegistry.get(toolCall.function.name);
          if (!tool) {
            throw new Error(`Tool not found: ${toolCall.function.name}`);
          }

          this.terminal.info(`🔧 Executing: ${toolCall.function.name}`);

          const params = JSON.parse(toolCall.function.arguments);
          const result = await tool.execute(params, context);

          toolResults[toolCall.id] = result;

          // Show result to user
          if (result.success) {
            this.terminal.success(`✓ ${toolCall.function.name} completed`);
          } else {
            this.terminal.error(`✗ ${toolCall.function.name} failed: ${result.error}`);
          }

          return result;
        },

        onComplete: () => {
          this.terminal.info('Task completed');
        },

        onError: (error: Error) => {
          this.terminal.error(`Error: ${error.message}`);
        }
      }
    );
  }
}
```

### 4. Interactive Mode Integration

**File**: `src/interactive/optimized-enhanced-mode.ts`

Replace manual routing with streaming tool orchestration:

```typescript
private async handleUserInput(userInput: string): Promise<void> {
  // Instead of routing and manual tool execution...
  const context: ToolExecutionContext = {
    projectRoot: this.projectRoot,
    workingDirectory: process.cwd(),
    environment: process.env as Record<string, string>,
    timeout: 60000
  };

  const orchestrator = new StreamingToolOrchestrator(
    this.ollamaClient,
    this.toolRegistry,
    this.terminal
  );

  await orchestrator.executeWithStreaming(userInput, context);
}
```

## Benefits

### 1. **Real-Time Responsiveness**
- Users see progress as tools execute
- No waiting for full response before action
- Better UX for long-running operations

### 2. **Simplified Architecture**
- No separate NL router needed
- Model decides which tools to call
- Less custom routing logic to maintain

### 3. **Better Tool Discovery**
- Model has access to all tool descriptions
- Can chain tools intelligently
- Natural multi-step workflows

### 4. **Improved Accuracy**
- Models trained for tool calling are more reliable
- Incremental parser handles partial responses
- Better at selecting appropriate tools

### 5. **Progressive Enhancement**
```
Before (Current):
User: "Create a React component and run tests"
[Wait 10s] → Creates file
[Wait 10s] → Runs tests
[Wait 2s]  → Shows results

After (Streaming Tools):
User: "Create a React component and run tests"
🔧 Executing: create_file
✓ File created: LoginForm.jsx
🔧 Executing: run_tests
... test output streams ...
✓ All tests passed
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Add tool call types to `ollama-client.ts`
- [ ] Implement `completeStreamWithTools` method
- [ ] Create `OllamaToolAdapter` class
- [ ] Write unit tests

### Phase 2: Orchestration (Week 2)
- [ ] Build `StreamingToolOrchestrator`
- [ ] Integrate with existing tool registry
- [ ] Handle tool execution errors
- [ ] Add progress indicators

### Phase 3: Integration (Week 3)
- [ ] Update interactive mode to use streaming tools
- [ ] Add configuration options (enable/disable)
- [ ] Migrate file operations to streaming
- [ ] Update documentation

### Phase 4: Enhancement (Week 4)
- [ ] Add tool result caching
- [ ] Implement tool chaining
- [ ] Add approval workflows for dangerous tools
- [ ] Performance optimization

## Tools to Expose

Based on current `src/tools/`, expose these to Ollama:

### High Priority
1. **filesystem** - Read, write, search files
2. **code-editor** - Create, edit, refactor code
3. **search** - Grep, find patterns
4. **execution** - Run commands, tests

### Medium Priority
5. **git** - Commit, diff, status
6. **code-analysis** - AST analysis, complexity metrics
7. **testing** - Generate and run tests

### Low Priority (require approval)
8. **refactoring** - Large-scale code changes
9. **deployment** - Build, deploy operations

## Safety Considerations

### 1. Tool Approval Workflows
```typescript
interface ToolApprovalConfig {
  requireApproval: boolean;
  autoApproveCategories: string[];
  dangerousOperations: string[];
}
```

### 2. Execution Limits
- Timeout per tool: 30s default
- Max concurrent tools: 3
- Max tool calls per request: 10

### 3. Sandboxing
- Tools run in isolated context
- Working directory restrictions
- File system access controls

## Example User Flows

### 1. File Creation with Validation
```
User: Create a React login component with tests

🤖 Thinking...
🔧 Executing: create_file
   Creating: src/components/LoginForm.jsx...
✓ File created successfully

🔧 Executing: generate_tests
   Creating: src/components/LoginForm.test.jsx...
✓ Tests created

🔧 Executing: run_tests
   Running Jest...
   ✓ LoginForm renders correctly
   ✓ Handles submit event
✓ All tests passed (2 tests, 0 failures)

✅ Complete! Created component with passing tests.
```

### 2. Multi-Step Analysis
```
User: Find all TODO comments and create issues

🤖 Searching codebase...
🔧 Executing: search_code
   Pattern: TODO|FIXME
   Found 15 matches across 8 files

🔧 Executing: create_github_issue
   Issue #1: Refactor authentication logic
   Issue #2: Add error handling to API calls
   ...
✓ Created 15 GitHub issues

📊 Summary: Found 15 TODOs, created 15 issues
```

## Metrics for Success

1. **Performance**
   - Time to first tool execution < 2s
   - Streaming latency < 100ms per chunk
   - Tool execution success rate > 95%

2. **User Experience**
   - Reduced perceived wait time by 50%
   - Increased multi-tool usage by 3x
   - User satisfaction score > 4.5/5

3. **Code Quality**
   - Reduced routing code by 60%
   - Test coverage maintained > 90%
   - No regression in existing features

## Compatibility

### Supported Models
- ✅ Llama 3.1 8B and above
- ✅ Qwen 2.5 Coder
- ✅ Mistral models with tool support
- ⚠️ Fallback for models without native tool support

### Configuration
```typescript
{
  "streaming": {
    "enableToolCalling": true,
    "fallbackToRouting": true, // If model doesn't support tools
    "maxToolsPerRequest": 10,
    "toolTimeout": 30000
  }
}
```

## Migration Strategy

### Backward Compatibility
1. Keep existing routing system as fallback
2. Feature flag for streaming tools: `ENABLE_STREAMING_TOOLS`
3. Gradual rollout: CLI flag `--streaming-tools`

### Testing Strategy
1. Unit tests for each component
2. Integration tests with real Ollama
3. E2E tests for common workflows
4. Performance benchmarks

## Conclusion

Implementing streaming tool calling will transform `ollama-code` from a reactive system (classify → execute) to a proactive, real-time assistant. The model becomes the orchestrator, choosing and executing tools as needed, while users get immediate feedback on progress.

This aligns with modern AI assistant patterns and leverages Ollama's latest capabilities for a superior developer experience.

## Next Steps

1. **Review this proposal** with team
2. **Prototype** basic streaming tool call in branch
3. **Benchmark** performance vs current approach
4. **Decide** on implementation timeline
5. **Create** detailed technical specs for Phase 1

# Tool Calling Debug Guide

**Issue:** Model describes changes instead of using tools to execute them
**Status:** 🔍 Debugging in progress

## Recent Changes

### 1. Simplified System Prompt
Replaced verbose system prompt with concise, direct instructions:

**Before (verbose):**
```
You are an AI coding assistant with direct access to tools for file manipulation and code execution.
Your role is to TAKE ACTION by using the available tools, not just describe what to do.

CRITICAL GUIDELINES:
- When a user asks you to create, modify, or analyze code, USE THE TOOLS IMMEDIATELY
...
[40+ lines of instructions]
```

**After (concise):**
```
You are an AI coding assistant with access to tools. When users ask you to create or modify files, you MUST use the tools to take action.

AVAILABLE TOOLS:
- filesystem: Create, read, write, list, search, and delete files
- search: Search for files and content in the project
- execution: Run shell commands

CRITICAL: Always use tools to complete tasks. Never just describe what should be done.

Example 1 - Creating a file:
User: "Create a React login component"
YOU MUST: Call the filesystem tool with operation="write", path="LoginComponent.tsx", content="[component code]"
NEVER: Just show code examples or describe the component
...
```

### 2. Added Debug Logging
Added logging to see what's being sent to the API:
- System prompt length and preview
- Tool names and count

Location: `src/tools/streaming-orchestrator.ts:143-151`

## Debugging Steps

### Step 1: Enable Debug Logging

Set the log level to DEBUG to see what's being sent:

```bash
export LOG_LEVEL=debug
yarn start
```

### Step 2: Test with Simple Request

Try a minimal test case:

```
> Create a file called test.txt with content "Hello World"
```

**Expected behavior:**
1. Debug logs show: "System prompt being sent" with prompt preview
2. Debug logs show: "Tools being sent" with tool names
3. Model calls filesystem tool
4. File is created

**If model doesn't use tools, check:**
- Are tools being sent? (Look for "Tools being sent" log)
- Is system prompt being sent? (Look for "System prompt being sent" log)
- What does the model's response look like?

### Step 3: Verify Tool Format

Run this to verify tool definitions:

```bash
node -e "
const { toolRegistry, initializeToolSystem } = require('./dist/src/tools/index.js');
const { OllamaToolAdapter } = require('./dist/src/tools/ollama-adapter.js');

initializeToolSystem();
const tools = OllamaToolAdapter.getAllTools(toolRegistry);

console.log('Tool being sent to API:');
console.log(JSON.stringify(tools[0], null, 2));
"
```

**Expected output:**
```json
{
  "type": "function",
  "function": {
    "name": "filesystem",
    "description": "...",
    "parameters": {
      "type": "object",
      "properties": { ... },
      "required": ["operation", "path"]
    }
  }
}
```

### Step 4: Test devstral Tool Calling Directly

Test if devstral actually supports tool calling:

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "devstral:latest",
  "messages": [
    {
      "role": "system",
      "content": "You have access to tools. Use them to complete tasks."
    },
    {
      "role": "user",
      "content": "Create a file called hello.txt with content Hello World"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "create_file",
        "description": "Create a new file",
        "parameters": {
          "type": "object",
          "properties": {
            "filename": {
              "type": "string",
              "description": "The name of the file"
            },
            "content": {
              "type": "string",
              "description": "The content to write"
            }
          },
          "required": ["filename", "content"]
        }
      }
    }
  ],
  "stream": false
}' | python3 -m json.tool
```

**Look for:** Does the response include a `tool_calls` field?

### Step 5: Try Alternative Models

If devstral doesn't work, test with known tool-calling models:

```bash
# Test with mistral (confirmed tool calling support)
ollama pull mistral
```

Then temporarily change the model in constants:

```typescript
// src/constants.ts
export const DEFAULT_MODEL = 'mistral:latest';
```

## Common Issues and Solutions

### Issue 1: Tools Not Being Sent

**Symptom:** No "Tools being sent" debug log appears

**Possible causes:**
- Tool system not initialized
- Tool registry empty
- OllamaToolAdapter not converting tools correctly

**Fix:** Check tool registration in `src/tools/index.ts`

### Issue 2: System Prompt Not Being Sent

**Symptom:** No "System prompt being sent" debug log appears

**Possible causes:**
- Dynamic import failing
- generateToolCallingSystemPrompt() not exported
- System prompt is undefined/empty

**Fix:** Verify exports in `src/ai/prompts.ts`

### Issue 3: Model Ignores Tools

**Symptom:** Tools are sent, but model responds with text instead of tool calls

**Possible causes:**
- Model doesn't support tool calling
- System prompt is confusing the model
- Tool definitions are malformed
- Model needs specific prompting format

**Fix:**
1. Verify model supports tool calling (test with curl)
2. Try simpler system prompt
3. Try different model (mistral, llama3.1, etc.)

### Issue 4: Tool Calls Not Being Executed

**Symptom:** Model makes tool calls, but nothing happens

**Possible causes:**
- onToolCall callback not being called
- Tool execution failing silently
- Context missing required fields

**Fix:** Add logging in executeToolCall() method

## Tool Format Reference

Ollama expects tools in this format:

```json
{
  "type": "function",
  "function": {
    "name": "tool_name",
    "description": "What the tool does",
    "parameters": {
      "type": "object",
      "properties": {
        "param1": {
          "type": "string",
          "description": "Parameter description"
        }
      },
      "required": ["param1"]
    }
  }
}
```

## Testing Different System Prompts

If the current prompt doesn't work, try these alternatives:

### Option 1: Minimal Prompt
```typescript
export const TOOL_CALLING_SYSTEM_PROMPT = `You have access to tools. Use them to complete user requests. Call the filesystem tool to create or modify files.`;
```

### Option 2: Example-Heavy Prompt
```typescript
export const TOOL_CALLING_SYSTEM_PROMPT = `You can call tools to complete tasks.

When user says: "Create file.txt with content Hello"
You call: filesystem(operation="write", path="file.txt", content="Hello")

When user says: "Create a login component"
You call: filesystem(operation="write", path="LoginComponent.tsx", content="[component code]")

Always use tools instead of describing actions.`;
```

### Option 3: Direct Command
```typescript
export const TOOL_CALLING_SYSTEM_PROMPT = `USE TOOLS. DO NOT DESCRIBE. CALL filesystem TOOL TO CREATE FILES.`;
```

## Verifying Tool Calling Works

A successful tool call should look like this in the logs:

```
[DEBUG] System prompt being sent: { promptLength: 500, preview: 'You are an AI...' }
[DEBUG] Tools being sent: { toolNames: ['filesystem', 'search', 'execution'], toolCount: 3 }
[INFO] Starting streaming tool execution
🔧 Executing: filesystem
[DEBUG] Tool call executed: { toolName: 'filesystem', success: true }
✓ filesystem completed
```

## Next Steps

1. **Enable debug logging** and run a test
2. **Check the logs** for what's being sent
3. **Verify devstral tool support** with direct API call
4. **Try alternative models** if devstral doesn't support tools well
5. **Experiment with system prompts** if tools are being sent but ignored

## Files to Monitor

- `dist/src/tools/streaming-orchestrator.js` - Where tools are sent
- `dist/src/ai/ollama-client.js` - API communication
- `dist/src/ai/prompts.js` - System prompt definition
- `dist/src/tools/ollama-adapter.js` - Tool format conversion

## Useful Commands

```bash
# See current model
grep DEFAULT_MODEL src/constants.ts

# See available models
curl http://localhost:11434/api/tags | python3 -m json.tool | grep '"name"'

# Test tool calling directly
curl http://localhost:11434/api/chat -d '{ ... }' | python3 -m json.tool

# Enable debug logging
export LOG_LEVEL=debug
yarn start

# Check tool definitions
node -e "..." # (see Step 3 above)
```

## Contact Model Provider

If devstral is supposed to support tool calling but doesn't work:

1. Check Ollama devstral model card
2. Look for devstral-specific prompting requirements
3. Check if model needs fine-tuning or specific format
4. Try updating Ollama: `ollama pull devstral:latest`

---

**Current Status:** Simplified system prompt, added debug logging, ready for testing.
**Next Action:** Enable debug logging and test with simple file creation request.

# System Prompt Search Guidance Improvement

**Date**: October 19, 2024
**Issue**: Model not using search tool for "How is X used?" type questions

## The Problem

When users asked informational questions like "How is firestore used in this project?", the model would output template tokens (`<|im_start|>`) instead of using the search tool to find the answer.

### Example from Transcript

```
> How is firestore used in this project?
[2025-10-19T23:09:08.674Z] INFO: Starting streaming tool execution with history
[2025-10-19T23:09:09.796Z] WARN: Model output contains template tokens - filtering them out
[2025-10-19T23:09:10.613Z] WARN: Model provided no response and no tool calls
```

### Root Cause

The `TOOL_CALLING_SYSTEM_PROMPT` focused heavily on:
1. **CODE CREATION** - "Build X", "Create X", "Implement X"
2. **CODE ANALYSIS** - "Analyze X", "Review X", "Explain X"

But did not explicitly mention **INFORMATIONAL QUERIES** like:
- "How is X used in this project?"
- "Where is Y defined?"
- "Find usage of Z"

The model didn't understand that these questions should use the `search` tool.

## The Fix

**File**: `src/ai/prompts.ts`
**Lines**: 345-349

Added explicit guidance at the top of the Tool Usage Guidelines:

```typescript
Tool Usage Guidelines:
- For INFORMATIONAL QUERIES (e.g., "How is X used?", "Where is Y defined?", "Find usage of Z"):
  1. Use 'search' tool to find code, imports, and usage patterns
  2. Search for the EXACT identifier/keyword (e.g., "firestore" not "firestore usage")
  3. Default type is "content" which searches within files
  4. Example: { query: "firestore" } to find all uses of firestore

- For CODE CREATION/BUILDING tasks (e.g., "Build a REST API", "Create a user auth system", "Implement X"):
  ...

- For CODE ANALYSIS tasks (e.g., "Analyze this code", "Review the implementation"):
  ...
```

## Why This Helps

### 1. Explicit Pattern Matching

The prompt now explicitly lists the types of questions that should use search:
- "How is X used?"
- "Where is Y defined?"
- "Find usage of Z"

### 2. Tool Selection Guidance

The model now knows that informational queries about code should use the `search` tool, not:
- ~~filesystem (for listing files)~~
- ~~advanced-code-analysis (for analyzing specific files)~~
- ~~Just responding without tools~~

### 3. Parameter Guidance

The prompt reinforces the search tool parameter best practices:
- Use EXACT identifier (e.g., "firestore" not "firestore usage")
- Default type is "content" (searches within files)
- Provides a concrete example

## Expected Behavior After Fix

### Before Fix

```
User: "How is firestore used in this project?"
Model: <|im_start|>  (template token - confused)
Result: No answer, warning message
```

### After Fix

```
User: "How is firestore used in this project?"
Model: {"name": "search", "arguments": {"query": "firestore"}}
Search executes, finds usage
Model: "Firestore is used for authentication and real-time database..."
Result: Helpful answer based on actual code
```

## Common Informational Query Patterns

The fix should help with these question patterns:

| User Question | Expected Tool Call |
|--------------|-------------------|
| "How is X used in this project?" | `{"name": "search", "arguments": {"query": "X"}}` |
| "Where is Y defined?" | `{"name": "search", "arguments": {"query": "Y"}}` |
| "Find all uses of Z" | `{"name": "search", "arguments": {"query": "Z"}}` |
| "Show me imports of X" | `{"name": "search", "arguments": {"query": "import X"}}` |
| "What files use Y?" | `{"name": "search", "arguments": {"query": "Y"}}` |

## Relationship to Other Fixes

This fix complements the other improvements:

1. **Template Token Filtering** (TEMPLATE_TOKEN_FILTERING_FIX.md)
   - Filters out `<|im_start|>` tokens when model is confused
   - This fix reduces the confusion in the first place

2. **Search Tool Improvements** (SEARCH_TOOL_IMPROVEMENT_v2.md)
   - Made search tool parameter descriptions very directive
   - This fix ensures the model knows WHEN to use search

3. **Duplicate Detection** (DUPLICATE_DETECTION_IMPROVEMENT.md)
   - Smart duplicate detection allows follow-up searches
   - This fix ensures initial search happens

Together, these fixes create a robust system for handling informational queries.

## Testing

### Manual Testing

Try these questions to verify the fix works:

**Should now use search tool:**
```
> How is firebase used in this project?
> Where is useState defined?
> Find all API endpoints
> Show me imports of express
> What files use axios?
```

**Should still use filesystem tool:**
```
> What files are in this project?
> List the src directory
> Show me the directory structure
```

**Should still use code-analysis tool:**
```
> Analyze the authentication module
> Review src/api/users.js for security issues
```

### E2E Testing

The E2E test suite should verify:
1. Informational queries trigger search tool
2. Search tool is called with correct parameters
3. Model provides helpful answers based on search results

## Benefits

1. **Better Tool Selection** - Model chooses the right tool for informational queries
2. **Fewer Template Tokens** - Model less likely to output `<|im_start|>` when confused
3. **More Helpful Responses** - Users get actual answers based on code search
4. **Clear Categories** - Three clear categories: Informational, Creation, Analysis

## Future Improvements

1. **More Examples** - Add more example questions for each category
2. **Tool Combinations** - Guidance on when to use multiple tools together
3. **Error Recovery** - Better handling when search returns no results
4. **Context Awareness** - Help model choose between search and analysis when both could work

## Regression Issue and Fix

After the initial implementation, a regression was discovered where the filesystem tool was failing with "Invalid parameters".

### The Regression

The original prompt guidance said:
```
- Path Guidelines:
  * Omit optional path parameters if not needed
```

The model interpreted this to mean it could omit the `path` parameter from filesystem operations:
```json
{"name": "filesystem", "arguments": {"operation": "list"}}  // ❌ Missing required 'path'
```

This caused errors: `Invalid parameters for tool: filesystem`

### The Fix

Updated the prompt to be extremely explicit about when path is required vs optional:

```typescript
- When using 'filesystem' tool:
  * operation='list' → Browse directory contents (REQUIRES 'path' parameter - use "." for current directory)
  * ALWAYS include the 'path' parameter for filesystem operations

- Path Guidelines:
  * For filesystem operations: ALWAYS specify 'path' (use "." for current directory)
  * For search operations: You can omit 'path' to search the entire project
```

Now the model knows:
- ✅ Filesystem operations ALWAYS need `path`
- ✅ Use `"."` for current directory listings
- ✅ Only search operations can omit path

## Status

**✅ IMPLEMENTED**
**Regression**: ✅ FIXED
**Build**: Successful
**Testing**: Ready for user validation

## Files Modified

1. `src/ai/prompts.ts` - Added INFORMATIONAL QUERIES section and clarified path parameter requirements

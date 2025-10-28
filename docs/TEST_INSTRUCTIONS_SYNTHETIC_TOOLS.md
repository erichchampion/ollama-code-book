# Manual Testing Instructions for Synthetic Tool Calling

The automated test script has limitations with interactive sessions. Please test manually following these instructions.

## Setup

```bash
cd /Users/erich/git/github/erichchampion/ollama-code/ollama-code
yarn start --mode interactive
```

---

## Test 1: Multiple File Creation ✅ (Already Proven Working)

**Prompt:**
```
Create three files: alpha.txt with "Alpha", beta.txt with "Beta", and gamma.txt with "Gamma"
```

**Expected Result:**
- Should see JSON output for 3 filesystem tool calls
- Should see `🔧 Executing: filesystem` three times
- Should see `✓ filesystem completed` three times
- Files created in current directory

**Verification (after `exit`):**
```bash
ls alpha.txt beta.txt gamma.txt
cat alpha.txt beta.txt gamma.txt
rm alpha.txt beta.txt gamma.txt
```

**Expected Output:**
```
Alpha
Beta
Gamma
```

---

## Test 2: Command Execution

**Prompt:**
```
Run the pwd command to show the current directory
```

**Expected Result:**
- Should see JSON output for execution tool call
- Should see `🔧 Executing: execution`
- Should see current directory path in output
- Should see `✓ execution completed`

**Verification:**
```
# Just observe the output from the command
```

---

## Test 3: Mixed Operations (File + Command)

**Prompt:**
```
Create a file called readme.md with content "# Test Project", then run ls to show it
```

**Expected Result:**
- Should see 2 JSON outputs (filesystem, then execution)
- Should see `🔧 Executing: filesystem`
- Should see `🔧 Executing: execution`
- Should see readme.md in the ls output
- Both tools should complete successfully

**Verification (after `exit`):**
```bash
cat readme.md
rm readme.md
```

**Expected Output:**
```
# Test Project
```

---

## Test 4: File with Special Characters

**Prompt:**
```
Create a file called special.txt with content "Hello @user! Price: $99.99"
```

**Expected Result:**
- Should see JSON output with special characters properly escaped
- Should see `🔧 Executing: filesystem`
- Should see `✓ filesystem completed`
- File should contain exact content with special chars

**Verification (after `exit`):**
```bash
cat special.txt
rm special.txt
```

**Expected Output:**
```
Hello @user! Price: $99.99
```

---

## Test 5: Multi-turn Conversation

**First Prompt:**
```
Create a file called notes.txt with content "Draft version"
```

**Wait for completion, then Second Prompt:**
```
Now update notes.txt to contain "Final version"
```

**Expected Result:**
- First request creates file with "Draft version"
- Second request should understand context and update the same file
- Should see 2 separate tool executions

**Verification (after `exit`):**
```bash
cat notes.txt
rm notes.txt
```

**Expected Output:**
```
Final version
```

---

## Test 6: Error Handling

**Prompt:**
```
Read the contents of a file called nonexistent.txt
```

**Expected Result:**
- Should see tool execution attempt
- Should see an error message indicating file doesn't exist
- Should NOT crash the application
- Should remain in interactive mode

---

## Success Criteria

✅ **All tests pass if:**
- JSON tool calls are detected and parsed
- Tools execute successfully (see `🔧 Executing` and `✓ completed` messages)
- Files are created with correct content
- Commands execute and show output
- Multi-turn conversations maintain context
- Errors are handled gracefully

❌ **Tests fail if:**
- JSON is output but tools don't execute
- Files aren't created or have wrong content
- Commands don't run
- Application crashes
- Context is lost between turns

---

## Observation Notes

Note any interesting behaviors:

1. **Streaming behavior**: Does the JSON appear gradually or all at once?
2. **Timing**: How long between JSON completion and tool execution?
3. **Multiple tools**: Do they execute sequentially or in parallel?
4. **Error messages**: Are they clear and helpful?
5. **Model responses**: Does the model explain what it's doing?

---

## Quick Verification Script

After running all tests manually, run this to verify all files were created correctly:

```bash
# Should fail if test files still exist (they should be cleaned up)
ls alpha.txt beta.txt gamma.txt readme.md special.txt notes.txt 2>/dev/null && echo "⚠️  Test files not cleaned up" || echo "✓ Test files cleaned up"
```

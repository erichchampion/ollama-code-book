# Testing with Claude (Anthropic API)

This guide explains how to configure ollama-code to use Claude (Anthropic's API) instead of local Ollama models for testing the tool calling improvements.

## Prerequisites

1. An Anthropic API key from https://console.anthropic.com/
2. Active Claude API subscription

## Configuration Steps

### 1. Set Your API Key

The application looks for `.env` files in two locations (in order of precedence):

1. **Current working directory** - Project-specific overrides
2. **Package installation directory** - Global configuration

**Option A: Package-level configuration (recommended for npm install)**

Create `.env` in the ollama-code package directory:

```bash
# Navigate to package installation
cd /path/to/ollama-code

# Create .env file
cat > .env << 'EOF'
ANTHROPIC_API_KEY=sk-ant-api03-...your_key_here...
EOF
```

This configuration will be used regardless of where you run the command from.

**Option B: Project-specific configuration**

Create `.env` in your project directory:

```bash
# In your project directory
cat > .env << 'EOF'
ANTHROPIC_API_KEY=sk-ant-api03-...your_key_here...
EOF
```

This overrides the package-level configuration when running from this directory.

**Important**: Never commit `.env` files to git. Add to `.gitignore`.

### 2. Update Default Model (Option A: For Testing)

To quickly test with Claude, you can temporarily update the default model in `src/constants.ts`:

```typescript
// Change line 29 from:
export const DEFAULT_MODEL = 'qwen2.5-coder:latest';

// To:
export const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
```

Available Claude models:
- `claude-3-5-sonnet-20241022` - Latest Sonnet (recommended for code)
- `claude-3-5-haiku-20241022` - Fast and efficient
- `claude-3-opus-20240229` - Most capable

### 3. Rebuild the Project

```bash
yarn build
```

### 4. Run Interactive Mode

```bash
# Start interactive mode
node dist/src/cli-selector.js --mode interactive

# Or if you have it installed globally
ollama-code --mode interactive
```

## Testing the Improvements

Try these test queries to verify the tool calling improvements:

### Basic File Listing
```
> What files are in this project?
```
**Expected**: Should call filesystem tool with `{"operation": "list", "path": "."}`

### Informational Query
```
> How is [library-name] used in this project?
```
**Expected**: Should call search tool with `{"query": "library-name"}`

### Multi-turn Conversation
```
> What files are in this project?
[Wait for response]
> Tell me more about the main files
```
**Expected**: Should allow follow-up questions without duplicate blocking

## What to Test

The recent improvements fix these issues:

1. **✅ Tool Calling API**: Proper message format for Anthropic's API
2. **✅ Template Token Handling**: Graceful handling if model outputs special tokens
3. **✅ Smart Duplicate Detection**: Allows follow-up queries after successful calls
4. **✅ Search Tool**: Better parameter descriptions guide Claude to make correct calls
5. **✅ System Prompt**: Clear guidance for when to use search vs filesystem

## Reverting to Ollama

To switch back to Ollama:

1. Remove or comment out `ANTHROPIC_API_KEY` from `.env`
2. Revert `src/constants.ts` to use `'qwen2.5-coder:latest'`
3. Rebuild: `yarn build`

## Environment Variables Reference

```bash
# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-...        # Your API key (required for Anthropic)

# Alternative: Use environment variable for model override
# (This might override DEFAULT_MODEL if supported by the CLI)
# AI_MODEL=claude-3-5-sonnet-20241022

# Logging
LOG_LEVEL=debug                     # Use 'debug' or '0' to see detailed tool calling logs

# Testing
OLLAMA_CODE_E2E_TEST=true          # Allows non-TTY interactive mode for E2E tests
```

## Cost Considerations

**Note**: Using Claude API incurs costs based on token usage. Monitor your usage at:
https://console.anthropic.com/settings/usage

Approximate costs (as of Oct 2024):
- Claude 3.5 Sonnet: $3 per million input tokens, $15 per million output tokens
- Claude 3.5 Haiku: $0.25 per million input tokens, $1.25 per million output tokens

For testing, consider using Haiku if you want to minimize costs.

## Troubleshooting

### "Anthropic API key is required" Error

**Cause**: API key not found in environment

**Solution**:
1. Verify `.env` file exists in project root
2. Check `ANTHROPIC_API_KEY` is set correctly
3. Restart your terminal/IDE to reload environment variables

### "Invalid API key" Error

**Cause**: API key is incorrect or expired

**Solution**:
1. Verify your key at https://console.anthropic.com/settings/keys
2. Generate a new key if needed
3. Update `.env` file

### Tool Calls Still Not Working

**Cause**: Claude's API requires proper tool/function calling configuration

**Check**:
1. Make sure you rebuilt after making changes: `yarn build`
2. Verify the build directory contains your changes
3. Check logs with `LOG_LEVEL=debug` for detailed error messages

## Support

If you encounter issues:
1. Check the logs with `LOG_LEVEL=debug`
2. Review `TOOL_CALLING_FIX.md` for details on the improvements
3. Compare behavior with Ollama to isolate API-specific issues

## Alternative: Provider Configuration File

If implemented, you could use a config file approach:

```json
// .ollama-code.json (if supported)
{
  "ai": {
    "provider": "anthropic",
    "defaultModel": "claude-3-5-sonnet-20241022"
  }
}
```

Check the codebase to see if this configuration method is supported.

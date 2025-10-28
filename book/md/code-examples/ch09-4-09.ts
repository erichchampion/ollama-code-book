/**
 * Example: Storing and using API keys
 */

// Initialize credential store
const credentialStore = new CredentialStore();

// Store API keys (one-time setup)
await credentialStore.set('anthropic_api_key', 'sk-ant-...');
await credentialStore.set('openai_api_key', 'sk-...');
await credentialStore.set('github_token', 'ghp_...');

// Retrieve API key when needed
const anthropicKey = await credentialStore.get('anthropic_api_key');

// Use with AI provider
const provider = new AnthropicProvider({
  apiKey: anthropicKey!,
  model: 'claude-3-5-sonnet-20241022'
});

// Delete credential
await credentialStore.delete('old_api_key');

// List all stored credentials
const keys = await credentialStore.list();
console.log('Stored credentials:', keys);
// Output: ['anthropic_api_key', 'openai_api_key', 'github_token']
// Good: Encrypted credential storage
await providerManager.storeCredentials('openai-main', {
  apiKey: process.env.OPENAI_API_KEY
});

// Credentials encrypted with AES-256-GCM
// Stored with restricted permissions (0o600)
// Never logged or exposed
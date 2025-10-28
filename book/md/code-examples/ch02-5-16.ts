// Credentials are encrypted using AES-256-GCM
await providerManager.storeCredentials('openai-main', {
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'org-123'
});

// Stored on disk with restricted permissions (0o600)
// File: ~/.ollama-code/credentials/openai-main.enc
// Format: iv:authTag:encryptedData
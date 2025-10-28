// Use environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Or encrypted credential store
const credentialStore = new CredentialStore({
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 100000
  }
});

const apiKey = await credentialStore.get('openai-api-key');
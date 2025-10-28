// Hardcoded in code
const OPENAI_API_KEY = 'sk-proj-abc123...';

// In version control
git add config.json  // Contains API keys

// In logs
console.log(`Using API key: ${apiKey}`);

// In error messages
throw new Error(`Invalid API key: ${apiKey}`);
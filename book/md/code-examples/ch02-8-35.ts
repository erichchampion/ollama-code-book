// Bad: Environment variables exposed in logs
const apiKey = process.env.OPENAI_API_KEY;
console.log(`Using API key: ${apiKey}`); // NEVER!
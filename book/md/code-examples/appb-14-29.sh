# DON'T: Store secrets in config file
{
  "providers": {
    "openai": {
      "apiKey": "sk-proj-abc123..."
    }
  }
}

# DO: Use environment variables
{
  "providers": {
    "openai": {
      "apiKey": "${OPENAI_API_KEY}"
    }
  }
}
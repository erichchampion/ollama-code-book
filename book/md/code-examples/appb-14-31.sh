# Development
ollama-code --profile dev chat

# Production
ollama-code --profile prod chat

# ~/.ollama-code/profiles/dev.json
{
  "providers": {
    "ollama": {
      "model": "codellama:7b"
    }
  },
  "logging": {
    "level": "debug"
  }
}

# ~/.ollama-code/profiles/prod.json
{
  "providers": {
    "openai": {
      "model": "gpt-4-turbo"
    }
  },
  "logging": {
    "level": "warn"
  }
}
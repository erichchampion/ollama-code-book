# Default
{
  "providers": {
    "ollama": {
      "model": "codellama:7b"
    }
  }
}

# Environment variable
export OLLAMA_MODEL="codellama:34b"

# CLI flag
ollama-code --model codellama:13b chat

# Final result: codellama:13b (CLI flag wins)
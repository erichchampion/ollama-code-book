# .gitignore
.ollama-code/config.local.json    # Local overrides (not committed)

# config.json (committed)
{
  "providers": {
    "ollama": {
      "model": "codellama:7b"
    }
  }
}

# config.local.json (not committed, overrides config.json)
{
  "providers": {
    "ollama": {
      "model": "codellama:34b"
    }
  }
}
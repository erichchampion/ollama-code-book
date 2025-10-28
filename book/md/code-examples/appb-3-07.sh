# Enabled plugins (comma-separated)
export OLLAMA_CODE_PLUGINS="kubernetes,docker,terraform"

# Auto-update
export OLLAMA_CODE_PLUGIN_AUTO_UPDATE="false"

# Plugin-specific config (JSON)
export OLLAMA_CODE_KUBERNETES_CONFIG='{"kubectl":true,"helm":true}'
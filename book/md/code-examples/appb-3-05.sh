# Sandbox
export OLLAMA_CODE_SANDBOX_ENABLED="true"

# Allowed commands (comma-separated)
export OLLAMA_CODE_ALLOWED_COMMANDS="git,npm,yarn,kubectl"

# Allowed paths (comma-separated)
export OLLAMA_CODE_ALLOWED_PATHS="~/projects,/tmp"

# Denied paths (comma-separated)
export OLLAMA_CODE_DENIED_PATHS="~/.ssh,~/.aws"

# Max file size (bytes)
export OLLAMA_CODE_MAX_FILE_SIZE="10485760"

# Rate limiting
export OLLAMA_CODE_RATE_LIMIT_ENABLED="true"
export OLLAMA_CODE_RATE_LIMIT_RPM="60"
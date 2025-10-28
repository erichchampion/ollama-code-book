# Lightweight Ollama Test Instance
# Purpose: Provide isolated AI model for automated testing
# Model: TinyLlama (1.1B parameters, ~637MB)

FROM ollama/ollama:latest

# Set working directory
WORKDIR /root

# Expose Ollama API port
EXPOSE 11434

# Pull lightweight model for testing
# TinyLlama is chosen for:
# - Small size (~637MB) for fast container builds
# - Good performance for basic code understanding
# - Fast inference suitable for test suites
RUN ollama serve & \
    sleep 5 && \
    ollama pull tinyllama && \
    pkill ollama

# Health check to ensure Ollama is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:11434/api/tags || exit 1

# Start Ollama server
ENTRYPOINT ["/bin/ollama"]
CMD ["serve"]

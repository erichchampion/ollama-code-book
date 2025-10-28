# Build
docker build -t devops-ai:latest .

# Run with Ollama connection
docker run -it \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  devops-ai:latest
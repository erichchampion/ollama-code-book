# Chat command
ollama-code chat \
  --provider ollama \
  --model codellama:34b \
  --temperature 0.3 \
  --max-tokens 4096

# Generate command
ollama-code generate \
  --input prompt.txt \
  --output result.txt \
  --provider openai \
  --stream

# Tool command
ollama-code tool execute read-file \
  --params '{"path":"src/index.ts"}' \
  --no-approval
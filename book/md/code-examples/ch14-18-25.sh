# Explain code via CLI (works in any editor)
cat file.ts | ollama-code explain

# Fix errors
cat file.ts | ollama-code fix > file.fixed.ts

# Generate tests
ollama-code generate-tests file.ts > file.test.ts
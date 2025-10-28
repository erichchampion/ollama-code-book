# Create project
mkdir devops-ai-assistant
cd devops-ai-assistant

# Initialize
yarn init -y

# Install dependencies
yarn add \
  ollama-code \
  commander \
  chalk \
  yaml \
  @kubernetes/client-node \
  @aws-sdk/client-s3

# Install dev dependencies
yarn add -D \
  typescript \
  @types/node \
  vitest \
  @vitest/coverage-v8
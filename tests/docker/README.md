# Ollama Test Docker Environment

This directory contains Docker configuration for running a lightweight Ollama instance dedicated to automated testing.

## Overview

The test Ollama instance uses **TinyLlama** (1.1B parameters, ~637MB), a lightweight model that provides:
- Fast container builds and startup
- Quick inference times suitable for test suites
- Basic code understanding capabilities
- Minimal resource requirements

## Quick Start

### Build and Start Test Instance

```bash
# From project root
cd tests/docker

# Build and start Ollama test instance
docker-compose -f docker-compose.test.yml up -d

# Wait for Ollama to be ready
docker-compose -f docker-compose.test.yml exec ollama-test ollama list

# Verify model is loaded
curl http://localhost:11435/api/tags
```

### Run Tests Against Test Instance

```bash
# Set environment variable to use test instance
export OLLAMA_TEST_HOST=http://localhost:11435

# Run tests
yarn test:e2e

# Or run specific AI model tests
yarn test:ai-integration
```

### Stop Test Instance

```bash
# Stop and remove containers
docker-compose -f docker-compose.test.yml down

# Stop and remove containers + volumes
docker-compose -f docker-compose.test.yml down -v
```

## Port Configuration

- **Host Port:** 11435 (different from default 11434 to avoid conflicts)
- **Container Port:** 11434 (Ollama default)

This allows running both local Ollama (development) and test Ollama (automated testing) simultaneously.

## Model Selection Guide

### Current Model: TinyLlama
- **Use for:** Basic tests, fast feedback, CI/CD
- **Size:** ~637MB
- **Speed:** Very fast (< 1s response time)
- **Quality:** Good for simple code tasks

### Alternative Models (Future)

For specific test scenarios, you can pull additional models:

```bash
# For better code understanding (slower, ~4.7GB)
docker-compose -f docker-compose.test.yml exec ollama-test ollama pull codellama:7b

# For faster basic tests (~3.8GB)
docker-compose -f docker-compose.test.yml exec ollama-test ollama pull llama3.2:3b
```

## Environment Variables

Configure test environment via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_TEST_HOST` | `http://localhost:11435` | Ollama test instance URL |
| `OLLAMA_TEST_MODEL` | `tinyllama` | Default model for tests |
| `OLLAMA_TEST_TIMEOUT` | `30000` | Request timeout in ms |
| `USE_REAL_AI` | `false` | Enable real AI testing (vs mocks) |

## CI/CD Integration

The Docker setup is designed for CI/CD environments:

### GitHub Actions Example

```yaml
- name: Start Ollama Test Instance
  run: |
    cd tests/docker
    docker-compose -f docker-compose.test.yml up -d

- name: Wait for Ollama Ready
  run: |
    timeout 60 bash -c 'until curl -f http://localhost:11435/api/tags; do sleep 2; done'

- name: Run AI Integration Tests
  env:
    OLLAMA_TEST_HOST: http://localhost:11435
    USE_REAL_AI: true
  run: yarn test:ai-integration

- name: Stop Ollama Test Instance
  if: always()
  run: |
    cd tests/docker
    docker-compose -f docker-compose.test.yml down
```

## Health Checks

The container includes health checks to ensure Ollama is ready:

```bash
# Check container health
docker-compose -f docker-compose.test.yml ps

# Manual health check
curl http://localhost:11435/api/tags
```

Expected healthy response:
```json
{
  "models": [
    {
      "name": "tinyllama:latest",
      "modified_at": "2025-01-01T00:00:00Z",
      "size": 637000000
    }
  ]
}
```

## Troubleshooting

### Container fails to start
```bash
# Check logs
docker-compose -f docker-compose.test.yml logs ollama-test

# Rebuild from scratch
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml build --no-cache
docker-compose -f docker-compose.test.yml up -d
```

### Model not loaded
```bash
# Pull model manually
docker-compose -f docker-compose.test.yml exec ollama-test ollama pull tinyllama

# List available models
docker-compose -f docker-compose.test.yml exec ollama-test ollama list
```

### Port conflicts
```bash
# Check if port 11435 is in use
lsof -i :11435

# Or modify docker-compose.test.yml to use different port
```

## Resource Requirements

**Minimum:**
- RAM: 2GB
- Disk: 2GB
- CPU: 2 cores

**Recommended:**
- RAM: 4GB
- Disk: 5GB
- CPU: 4 cores

## Performance Considerations

### Test Execution Times

| Test Type | Mock AI | Real AI (TinyLlama) |
|-----------|---------|---------------------|
| Unit Test | <1ms | N/A |
| Integration Test | 5-10ms | 500ms-1s |
| E2E Test | 50-100ms | 1-2s |

### When to Use Real AI vs Mocks

**Use Real AI (TinyLlama) when:**
- Testing AI provider integration
- Validating prompt engineering
- Testing response parsing
- Benchmarking AI quality

**Use Mocks when:**
- Unit testing business logic
- Testing error handling
- Fast feedback loops (TDD)
- Deterministic results needed

## Maintenance

### Updating Models

```bash
# Pull latest version of current model
docker-compose -f docker-compose.test.yml exec ollama-test ollama pull tinyllama

# Switch to different model
docker-compose -f docker-compose.test.yml exec ollama-test ollama pull llama3.2:3b
```

### Cleaning Up

```bash
# Remove unused models
docker-compose -f docker-compose.test.yml exec ollama-test ollama rm <model-name>

# Clear all data and rebuild
docker-compose -f docker-compose.test.yml down -v
docker volume prune -f
```

## Security Notes

- Test instance uses `OLLAMA_ORIGINS=*` for compatibility
- Should NOT be exposed to public internet
- Only use in trusted test environments
- Use different port (11435) from production Ollama

## Support

For issues with:
- **Ollama:** https://github.com/ollama/ollama/issues
- **Docker:** https://docs.docker.com/
- **Test Infrastructure:** See project maintainers

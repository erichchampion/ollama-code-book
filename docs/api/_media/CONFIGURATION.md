# Configuration Guide - Ollama Code CLI v0.7.1

This document provides comprehensive information about configuring the Ollama Code CLI tool, including all advanced features, multi-provider settings, and enterprise configurations.

## Table of Contents

- [Configuration Overview](#configuration-overview)
- [Configuration Sources and Precedence](#configuration-sources-and-precedence)
- [Core AI Configuration](#core-ai-configuration)
- [Multi-Provider AI Configuration](#multi-provider-ai-configuration)
- [VCS Intelligence Configuration](#vcs-intelligence-configuration)
- [IDE Integration Configuration](#ide-integration-configuration)
- [Performance and Enterprise Configuration](#performance-and-enterprise-configuration)
- [Documentation Configuration](#documentation-configuration)
- [Security and Authentication](#security-and-authentication)
- [Environment-Specific Configuration](#environment-specific-configuration)
- [Configuration Validation and Troubleshooting](#configuration-validation-and-troubleshooting)

---

## Configuration Overview

The Ollama Code CLI uses a hierarchical configuration system with:
- **Type safety** using Zod schemas for runtime validation
- **Sensible defaults** for all options to work out of the box
- **Environment variable overrides** for CI/CD and deployment flexibility
- **Runtime configuration updates** through CLI commands
- **Multi-environment support** with profiles and inheritance

### Configuration Architecture

```
Configuration Hierarchy (highest to lowest precedence):
1. Command line arguments          (--temperature 0.8)
2. Environment variables          (OLLAMA_CODE_TEMPERATURE=0.8)
3. Project configuration file     (./ollama-code.config.json)
4. Global configuration file      (~/.ollama-code/config.json)
5. Default values                 (built-in defaults)
```

---

## Configuration Sources and Precedence

### 1. Configuration Files

#### Project Configuration (Highest Priority)
```bash
# Project root: ./ollama-code.config.json
{
  "ai": {
    "defaultProvider": "ollama",
    "defaultModel": "qwen2.5-coder:latest"
  },
  "vcs": {
    "enableHooks": true,
    "qualityThreshold": 85
  }
}
```

#### Global Configuration
```bash
# User home: ~/.ollama-code/config.json
{
  "ai": {
    "providers": {
      "openai": {
        "apiKey": "sk-...",
        "model": "gpt-4"
      }
    }
  },
  "terminal": {
    "theme": "dark",
    "useColors": true
  }
}
```

### 2. Environment Variables

All configuration keys can be set via environment variables using the `OLLAMA_CODE_` prefix:

```bash
# AI Configuration
export OLLAMA_CODE_AI_DEFAULT_PROVIDER=openai
export OLLAMA_CODE_AI_DEFAULT_MODEL=gpt-4
export OLLAMA_CODE_AI_DEFAULT_TEMPERATURE=0.8

# Provider Configuration
export OLLAMA_CODE_PROVIDERS_OPENAI_API_KEY=sk-...
export OLLAMA_CODE_PROVIDERS_ANTHROPIC_API_KEY=sk-ant-...
export OLLAMA_CODE_PROVIDERS_GOOGLE_API_KEY=AIza...

# VCS Configuration
export OLLAMA_CODE_VCS_ENABLE_HOOKS=true
export OLLAMA_CODE_VCS_QUALITY_THRESHOLD=80

# IDE Configuration
export OLLAMA_CODE_IDE_SERVER_PORT=3002
export OLLAMA_CODE_IDE_SERVER_AUTO_START=true
```

### 3. Command Line Arguments

```bash
# Override any configuration via CLI
ollama-code ask "question" --provider openai --temperature 0.9
ollama-code config set ai.defaultProvider anthropic --global
```

---

## Core AI Configuration

### AI Provider Settings

```json
{
  "ai": {
    "defaultProvider": "ollama",
    "defaultModel": "qwen2.5-coder:latest",
    "defaultTemperature": 0.7,
    "defaultTopP": 0.9,
    "defaultTopK": 40,
    "maxTokens": 4096,
    "contextWindow": 8192,
    "streaming": {
      "enabled": true,
      "chunkSize": 1024,
      "timeout": 30000
    },
    "fallback": {
      "enabled": true,
      "providers": ["ollama", "openai"],
      "maxRetries": 3
    }
  }
}
```

#### Configuration Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ai.defaultProvider` | string | `"ollama"` | Default AI provider to use |
| `ai.defaultModel` | string | `"qwen2.5-coder:latest"` | Default model for AI operations |
| `ai.defaultTemperature` | number | `0.7` | Response creativity (0-2) |
| `ai.defaultTopP` | number | `0.9` | Top-p sampling parameter |
| `ai.defaultTopK` | number | `40` | Top-k sampling parameter |
| `ai.maxTokens` | number | `4096` | Maximum tokens per response |
| `ai.contextWindow` | number | `8192` | Context window size |
| `ai.streaming.enabled` | boolean | `true` | Enable streaming responses |
| `ai.streaming.chunkSize` | number | `1024` | Streaming chunk size |
| `ai.fallback.enabled` | boolean | `true` | Enable provider fallback |
| `ai.fallback.maxRetries` | number | `3` | Maximum retry attempts |

### Ollama Configuration

```json
{
  "ollama": {
    "baseUrl": "http://localhost:11434",
    "timeout": 120000,
    "retryOptions": {
      "maxRetries": 3,
      "initialDelayMs": 1000,
      "maxDelayMs": 10000
    },
    "models": {
      "preload": ["qwen2.5-coder:latest", "codellama:7b"],
      "autoUpdate": false,
      "cleanupOld": true
    },
    "performance": {
      "concurrentRequests": 5,
      "requestQueue": 100,
      "memoryLimit": "8GB"
    }
  }
}
```

---

## Multi-Provider AI Configuration

### Provider Definitions

```json
{
  "providers": {
    "ollama": {
      "type": "ollama",
      "enabled": true,
      "baseUrl": "http://localhost:11434",
      "models": ["qwen2.5-coder:latest", "codellama:7b"],
      "capabilities": ["code", "chat", "completion"],
      "priority": 1,
      "costPerToken": 0.0,
      "rateLimits": {
        "requestsPerMinute": 60,
        "tokensPerMinute": 100000
      }
    },
    "openai": {
      "type": "openai",
      "enabled": true,
      "apiKey": "${OPENAI_API_KEY}",
      "baseUrl": "https://api.openai.com/v1",
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "capabilities": ["code", "chat", "completion", "function-calling"],
      "priority": 2,
      "costPerToken": 0.00003,
      "rateLimits": {
        "requestsPerMinute": 3500,
        "tokensPerMinute": 90000
      }
    },
    "anthropic": {
      "type": "anthropic",
      "enabled": true,
      "apiKey": "${ANTHROPIC_API_KEY}",
      "baseUrl": "https://api.anthropic.com",
      "models": ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
      "capabilities": ["code", "chat", "completion", "analysis"],
      "priority": 3,
      "costPerToken": 0.000015,
      "rateLimits": {
        "requestsPerMinute": 50,
        "tokensPerMinute": 40000
      }
    },
    "google": {
      "type": "google",
      "enabled": false,
      "apiKey": "${GOOGLE_API_KEY}",
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
      "models": ["gemini-1.5-pro", "gemini-1.5-flash"],
      "capabilities": ["code", "chat", "completion"],
      "priority": 4,
      "costPerToken": 0.0000125,
      "rateLimits": {
        "requestsPerMinute": 30,
        "tokensPerMinute": 32000
      }
    }
  }
}
```

### Intelligent Routing Configuration

```json
{
  "routing": {
    "strategy": "intelligent",
    "strategies": {
      "cost-optimized": {
        "primaryCriteria": "cost",
        "fallbackCriteria": ["availability", "speed"]
      },
      "speed-optimized": {
        "primaryCriteria": "latency",
        "fallbackCriteria": ["availability", "cost"]
      },
      "quality-optimized": {
        "primaryCriteria": "capability",
        "fallbackCriteria": ["availability", "speed"]
      },
      "intelligent": {
        "weights": {
          "cost": 0.3,
          "speed": 0.3,
          "quality": 0.4
        },
        "contextAware": true,
        "learningEnabled": true
      }
    },
    "fallback": {
      "enabled": true,
      "order": ["ollama", "openai", "anthropic"],
      "circuitBreaker": {
        "enabled": true,
        "errorThreshold": 5,
        "timeoutThreshold": 30000,
        "recoveryTime": 60000
      }
    }
  }
}
```

### Fine-Tuning Configuration

```json
{
  "fineTuning": {
    "defaultConfig": {
      "epochs": 3,
      "learningRate": 0.0001,
      "batchSize": 4,
      "validationSplit": 0.2,
      "maxSequenceLength": 2048,
      "temperature": 0.1,
      "dropout": 0.1,
      "gradientClipping": 1.0,
      "weightDecay": 0.01,
      "warmupSteps": 100,
      "saveSteps": 500,
      "evaluationSteps": 100,
      "earlyStopping": {
        "enabled": true,
        "patience": 3,
        "minDelta": 0.001
      },
      "quantization": {
        "enabled": true,
        "type": "int8"
      },
      "lora": {
        "enabled": true,
        "rank": 16,
        "alpha": 32,
        "dropout": 0.1
      }
    },
    "datasetGeneration": {
      "types": ["code_completion", "code_analysis", "documentation"],
      "qualityThresholds": {
        "minCommentLength": 20,
        "maxTopImports": 15,
        "complexityThresholds": {
          "moderateLines": 20,
          "complexLines": 50
        }
      },
      "sampling": {
        "contextLines": 5,
        "chunkSize": 10,
        "maxSamples": 10000
      }
    }
  }
}
```

### Model Deployment Configuration

```json
{
  "deployment": {
    "defaultStrategy": "round-robin",
    "loadBalancing": {
      "strategies": {
        "round-robin": {
          "enabled": true,
          "healthCheckInterval": 30000
        },
        "least-connections": {
          "enabled": true,
          "connectionWeight": 1.0
        },
        "weighted": {
          "enabled": true,
          "weights": {
            "instance-1": 1.0,
            "instance-2": 1.5,
            "instance-3": 0.8
          }
        }
      }
    },
    "scaling": {
      "minInstances": 1,
      "maxInstances": 5,
      "targetConcurrency": 10,
      "scaleUpThreshold": 0.8,
      "scaleDownThreshold": 0.3,
      "cooldownPeriod": 300000
    },
    "resources": {
      "maxMemoryMB": 4096,
      "maxCpuCores": 2,
      "diskSpaceGB": 20
    },
    "networking": {
      "timeout": 30000,
      "keepAlive": true,
      "compression": true
    }
  }
}
```

### Response Fusion Configuration

```json
{
  "responseFusion": {
    "defaultStrategy": "consensus",
    "strategies": {
      "consensus": {
        "minProviders": 2,
        "agreementThreshold": 0.7,
        "conflictResolution": "majority"
      },
      "weighted": {
        "weights": {
          "ollama": 0.3,
          "openai": 0.4,
          "anthropic": 0.3
        }
      },
      "best-quality": {
        "qualityMetrics": ["consistency", "completeness", "accuracy"],
        "scoringAlgorithm": "composite"
      }
    },
    "qualityValidation": {
      "enabled": true,
      "checks": ["logicalConsistency", "factualAccuracy", "coherence"],
      "confidenceThreshold": 0.8
    }
  }
}
```

---

## VCS Intelligence Configuration

### Git Hooks Configuration

```json
{
  "vcs": {
    "enableHooks": true,
    "hooks": {
      "preCommit": {
        "enabled": true,
        "qualityThreshold": 80,
        "securityLevel": "medium",
        "checks": ["syntax", "style", "security", "complexity"],
        "autoFix": {
          "enabled": true,
          "safeOnly": true,
          "createBackup": true
        }
      },
      "commitMsg": {
        "enabled": true,
        "style": "conventional",
        "validation": {
          "enforceFormat": true,
          "minLength": 10,
          "maxLength": 72
        },
        "enhancement": {
          "enabled": true,
          "addScope": true,
          "improveClarity": true
        }
      },
      "prePush": {
        "enabled": true,
        "regressionAnalysis": true,
        "riskThreshold": "medium",
        "blockOnHighRisk": true
      }
    },
    "commitMessageGeneration": {
      "styles": {
        "conventional": {
          "types": ["feat", "fix", "docs", "style", "refactor", "test", "chore"],
          "includeScope": true,
          "includeBreakingChange": true
        },
        "descriptive": {
          "maxLength": 72,
          "includeContext": true,
          "includeImpact": true
        },
        "emoji": {
          "mapping": {
            "feat": "✨",
            "fix": "🐛",
            "docs": "📚",
            "style": "💎",
            "refactor": "♻️",
            "test": "🧪",
            "chore": "🔧"
          }
        }
      }
    }
  }
}
```

### CI/CD Pipeline Configuration

```json
{
  "cicd": {
    "platforms": {
      "github": {
        "enabled": true,
        "workflowPath": ".github/workflows",
        "qualityGates": {
          "minQualityScore": 80,
          "maxCriticalIssues": 0,
          "maxSecurityIssues": 5,
          "minTestCoverage": 80
        }
      },
      "gitlab": {
        "enabled": false,
        "configPath": ".gitlab-ci.yml",
        "qualityGates": {
          "minQualityScore": 85,
          "maxCriticalIssues": 0,
          "maxSecurityIssues": 3
        }
      }
    },
    "universalApi": {
      "autoDetect": true,
      "enableSecurityAnalysis": true,
      "enablePerformanceAnalysis": true,
      "enableArchitecturalAnalysis": true,
      "reportFormat": "json",
      "outputPath": "./reports"
    }
  }
}
```

### Regression Analysis Configuration

```json
{
  "regressionAnalysis": {
    "enabled": true,
    "models": {
      "historical": {
        "enabled": true,
        "windowSize": 100,
        "weightDecay": 0.95
      },
      "filePattern": {
        "enabled": true,
        "patterns": {
          "core": 2.0,
          "api": 1.5,
          "config": 1.8,
          "test": 0.5
        }
      }
    },
    "thresholds": {
      "low": 0.3,
      "medium": 0.6,
      "high": 0.8
    },
    "reporting": {
      "enabled": true,
      "formats": ["json", "html"],
      "includeRecommendations": true
    }
  }
}
```

---

## IDE Integration Configuration

### VS Code Extension Configuration

```json
{
  "ide": {
    "vscode": {
      "enabled": true,
      "features": {
        "inlineCompletion": {
          "enabled": true,
          "provider": "ollama",
          "model": "qwen2.5-coder:latest",
          "triggerCharacters": [".", "(", "["],
          "debounceMs": 300,
          "maxSuggestions": 5
        },
        "codeActions": {
          "enabled": true,
          "quickFixes": true,
          "refactoring": true,
          "organizeImports": true
        },
        "diagnostics": {
          "enabled": true,
          "severity": "warning",
          "categories": ["syntax", "style", "security", "performance"],
          "updateInterval": 5000
        },
        "hover": {
          "enabled": true,
          "includeExamples": true,
          "includeLinks": true,
          "maxLength": 500
        },
        "chatPanel": {
          "enabled": true,
          "defaultProvider": "ollama",
          "persistHistory": true,
          "maxHistorySize": 100
        }
      },
      "workspace": {
        "analysisDepth": 3,
        "indexInBackground": true,
        "excludePatterns": ["node_modules", "dist", ".git"],
        "maxFileSize": 1048576
      }
    }
  }
}
```

### Integration Server Configuration

```json
{
  "integrationServer": {
    "enabled": false,
    "port": 3002,
    "host": "localhost",
    "auth": {
      "required": false,
      "token": "${IDE_AUTH_TOKEN}",
      "tokenExpiry": 86400000
    },
    "websocket": {
      "pingInterval": 30000,
      "pongTimeout": 5000,
      "maxConnections": 10,
      "compression": true
    },
    "features": {
      "workspaceAnalysis": true,
      "realTimeUpdates": true,
      "progressTracking": true,
      "errorReporting": true
    },
    "logging": {
      "enabled": true,
      "level": "info",
      "logConnections": true,
      "logRequests": false
    }
  }
}
```

---

## Performance and Enterprise Configuration

### Caching Configuration

```json
{
  "caching": {
    "enabled": true,
    "strategies": {
      "memory": {
        "enabled": true,
        "maxSize": 100,
        "ttl": 3600000,
        "algorithm": "LRU"
      },
      "disk": {
        "enabled": true,
        "path": "~/.ollama-code/cache",
        "maxSize": "1GB",
        "compression": true
      },
      "redis": {
        "enabled": false,
        "url": "redis://localhost:6379",
        "keyPrefix": "ollama-code:",
        "ttl": 7200000
      }
    },
    "invalidation": {
      "onModelChange": true,
      "onConfigChange": true,
      "maxAge": 86400000
    }
  }
}
```

### Performance Optimization

```json
{
  "performance": {
    "startup": {
      "lazyLoading": true,
      "preloadCommonComponents": true,
      "componentCache": true,
      "optimizeImports": true
    },
    "concurrency": {
      "maxConcurrentRequests": 5,
      "requestQueueSize": 100,
      "workerThreads": {
        "enabled": true,
        "poolSize": 4
      }
    },
    "memory": {
      "maxHeapSize": "2GB",
      "garbageCollection": {
        "strategy": "incremental",
        "threshold": 0.8
      },
      "monitoring": {
        "enabled": true,
        "interval": 30000,
        "alertThreshold": 0.9
      }
    }
  }
}
```

### Enterprise Features

```json
{
  "enterprise": {
    "distributedProcessing": {
      "enabled": false,
      "nodes": [
        {
          "host": "worker1.company.com",
          "port": 3003,
          "weight": 1.0
        },
        {
          "host": "worker2.company.com",
          "port": 3003,
          "weight": 1.5
        }
      ],
      "loadBalancing": "weighted",
      "healthChecks": {
        "enabled": true,
        "interval": 30000,
        "timeout": 5000
      }
    },
    "audit": {
      "enabled": false,
      "logAllRequests": true,
      "logSensitiveData": false,
      "retentionDays": 90,
      "outputPath": "/var/log/ollama-code/audit.log"
    },
    "compliance": {
      "dataResidency": "US",
      "encryptionAtRest": true,
      "encryptionInTransit": true,
      "accessControl": {
        "enabled": false,
        "roles": ["admin", "developer", "viewer"],
        "permissions": {
          "admin": ["*"],
          "developer": ["read", "write", "execute"],
          "viewer": ["read"]
        }
      }
    }
  }
}
```

---

## Performance Dashboard & Analytics Configuration - Phase 6

### Performance Dashboard Configuration

```json
{
  "performanceDashboard": {
    "enabled": true,
    "monitoring": {
      "realTimeUpdates": true,
      "updateInterval": 5000,
      "retentionPeriod": "7d",
      "maxDataPoints": 10000
    },
    "metrics": {
      "system": {
        "cpu": {
          "enabled": true,
          "thresholds": {
            "warning": 70,
            "critical": 90
          }
        },
        "memory": {
          "enabled": true,
          "thresholds": {
            "warning": 80,
            "critical": 95
          }
        },
        "disk": {
          "enabled": true,
          "paths": ["/", "/tmp"],
          "thresholds": {
            "warning": 85,
            "critical": 95
          }
        }
      },
      "application": {
        "responseTime": {
          "enabled": true,
          "percentiles": [50, 90, 95, 99],
          "thresholds": {
            "p50": 100,
            "p90": 500,
            "p95": 1000,
            "p99": 2000
          }
        },
        "errorRate": {
          "enabled": true,
          "thresholds": {
            "warning": 1,
            "critical": 5
          }
        },
        "throughput": {
          "enabled": true,
          "windowSize": "1m",
          "thresholds": {
            "min": 10,
            "target": 100
          }
        }
      },
      "ai": {
        "providerHealth": {
          "enabled": true,
          "checkInterval": 30000,
          "timeout": 10000
        },
        "modelPerformance": {
          "enabled": true,
          "trackLatency": true,
          "trackAccuracy": false,
          "trackCost": true
        },
        "cacheHitRate": {
          "enabled": true,
          "thresholds": {
            "warning": 60,
            "target": 80
          }
        }
      }
    },
    "alerts": {
      "enabled": true,
      "channels": {
        "console": {
          "enabled": true,
          "level": "warning"
        },
        "email": {
          "enabled": false,
          "smtp": {
            "host": "smtp.example.com",
            "port": 587,
            "secure": false,
            "auth": {
              "user": "${SMTP_USER}",
              "pass": "${SMTP_PASS}"
            }
          },
          "recipients": ["admin@example.com"]
        },
        "webhook": {
          "enabled": false,
          "url": "${WEBHOOK_URL}",
          "headers": {
            "Authorization": "Bearer ${WEBHOOK_TOKEN}"
          }
        }
      },
      "rules": {
        "cpuHigh": {
          "metric": "system.cpu",
          "condition": "> 80",
          "duration": "5m",
          "severity": "warning"
        },
        "memoryHigh": {
          "metric": "system.memory",
          "condition": "> 90",
          "duration": "2m",
          "severity": "critical"
        },
        "errorRateHigh": {
          "metric": "application.errorRate",
          "condition": "> 5",
          "duration": "1m",
          "severity": "critical"
        },
        "responseTimeSlow": {
          "metric": "application.responseTime.p95",
          "condition": "> 2000",
          "duration": "3m",
          "severity": "warning"
        }
      }
    },
    "reporting": {
      "enabled": true,
      "formats": ["json", "html", "csv"],
      "schedule": {
        "daily": {
          "enabled": true,
          "time": "09:00"
        },
        "weekly": {
          "enabled": true,
          "day": "monday",
          "time": "08:00"
        },
        "monthly": {
          "enabled": false,
          "day": 1,
          "time": "08:00"
        }
      },
      "includeRecommendations": true,
      "exportPath": "./reports/performance"
    }
  }
}
```

### Analytics Configuration

```json
{
  "analytics": {
    "enabled": true,
    "collection": {
      "anonymizeData": true,
      "sampleRate": 1.0,
      "bufferSize": 1000,
      "flushInterval": 30000
    },
    "storage": {
      "type": "local",
      "path": "~/.ollama-code/analytics",
      "retention": {
        "raw": "30d",
        "aggregated": "1y"
      },
      "compression": true
    },
    "analysis": {
      "trendDetection": {
        "enabled": true,
        "sensitivity": "medium",
        "minimumDataPoints": 100
      },
      "anomalyDetection": {
        "enabled": true,
        "algorithm": "isolation-forest",
        "sensitivity": 0.1
      },
      "predictiveAnalysis": {
        "enabled": false,
        "horizon": "24h",
        "confidence": 0.95
      }
    },
    "recommendations": {
      "enabled": true,
      "categories": [
        "performance",
        "cost",
        "reliability",
        "security"
      ],
      "autoApply": {
        "enabled": false,
        "safetyLevel": "conservative"
      }
    }
  }
}
```

### Performance Optimization Integration

```json
{
  "optimization": {
    "startup": {
      "strategy": "balanced",
      "strategies": {
        "fast": {
          "maxStartupTime": 1500,
          "memoryBudget": 128,
          "skipNonEssential": true
        },
        "balanced": {
          "maxStartupTime": 3000,
          "memoryBudget": 256,
          "skipNonEssential": false
        },
        "performance": {
          "maxStartupTime": 5000,
          "memoryBudget": 512,
          "preloadAll": true
        }
      },
      "monitoring": {
        "trackComponentLoad": true,
        "trackMemoryUsage": true,
        "trackInitTime": true
      }
    },
    "cache": {
      "preloading": {
        "enabled": true,
        "strategy": "predictive",
        "memoryBudget": 256,
        "maxPreloadTime": 5000,
        "parallelPreloads": 4
      },
      "indexOptimization": {
        "enabled": true,
        "rebuildThreshold": 0.3,
        "backgroundRebuild": true
      }
    }
  }
}
```

---

## Documentation Configuration

### TypeDoc Configuration

```json
{
  "documentation": {
    "typedoc": {
      "enabled": true,
      "configPath": "./typedoc.json",
      "outputPath": "./docs/api",
      "formats": ["markdown", "html"],
      "watch": false,
      "coverage": {
        "threshold": 80,
        "reportMissing": true
      }
    },
    "automation": {
      "githubActions": {
        "enabled": true,
        "workflowPath": ".github/workflows/update-documentation.yml",
        "triggerOnPush": true,
        "triggerOnPR": true,
        "autoCommit": true
      },
      "validation": {
        "enabled": true,
        "checkLinks": true,
        "checkCoverage": true,
        "failOnErrors": false
      }
    },
    "generation": {
      "includePrivate": false,
      "includeProtected": true,
      "includeInternal": false,
      "generateSearchIndex": true,
      "customCSS": null
    }
  }
}
```

---

## Security and Authentication

### API Keys and Secrets

```json
{
  "security": {
    "apiKeys": {
      "encryption": {
        "enabled": true,
        "algorithm": "aes-256-gcm",
        "keyDerivation": "pbkdf2"
      },
      "storage": {
        "method": "keychain",
        "fallback": "encrypted-file",
        "path": "~/.ollama-code/secrets"
      }
    },
    "validation": {
      "enableInputSanitization": true,
      "maxInputLength": 100000,
      "allowedFileExtensions": [".ts", ".js", ".py", ".go", ".rs", ".java"],
      "blockSensitivePatterns": true
    },
    "audit": {
      "logSensitiveOperations": true,
      "logFailedAuthentication": true,
      "maxLogSize": "10MB",
      "rotateDaily": true
    }
  }
}
```

### Authentication Configuration

```bash
# Environment variables for API keys (recommended)
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=AIza...

# Or use configuration
ollama-code config set providers.openai.apiKey sk-... --global
ollama-code config set providers.anthropic.apiKey sk-ant-... --global
```

---

## Environment-Specific Configuration

### Development Environment

```json
{
  "environment": "development",
  "ai": {
    "defaultProvider": "ollama",
    "streaming": {
      "enabled": true
    }
  },
  "logging": {
    "level": "debug",
    "verbose": true
  },
  "caching": {
    "enabled": false
  },
  "performance": {
    "startup": {
      "lazyLoading": false
    }
  }
}
```

### Production Environment

```json
{
  "environment": "production",
  "ai": {
    "defaultProvider": "openai",
    "fallback": {
      "enabled": true,
      "providers": ["openai", "anthropic", "ollama"]
    }
  },
  "logging": {
    "level": "info",
    "verbose": false
  },
  "caching": {
    "enabled": true,
    "strategies": {
      "redis": {
        "enabled": true
      }
    }
  },
  "security": {
    "audit": {
      "enabled": true
    }
  }
}
```

### CI/CD Environment

```json
{
  "environment": "ci",
  "ai": {
    "defaultProvider": "ollama",
    "timeout": 60000
  },
  "logging": {
    "level": "warn",
    "format": "json"
  },
  "caching": {
    "enabled": false
  },
  "terminal": {
    "useColors": false,
    "interactive": false
  }
}
```

---

## Configuration Validation and Troubleshooting

### Configuration Validation

```bash
# Validate current configuration
ollama-code config validate

# Validate with detailed output
ollama-code config validate --verbose

# Fix common configuration issues
ollama-code config validate --fix-issues

# Check specific configuration section
ollama-code config validate --section ai.providers
```

### Common Configuration Issues

#### 1. API Key Issues
```bash
# Check if API keys are properly set
ollama-code config get providers.openai.apiKey

# Test API key validity
ollama-code provider list --detailed

# Set API key securely
ollama-code config set providers.openai.apiKey sk-... --global
```

#### 2. Provider Connection Issues
```bash
# Test provider connectivity
ollama-code provider benchmark --provider ollama --duration 10

# Check provider configuration
ollama-code config get providers.ollama

# Reset provider configuration
ollama-code config reset --key providers.ollama --confirm
```

#### 3. Performance Issues
```bash
# Check performance configuration
ollama-code config get performance

# Enable caching
ollama-code config set caching.enabled true

# Optimize startup performance
ollama-code config set performance.startup.lazyLoading true
```

### Configuration Debugging

```bash
# Show all configuration with sources
ollama-code config list --show-sources

# Export configuration for review
ollama-code config export debug-config.json --include-secrets

# Compare configurations
diff <(ollama-code config list --format json) expected-config.json
```

### Environment Variable Reference

```bash
# Core AI Settings
OLLAMA_CODE_AI_DEFAULT_PROVIDER=ollama
OLLAMA_CODE_AI_DEFAULT_MODEL=qwen2.5-coder:latest
OLLAMA_CODE_AI_DEFAULT_TEMPERATURE=0.7

# Provider Settings
OLLAMA_CODE_PROVIDERS_OPENAI_API_KEY=sk-...
OLLAMA_CODE_PROVIDERS_ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_CODE_PROVIDERS_GOOGLE_API_KEY=AIza...

# VCS Settings
OLLAMA_CODE_VCS_ENABLE_HOOKS=true
OLLAMA_CODE_VCS_QUALITY_THRESHOLD=80

# IDE Settings
OLLAMA_CODE_IDE_SERVER_PORT=3002
OLLAMA_CODE_IDE_SERVER_AUTO_START=true

# Performance Settings
OLLAMA_CODE_CACHING_ENABLED=true
OLLAMA_CODE_PERFORMANCE_CONCURRENCY_MAX_CONCURRENT_REQUESTS=5

# Security Settings
OLLAMA_CODE_SECURITY_VALIDATION_ENABLE_INPUT_SANITIZATION=true
```

---

## Configuration Examples

### Complete Configuration Example

```json
{
  "environment": "development",
  "ai": {
    "defaultProvider": "ollama",
    "defaultModel": "qwen2.5-coder:latest",
    "defaultTemperature": 0.7,
    "streaming": {
      "enabled": true,
      "chunkSize": 1024
    },
    "fallback": {
      "enabled": true,
      "providers": ["ollama", "openai"]
    }
  },
  "providers": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434",
      "models": ["qwen2.5-coder:latest", "codellama:7b"]
    },
    "openai": {
      "enabled": true,
      "apiKey": "${OPENAI_API_KEY}",
      "models": ["gpt-4", "gpt-3.5-turbo"]
    }
  },
  "vcs": {
    "enableHooks": true,
    "hooks": {
      "preCommit": {
        "enabled": true,
        "qualityThreshold": 80
      },
      "commitMsg": {
        "enabled": true,
        "style": "conventional"
      }
    }
  },
  "ide": {
    "vscode": {
      "enabled": true,
      "features": {
        "inlineCompletion": {
          "enabled": true
        },
        "chatPanel": {
          "enabled": true
        }
      }
    }
  },
  "documentation": {
    "typedoc": {
      "enabled": true,
      "outputPath": "./docs/api"
    }
  },
  "performance": {
    "caching": {
      "enabled": true
    },
    "startup": {
      "lazyLoading": true
    }
  },
  "logging": {
    "level": "info",
    "verbose": false
  }
}
```

---

This comprehensive configuration guide covers all aspects of the Ollama Code CLI v0.7.0. For specific implementation details and usage examples, refer to the [API Reference](API_REFERENCE.md) and [Architecture Documentation](ARCHITECTURE.md).
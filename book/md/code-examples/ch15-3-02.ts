const MODEL_RECOMMENDATIONS = {
  // Best for code generation
  code: {
    local: [
      'codellama:34b',           // Best quality local model
      'deepseek-coder:33b',      // Strong alternative
      'wizardcoder:34b'          // Good for explanations
    ],
    cloud: [
      'gpt-4-turbo',             // Best overall (OpenAI)
      'claude-3-opus',           // Strong reasoning (Anthropic)
      'gemini-1.5-pro'           // Good context window (Google)
    ]
  },

  // Best for infrastructure/DevOps
  infrastructure: {
    local: [
      'codellama:34b',           // Trained on YAML, JSON
      'mistral:7b'               // Fast, good quality
    ],
    cloud: [
      'gpt-4-turbo',             // Best for Kubernetes
      'claude-3-sonnet'          // Good cost/quality balance
    ]
  },

  // Best for data science
  datascience: {
    local: [
      'codellama:34b',           // Python expertise
      'wizardcoder:34b'
    ],
    cloud: [
      'gpt-4-turbo',             // Best for NumPy/Pandas
      'claude-3-opus'            // Good for explanations
    ]
  },

  // Best for security
  security: {
    local: [
      'codellama:34b'
    ],
    cloud: [
      'gpt-4-turbo',             // Best for vulnerability detection
      'claude-3-opus'            // Strong reasoning for security
    ]
  }
};
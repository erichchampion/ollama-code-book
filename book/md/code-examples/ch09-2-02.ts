const threats: Threat[] = [
  {
    category: ThreatCategory.DESTRUCTIVE_OPERATIONS,
    description: 'AI executes commands that delete or corrupt data',
    severity: 'critical',
    mitigation: [
      'Require approval for destructive operations',
      'Implement sandboxing',
      'Use read-only mode by default',
      'Maintain audit trail'
    ],
    examples: [
      'DROP DATABASE production',
      'rm -rf /',
      'git push --force origin main',
      'DELETE FROM users'
    ]
  },
  {
    category: ThreatCategory.DATA_LEAKAGE,
    description: 'Sensitive data sent to AI providers or logged',
    severity: 'critical',
    mitigation: [
      'Filter sensitive patterns before AI calls',
      'Encrypt credentials at rest',
      'Redact logs',
      'Use private AI deployments for sensitive data'
    ],
    examples: [
      'API keys in code review',
      'Database passwords in logs',
      'Customer PII in prompts',
      'Private tokens in conversation history'
    ]
  },
  {
    category: ThreatCategory.UNAUTHORIZED_ACCESS,
    description: 'Access to files or systems outside allowed scope',
    severity: 'high',
    mitigation: [
      'Implement path allowlist/blocklist',
      'Use principle of least privilege',
      'Sandbox file system access',
      'Validate all paths'
    ],
    examples: [
      'Reading /etc/shadow',
      'Accessing ~/.ssh/id_rsa',
      'Reading .env files',
      'Accessing parent directories'
    ]
  },
  {
    category: ThreatCategory.RESOURCE_EXHAUSTION,
    description: 'Excessive API calls or resource usage',
    severity: 'medium',
    mitigation: [
      'Implement rate limiting',
      'Set budget caps',
      'Monitor usage',
      'Use request queuing'
    ],
    examples: [
      'Infinite loop calling AI',
      'Processing entire codebase repeatedly',
      'Exhausting API quotas',
      'Memory leaks from large conversations'
    ]
  }
];
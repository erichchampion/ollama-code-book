/**
 * Security best practices checklist
 */
export const SECURITY_CHECKLIST = {
  authentication: [
    'Use encrypted credential storage (AES-256-GCM)',
    'Never store credentials in plaintext',
    'Use OS keychain when available',
    'Rotate credentials regularly',
    'Use principle of least privilege'
  ],

  authorization: [
    'Implement sandbox for file access',
    'Require approval for destructive operations',
    'Use allowlists for paths and commands',
    'Validate all user input',
    'Implement read-only mode'
  ],

  dataProtection: [
    'Filter sensitive data before sending to AI',
    'Use local AI for sensitive code',
    'Redact secrets in logs',
    'Anonymize code when possible',
    'Encrypt data at rest and in transit'
  ],

  rateLimiting: [
    'Implement rate limiting for API calls',
    'Set budget caps (hourly, daily, monthly)',
    'Monitor usage patterns',
    'Alert on unusual activity',
    'Implement request queuing'
  ],

  auditLogging: [
    'Log all security-relevant events',
    'Include context (user, timestamp, resource)',
    'Redact sensitive data in logs',
    'Rotate logs regularly',
    'Enable forensic analysis'
  ],

  inputValidation: [
    'Validate all user input',
    'Sanitize before processing',
    'Detect injection attempts',
    'Limit input length',
    'Use type checking'
  ],

  errorHandling: [
    'Never expose sensitive data in errors',
    'Log errors securely',
    'Fail securely (deny by default)',
    'Handle edge cases',
    'Provide user-friendly messages'
  ],

  deployment: [
    'Run with least privilege',
    'Use environment variables for config',
    'Enable security headers',
    'Keep dependencies updated',
    'Regular security audits'
  ]
};
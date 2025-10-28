/**
 * Validates and sanitizes user input
 */
export class InputValidator {
  private logger: Logger;

  // Patterns for sensitive data
  private sensitivePatterns = [
    // API keys
    /sk-[a-zA-Z0-9]{20,}/g,
    /sk-ant-[a-zA-Z0-9-_]{20,}/g,
    /ghp_[a-zA-Z0-9]{36}/g,
    /gho_[a-zA-Z0-9]{36}/g,

    // AWS credentials
    /AKIA[0-9A-Z]{16}/g,
    /aws_secret_access_key["\s:=]+[a-zA-Z0-9/+=]{40}/gi,

    // Private keys
    /-----BEGIN (RSA |DSA |EC )?PRIVATE KEY-----/g,

    // Passwords
    /password["\s:=]+[^\s"]{8,}/gi,
    /passwd["\s:=]+[^\s"]{8,}/gi,

    // Tokens
    /token["\s:=]+[a-zA-Z0-9_-]{20,}/gi,
    /bearer\s+[a-zA-Z0-9_-]{20,}/gi,

    // Database connection strings
    /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi,
    /postgres:\/\/[^:]+:[^@]+@/gi,
    /mysql:\/\/[^:]+:[^@]+@/gi,

    // Email addresses (PII)
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

    // Credit card numbers
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

    // SSN
    /\b\d{3}-\d{2}-\d{4}\b/g
  ];

  // Patterns for injection attempts
  private injectionPatterns = [
    // Command injection
    /;\s*(rm|dd|mkfs|kill|shutdown)/i,
    /\|\s*(curl|wget).*\|\s*sh/i,
    /`[^`]*`/g, // Backticks
    /\$\([^)]*\)/g, // Command substitution

    // SQL injection
    /(union|select|insert|update|delete|drop|create|alter).*from/gi,
    /('|")\s*(or|and)\s*('|")/gi,

    // Path traversal
    /\.\.[\/\\]/g,
    /(\.\.\/){2,}/g,

    // XSS
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi // Event handlers
  ];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate input and detect issues
   */
  validate(input: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Check for sensitive data
    for (const pattern of this.sensitivePatterns) {
      if (pattern.test(input)) {
        issues.push({
          type: 'sensitive_data',
          severity: 'critical',
          message: 'Input contains sensitive data (API key, password, etc.)',
          pattern: pattern.toString()
        });
      }
    }

    // Check for injection attempts
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(input)) {
        issues.push({
          type: 'injection_attempt',
          severity: 'high',
          message: 'Input contains potential injection pattern',
          pattern: pattern.toString()
        });
      }
    }

    // Check length
    if (input.length > 50000) {
      issues.push({
        type: 'excessive_length',
        severity: 'medium',
        message: 'Input exceeds maximum length',
        pattern: 'length > 50000'
      });
    }

    const valid = issues.length === 0;

    if (!valid) {
      this.logger.warn('Input validation failed:', {
        issues,
        inputLength: input.length
      });
    }

    return {
      valid,
      issues
    };
  }

  /**
   * Sanitize input by redacting sensitive data
   */
  sanitize(input: string): string {
    let sanitized = input;

    // Redact sensitive patterns
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Check if input is safe to send to AI
   */
  isSafeForAI(input: string): boolean {
    const validation = this.validate(input);

    // Block if contains sensitive data
    const hasSensitiveData = validation.issues.some(
      issue => issue.type === 'sensitive_data'
    );

    return !hasSensitiveData;
  }

  /**
   * Check if input is safe to execute
   */
  isSafeForExecution(input: string): boolean {
    const validation = this.validate(input);

    // Block if contains injection attempts
    const hasInjection = validation.issues.some(
      issue => issue.type === 'injection_attempt'
    );

    return !hasInjection;
  }
}

export interface ValidationIssue {
  type: 'sensitive_data' | 'injection_attempt' | 'excessive_length';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  pattern: string;
}
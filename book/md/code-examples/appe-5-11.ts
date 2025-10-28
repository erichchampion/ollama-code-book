class InputValidator {
  // File path validation
  validateFilePath(path: string): ValidationResult {
    // Length check
    if (path.length > 4096) {
      return { valid: false, error: 'Path too long' };
    }

    // Null byte check
    if (path.includes('\0')) {
      return { valid: false, error: 'Invalid characters' };
    }

    // Directory traversal check
    if (path.includes('..')) {
      return { valid: false, error: 'Directory traversal not allowed' };
    }

    // Allowed characters only
    if (!/^[a-zA-Z0-9_\-./]+$/.test(path)) {
      return { valid: false, error: 'Invalid characters in path' };
    }

    return { valid: true };
  }

  // Prompt validation
  validatePrompt(prompt: string): ValidationResult {
    // Length check
    if (prompt.length > 50000) {
      return { valid: false, error: 'Prompt too long' };
    }

    // Check for prompt injection attempts
    const INJECTION_PATTERNS = [
      /ignore.*previous.*instructions/i,
      /disregard.*system.*prompt/i,
      /you.*are.*now/i,
      /new.*role/i
    ];

    if (INJECTION_PATTERNS.some(p => p.test(prompt))) {
      return { valid: false, error: 'Potential prompt injection' };
    }

    return { valid: true };
  }

  // API key validation
  validateApiKey(key: string): ValidationResult {
    // Format checks
    if (!/^sk-[a-zA-Z0-9]{48}$/.test(key)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    return { valid: true };
  }
}
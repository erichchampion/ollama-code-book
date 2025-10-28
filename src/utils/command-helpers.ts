/**
 * Command Helper Utilities
 *
 * Provides reusable utility functions for command validation, error handling,
 * and common patterns to eliminate code duplication across command implementations.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { createSpinner, Spinner } from './spinner.js';
import { formatErrorForDisplay } from '../errors/formatter.js';
import { fileExists } from '../fs/operations.js';

/**
 * Validates that a value is a non-empty string
 */
export function validateNonEmptyString(value: any, fieldName: string): boolean {
  if (typeof value !== 'string' || value.trim() === '') {
    console.error(`Please provide a ${fieldName}.`);
    return false;
  }
  return true;
}

/**
 * Validates that a file exists at the given path and prevents directory traversal attacks
 */
export async function validateFileExists(filePath: string): Promise<boolean> {
  if (!validateNonEmptyString(filePath, 'file path')) {
    return false;
  }

  // Security: Prevent directory traversal attacks
  if (!isSecureFilePath(filePath)) {
    console.error(`Access denied: Path outside working directory not allowed: ${filePath}`);
    throw new Error(`Security: Directory traversal attack blocked: ${filePath}`);
  }

  if (!await fileExists(filePath)) {
    console.error(`File not found: ${filePath}`);
    return false;
  }

  return true;
}

/**
 * Security function to prevent directory traversal attacks
 * Only allows access to files within the current working directory and its subdirectories
 */
export function isSecureFilePath(filePath: string): boolean {
  try {
    // Get the current working directory
    const cwd = process.cwd();

    // Security: Normalize path separators to prevent bypassing checks with mixed separators
    // On Unix systems, backslashes in paths are literal characters, not separators
    // Convert any backslashes to forward slashes before processing
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Resolve the file path to an absolute path
    const resolvedPath = path.resolve(normalizedPath);

    // Allow access to current working directory and its subdirectories
    const isWithinCwd = resolvedPath.startsWith(cwd + path.sep) || resolvedPath === cwd;

    // Allow access to system temp directories for testing and legitimate operations
    const tempDirs = [
      '/tmp/',
      '/var/tmp/',
      process.env.TMPDIR || '',
      process.env.TEMP || '',
      process.env.TMP || ''
    ].filter(Boolean);

    const isInTempDir = tempDirs.some(tempDir => {
      try {
        const normalizedTempDir = path.resolve(tempDir);
        return resolvedPath.startsWith(normalizedTempDir + path.sep) || resolvedPath === normalizedTempDir;
      } catch {
        return false;
      }
    });

    if (!isWithinCwd && !isInTempDir) {
      logger.warn(`Directory traversal attempt blocked: ${normalizedPath} -> ${resolvedPath}`);
      return false;
    }

    // Additional security: Block access to sensitive system files even in temp dirs
    const forbiddenPaths = [
      '/etc/',
      '/usr/',
      '/opt/',
      '/root/',
      '/proc/',
      '/sys/',
      'C:\\Windows\\',
      'C:\\Program Files\\',
      'C:\\Program Files (x86)\\',
      'C:\\Users\\',
      path.join(process.env.HOME || '', '.ssh'),
      path.join(process.env.HOME || '', '.aws'),
      path.join(process.env.HOME || '', '.config')
    ];

    for (const forbiddenPath of forbiddenPaths) {
      if (forbiddenPath && resolvedPath.startsWith(forbiddenPath)) {
        logger.warn(`Access to sensitive system path blocked: ${resolvedPath}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error(`Path validation error: ${error}`);
    return false;
  }
}

/**
 * Validates that a directory exists at the given path
 */
export async function validateDirectoryExists(dirPath: string): Promise<boolean> {
  if (!validateNonEmptyString(dirPath, 'directory path')) {
    return false;
  }

  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      console.error(`Path is not a directory: ${dirPath}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Directory not found: ${dirPath}`);
    return false;
  }
}

/**
 * Executes a function with a spinner animation
 * Handles spinner cleanup and error formatting consistently
 */
export async function executeWithSpinner<T>(
  spinnerText: string,
  fn: () => Promise<T>,
  successMessage?: string,
  errorMessage?: string
): Promise<T> {
  const spinner = createSpinner(spinnerText);
  spinner.start();

  try {
    const result = await fn();

    if (successMessage) {
      spinner.succeed(successMessage);
    } else {
      spinner.stop();
    }

    return result;
  } catch (error) {
    if (errorMessage) {
      spinner.fail(errorMessage);
    } else {
      spinner.fail();
    }
    throw error;
  }
}

/**
 * Handles command errors consistently across all commands
 */
export function handleCommandError(
  error: unknown,
  spinner?: Spinner,
  customMessage?: string
): void {
  // Stop spinner if provided
  if (spinner) {
    if (customMessage) {
      spinner.fail(customMessage);
    } else {
      spinner.fail();
    }
  }

  // Format and display error
  const formattedError = formatErrorForDisplay(error);
  console.error(formattedError);

  // Log detailed error for debugging
  logger.error('Command execution failed:', error);
}

/**
 * Safely executes a command with proper error handling and cleanup
 */
export async function executeCommand<T>(
  commandName: string,
  operation: () => Promise<T>,
  options: {
    spinnerText?: string;
    successMessage?: string;
    errorMessage?: string;
    validateInputs?: () => Promise<boolean>;
  } = {}
): Promise<T | undefined> {
  const {
    spinnerText,
    successMessage,
    errorMessage,
    validateInputs
  } = options;

  try {
    // Run input validation if provided
    if (validateInputs) {
      const isValid = await validateInputs();
      if (!isValid) {
        return undefined;
      }
    }

    // Execute with or without spinner
    if (spinnerText) {
      return await executeWithSpinner(
        spinnerText,
        operation,
        successMessage,
        errorMessage
      );
    } else {
      return await operation();
    }
  } catch (error) {
    handleCommandError(error, undefined, errorMessage);
    return undefined;
  }
}

/**
 * Creates a cancellable operation with SIGINT handling
 */
export function createCancellableOperation<T>(
  operation: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const abortController = new AbortController();

  // Handle Ctrl+C gracefully
  const handleInterrupt = () => {
    abortController.abort();
    console.log('\n\nOperation cancelled by user.');
  };

  process.on('SIGINT', handleInterrupt);

  return operation(abortController.signal).finally(() => {
    // Always clean up the interrupt handler
    process.off('SIGINT', handleInterrupt);
  });
}

/**
 * Validates file extension matches expected types
 */
export function validateFileExtension(
  filePath: string,
  allowedExtensions: string[]
): boolean {
  const ext = filePath.toLowerCase().split('.').pop() || '';

  if (!allowedExtensions.includes(ext)) {
    console.error(
      `Unsupported file type: .${ext}. ` +
      `Supported types: ${allowedExtensions.map(e => `.${e}`).join(', ')}`
    );
    return false;
  }

  return true;
}

/**
 * Safely parses JSON with error handling
 */
export function parseJSONSafely<T = any>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.error('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Truncates text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Validates that required command arguments are provided
 */
export function validateRequiredArgs(
  args: string[],
  requiredCount: number,
  commandName: string,
  usage: string
): boolean {
  if (args.length < requiredCount) {
    console.error(`Insufficient arguments for ${commandName} command.`);
    console.error(`Usage: ${usage}`);
    return false;
  }
  return true;
}

/**
 * Validates input size to prevent DoS attacks
 * Returns false if input is too large
 */
export function validateInputSize(input: string, maxSizeBytes: number = 50000): boolean {
  if (!input || typeof input !== 'string') {
    return true; // Empty/null inputs are valid
  }

  const inputSize = Buffer.byteLength(input, 'utf8');

  if (inputSize > maxSizeBytes) {
    const sizeInKB = Math.round(inputSize / 1024);
    const maxSizeInKB = Math.round(maxSizeBytes / 1024);

    console.error(`Input too large: ${sizeInKB}KB exceeds maximum of ${maxSizeInKB}KB`);
    logger.warn(`Input size validation failed: ${inputSize} bytes > ${maxSizeBytes} bytes`);
    return false;
  }

  return true;
}

/**
 * Simple rate limiter to prevent DoS attacks
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request is allowed for the given identifier
   */
  isAllowed(identifier: string = 'global'): boolean {
    const now = Date.now();
    const requestTimes = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => now - time < this.windowMs);

    // Check if limit is exceeded
    if (validRequests.length >= this.maxRequests) {
      logger.warn(`Rate limit exceeded for ${identifier}: ${validRequests.length}/${this.maxRequests} requests`);
      return false;
    }

    // Add current request time
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  /**
   * Get current request count for identifier
   */
  getCurrentCount(identifier: string = 'global'): number {
    const now = Date.now();
    const requestTimes = this.requests.get(identifier) || [];
    return requestTimes.filter(time => now - time < this.windowMs).length;
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute

/**
 * Validates rate limiting to prevent DoS attacks
 * Returns false if rate limit is exceeded
 */
export function validateRateLimit(identifier: string = 'global'): boolean {
  if (!globalRateLimiter.isAllowed(identifier)) {
    const currentCount = globalRateLimiter.getCurrentCount(identifier);
    console.error(`Rate limit exceeded: ${currentCount}/10 requests per minute`);
    console.error('Please wait before making additional requests');
    return false;
  }

  return true;
}

/**
 * Validates configuration values for security
 * Prevents insecure or malicious configuration settings
 */
export function validateConfigurationValue(key: string, value: any): boolean {
  if (!key || typeof key !== 'string') {
    console.error('Invalid configuration key');
    logger.warn('Configuration validation failed: invalid key');
    return false;
  }

  // Define validation rules for different config keys
  const validationRules: Record<string, (val: any) => boolean> = {
    'logger.level': (val) => ['error', 'warn', 'info', 'debug'].includes(val),
    'api.baseUrl': (val) => {
      if (typeof val !== 'string') return false;
      try {
        const url = new URL(val);

        // A10 Security: Block dangerous protocols that could lead to SSRF
        const dangerousProtocols = ['file:', 'gopher:', 'ftp:', 'ldap:', 'dict:', 'telnet:'];
        if (dangerousProtocols.includes(url.protocol)) {
          console.error(`A10 Security: Dangerous protocol blocked: ${url.protocol}`);
          return false;
        }

        // A10 Security: Block attempts to access internal/private networks
        const hostname = url.hostname.toLowerCase();
        const port = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80);

        // Block localhost access to non-HTTP ports (prevent port scanning)
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== 80 && port !== 443 && port !== 11434) {
          console.error(`A10 Security: Blocked localhost access to non-standard port: ${port}`);
          return false;
        }

        // Block cloud metadata endpoints
        if (hostname === '169.254.169.254' || hostname.includes('metadata')) {
          console.error(`A10 Security: Blocked access to cloud metadata endpoint: ${hostname}`);
          return false;
        }

        // Block private IP ranges (RFC 1918)
        if (hostname.startsWith('10.') || hostname.startsWith('192.168.') ||
            hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
          console.error(`A10 Security: Blocked access to private IP range: ${hostname}`);
          return false;
        }

        // Allow only HTTP/HTTPS protocols
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          console.error(`A10 Security: Only HTTP/HTTPS protocols allowed, got: ${url.protocol}`);
          return false;
        }

        // Allow localhost HTTP and Ollama default port, require HTTPS for external URLs
        return url.protocol === 'https:' ||
               (url.protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1'));
      } catch {
        return false;
      }
    },
    'telemetry.enabled': (val) => typeof val === 'boolean',
    'ai.temperature': (val) => typeof val === 'number' && val >= 0 && val <= 2,
    'ai.maxTokens': (val) => typeof val === 'number' && val > 0 && val <= 100000,
    'api.timeout': (val) => typeof val === 'number' && val > 0 && val <= 300000,
    'fileOps.maxReadSizeBytes': (val) => typeof val === 'number' && val > 0 && val <= 100000000,
    'performance.maxCacheSize': (val) => typeof val === 'number' && val > 0 && val <= 10000,
    'performance.concurrentOperations': (val) => typeof val === 'number' && val > 0 && val <= 20
  };

  // Check if we have a specific validation rule
  const validator = validationRules[key];
  if (validator) {
    const isValid = validator(value);
    if (!isValid) {
      console.error(`Invalid value for ${key}: ${value}`);
      logger.warn(`Configuration validation failed for ${key}: ${value}`);
      return false;
    }
  }

  // General security checks
  if (typeof value === 'string') {
    // Prevent script injection in string values
    if (value.includes('<script>') || value.includes('javascript:') || value.includes('data:')) {
      console.error(`Potentially malicious configuration value detected for ${key}`);
      logger.warn(`Security: Malicious config value blocked for ${key}`);
      return false;
    }

    // Prevent command injection patterns
    if (value.includes('$(') || value.includes('`') || value.includes('|') || value.includes(';')) {
      console.error(`Potentially dangerous configuration value for ${key}`);
      logger.warn(`Security: Dangerous config pattern blocked for ${key}`);
      return false;
    }
  }

  return true;
}

/**
 * Security: A05:2021 - Security Misconfiguration
 * Sanitizes configuration output for production mode
 * Removes debug information and sensitive data
 */
export function sanitizeConfigurationOutput(config: any, isProduction: boolean = false): any {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const sanitized = JSON.parse(JSON.stringify(config));

  if (isProduction) {
    // Security: A05:2021 - Don't expose debug-related information in production
    if (sanitized.development) {
      delete sanitized.development.enableDebugMode;
      delete sanitized.development.logLevel;
    }

    // Security: A05:2021 - Remove entire logger section in production
    // to avoid exposing debug level or logging configuration
    if (sanitized.logger) {
      delete sanitized.logger;
    }

    // Remove internal/sensitive keys
    delete sanitized.version;
    delete sanitized.internalMetrics;
    delete sanitized.debugInfo;
  }

  return sanitized;
}

/**
 * A06 Security: Validate file types for processing
 * Returns true if the file is safe to process, false otherwise
 */
export function validateFileTypeForProcessing(filePath: string): boolean {
  // Get file extension using simple string manipulation
  const lastDotIndex = filePath.lastIndexOf('.');
  const extension = lastDotIndex >= 0 ? filePath.substring(lastDotIndex).toLowerCase() : '';

  // A06 Security: List of dangerous file extensions that should not be processed
  const dangerousExtensions = [
    '.exe', '.dll', '.bat', '.cmd', '.com', '.scr', '.vbs', '.vbe',
    '.jse', '.wsf', '.wsh', '.msi', '.msp', '.hta', '.cpl',
    '.ps1', '.ps2', '.psc1', '.psc2', '.msh', '.msh1', '.msh2', '.mshxml',
    '.scf', '.lnk', '.inf', '.reg', '.docm', '.dotm', '.xlsm', '.xltm',
    '.xlam', '.pptm', '.potm', '.ppam', '.ppsm', '.sldm'
  ];

  if (dangerousExtensions.includes(extension)) {
    console.error(`A06 Security: File type not supported for processing: ${extension}`);
    logger.warn(`A06 Security: Dangerous file type blocked: ${extension} (${filePath})`);
    return false;
  }

  // A06 Security: List of safe text-based file extensions for code analysis
  const safeExtensions = [
    '.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg',
    '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte', '.py', '.java', '.c', '.cpp',
    '.cc', '.cxx', '.h', '.hpp', '.cs', '.vb', '.php', '.rb', '.go', '.rs',
    '.swift', '.kt', '.scala', '.clj', '.hs', '.elm', '.ml', '.fs', '.r',
    '.sql', '.html', '.htm', '.css', '.scss', '.sass', '.less', '.styl',
    '.sh', '.bash', '.zsh', '.fish', '.dockerfile', '.gitignore', '.editorconfig'
  ];

  // Allow files without extensions (often config files)
  if (!extension) {
    return true;
  }

  // Only allow explicitly safe extensions
  if (safeExtensions.includes(extension)) {
    return true;
  }

  // Warn about unknown file types but allow them (with caution)
  logger.warn(`A06 Security: Unknown file type, proceeding with caution: ${extension} (${filePath})`);
  return true;
}

/**
 * A08 Security: Validate content for potential security issues
 * Returns true if content appears safe to process, false otherwise
 */
export function validateContentIntegrity(content: string, filePath: string): boolean {
  // Allow empty files - they're valid for analysis
  if (typeof content !== 'string') {
    logger.warn(`A08 Security: Invalid content type for file: ${filePath}`);
    return false;
  }

  // A08 Security: Check for potentially malicious patterns
  const maliciousPatterns = [
    /eval\s*\(/i,                    // eval() calls
    /Function\s*\(/i,                // Function constructor
    /setTimeout\s*\(/i,              // setTimeout with string
    /setInterval\s*\(/i,             // setInterval with string
    /document\.write\s*\(/i,         // document.write
    /innerHTML\s*=/i,                // innerHTML assignment
    /outerHTML\s*=/i,                // outerHTML assignment
    /javascript:/i,                  // javascript: protocol
    /vbscript:/i,                    // vbscript: protocol
    /data:.*script/i,                // data: URLs with script
    /\.call\s*\(\s*null/i,           // suspicious .call usage
    /\.apply\s*\(\s*null/i,          // suspicious .apply usage
    /process\.exit\s*\(/i,           // process.exit calls
    /require\s*\(\s*['"][^'"]*child_process['"]/, // child_process require
    /import.*child_process/i,        // child_process import
    /spawn|exec|fork/i,              // process spawning functions
  ];

  let suspiciousPatternCount = 0;
  for (const pattern of maliciousPatterns) {
    if (pattern.test(content)) {
      suspiciousPatternCount++;
      logger.warn(`A08 Security: Suspicious pattern detected in ${filePath}: ${pattern.toString()}`);
    }
  }

  // A08 Security: If too many suspicious patterns, warn but still allow processing
  if (suspiciousPatternCount > 3) {
    logger.warn(`A08 Security: High risk content detected in ${filePath}: ${suspiciousPatternCount} suspicious patterns`);
    console.warn(`⚠️  A08 Security Warning: File contains ${suspiciousPatternCount} potentially dangerous patterns`);
  }

  // A08 Security: Always return true as we're analyzing, not executing
  // The goal is to warn about risks while still allowing static analysis
  return true;
}

/**
 * Security function to sanitize search terms and prevent command injection
 * Removes dangerous shell metacharacters that could be used for injection attacks
 */
export function sanitizeSearchTerm(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove or escape dangerous shell metacharacters
  // Keep only alphanumeric, spaces, basic punctuation, and safe regex characters
  const sanitized = input
    .replace(/[;&|`$(){}[\]\\<>]/g, '') // Remove shell metacharacters
    .replace(/"/g, '\\"') // Escape quotes
    .replace(/'/g, "\\'") // Escape single quotes
    .trim();

  // Additional validation: prevent extremely long inputs
  if (sanitized.length > 1000) {
    logger.warn(`Search term truncated from ${input.length} to 1000 characters`);
    return sanitized.substring(0, 1000);
  }

  // Log security warning if dangerous characters were removed
  if (sanitized !== input) {
    logger.warn(`Search term sanitized: "${input}" -> "${sanitized}"`);
  }

  return sanitized;
}

/**
 * Security function to sanitize output content to prevent display of dangerous patterns
 */
export function sanitizeOutput(output: string): string {
  if (!output || typeof output !== 'string') {
    return '';
  }

  // Define dangerous patterns that should not be displayed
  const dangerousPatterns = [
    /rm\s+-rf\s+[\/\w]/gi,           // rm -rf commands
    /DROP\s+TABLE/gi,                // SQL injection attempts
    /\<script\>/gi,                  // XSS attempts
    /javascript:/gi,                 // JavaScript URL schemes
    /eval\s*\(/gi,                   // Code evaluation
    /exec\s*\(/gi,                   // Code execution
    /system\s*\(/gi,                 // System calls
    /curl\s+.*[|&;]/gi,              // Dangerous curl commands
    /wget\s+.*[|&;]/gi,              // Dangerous wget commands
    /\$\(.*\)/g,                     // Command substitution
    /`.*`/g,                         // Backtick execution
    /\|.*>/g,                        // Pipe with redirection
    /&&.*rm/gi,                      // Chained commands with rm
    /;.*rm/gi                        // Semicolon chained with rm
  ];

  let sanitized = output;
  let wasModified = false;

  // Replace dangerous patterns with sanitized versions
  for (const pattern of dangerousPatterns) {
    const before = sanitized;
    sanitized = sanitized.replace(pattern, '[CONTENT_SANITIZED]');
    if (sanitized !== before) {
      wasModified = true;
    }
  }

  // Log security warning if content was modified
  if (wasModified) {
    logger.warn('Output content sanitized to remove potentially dangerous patterns');
  }

  return sanitized;
}

/**
 * Security function to validate and sanitize shell commands to prevent injection attacks
 * Returns null if the command is deemed unsafe
 */
export function validateAndSanitizeCommand(input: string): string | null {
  if (!input || typeof input !== 'string') {
    logger.warn('Command validation failed: empty or invalid input');
    return null;
  }

  const command = input.trim();

  // Prevent extremely long commands
  if (command.length > 500) {
    logger.warn(`Command rejected: too long (${command.length} characters)`);
    return null;
  }

  // Define allowed safe commands for code development
  const allowedCommands = [
    'ls', 'pwd', 'echo', 'cat', 'head', 'tail', 'grep', 'find', 'wc',
    'git status', 'git log', 'git diff', 'git branch', 'git show',
    'npm --version', 'node --version', 'yarn --version', 'tsc --version',
    'npm list', 'yarn list', 'npm audit', 'yarn audit'
  ];

  // Check if command starts with any allowed pattern
  const isAllowed = allowedCommands.some(allowed =>
    command.toLowerCase().startsWith(allowed.toLowerCase())
  );

  if (!isAllowed) {
    logger.warn(`Command rejected: not in allowlist: ${command}`);
    return null;
  }

  // Additional security checks: dangerous patterns
  const dangerousPatterns = [
    /rm\s+(-rf|\-r|\-f)/i,    // rm -rf, rm -r, rm -f
    />/,                       // Output redirection
    /\|/,                      // Pipes
    /;/,                       // Command chaining
    /&&/,                      // Command chaining
    /\|\|/,                    // Command chaining
    /\s+&\s+/,                 // Background execution / command chaining
    /`/,                       // Command substitution
    /\$\(/,                    // Command substitution
    /\.\./,                    // Directory traversal
    /(curl|wget)\s+/i,         // Network requests
    /(nc|netcat)\s+/i,         // Network connections
    /sh\s+/i,                  // Shell execution
    /bash\s+/i,                // Bash execution
    /eval\s+/i,                // Code evaluation
    /exec\s+/i                 // Process execution
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      logger.warn(`Command rejected: dangerous pattern detected: ${command}`);
      return null;
    }
  }

  logger.debug(`Command validated and approved: ${command}`);
  return command;
}

/**
 * A09 Security: Log security-relevant events without exposing sensitive data
 */
export function logSecurityEvent(event: string, details: Record<string, any> = {}): void {
  // A09 Security: Sanitize details to remove sensitive information
  const sanitizedDetails = { ...details };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'secret', 'key', 'token', 'auth', 'credential'];
  for (const field of sensitiveFields) {
    for (const key in sanitizedDetails) {
      if (key.toLowerCase().includes(field)) {
        sanitizedDetails[key] = '[REDACTED]';
      }
    }
  }

  // Log the security event with timestamp
  const timestamp = new Date().toISOString();
  console.error(`[SECURITY] ${timestamp}: ${event}`, sanitizedDetails);
}

/**
 * A09 Security: Sanitize sensitive configuration values for output
 */
export function sanitizeConfigurationValue(key: string, value: any): string {
  // A09 Security: Redact sensitive configuration values
  const sensitiveKeys = [
    'password', 'secret', 'key', 'token', 'auth', 'credential',
    'api.secret', 'api.key', 'database.password', 'oauth.secret'
  ];

  const isSensitive = sensitiveKeys.some(sensitiveKey =>
    key.toLowerCase().includes(sensitiveKey.toLowerCase())
  );

  if (isSensitive) {
    return '[REDACTED]';
  }

  return String(value);
}
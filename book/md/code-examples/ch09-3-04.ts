import { minimatch } from 'minimatch';
import path from 'path';

/**
 * Validates operations against sandbox rules
 */
export class SandboxValidator {
  constructor(private config: SandboxConfig) {}

  /**
   * Check if file path is allowed
   */
  isPathAllowed(filePath: string): ValidationResult {
    const normalizedPath = path.normalize(filePath);

    // Check if path escapes working directory
    if (this.config.workingDirectory) {
      const resolved = path.resolve(this.config.workingDirectory, normalizedPath);
      if (!resolved.startsWith(this.config.workingDirectory)) {
        return {
          allowed: false,
          reason: 'Path escapes working directory',
          severity: 'critical'
        };
      }
    }

    // Check blocked paths first (takes precedence)
    if (this.config.blockedPaths) {
      for (const pattern of this.config.blockedPaths) {
        if (minimatch(normalizedPath, pattern)) {
          return {
            allowed: false,
            reason: `Path matches blocked pattern: ${pattern}`,
            severity: 'high'
          };
        }
      }
    }

    // Check allowed paths
    if (this.config.allowedPaths) {
      let matched = false;

      for (const pattern of this.config.allowedPaths) {
        if (minimatch(normalizedPath, pattern)) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        return {
          allowed: false,
          reason: 'Path not in allowed list',
          severity: 'medium'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if command is allowed
   */
  isCommandAllowed(command: string): ValidationResult {
    if (!this.config.allowedCommands) {
      // If no allowlist, reject all commands
      return {
        allowed: false,
        reason: 'Command execution not allowed',
        severity: 'high'
      };
    }

    // Extract base command (first word)
    const baseCommand = command.trim().split(/\s+/)[0];

    // Check if command is in allowlist
    const allowed = this.config.allowedCommands.some(allowedCmd => {
      // Exact match
      if (command === allowedCmd) return true;

      // Prefix match (e.g., "git" allows "git status")
      if (command.startsWith(allowedCmd + ' ')) return true;

      // Base command match
      if (baseCommand === allowedCmd) return true;

      return false;
    });

    if (!allowed) {
      return {
        allowed: false,
        reason: `Command not in allowed list: ${baseCommand}`,
        severity: 'high'
      };
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /rm\s+-rf/,
      /dd\s+if=/,
      /mkfs/,
      /:\(\)\{.*\}:/,  // Fork bomb
      />\s*\/dev\/sd/,
      /curl.*\|\s*sh/,
      /wget.*\|\s*sh/,
      /sudo/,
      /chmod\s+777/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: 'Command contains dangerous pattern',
          severity: 'critical'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if operation is allowed in read-only mode
   */
  isWriteAllowed(operation: 'create' | 'update' | 'delete'): ValidationResult {
    if (this.config.readOnly) {
      return {
        allowed: false,
        reason: 'Sandbox is in read-only mode',
        severity: 'medium'
      };
    }

    return { allowed: true };
  }

  /**
   * Check if network access is allowed
   */
  isNetworkAllowed(url: string): ValidationResult {
    if (!this.config.allowNetwork) {
      return {
        allowed: false,
        reason: 'Network access not allowed',
        severity: 'medium'
      };
    }

    return { allowed: true };
  }
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}
/**
 * Audit logger for security-relevant events
 */
export class AuditLogger {
  private logger: Logger;
  private storage: AuditStorage;

  constructor(logger: Logger, storage: AuditStorage) {
    this.logger = logger;
    this.storage = storage;
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // Add metadata
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date(),
      id: this.generateEventId()
    };

    // Redact sensitive data
    const redacted = this.redactEvent(auditEvent);

    // Write to logger
    this.logger.info('Security event:', redacted);

    // Store for audit
    await this.storage.store(redacted);
  }

  /**
   * Log file access
   */
  async logFileAccess(
    operation: 'read' | 'write' | 'delete',
    filePath: string,
    success: boolean,
    user?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: 'file_access',
      operation,
      resource: filePath,
      success,
      user,
      metadata: {}
    });
  }

  /**
   * Log command execution
   */
  async logCommandExecution(
    command: string,
    success: boolean,
    exitCode?: number,
    user?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: 'command_execution',
      operation: 'execute',
      resource: command,
      success,
      user,
      metadata: { exitCode }
    });
  }

  /**
   * Log credential access
   */
  async logCredentialAccess(
    operation: 'get' | 'set' | 'delete',
    key: string,
    success: boolean,
    user?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: 'credential_access',
      operation,
      resource: key,
      success,
      user,
      metadata: {}
    });
  }

  /**
   * Log security violation
   */
  async logViolation(
    violationType: string,
    resource: string,
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    user?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: 'security_violation',
      operation: violationType,
      resource,
      success: false,
      user,
      metadata: { reason, severity }
    });
  }

  /**
   * Redact sensitive data from event
   */
  private redactEvent(event: AuditEvent): AuditEvent {
    const redacted = { ...event };

    // Redact resource if it contains sensitive data
    if (redacted.resource) {
      const validator = new InputValidator(this.logger);
      redacted.resource = validator.sanitize(redacted.resource);
    }

    return redacted;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export interface SecurityEvent {
  type: string;
  operation: string;
  resource: string;
  success: boolean;
  user?: string;
  metadata: Record<string, any>;
}

export interface AuditEvent extends SecurityEvent {
  id: string;
  timestamp: Date;
}
import fs from 'fs/promises';

/**
 * Sandboxed file system operations
 */
export class SandboxedFileSystem {
  private validator: SandboxValidator;
  private logger: Logger;

  constructor(
    config: SandboxConfig,
    logger: Logger
  ) {
    this.validator = new SandboxValidator(config);
    this.logger = logger;
  }

  /**
   * Read file with sandbox validation
   */
  async readFile(filePath: string): Promise<string> {
    // Validate path
    const validation = this.validator.isPathAllowed(filePath);

    if (!validation.allowed) {
      this.logger.warn('Blocked file read:', {
        path: filePath,
        reason: validation.reason
      });

      throw new SecurityError(
        `Access denied: ${validation.reason}`,
        validation.severity || 'medium'
      );
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      this.logger.debug('File read:', { path: filePath, size: content.length });

      return content;

    } catch (error) {
      this.logger.error('File read error:', { path: filePath, error });
      throw error;
    }
  }

  /**
   * Write file with sandbox validation
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    // Validate write allowed
    const writeValidation = this.validator.isWriteAllowed('create');

    if (!writeValidation.allowed) {
      throw new SecurityError(
        `Write denied: ${writeValidation.reason}`,
        writeValidation.severity || 'medium'
      );
    }

    // Validate path
    const pathValidation = this.validator.isPathAllowed(filePath);

    if (!pathValidation.allowed) {
      this.logger.warn('Blocked file write:', {
        path: filePath,
        reason: pathValidation.reason
      });

      throw new SecurityError(
        `Access denied: ${pathValidation.reason}`,
        pathValidation.severity || 'medium'
      );
    }

    try {
      await fs.writeFile(filePath, content, 'utf-8');

      this.logger.info('File written:', {
        path: filePath,
        size: content.length
      });

    } catch (error) {
      this.logger.error('File write error:', { path: filePath, error });
      throw error;
    }
  }

  /**
   * Delete file with sandbox validation
   */
  async deleteFile(filePath: string): Promise<void> {
    // Validate write allowed
    const writeValidation = this.validator.isWriteAllowed('delete');

    if (!writeValidation.allowed) {
      throw new SecurityError(
        `Delete denied: ${writeValidation.reason}`,
        writeValidation.severity || 'medium'
      );
    }

    // Validate path
    const pathValidation = this.validator.isPathAllowed(filePath);

    if (!pathValidation.allowed) {
      this.logger.warn('Blocked file delete:', {
        path: filePath,
        reason: pathValidation.reason
      });

      throw new SecurityError(
        `Access denied: ${pathValidation.reason}`,
        pathValidation.severity || 'medium'
      );
    }

    try {
      await fs.unlink(filePath);

      this.logger.warn('File deleted:', { path: filePath });

    } catch (error) {
      this.logger.error('File delete error:', { path: filePath, error });
      throw error;
    }
  }

  /**
   * List directory with sandbox validation
   */
  async listDirectory(dirPath: string): Promise<string[]> {
    const validation = this.validator.isPathAllowed(dirPath);

    if (!validation.allowed) {
      throw new SecurityError(
        `Access denied: ${validation.reason}`,
        validation.severity || 'medium'
      );
    }

    const entries = await fs.readdir(dirPath);

    // Filter entries by sandbox rules
    const allowed: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const entryValidation = this.validator.isPathAllowed(fullPath);

      if (entryValidation.allowed) {
        allowed.push(entry);
      }
    }

    return allowed;
  }
}

export class SecurityError extends Error {
  constructor(
    message: string,
    public severity: 'low' | 'medium' | 'high' | 'critical'
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}
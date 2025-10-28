/**
 * Validation Utilities
 *
 * Centralized validation logic to reduce duplication and ensure consistent
 * validation patterns across the application.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createValidationError } from './error-handling.js';

export interface ValidationResult<T = any> {
  isValid: boolean;
  value?: T;
  error?: Error;
  errors?: string[];
}

export interface FileValidationOptions {
  mustExist?: boolean;
  allowedExtensions?: string[];
  maxSize?: number; // in bytes
  checkReadable?: boolean;
  checkWritable?: boolean;
}

/**
 * File system validation utilities
 */
export class FileSystemValidator {
  /**
   * Validate file path and properties
   */
  static async validateFile(
    filePath: string,
    options: FileValidationOptions = {}
  ): Promise<ValidationResult<string>> {
    try {
      const resolvedPath = path.resolve(filePath);

      // Check existence
      if (options.mustExist !== false) {
        try {
          await fs.promises.access(resolvedPath, fs.constants.F_OK);
        } catch {
          return {
            isValid: false,
            error: createValidationError('filePath', filePath, 'existing file')
          };
        }
      }

      // Check if it's actually a file
      if (options.mustExist !== false) {
        const stats = await fs.promises.stat(resolvedPath);
        if (!stats.isFile()) {
          return {
            isValid: false,
            error: createValidationError('filePath', filePath, 'file (not directory)')
          };
        }

        // Check file size
        if (options.maxSize !== undefined && stats.size > options.maxSize) {
          return {
            isValid: false,
            error: createValidationError(
              'fileSize',
              stats.size,
              `file smaller than ${options.maxSize} bytes`
            )
          };
        }
      }

      // Check file extension
      if (options.allowedExtensions) {
        const ext = path.extname(resolvedPath).toLowerCase();
        if (!options.allowedExtensions.includes(ext)) {
          return {
            isValid: false,
            error: createValidationError(
              'fileExtension',
              ext,
              `one of: ${options.allowedExtensions.join(', ')}`
            )
          };
        }
      }

      return {
        isValid: true,
        value: resolvedPath
      };

    } catch (error) {
      return {
        isValid: false,
        error: createValidationError('filePath', filePath, 'valid file path')
      };
    }
  }

  /**
   * Check if path exists
   */
  static async exists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * String validation utilities
 */
export class StringValidator {
  /**
   * Validate string with length constraints
   */
  static validate(
    value: unknown,
    fieldName: string,
    minLength: number = 0,
    maxLength?: number
  ): ValidationResult<string> {
    // Type check
    if (typeof value !== 'string') {
      return {
        isValid: false,
        error: createValidationError(fieldName, value, 'string')
      };
    }

    const str = value.trim();

    // Length checks
    if (str.length < minLength) {
      return {
        isValid: false,
        error: createValidationError(
          fieldName,
          str,
          `string with at least ${minLength} characters`
        )
      };
    }

    if (maxLength && str.length > maxLength) {
      return {
        isValid: false,
        error: createValidationError(
          fieldName,
          str,
          `string with at most ${maxLength} characters`
        )
      };
    }

    return {
      isValid: true,
      value: str
    };
  }
}

/**
 * Legacy validation functions for backward compatibility
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidPath(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !value.includes('\0');
}

export function isValidFilePath(value: unknown): value is string {
  return isValidPath(value) && typeof value === 'string' && !value.endsWith('/');
}

export function isValidDirectoryPath(value: unknown): value is string {
  return isValidPath(value);
}

/**
 * Convenience validation functions
 */
export const validators = {
  file: FileSystemValidator.validateFile,
  exists: FileSystemValidator.exists,
  string: StringValidator.validate
};
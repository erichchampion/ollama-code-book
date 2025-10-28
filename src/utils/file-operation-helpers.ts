/**
 * File Operation Helpers
 *
 * Utility functions to eliminate DRY violations in file operation commands
 */

import { EnhancedCodeEditor } from '../tools/enhanced-code-editor.js';
import { getAIClient } from '../ai/index.js';
import { logger } from '../utils/logger.js';
import { formatErrorForDisplay } from '../errors/formatter.js';
import { FILE_OPERATION_CONSTANTS } from '../constants/file-operations.js';
import path from 'path';

export interface FileOperationContext {
  editor: EnhancedCodeEditor;
  aiClient: any;
}

export interface CreateFileOptions {
  path: string;
  content?: string;
  description?: string;
}

export interface EditRequestFile {
  path: string;
  action: {
    type: 'create-file' | 'modify-content';
    parameters: Record<string, any>;
  };
  content: string;
  description: string;
}

/**
 * Initialize file operation context (eliminates repeated initialization)
 */
export async function initializeFileOperationContext(): Promise<FileOperationContext> {
  const editor = new EnhancedCodeEditor();
  await editor.initialize();

  return {
    editor,
    aiClient: getAIClient()
  };
}

/**
 * Create a standardized file edit request
 */
export function createFileEditRequest(
  type: 'create' | 'modify',
  files: EditRequestFile[]
) {
  return {
    type,
    files
  };
}

/**
 * Execute file operation with standardized error handling
 */
export async function executeFileOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    logger.info(`Starting file operation: ${operationName}`);
    return await operation();
  } catch (error) {
    logger.error(`File operation failed: ${operationName}`, error);
    console.error(formatErrorForDisplay(error));
    throw error;
  }
}

/**
 * Generate safe output path for test files
 */
export function generateTestFilePath(sourcePath: string, outputPath?: string): string {
  if (outputPath) {
    return outputPath;
  }

  const ext = path.extname(sourcePath);
  const validExtensions = ['.ts', '.js', '.py'];

  if (!validExtensions.includes(ext)) {
    // Fallback for unsupported extensions
    return sourcePath.replace(/\.[^.]+$/, '.test.js');
  }

  return sourcePath.replace(/\.(ts|js|py)$/, '.test.$1');
}

/**
 * Build AI prompt with consistent formatting
 */
export function buildAIPrompt(template: string, context: Record<string, any>): string {
  let prompt = template;
  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return prompt;
}

/**
 * Create file with standardized handling
 */
export async function createFileWithContent(
  context: FileOperationContext,
  options: CreateFileOptions
): Promise<boolean> {
  const request = createFileEditRequest('create', [{
    path: options.path,
    action: {
      type: 'create-file',
      parameters: {}
    },
    content: options.content || '',
    description: options.description || `Created file: ${path.basename(options.path)}`
  }]);

  const results = await context.editor.executeEditRequest(request);

  if (results[0].success) {
    console.log(`✅ Successfully created: ${options.path}`);
    if (options.description) {
      console.log(`   ${options.description}`);
    }
    return true;
  } else {
    console.error(`❌ Failed to create file: ${results[0].error}`);
    return false;
  }
}

/**
 * Modify file with standardized handling
 */
export async function modifyFileWithContent(
  context: FileOperationContext,
  filePath: string,
  newContent: string,
  description: string
): Promise<boolean> {
  const request = createFileEditRequest('modify', [{
    path: filePath,
    action: {
      type: 'modify-content',
      parameters: {}
    },
    content: newContent,
    description
  }]);

  const results = await context.editor.executeEditRequest(request);

  if (results[0].success) {
    console.log(`✅ Successfully modified: ${filePath}`);
    console.log(`   Applied: "${description}"`);
    return true;
  } else {
    console.error(`❌ Failed to modify file: ${results[0].error}`);
    return false;
  }
}

/**
 * Extract code from markdown code blocks
 */
function extractCodeFromMarkdown(content: string): string {
  if (!content) return '';

  // Try to find markdown code blocks
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
  const matches = [...content.matchAll(codeBlockRegex)];

  if (matches.length > 0) {
    // Return the first code block content
    return matches[0][1].trim();
  }

  // If no code blocks found, check if the content itself looks like code
  // (doesn't start with prose-like text)
  const lines = content.trim().split('\n');
  const firstLine = lines[0].trim();

  // If it starts with typical code patterns, return as-is
  if (
    firstLine.startsWith('import ') ||
    firstLine.startsWith('export ') ||
    firstLine.startsWith('const ') ||
    firstLine.startsWith('let ') ||
    firstLine.startsWith('var ') ||
    firstLine.startsWith('function ') ||
    firstLine.startsWith('class ') ||
    firstLine.startsWith('//') ||
    firstLine.startsWith('/*') ||
    firstLine.startsWith('{') ||
    firstLine.startsWith('(')
  ) {
    return content.trim();
  }

  // Otherwise, assume the whole content is wrapped in explanation text
  // and try to extract what looks like code
  return content.trim();
}

/**
 * Generate code using AI with consistent prompt structure
 */
export async function generateCodeWithAI(
  context: FileOperationContext,
  description: string,
  options: {
    language?: string;
    framework?: string;
    includeComments?: boolean;
    includeErrorHandling?: boolean;
  } = {}
): Promise<string> {
  const contextParts: string[] = [];

  if (options.language) {
    contextParts.push(`Language: ${options.language}`);
  }
  if (options.framework) {
    contextParts.push(`Framework: ${options.framework}`);
  }

  const requirements: string[] = [];
  if (options.includeErrorHandling !== false) {
    requirements.push('- Include proper error handling');
  }
  if (options.includeComments !== false) {
    requirements.push('- Add appropriate comments');
  }
  requirements.push('- Follow best practices', '- Make it complete and functional');

  const prompt = buildAIPrompt(
    `Generate production-ready code for: {description}
{context}

Requirements:
{requirements}

IMPORTANT: Respond with ONLY the code, no explanations or markdown formatting:`,
    {
      description,
      context: contextParts.length > 0 ? '\n' + contextParts.join('\n') : '',
      requirements: requirements.join('\n')
    }
  );

  const response = await context.aiClient.complete(prompt);
  const rawContent = response.message?.content || '';

  // Extract code from markdown if present
  return extractCodeFromMarkdown(rawContent);
}

/**
 * Validate file path and ensure directory exists
 */
export function validateAndPreparePath(filePath: string): { isValid: boolean; error?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { isValid: false, error: 'File path must be a non-empty string' };
  }

  const normalizedPath = path.normalize(filePath);

  // Check for potentially dangerous paths
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
    return {
      isValid: false,
      error: 'Path contains potentially unsafe components'
    };
  }

  return { isValid: true };
}

/**
 * Detect file language from extension using constants
 */
export function detectFileLanguage(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  return FILE_OPERATION_CONSTANTS.LANGUAGE_EXTENSIONS[ext as keyof typeof FILE_OPERATION_CONSTANTS.LANGUAGE_EXTENSIONS];
}

/**
 * Check if technology string is a programming language
 */
export function isProgrammingLanguage(tech: string): boolean {
  return (FILE_OPERATION_CONSTANTS.PROGRAMMING_LANGUAGES as readonly string[])
    .includes(tech.toLowerCase());
}

/**
 * Check if technology string is a framework
 */
export function isFramework(tech: string): boolean {
  return (FILE_OPERATION_CONSTANTS.FRAMEWORKS as readonly string[])
    .includes(tech.toLowerCase());
}
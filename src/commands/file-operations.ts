/**
 * File Operation Commands
 *
 * Phase 2.1: Natural language file commands for interactive file operations
 * Refactored to eliminate DRY violations and hardcoded values
 */

import { CommandDef, commandRegistry, ArgType } from './index.js';
import { ValidationLevel } from '../tools/code-editor.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FILE_OPERATION_CONSTANTS } from '../constants/file-operations.js';
import {
  initializeFileOperationContext,
  executeFileOperation,
  createFileWithContent,
  modifyFileWithContent,
  generateCodeWithAI,
  generateTestFilePath,
  validateAndPreparePath
} from '../utils/file-operation-helpers.js';

/**
 * Create file command
 */
export const createFileCommand: CommandDef = {
  name: 'create-file',
  description: 'Create a new file with AI-generated content',
  category: 'File Operations',
  args: [
    {
      name: 'path',
      type: ArgType.STRING,
      required: true,
      description: 'Path for the new file'
    },
    {
      name: 'description',
      type: ArgType.STRING,
      required: false,
      description: 'Description of file content to generate'
    },
    {
      name: 'type',
      type: ArgType.STRING,
      required: false,
      description: 'File type (js, ts, py, etc.)'
    }
  ],
  async handler(args: Record<string, any>): Promise<void> {
    if (!args.path) {
      throw new Error('File path is required');
    }

    const validation = validateAndPreparePath(args.path);
    if (!validation.isValid) {
      throw new Error(`Invalid file path: ${validation.error}`);
    }

    await executeFileOperation(async () => {
      const context = await initializeFileOperationContext();

      // Generate content if description provided
      let content = args.content || '';
      if (args.description && !content) {
        content = await generateCodeWithAI(context, args.description, {
          language: args.type
        });
      }

      const description = args.description
        ? `Generated from: "${args.description}"`
        : 'Created via create-file command';

      await createFileWithContent(context, {
        path: args.path,
        content,
        description
      });
    }, `Creating file: ${args.path}`);
  }
};

/**
 * Edit file command
 */
export const editFileCommand: CommandDef = {
  name: 'edit-file',
  description: 'Edit an existing file with AI assistance',
  category: 'File Operations',
  args: [
    {
      name: 'path',
      type: ArgType.STRING,
      required: true,
      description: 'Path to the file to edit'
    },
    {
      name: 'instructions',
      type: ArgType.STRING,
      required: true,
      description: 'Natural language instructions for editing'
    },
    {
      name: 'preview',
      type: ArgType.BOOLEAN,
      required: false,
      description: 'Preview changes before applying'
    }
  ],
  async handler(args: Record<string, any>): Promise<void> {
    if (!args.path || !args.instructions) {
      throw new Error('File path and instructions are required');
    }

    const validation = validateAndPreparePath(args.path);
    if (!validation.isValid) {
      throw new Error(`Invalid file path: ${validation.error}`);
    }

    await executeFileOperation(async () => {
      const context = await initializeFileOperationContext();

      // Read current content
      const currentContent = await fs.readFile(args.path, 'utf-8');

      // Generate edit instructions using AI
      const prompt = `Given the following code, apply these changes: ${args.instructions}

Current code:
\`\`\`
${currentContent}
\`\`\`

Provide the complete modified code:`;

      const response = await context.aiClient.complete(prompt);
      const newContent = response.message?.content || currentContent;

      // Preview mode
      if (args.preview) {
        console.log('\n📝 Preview of changes:');
        console.log('─'.repeat(50));
        console.log(newContent);
        console.log('─'.repeat(50));
        console.log('Use --no-preview to apply changes');
        return;
      }

      await modifyFileWithContent(context, args.path, newContent, args.instructions);
    }, `Editing file: ${args.path}`);
  }
};

/**
 * Generate code command
 */
export const generateCodeCommand: CommandDef = {
  name: 'generate-code',
  description: 'Generate code based on natural language description',
  category: 'File Operations',
  args: [
    {
      name: 'description',
      type: ArgType.STRING,
      required: true,
      description: 'Natural language description of code to generate'
    },
    {
      name: 'output',
      type: ArgType.STRING,
      required: false,
      description: 'Output file path (optional)'
    },
    {
      name: 'language',
      type: ArgType.STRING,
      required: false,
      description: 'Programming language'
    },
    {
      name: 'framework',
      type: ArgType.STRING,
      required: false,
      description: 'Framework to use (react, express, etc.)'
    }
  ],
  async handler(args: Record<string, any>): Promise<void> {
    if (!args.description) {
      throw new Error('Description is required for code generation');
    }

    if (args.output) {
      const validation = validateAndPreparePath(args.output);
      if (!validation.isValid) {
        throw new Error(`Invalid output path: ${validation.error}`);
      }
    }

    await executeFileOperation(async () => {
      const context = await initializeFileOperationContext();

      const generatedCode = await generateCodeWithAI(context, args.description, {
        language: args.language,
        framework: args.framework
      });

      // Display or save generated code
      if (args.output) {
        await createFileWithContent(context, {
          path: args.output,
          content: generatedCode,
          description: `Generated code: ${args.description}`
        });
      } else {
        console.log('\n🎯 Generated code:');
        console.log('─'.repeat(50));
        console.log(generatedCode);
        console.log('─'.repeat(50));
        console.log('\nTip: Use --output <path> to save to a file');
      }
    }, `Generating code: ${args.description}`);
  }
};

/**
 * Create tests command
 */
export const createTestsCommand: CommandDef = {
  name: 'create-tests',
  description: 'Generate tests for existing code',
  category: 'File Operations',
  args: [
    {
      name: 'source',
      type: ArgType.STRING,
      required: true,
      description: 'Path to source file to test'
    },
    {
      name: 'output',
      type: ArgType.STRING,
      required: false,
      description: 'Output path for test file'
    },
    {
      name: 'framework',
      type: ArgType.STRING,
      required: false,
      description: 'Test framework (jest, mocha, pytest, etc.)'
    }
  ],
  async handler(args: Record<string, any>): Promise<void> {
    if (!args.source) {
      throw new Error('Source file path is required');
    }

    const sourceValidation = validateAndPreparePath(args.source);
    if (!sourceValidation.isValid) {
      throw new Error(`Invalid source path: ${sourceValidation.error}`);
    }

    await executeFileOperation(async () => {
      const context = await initializeFileOperationContext();

      const sourceContent = await fs.readFile(args.source, 'utf-8');

      // Use constant for default test framework
      const framework = args.framework || FILE_OPERATION_CONSTANTS.DEFAULT_TEST_FRAMEWORK;

      // Generate tests using AI
      const prompt = `Generate comprehensive unit tests for the following code:

Code to test:
\`\`\`
${sourceContent}
\`\`\`

Requirements:
- Use ${framework} testing framework
- Test all functions/methods
- Include edge cases
- Test error conditions
- Add descriptive test names
- Include setup/teardown if needed
- Achieve high code coverage

Provide complete test code:`;

      const response = await context.aiClient.complete(prompt);
      const testCode = response.message?.content || '';

      // Use safe path generation function
      const outputPath = generateTestFilePath(args.source, args.output);

      await createFileWithContent(context, {
        path: outputPath,
        content: testCode,
        description: `Tests for ${path.basename(args.source)} using ${framework}`
      });

      console.log(`   Source: ${args.source}`);
      console.log(`   Framework: ${framework}`);
    }, `Generating tests for: ${args.source}`);
  }
};

/**
 * Register all file operation commands
 */
export function registerFileOperationCommands(): void {
  const commands = [
    createFileCommand,
    editFileCommand,
    generateCodeCommand,
    createTestsCommand
  ];

  for (const command of commands) {
    commandRegistry.register(command);
    logger.debug(`Registered file operation command: ${command.name}`);
  }
}

/**
 * Get all file operation commands
 */
export function getFileOperationCommands(): CommandDef[] {
  return [
    createFileCommand,
    editFileCommand,
    generateCodeCommand,
    createTestsCommand
  ];
}
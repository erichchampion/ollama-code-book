/**
 * Interactive Mode File Operations Tests
 *
 * Tests for file operation handling in interactive mode, including:
 * - File creation with explicit paths
 * - File creation with AI-suggested paths
 * - File editing
 * - Error handling and fallbacks
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Interactive Mode File Operations', () => {
  let mockTerminal;
  let mockComponentFactory;
  let mockAiClient;
  let mockExecuteCommand;
  let handler;

  beforeEach(() => {
    // Mock terminal
    mockTerminal = {
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Mock AI client
    mockAiClient = {
      complete: jest.fn()
    };

    // Mock component factory
    mockComponentFactory = {
      getComponent: jest.fn((name) => {
        if (name === 'aiClient') {
          return Promise.resolve(mockAiClient);
        }
        throw new Error(`Unknown component: ${name}`);
      })
    };

    // Mock executeCommand
    mockExecuteCommand = jest.fn();

    // Create a mock handler that simulates the file operation logic
    handler = {
      terminal: mockTerminal,
      componentFactory: mockComponentFactory,
      getComponentTimeout: jest.fn(() => 5000),

      async handleFileOperation(result, userInput) {
        const operation = result.fileOperation?.operation;
        const targetFile = result.fileOperation?.targetFile;
        const description = result.fileOperation?.description || userInput;

        if (operation === 'create') {
          if (!targetFile) {
            // No file path specified - need to generate one
            this.terminal.info('Determining file path and generating code...');

            try {
              const aiClient = await this.componentFactory.getComponent('aiClient', {
                timeout: this.getComponentTimeout('aiClient')
              });

              const pathPrompt = `Based on this request: "${description}"

Suggest a single, appropriate file path. Consider:
- Component type (React component, class, function, etc.)
- Naming conventions (PascalCase for components, camelCase for utilities, etc.)
- File extension (.jsx, .tsx, .js, .ts, .py, etc.)
- Common directory structures (src/, components/, utils/, etc.)

Reply with ONLY the file path, nothing else. Example: src/components/LoginForm.jsx`;

              const response = await aiClient.complete(pathPrompt);
              const rawContent = response.message?.content;
              const suggestedPath = rawContent ? rawContent.trim() : '';

              if (suggestedPath && suggestedPath.length > 0 && suggestedPath.length < 200) {
                this.terminal.info(`Creating file: ${suggestedPath}...`);
                await mockExecuteCommand('create-file', ['--path', suggestedPath, '--description', description]);
                this.terminal.success(`✓ File created: ${suggestedPath}`);
                return { success: true, path: suggestedPath };
              } else {
                // Invalid path from AI - fall back to generate-code
                this.terminal.info('Generating code (could not determine file path)...');
                await mockExecuteCommand('generate-code', ['--description', description]);
                this.terminal.info('\nTo save this code, use: create-file with a specific path');
                return { success: false, fallback: true };
              }
            } catch (error) {
              this.terminal.info('Generating code (could not determine file path)...');
              await mockExecuteCommand('generate-code', ['--description', description]);
              this.terminal.info('\nTo save this code, use: create-file with a specific path');
              return { success: false, fallback: true };
            }
          }

          this.terminal.info(`Creating file: ${targetFile}...`);
          await mockExecuteCommand('create-file', ['--path', targetFile, '--description', description]);
          this.terminal.success(`✓ File created successfully`);
          return { success: true, path: targetFile };
        } else if (operation === 'edit' || operation === 'modify') {
          if (!targetFile) {
            this.terminal.warn('No target file specified. Please specify which file to edit.');
            return { success: false, error: 'No target file' };
          }

          this.terminal.info(`Editing file: ${targetFile}...`);
          await mockExecuteCommand('edit-file', ['--path', targetFile, '--instructions', description]);
          this.terminal.success(`✓ File edited successfully`);
          return { success: true, path: targetFile };
        }
      }
    };
  });

  describe('File Creation with Explicit Path', () => {
    test('should create file when path is provided', async () => {
      const result = {
        type: 'file_operation',
        fileOperation: {
          operation: 'create',
          targetFile: 'src/components/LoginForm.jsx',
          description: 'Create a React login component'
        }
      };

      const output = await handler.handleFileOperation(result, 'Create a React login component');

      expect(output.success).toBe(true);
      expect(output.path).toBe('src/components/LoginForm.jsx');
      expect(mockTerminal.info).toHaveBeenCalledWith('Creating file: src/components/LoginForm.jsx...');
      expect(mockTerminal.success).toHaveBeenCalledWith('✓ File created successfully');
      expect(mockExecuteCommand).toHaveBeenCalledWith('create-file', [
        '--path',
        'src/components/LoginForm.jsx',
        '--description',
        'Create a React login component'
      ]);
    });

    test('should handle different file types correctly', async () => {
      const testCases = [
        {
          path: 'utils/helper.js',
          description: 'Helper utility function'
        },
        {
          path: 'services/api.ts',
          description: 'API service class'
        },
        {
          path: 'components/Button.tsx',
          description: 'Reusable button component'
        }
      ];

      for (const testCase of testCases) {
        const result = {
          type: 'file_operation',
          fileOperation: {
            operation: 'create',
            targetFile: testCase.path,
            description: testCase.description
          }
        };

        const output = await handler.handleFileOperation(result, testCase.description);

        expect(output.success).toBe(true);
        expect(output.path).toBe(testCase.path);
      }
    });
  });

  describe('File Creation with AI Path Suggestion', () => {
    test('should ask AI for path suggestion when no path provided', async () => {
      mockAiClient.complete.mockResolvedValue({
        message: {
          content: 'src/components/UserLogin.jsx'
        }
      });

      const result = {
        type: 'file_operation',
        fileOperation: {
          operation: 'create',
          targetFile: null,
          description: 'Create a new React component for user login'
        }
      };

      const output = await handler.handleFileOperation(result, 'Create a new React component for user login');

      expect(output.success).toBe(true);
      expect(output.path).toBe('src/components/UserLogin.jsx');
      expect(mockTerminal.info).toHaveBeenCalledWith('Determining file path and generating code...');
      expect(mockAiClient.complete).toHaveBeenCalled();
      expect(mockExecuteCommand).toHaveBeenCalledWith('create-file', [
        '--path',
        'src/components/UserLogin.jsx',
        '--description',
        'Create a new React component for user login'
      ]);
    });

    test('should handle various AI path suggestions', async () => {
      const testCases = [
        {
          description: 'Create a Python utility function',
          suggestedPath: 'utils/helper.py'
        },
        {
          description: 'Create a TypeScript interface',
          suggestedPath: 'types/User.ts'
        },
        {
          description: 'Create an Express route handler',
          suggestedPath: 'routes/api.js'
        }
      ];

      for (const testCase of testCases) {
        mockAiClient.complete.mockResolvedValue({
          message: {
            content: testCase.suggestedPath
          }
        });

        const result = {
          type: 'file_operation',
          fileOperation: {
            operation: 'create',
            targetFile: null,
            description: testCase.description
          }
        };

        const output = await handler.handleFileOperation(result, testCase.description);

        expect(output.success).toBe(true);
        expect(output.path).toBe(testCase.suggestedPath);
      }
    });

    test('should reject invalid AI path suggestions', async () => {
      const invalidCases = [
        { content: '', reason: 'empty string' },
        { content: 'a'.repeat(300), reason: 'too long' }
      ];

      for (const testCase of invalidCases) {
        mockExecuteCommand.mockClear(); // Clear previous calls

        mockAiClient.complete.mockResolvedValue({
          message: {
            content: testCase.content
          }
        });

        const result = {
          type: 'file_operation',
          fileOperation: {
            operation: 'create',
            targetFile: null,
            description: 'Create a component'
          }
        };

        const output = await handler.handleFileOperation(result, 'Create a component');

        // Should fall back to generate-code
        expect(output.success).toBe(false);
        expect(output.fallback).toBe(true);
        expect(mockExecuteCommand).toHaveBeenCalledWith('generate-code', [
          '--description',
          'Create a component'
        ]);
      }
    });

    test('should fallback to generate-code when AI fails', async () => {
      mockAiClient.complete.mockRejectedValue(new Error('AI service unavailable'));

      const result = {
        type: 'file_operation',
        fileOperation: {
          operation: 'create',
          targetFile: null,
          description: 'Create a React component'
        }
      };

      const output = await handler.handleFileOperation(result, 'Create a React component');

      expect(output.success).toBe(false);
      expect(output.fallback).toBe(true);
      expect(mockTerminal.info).toHaveBeenCalledWith('Generating code (could not determine file path)...');
      expect(mockExecuteCommand).toHaveBeenCalledWith('generate-code', [
        '--description',
        'Create a React component'
      ]);
    });
  });

  describe('File Editing', () => {
    test('should edit file when path is provided', async () => {
      const result = {
        type: 'file_operation',
        fileOperation: {
          operation: 'edit',
          targetFile: 'src/components/Button.jsx',
          description: 'Add a disabled prop'
        }
      };

      const output = await handler.handleFileOperation(result, 'Add a disabled prop to Button');

      expect(output.success).toBe(true);
      expect(output.path).toBe('src/components/Button.jsx');
      expect(mockTerminal.info).toHaveBeenCalledWith('Editing file: src/components/Button.jsx...');
      expect(mockTerminal.success).toHaveBeenCalledWith('✓ File edited successfully');
      expect(mockExecuteCommand).toHaveBeenCalledWith('edit-file', [
        '--path',
        'src/components/Button.jsx',
        '--instructions',
        'Add a disabled prop'
      ]);
    });

    test('should handle modify operation same as edit', async () => {
      const result = {
        type: 'file_operation',
        fileOperation: {
          operation: 'modify',
          targetFile: 'utils/helper.js',
          description: 'Refactor to use async/await'
        }
      };

      const output = await handler.handleFileOperation(result, 'Refactor helper to use async/await');

      expect(output.success).toBe(true);
      expect(output.path).toBe('utils/helper.js');
      expect(mockExecuteCommand).toHaveBeenCalledWith('edit-file', [
        '--path',
        'utils/helper.js',
        '--instructions',
        'Refactor to use async/await'
      ]);
    });

    test('should warn when edit has no target file', async () => {
      const result = {
        type: 'file_operation',
        fileOperation: {
          operation: 'edit',
          targetFile: null,
          description: 'Add error handling'
        }
      };

      const output = await handler.handleFileOperation(result, 'Add error handling');

      expect(output.success).toBe(false);
      expect(output.error).toBe('No target file');
      expect(mockTerminal.warn).toHaveBeenCalledWith('No target file specified. Please specify which file to edit.');
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle command execution errors gracefully', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('File already exists'));

      const result = {
        type: 'file_operation',
        fileOperation: {
          operation: 'create',
          targetFile: 'src/App.jsx',
          description: 'Create app component'
        }
      };

      await expect(handler.handleFileOperation(result, 'Create app')).rejects.toThrow('File already exists');
    });

    test('should handle AI service timeout', async () => {
      mockAiClient.complete.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      const result = {
        type: 'file_operation',
        fileOperation: {
          operation: 'create',
          targetFile: null,
          description: 'Create component'
        }
      };

      const output = await handler.handleFileOperation(result, 'Create component');

      expect(output.success).toBe(false);
      expect(output.fallback).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete user workflow for React component', async () => {
      mockAiClient.complete.mockResolvedValue({
        message: {
          content: 'src/components/LoginForm.jsx'
        }
      });

      const createResult = {
        type: 'file_operation',
        fileOperation: {
          operation: 'create',
          targetFile: null,
          description: 'Create a React login form with email and password'
        }
      };

      const createOutput = await handler.handleFileOperation(
        createResult,
        'Create a React login form with email and password'
      );

      expect(createOutput.success).toBe(true);
      expect(createOutput.path).toBe('src/components/LoginForm.jsx');

      // Now edit the created file
      const editResult = {
        type: 'file_operation',
        fileOperation: {
          operation: 'edit',
          targetFile: 'src/components/LoginForm.jsx',
          description: 'Add password strength indicator'
        }
      };

      const editOutput = await handler.handleFileOperation(
        editResult,
        'Add password strength indicator to LoginForm'
      );

      expect(editOutput.success).toBe(true);
      expect(editOutput.path).toBe('src/components/LoginForm.jsx');
    });

    test('should handle authentication system creation workflow', async () => {
      const steps = [
        {
          description: 'Create user authentication service',
          suggestedPath: 'services/auth.js'
        },
        {
          description: 'Create login API endpoint',
          suggestedPath: 'routes/auth.js'
        },
        {
          description: 'Create user model',
          suggestedPath: 'models/User.js'
        }
      ];

      for (const step of steps) {
        mockAiClient.complete.mockResolvedValue({
          message: {
            content: step.suggestedPath
          }
        });

        const result = {
          type: 'file_operation',
          fileOperation: {
            operation: 'create',
            targetFile: null,
            description: step.description
          }
        };

        const output = await handler.handleFileOperation(result, step.description);

        expect(output.success).toBe(true);
        expect(output.path).toBe(step.suggestedPath);
      }
    });
  });
});

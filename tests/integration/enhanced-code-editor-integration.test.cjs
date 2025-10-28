/**
 * Enhanced Code Editor Integration Tests
 *
 * Tests complex multi-file scenarios and real-world workflows with mocked implementations.
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

// Mock Enhanced Code Editor for integration testing
class MockEnhancedCodeEditorIntegration {
  constructor() {
    this.initialized = false;
    this.projectFiles = new Map();
  }

  async initialize() {
    this.initialized = true;
  }

  async executeEditRequest(request) {
    if (!this.initialized) {
      await this.initialize();
    }

    const results = [];

    // Validate dependencies for all files
    await this.validateDependencies(request.files);

    for (const fileOp of request.files) {
      const result = await this.executeFileOperation(fileOp, request);
      results.push(result);

      if (request.atomic && !result.success) {
        // Rollback previous successful operations
        for (const prevResult of results.slice(0, -1)) {
          if (prevResult.success) {
            await this.rollbackOperation(prevResult);
          }
        }
        break;
      }
    }

    return results;
  }

  async executeFileOperation(fileOp, request) {
    try {
      switch (fileOp.action.type) {
        case 'create-file':
          await this.createFile(fileOp);
          break;
        case 'modify-content':
          await this.modifyFile(fileOp);
          break;
        default:
          throw new Error(`Unsupported operation: ${fileOp.action.type}`);
      }

      return {
        success: true,
        editId: `edit-${Date.now()}`,
        affectedFiles: [fileOp.path]
      };
    } catch (error) {
      return {
        success: false,
        editId: `edit-${Date.now()}`,
        error: error.message,
        affectedFiles: [fileOp.path]
      };
    }
  }

  async createFile(fileOp) {
    // Ensure directory exists
    const dir = path.dirname(fileOp.path);
    await fs.mkdir(dir, { recursive: true });

    let content = fileOp.content || '';

    // Handle template-based generation
    if (fileOp.templateData) {
      content = this.applyTemplate(content, fileOp.templateData);
    }

    await fs.writeFile(fileOp.path, content, 'utf-8');
    this.projectFiles.set(fileOp.path, content);
  }

  async modifyFile(fileOp) {
    if (fileOp.content) {
      await fs.writeFile(fileOp.path, fileOp.content, 'utf-8');
      this.projectFiles.set(fileOp.path, fileOp.content);
    }
  }

  async validateDependencies(files) {
    // Mock dependency validation
    for (const file of files) {
      if (file.dependencies) {
        for (const dep of file.dependencies) {
          const depExists = files.some(f => f.path === dep) ||
                           this.projectFiles.has(dep) ||
                           await fs.access(dep).then(() => true).catch(() => false);

          if (!depExists) {
            throw new Error(`Dependency not found: ${dep}`);
          }
        }
      }
    }
  }

  async rollbackOperation(result) {
    // Mock rollback - in real implementation would restore from backup
    for (const filePath of result.affectedFiles) {
      try {
        await fs.unlink(filePath);
        this.projectFiles.delete(filePath);
      } catch (error) {
        // Ignore errors during rollback
      }
    }
  }

  applyTemplate(content, templateData) {
    let result = content;
    for (const [key, value] of Object.entries(templateData)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  }
}

describe('Enhanced Code Editor Integration Tests', () => {
  let editor;
  let tempDir;

  beforeEach(async () => {
    editor = new MockEnhancedCodeEditorIntegration();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'enhanced-editor-integration-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Multi-File Project Creation', () => {
    test('should create a complete TypeScript module with dependencies', async () => {
      const request = {
        type: 'create',
        files: [
          {
            path: path.join(tempDir, 'types.ts'),
            action: { type: 'create-file', parameters: {} },
            content: `export interface User {
  id: string;
  name: string;
  email: string;
}`
          },
          {
            path: path.join(tempDir, 'service.ts'),
            action: { type: 'create-file', parameters: {} },
            content: `import { User } from './types.js';

export class UserService {
  async createUser(userData: Partial<User>): Promise<User> {
    return {
      id: Math.random().toString(36),
      name: userData.name || '',
      email: userData.email || ''
    };
  }
}`,
            dependencies: [path.join(tempDir, 'types.ts')]
          },
          {
            path: path.join(tempDir, 'index.ts'),
            action: { type: 'create-file', parameters: {} },
            content: `export { UserService } from './service.js';
export type { User } from './types.js';`,
            dependencies: [
              path.join(tempDir, 'service.ts'),
              path.join(tempDir, 'types.ts')
            ]
          }
        ],
        atomic: true
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(3);
      expect(result.every(r => r.success)).toBe(true);

      // Verify all files exist
      const typesContent = await fs.readFile(path.join(tempDir, 'types.ts'), 'utf-8');
      expect(typesContent).toContain('interface User');

      const serviceContent = await fs.readFile(path.join(tempDir, 'service.ts'), 'utf-8');
      expect(serviceContent).toContain('class UserService');

      const indexContent = await fs.readFile(path.join(tempDir, 'index.ts'), 'utf-8');
      expect(indexContent).toContain('export { UserService }');
    });

    test('should create a React component library structure', async () => {
      const request = {
        type: 'create',
        files: [
          {
            path: path.join(tempDir, 'components', 'Button', 'Button.tsx'),
            action: { type: 'create-file', parameters: {} },
            content: `import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};`
          },
          {
            path: path.join(tempDir, 'components', 'Button', 'index.ts'),
            action: { type: 'create-file', parameters: {} },
            content: `export { Button, type ButtonProps } from './Button.js';`,
            dependencies: [path.join(tempDir, 'components', 'Button', 'Button.tsx')]
          },
          {
            path: path.join(tempDir, 'components', 'index.ts'),
            action: { type: 'create-file', parameters: {} },
            content: `export * from './Button/index.js';`,
            dependencies: [path.join(tempDir, 'components', 'Button', 'index.ts')]
          }
        ],
        atomic: true
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(3);
      expect(result.every(r => r.success)).toBe(true);

      // Verify directory structure
      await expect(fs.access(path.join(tempDir, 'components', 'Button', 'Button.tsx'))).resolves.toBeUndefined();
      await expect(fs.access(path.join(tempDir, 'components', 'Button', 'index.ts'))).resolves.toBeUndefined();
      await expect(fs.access(path.join(tempDir, 'components', 'index.ts'))).resolves.toBeUndefined();
    });
  });

  describe('Cross-File Operations', () => {
    test('should handle multi-file refactoring with dependencies', async () => {
      // First create initial files
      const setupRequest = {
        type: 'create',
        files: [
          {
            path: path.join(tempDir, 'models.ts'),
            action: { type: 'create-file', parameters: {} },
            content: `export interface UserData { id: string; name: string; }`
          },
          {
            path: path.join(tempDir, 'service.ts'),
            action: { type: 'create-file', parameters: {} },
            content: `import { UserData } from './models.js';
export function processUser(user: UserData): string {
  return user.name;
}`
          }
        ]
      };

      await editor.executeEditRequest(setupRequest);

      // Now refactor interface name
      const refactorRequest = {
        type: 'modify',
        files: [
          {
            path: path.join(tempDir, 'models.ts'),
            action: { type: 'modify-content', parameters: {} },
            content: `export interface User { id: string; name: string; }`
          },
          {
            path: path.join(tempDir, 'service.ts'),
            action: { type: 'modify-content', parameters: {} },
            content: `import { User } from './models.js';
export function processUser(user: User): string {
  return user.name;
}`
          }
        ],
        atomic: true
      };

      const result = await editor.executeEditRequest(refactorRequest);

      expect(result).toHaveLength(2);
      expect(result.every(r => r.success)).toBe(true);

      const modelsContent = await fs.readFile(path.join(tempDir, 'models.ts'), 'utf-8');
      expect(modelsContent).toContain('interface User');
      expect(modelsContent).not.toContain('interface UserData');

      const serviceContent = await fs.readFile(path.join(tempDir, 'service.ts'), 'utf-8');
      expect(serviceContent).toContain('import { User }');
    });
  });

  describe('Template-Based Generation', () => {
    test('should generate files from templates with context', async () => {
      const request = {
        type: 'create',
        files: [
          {
            path: path.join(tempDir, 'UserProfile.tsx'),
            action: { type: 'create-file', parameters: {} },
            content: `import React from 'react';

interface {{componentName}}Props {
  {{#each props}}
  {{name}}: {{type}};
  {{/each}}
}

export const {{componentName}}: React.FC<{{componentName}}Props> = ({{propsDestructured}}) => {
  return (
    <div>
      {{content}}
    </div>
  );
};`,
            templateData: {
              componentName: 'UserProfile',
              props: [
                { name: 'userId', type: 'string' },
                { name: 'name', type: 'string' }
              ],
              propsDestructured: '{ userId, name }',
              content: '<h1>{name}</h1><p>ID: {userId}</p>'
            }
          }
        ]
      };

      const result = await editor.executeEditRequest(request);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(true);

      const content = await fs.readFile(path.join(tempDir, 'UserProfile.tsx'), 'utf-8');
      expect(content).toContain('UserProfile');
      expect(content).toContain('{ userId, name }');
      expect(content).toContain('<h1>{name}</h1>');
    });
  });

  describe('Error Handling and Rollback', () => {
    test('should rollback atomic operations on failure', async () => {
      const validFile = path.join(tempDir, 'valid.ts');
      const invalidFile = '/invalid/path/file.ts';

      const request = {
        type: 'create',
        files: [
          {
            path: validFile,
            action: { type: 'create-file', parameters: {} },
            content: 'export const valid = true;'
          },
          {
            path: invalidFile,
            action: { type: 'create-file', parameters: {} },
            content: 'export const invalid = true;'
          }
        ],
        atomic: true
      };

      const result = await editor.executeEditRequest(request);

      // Should have two results, first successful, second failed
      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(false);

      // Valid file should have been rolled back
      await expect(fs.access(validFile)).rejects.toThrow();
    });

    test('should handle missing dependencies', async () => {
      const request = {
        type: 'create',
        files: [
          {
            path: path.join(tempDir, 'dependent.ts'),
            action: { type: 'create-file', parameters: {} },
            content: 'import { Missing } from "./missing.js";',
            dependencies: [path.join(tempDir, 'missing.ts')]
          }
        ]
      };

      await expect(editor.executeEditRequest(request)).rejects.toThrow('Dependency not found');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large multi-file operations efficiently', async () => {
      const numberOfFiles = 50;
      const files = [];

      for (let i = 0; i < numberOfFiles; i++) {
        files.push({
          path: path.join(tempDir, `module${i}.ts`),
          action: { type: 'create-file', parameters: {} },
          content: `export const value${i} = ${i};`
        });
      }

      const request = {
        type: 'create',
        files,
        atomic: true
      };

      const startTime = Date.now();
      const result = await editor.executeEditRequest(request);
      const endTime = Date.now();

      expect(result).toHaveLength(numberOfFiles);
      expect(result.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all files were created
      for (let i = 0; i < numberOfFiles; i++) {
        const filePath = path.join(tempDir, `module${i}.ts`);
        await expect(fs.access(filePath)).resolves.toBeUndefined();
      }
    });
  });
});
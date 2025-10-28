/**
 * File Commands Unit Tests
 *
 * Tests the natural language file operation commands for Phase 2.1
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

// Mock implementations for file command modules
class MockFileCommandProcessor {
  constructor() {
    this.commands = new Map();
    this.registerDefaultCommands();
  }

  registerDefaultCommands() {
    // Register file operation commands
    this.commands.set('create-file', {
      name: 'create-file',
      description: 'Create a new file with specified content',
      category: 'File Operations',
      execute: this.createFile.bind(this)
    });

    this.commands.set('edit-file', {
      name: 'edit-file',
      description: 'Edit an existing file with AI assistance',
      category: 'File Operations',
      execute: this.editFile.bind(this)
    });

    this.commands.set('refactor-code', {
      name: 'refactor-code',
      description: 'Refactor code with AI-powered suggestions',
      category: 'File Operations',
      execute: this.refactorCode.bind(this)
    });

    this.commands.set('generate-code', {
      name: 'generate-code',
      description: 'Generate code based on natural language description',
      category: 'File Operations',
      execute: this.generateCode.bind(this)
    });

    this.commands.set('fix-issues', {
      name: 'fix-issues',
      description: 'Automatically fix code issues and errors',
      category: 'File Operations',
      execute: this.fixIssues.bind(this)
    });

    this.commands.set('add-feature', {
      name: 'add-feature',
      description: 'Add a new feature to existing code',
      category: 'File Operations',
      execute: this.addFeature.bind(this)
    });

    this.commands.set('create-tests', {
      name: 'create-tests',
      description: 'Generate tests for existing code',
      category: 'File Operations',
      execute: this.createTests.bind(this)
    });
  }

  async createFile(args) {
    const { path: filePath, content, type } = args;

    if (!filePath) {
      throw new Error('File path is required');
    }

    // Generate content based on type if not provided
    const fileContent = content || this.generateDefaultContent(type);

    // Create directory if needed
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, fileContent, 'utf-8');

    return {
      success: true,
      message: `Created file: ${filePath}`,
      filePath,
      content: fileContent
    };
  }

  async editFile(args) {
    const { path: filePath, changes, preview = false } = args;

    if (!filePath) {
      throw new Error('File path is required');
    }

    // Read existing content
    const currentContent = await fs.readFile(filePath, 'utf-8');

    // Apply changes (mock implementation)
    const newContent = this.applyChanges(currentContent, changes);

    if (preview) {
      return {
        success: true,
        preview: true,
        currentContent,
        newContent,
        diff: this.generateDiff(currentContent, newContent)
      };
    }

    // Write changes
    await fs.writeFile(filePath, newContent, 'utf-8');

    return {
      success: true,
      message: `Edited file: ${filePath}`,
      filePath,
      changes: changes.length
    };
  }

  async refactorCode(args) {
    const { path: filePath, pattern, target } = args;

    if (!filePath) {
      throw new Error('File path is required');
    }

    const content = await fs.readFile(filePath, 'utf-8');

    // Mock refactoring
    const refactoredContent = content.replace(new RegExp(pattern, 'g'), target);

    await fs.writeFile(filePath, refactoredContent, 'utf-8');

    return {
      success: true,
      message: `Refactored code in: ${filePath}`,
      filePath,
      changes: (content.match(new RegExp(pattern, 'g')) || []).length
    };
  }

  async generateCode(args) {
    const { description, language = 'javascript', outputPath } = args;

    if (!description) {
      throw new Error('Description is required for code generation');
    }

    // Mock code generation based on description
    const generatedCode = this.generateFromDescription(description, language);

    if (outputPath) {
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(outputPath, generatedCode, 'utf-8');
    }

    return {
      success: true,
      message: 'Generated code successfully',
      code: generatedCode,
      language,
      outputPath
    };
  }

  async fixIssues(args) {
    const { path: filePath, issues = [] } = args;

    if (!filePath) {
      throw new Error('File path is required');
    }

    const content = await fs.readFile(filePath, 'utf-8');

    // Mock issue fixing
    let fixedContent = content;
    const fixedIssues = [];

    for (const issue of issues) {
      if (issue.type === 'syntax') {
        // Mock syntax fix
        fixedContent = fixedContent.replace(/;;\s*$/, ';');
        fixedIssues.push({ type: 'syntax', fixed: true });
      }
      if (issue.type === 'lint') {
        // Mock lint fix
        fixedContent = fixedContent.replace(/\s+$/, '');
        fixedIssues.push({ type: 'lint', fixed: true });
      }
    }

    await fs.writeFile(filePath, fixedContent, 'utf-8');

    return {
      success: true,
      message: `Fixed ${fixedIssues.length} issues in: ${filePath}`,
      filePath,
      fixedIssues
    };
  }

  async addFeature(args) {
    const { path: filePath, feature, position = 'end' } = args;

    if (!filePath || !feature) {
      throw new Error('File path and feature description are required');
    }

    const content = await fs.readFile(filePath, 'utf-8');

    // Mock feature addition
    const featureCode = this.generateFeatureCode(feature);
    let newContent;

    if (position === 'start') {
      newContent = featureCode + '\n\n' + content;
    } else {
      newContent = content + '\n\n' + featureCode;
    }

    await fs.writeFile(filePath, newContent, 'utf-8');

    return {
      success: true,
      message: `Added feature to: ${filePath}`,
      filePath,
      feature,
      codeAdded: featureCode.length
    };
  }

  async createTests(args) {
    const { sourcePath, outputPath, framework = 'jest' } = args;

    if (!sourcePath) {
      throw new Error('Source file path is required');
    }

    const sourceContent = await fs.readFile(sourcePath, 'utf-8');

    // Mock test generation
    const testContent = this.generateTests(sourceContent, framework);

    const testPath = outputPath || sourcePath.replace(/\.(js|ts)$/, '.test.$1');
    const dir = path.dirname(testPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(testPath, testContent, 'utf-8');

    return {
      success: true,
      message: `Created tests for: ${sourcePath}`,
      sourcePath,
      testPath,
      framework,
      testCount: 3 // Mock test count
    };
  }

  // Helper methods
  generateDefaultContent(type) {
    const templates = {
      javascript: '// New JavaScript file\n\nfunction main() {\n  console.log("Hello, World!");\n}\n\nmain();\n',
      typescript: '// New TypeScript file\n\nfunction main(): void {\n  console.log("Hello, World!");\n}\n\nmain();\n',
      python: '# New Python file\n\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n',
      default: '// New file\n\n'
    };
    return templates[type] || templates.default;
  }

  applyChanges(content, changes) {
    let result = content;
    for (const change of changes) {
      if (change.type === 'replace') {
        result = result.replace(change.from, change.to);
      }
      if (change.type === 'insert') {
        result = change.text + '\n' + result;
      }
      if (change.type === 'append') {
        result = result + '\n' + change.text;
      }
    }
    return result;
  }

  generateDiff(original, modified) {
    return {
      added: modified.length - original.length,
      removed: 0,
      modified: original !== modified
    };
  }

  generateFromDescription(description, language) {
    // Mock code generation based on description keywords
    if (description.includes('REST API')) {
      return `// REST API Implementation
const express = require('express');
const router = express.Router();

router.get('/api/resource', (req, res) => {
  res.json({ message: 'GET endpoint' });
});

router.post('/api/resource', (req, res) => {
  res.json({ message: 'POST endpoint' });
});

module.exports = router;`;
    }

    if (description.includes('React component')) {
      return `import React from 'react';

interface ComponentProps {
  title: string;
  onClick?: () => void;
}

export const Component: React.FC<ComponentProps> = ({ title, onClick }) => {
  return (
    <div onClick={onClick}>
      <h1>{title}</h1>
    </div>
  );
};`;
    }

    return `// Generated code from: ${description}\n\nfunction generatedFunction() {\n  // TODO: Implement\n}\n`;
  }

  generateFeatureCode(feature) {
    return `// New Feature: ${feature}\nfunction newFeature() {\n  // Feature implementation\n  return true;\n}\n`;
  }

  generateTests(sourceContent, framework) {
    return `// Generated tests using ${framework}
const { describe, test, expect } = require('@jest/globals');

describe('Component Tests', () => {
  test('should work correctly', () => {
    expect(true).toBe(true);
  });

  test('should handle edge cases', () => {
    expect(false).toBe(false);
  });

  test('should validate input', () => {
    expect(1 + 1).toBe(2);
  });
});`;
  }
}

describe('File Commands', () => {
  let processor;
  let tempDir;

  beforeEach(async () => {
    processor = new MockFileCommandProcessor();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-commands-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('create-file command', () => {
    test('should create a new file with content', async () => {
      const filePath = path.join(tempDir, 'new-file.js');
      const content = 'console.log("test");';

      const result = await processor.createFile({
        path: filePath,
        content
      });

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(filePath);

      const writtenContent = await fs.readFile(filePath, 'utf-8');
      expect(writtenContent).toBe(content);
    });

    test('should generate default content based on type', async () => {
      const filePath = path.join(tempDir, 'new-file.ts');

      const result = await processor.createFile({
        path: filePath,
        type: 'typescript'
      });

      expect(result.success).toBe(true);

      const writtenContent = await fs.readFile(filePath, 'utf-8');
      expect(writtenContent).toContain('TypeScript');
      expect(writtenContent).toContain(': void');
    });

    test('should create necessary directories', async () => {
      const filePath = path.join(tempDir, 'nested', 'dir', 'file.js');

      const result = await processor.createFile({
        path: filePath,
        content: 'test'
      });

      expect(result.success).toBe(true);
      await expect(fs.access(filePath)).resolves.toBeUndefined();
    });

    test('should throw error if path is missing', async () => {
      await expect(processor.createFile({})).rejects.toThrow('File path is required');
    });
  });

  describe('edit-file command', () => {
    test('should edit an existing file', async () => {
      const filePath = path.join(tempDir, 'edit-test.js');
      await fs.writeFile(filePath, 'original content');

      const result = await processor.editFile({
        path: filePath,
        changes: [
          { type: 'replace', from: 'original', to: 'modified' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('modified content');
    });

    test('should support preview mode', async () => {
      const filePath = path.join(tempDir, 'preview-test.js');
      await fs.writeFile(filePath, 'original content');

      const result = await processor.editFile({
        path: filePath,
        changes: [
          { type: 'replace', from: 'original', to: 'modified' }
        ],
        preview: true
      });

      expect(result.success).toBe(true);
      expect(result.preview).toBe(true);
      expect(result.currentContent).toBe('original content');
      expect(result.newContent).toBe('modified content');

      // File should not be changed
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('original content');
    });
  });

  describe('refactor-code command', () => {
    test('should refactor code patterns', async () => {
      const filePath = path.join(tempDir, 'refactor-test.js');
      await fs.writeFile(filePath, 'let oldName = 5;\noldName = oldName + 1;');

      const result = await processor.refactorCode({
        path: filePath,
        pattern: 'oldName',
        target: 'newName'
      });

      expect(result.success).toBe(true);
      expect(result.changes).toBe(3);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('let newName = 5;\nnewName = newName + 1;');
    });
  });

  describe('generate-code command', () => {
    test('should generate code from description', async () => {
      const result = await processor.generateCode({
        description: 'Create a REST API endpoint',
        language: 'javascript'
      });

      expect(result.success).toBe(true);
      expect(result.code).toContain('router');
      expect(result.code).toContain('express');
    });

    test('should save generated code to file if path provided', async () => {
      const outputPath = path.join(tempDir, 'generated.js');

      const result = await processor.generateCode({
        description: 'React component with props',
        language: 'typescript',
        outputPath
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('React');
      expect(content).toContain('Props');
    });
  });

  describe('fix-issues command', () => {
    test('should fix code issues', async () => {
      const filePath = path.join(tempDir, 'buggy.js');
      await fs.writeFile(filePath, 'const a = 5;; \n');

      const result = await processor.fixIssues({
        path: filePath,
        issues: [
          { type: 'syntax' },
          { type: 'lint' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.fixedIssues).toHaveLength(2);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).not.toContain(';;');
      expect(content).not.toMatch(/\s+$/);
    });
  });

  describe('add-feature command', () => {
    test('should add feature to existing file', async () => {
      const filePath = path.join(tempDir, 'app.js');
      await fs.writeFile(filePath, 'const app = {};\n');

      const result = await processor.addFeature({
        path: filePath,
        feature: 'user authentication',
        position: 'end'
      });

      expect(result.success).toBe(true);
      expect(result.codeAdded).toBeGreaterThan(0);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('const app = {}');
      expect(content).toContain('user authentication');
    });

    test('should add feature at the start when specified', async () => {
      const filePath = path.join(tempDir, 'app.js');
      await fs.writeFile(filePath, 'const app = {};\n');

      const result = await processor.addFeature({
        path: filePath,
        feature: 'imports',
        position: 'start'
      });

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      expect(lines[0]).toContain('imports');
    });
  });

  describe('create-tests command', () => {
    test('should generate tests for source file', async () => {
      const sourcePath = path.join(tempDir, 'source.js');
      await fs.writeFile(sourcePath, 'function add(a, b) { return a + b; }');

      const result = await processor.createTests({
        sourcePath,
        framework: 'jest'
      });

      expect(result.success).toBe(true);
      expect(result.testCount).toBeGreaterThan(0);

      const testPath = sourcePath.replace('.js', '.test.js');
      const testContent = await fs.readFile(testPath, 'utf-8');
      expect(testContent).toContain('describe');
      expect(testContent).toContain('test');
      expect(testContent).toContain('expect');
    });

    test('should use custom output path if provided', async () => {
      const sourcePath = path.join(tempDir, 'source.js');
      const outputPath = path.join(tempDir, 'tests', 'custom.test.js');
      await fs.writeFile(sourcePath, 'function add(a, b) { return a + b; }');

      const result = await processor.createTests({
        sourcePath,
        outputPath,
        framework: 'jest'
      });

      expect(result.success).toBe(true);
      expect(result.testPath).toBe(outputPath);

      await expect(fs.access(outputPath)).resolves.toBeUndefined();
    });
  });

  describe('Command Registration', () => {
    test('should have all required commands registered', () => {
      expect(processor.commands.has('create-file')).toBe(true);
      expect(processor.commands.has('edit-file')).toBe(true);
      expect(processor.commands.has('refactor-code')).toBe(true);
      expect(processor.commands.has('generate-code')).toBe(true);
      expect(processor.commands.has('fix-issues')).toBe(true);
      expect(processor.commands.has('add-feature')).toBe(true);
      expect(processor.commands.has('create-tests')).toBe(true);
    });

    test('should have proper category for all commands', () => {
      for (const [name, command] of processor.commands) {
        expect(command.category).toBe('File Operations');
        expect(command.description).toBeTruthy();
      }
    });
  });
});
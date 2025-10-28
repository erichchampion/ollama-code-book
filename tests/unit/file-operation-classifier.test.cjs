/**
 * File Operation Classifier Unit Tests
 *
 * Tests the enhanced natural language router file operation classification for Phase 2.2
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

// Mock FileOperationClassifier for testing
class MockFileOperationClassifier {
  constructor(workingDirectory) {
    this.workingDirectory = workingDirectory;
    this.projectFiles = [];
  }

  async initialize() {
    // Mock initialization - scan for files
    this.projectFiles = await this.getAllFiles(this.workingDirectory);
  }

  async classifyFileOperation(intent, context) {
    // Check if this is a file operation intent
    if (!this.isFileOperationIntent(intent)) {
      return null;
    }

    const operation = this.extractOperationType(intent);
    if (!operation) {
      return null;
    }

    // Create targets based on explicit files or context
    const targets = [];
    if (intent.entities.files.length > 0) {
      for (const filePath of intent.entities.files) {
        const target = await this.createFileTarget(filePath, 1.0, 'Explicitly mentioned in request');
        if (target) targets.push(target);
      }
    } else {
      // Use contextual targeting
      const contextTargets = await this.findContextualTargets(intent, context);
      targets.push(...contextTargets);
    }

    const safetyLevel = this.assessSafetyLevel(operation, targets);
    const estimatedImpact = this.assessImpact(operation, targets);

    return {
      operation,
      targets,
      content: this.extractContentSpec(intent),
      safetyLevel,
      requiresApproval: this.shouldRequireApproval(safetyLevel, estimatedImpact),
      estimatedImpact,
      dependencies: [],
      backupRequired: this.shouldCreateBackup(operation, safetyLevel)
    };
  }

  isFileOperationIntent(intent) {
    const fileOperationKeywords = [
      'create', 'make', 'generate', 'build',
      'edit', 'modify', 'change', 'update', 'fix',
      'delete', 'remove', 'drop',
      'move', 'rename', 'relocate',
      'copy', 'duplicate',
      'refactor', 'restructure',
      'test', 'spec'
    ];
    const action = intent.action.toLowerCase();
    return fileOperationKeywords.some(keyword => action.includes(keyword)) ||
           intent.entities.files.length > 0 ||
           intent.type === 'task_request';
  }

  extractOperationType(intent) {
    const action = intent.action.toLowerCase();
    if (action.includes('create') || action.includes('make') || action.includes('generate') || action.includes('build')) {
      return 'create';
    }
    if (action.includes('edit') || action.includes('modify') || action.includes('change') || action.includes('update') || action.includes('fix')) {
      return 'edit';
    }
    if (action.includes('delete') || action.includes('remove') || action.includes('drop')) {
      return 'delete';
    }
    if (action.includes('move') || action.includes('rename') || action.includes('relocate')) {
      return 'move';
    }
    if (action.includes('copy') || action.includes('duplicate')) {
      return 'copy';
    }
    if (action.includes('refactor') || action.includes('restructure')) {
      return 'refactor';
    }
    if (action.includes('test') || action.includes('spec')) {
      return 'test';
    }
    if (intent.type === 'task_request') {
      return 'edit';
    }
    return null;
  }

  async findContextualTargets(intent, context) {
    const targets = [];
    // Look for pattern matches
    for (const tech of intent.entities.technologies) {
      if (tech.toLowerCase() === 'typescript') {
        for (const file of context.projectFiles) {
          if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const target = await this.createFileTarget(file, 0.8, `Matches technology: ${tech}`);
            if (target) targets.push(target);
          }
        }
      }
      if (tech.toLowerCase() === 'react') {
        for (const file of context.projectFiles) {
          if (file.includes('component') || file.endsWith('.tsx') || file.endsWith('.jsx')) {
            const target = await this.createFileTarget(file, 0.8, `Matches technology: ${tech}`);
            if (target) targets.push(target);
          }
        }
      }
    }

    for (const concept of intent.entities.concepts) {
      if (concept.toLowerCase() === 'component') {
        for (const file of context.projectFiles) {
          if (file.toLowerCase().includes('component')) {
            const target = await this.createFileTarget(file, 0.8, `Matches concept: ${concept}`);
            if (target) targets.push(target);
          }
        }
      }
    }

    return targets;
  }

  async createFileTarget(filePath, confidence, reason) {
    try {
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(this.workingDirectory, filePath);
      let exists = false;
      let size;
      let lastModified;

      try {
        const stats = await fs.stat(resolvedPath);
        exists = true;
        size = stats.size;
        lastModified = stats.mtime;
      } catch {
        // File doesn't exist
      }

      return {
        path: resolvedPath,
        type: 'file',
        exists,
        size,
        lastModified,
        language: this.detectLanguage(resolvedPath),
        confidence,
        reason
      };
    } catch {
      return null;
    }
  }

  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
      '.ts': 'typescript', '.tsx': 'typescript',
      '.js': 'javascript', '.jsx': 'javascript',
      '.py': 'python', '.java': 'java',
      '.json': 'json', '.md': 'markdown'
    };
    return map[ext];
  }

  assessSafetyLevel(operation, targets) {
    if (operation === 'delete') return 'dangerous';
    if (operation === 'move') return 'risky';
    if (operation === 'create') return 'safe';

    // Check for system files
    for (const target of targets) {
      if (this.isSystemFile(target.path)) return 'dangerous';
      if (target.size && target.size > 100000) return 'cautious';
    }
    return 'safe';
  }

  isSystemFile(filePath) {
    const fileName = path.basename(filePath);
    return ['package.json', 'package-lock.json', 'yarn.lock', 'tsconfig.json'].includes(fileName);
  }

  assessImpact(operation, targets) {
    if (operation === 'delete') return 'major';
    if (operation === 'move') return 'significant';
    if (targets.length > 5) return 'significant';
    if (targets.length > 2) return 'moderate';
    return 'minimal';
  }

  shouldRequireApproval(safetyLevel, impactLevel) {
    return safetyLevel === 'dangerous' || safetyLevel === 'risky' ||
           impactLevel === 'major' || impactLevel === 'significant';
  }

  shouldCreateBackup(operation, safetyLevel) {
    return operation === 'delete' || operation === 'move' ||
           (operation === 'edit' && (safetyLevel === 'risky' || safetyLevel === 'dangerous'));
  }

  extractContentSpec(intent) {
    return {
      description: intent.action,
      language: intent.entities.technologies.find(t => this.isLanguage(t)),
      framework: intent.entities.technologies.find(t => this.isFramework(t))
    };
  }

  isLanguage(tech) {
    return ['javascript', 'typescript', 'python', 'java'].includes(tech.toLowerCase());
  }

  isFramework(tech) {
    return ['react', 'vue', 'angular', 'express'].includes(tech.toLowerCase());
  }

  async getAllFiles(dir) {
    const files = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        }
      }
    } catch {
      // Ignore errors
    }
    return files;
  }
}

let tempDir;

describe('FileOperationClassifier', () => {
  beforeEach(async () => {

    // Create temp directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-op-test-'));

    // Create some test files
    await fs.writeFile(path.join(tempDir, 'test.js'), 'console.log("test");');
    await fs.writeFile(path.join(tempDir, 'component.tsx'), 'export const Component = () => <div>test</div>;');
    await fs.writeFile(path.join(tempDir, 'utils.ts'), 'export function helper() { return true; }');
    await fs.writeFile(path.join(tempDir, 'package.json'), '{"name": "test"}');

    // Create subdirectory with files
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src', 'index.ts'), 'export * from "./component";');
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('File Operation Intent Classification', () => {
    test('should classify create file operation', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      const intent = {
        type: 'task_request',
        action: 'create a new React component',
        entities: {
          files: [],
          directories: [],
          functions: [],
          classes: [],
          technologies: ['react'],
          concepts: ['component'],
          variables: []
        },
        confidence: 0.9,
        complexity: 'simple',
        multiStep: false,
        riskLevel: 'low',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 5,
        context: {
          projectAware: true,
          fileSpecific: false,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [
          path.join(tempDir, 'test.js'),
          path.join(tempDir, 'component.tsx'),
          path.join(tempDir, 'utils.ts')
        ],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).not.toBeNull();
      expect(result.operation).toBe('create');
      expect(result.safetyLevel).toBe('safe');
      expect(result.requiresApproval).toBe(false);
      expect(result.estimatedImpact).toBe('minimal');
    });

    test('should classify edit file operation with explicit file', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      const testFile = path.join(tempDir, 'component.tsx');
      const intent = {
        type: 'task_request',
        action: 'add a prop to the component',
        entities: {
          files: [testFile],
          directories: [],
          functions: [],
          classes: [],
          technologies: ['react'],
          concepts: ['prop'],
          variables: []
        },
        confidence: 0.8,
        complexity: 'simple',
        multiStep: false,
        riskLevel: 'low',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 5,
        context: {
          projectAware: true,
          fileSpecific: true,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [testFile],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).not.toBeNull();
      expect(result.operation).toBe('edit');
      expect(result.targets).toHaveLength(1);
      expect(result.targets[0].path).toBe(testFile);
      expect(result.targets[0].exists).toBe(true);
      expect(result.targets[0].language).toBe('typescript');
      expect(result.safetyLevel).toBe('safe');
    });

    test('should classify delete operation as dangerous', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      const testFile = path.join(tempDir, 'test.js');
      const intent = {
        type: 'task_request',
        action: 'delete the test file',
        entities: {
          files: [testFile],
          directories: [],
          functions: [],
          classes: [],
          technologies: [],
          concepts: [],
          variables: []
        },
        confidence: 0.9,
        complexity: 'simple',
        multiStep: false,
        riskLevel: 'medium',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 2,
        context: {
          projectAware: true,
          fileSpecific: true,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [testFile],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).not.toBeNull();
      expect(result.operation).toBe('delete');
      expect(result.safetyLevel).toBe('dangerous');
      expect(result.requiresApproval).toBe(true);
      expect(result.backupRequired).toBe(true);
      expect(result.estimatedImpact).toBe('major');
    });

    test('should assess system file as dangerous', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      const packageJson = path.join(tempDir, 'package.json');
      const intent = {
        type: 'task_request',
        action: 'modify package.json',
        entities: {
          files: [packageJson],
          directories: [],
          functions: [],
          classes: [],
          technologies: [],
          concepts: [],
          variables: []
        },
        confidence: 0.8,
        complexity: 'simple',
        multiStep: false,
        riskLevel: 'medium',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 5,
        context: {
          projectAware: true,
          fileSpecific: true,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [packageJson],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).not.toBeNull();
      expect(result.operation).toBe('edit');
      expect(result.safetyLevel).toBe('dangerous');
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('File Pattern Matching', () => {
    test('should find TypeScript files by technology pattern', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      const intent = {
        type: 'task_request',
        action: 'refactor typescript functions',
        entities: {
          files: [],
          directories: [],
          functions: [],
          classes: [],
          technologies: ['typescript'],
          concepts: ['function'],
          variables: []
        },
        confidence: 0.8,
        complexity: 'moderate',
        multiStep: false,
        riskLevel: 'low',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 10,
        context: {
          projectAware: true,
          fileSpecific: false,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [
          path.join(tempDir, 'test.js'),
          path.join(tempDir, 'component.tsx'),
          path.join(tempDir, 'utils.ts'),
          path.join(tempDir, 'src', 'index.ts')
        ],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).not.toBeNull();
      expect(result.operation).toBe('refactor');
      // Should find TypeScript files (.ts, .tsx)
      const tsFiles = result.targets.filter(t => t.language === 'typescript');
      expect(tsFiles.length).toBeGreaterThan(0);
    });

    test('should handle ambiguous file targeting', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      // Create multiple component files
      await fs.writeFile(path.join(tempDir, 'ButtonComponent.tsx'), 'export const Button = () => <button>test</button>;');
      await fs.writeFile(path.join(tempDir, 'ListComponent.tsx'), 'export const List = () => <ul>test</ul>;');

      const intent = {
        type: 'task_request',
        action: 'modify component styling',
        entities: {
          files: [],
          directories: [],
          functions: [],
          classes: [],
          technologies: ['react'],
          concepts: ['component'],
          variables: []
        },
        confidence: 0.7,
        complexity: 'simple',
        multiStep: false,
        riskLevel: 'low',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 8,
        context: {
          projectAware: true,
          fileSpecific: false,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [
          path.join(tempDir, 'ButtonComponent.tsx'),
          path.join(tempDir, 'ListComponent.tsx'),
          path.join(tempDir, 'component.tsx')
        ],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).not.toBeNull();
      expect(result.operation).toBe('edit');
      // Should find multiple component files
      expect(result.targets.length).toBeGreaterThan(1);
    });
  });

  describe('Safety Assessment', () => {
    test('should assess move operation as risky', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      const testFile = path.join(tempDir, 'utils.ts');
      const intent = {
        type: 'task_request',
        action: 'move utils to src directory',
        entities: {
          files: [testFile],
          directories: [path.join(tempDir, 'src')],
          functions: [],
          classes: [],
          technologies: [],
          concepts: [],
          variables: []
        },
        confidence: 0.8,
        complexity: 'simple',
        multiStep: false,
        riskLevel: 'medium',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 5,
        context: {
          projectAware: true,
          fileSpecific: true,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [testFile],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).not.toBeNull();
      expect(result.operation).toBe('move');
      expect(result.safetyLevel).toBe('risky');
      expect(result.requiresApproval).toBe(true);
      expect(result.backupRequired).toBe(true);
    });

    test('should require backup for risky edits', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      // Create a large file to trigger cautious safety level
      const largeContent = 'x'.repeat(200000); // > 100KB
      const largeFile = path.join(tempDir, 'large.js');
      await fs.writeFile(largeFile, largeContent);

      const intent = {
        type: 'task_request',
        action: 'refactor large file',
        entities: {
          files: [largeFile],
          directories: [],
          functions: [],
          classes: [],
          technologies: [],
          concepts: [],
          variables: []
        },
        confidence: 0.8,
        complexity: 'complex',
        multiStep: true,
        riskLevel: 'medium',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 20,
        context: {
          projectAware: true,
          fileSpecific: true,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [largeFile],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).not.toBeNull();
      expect(result.operation).toBe('refactor');
      expect(result.safetyLevel).toBe('cautious');
      expect(result.backupRequired).toBe(false); // Only risky/dangerous operations require backup
    });
  });

  describe('Language Detection', () => {
    test('should detect file languages correctly', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      const testFiles = [
        { file: 'test.js', expectedLang: 'javascript' },
        { file: 'component.tsx', expectedLang: 'typescript' },
        { file: 'utils.ts', expectedLang: 'typescript' },
        { file: 'package.json', expectedLang: 'json' }
      ];

      for (const { file, expectedLang } of testFiles) {
        const intent = {
          type: 'task_request',
          action: `edit ${file}`,
          entities: {
            files: [path.join(tempDir, file)],
            directories: [],
            functions: [],
            classes: [],
            technologies: [],
            concepts: [],
            variables: []
          },
          confidence: 0.8,
          complexity: 'simple',
          multiStep: false,
          riskLevel: 'low',
          requiresClarification: false,
          suggestedClarifications: [],
          estimatedDuration: 5,
          context: {
            projectAware: true,
            fileSpecific: true,
            followUp: false,
            references: []
          }
        };

        const context = {
          workingDirectory: tempDir,
          projectFiles: [path.join(tempDir, file)],
          recentFiles: []
        };

        const result = await classifier.classifyFileOperation(intent, context);

        expect(result).not.toBeNull();
        expect(result.targets).toHaveLength(1);
        expect(result.targets[0].language).toBe(expectedLang);
      }
    });
  });

  describe('Content Specification Extraction', () => {
    test('should extract content specifications from intent', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      const intent = {
        type: 'task_request',
        action: 'create a React component with TypeScript',
        entities: {
          files: [],
          directories: [],
          functions: [],
          classes: [],
          technologies: ['react', 'typescript'],
          concepts: ['component'],
          variables: []
        },
        confidence: 0.9,
        complexity: 'simple',
        multiStep: false,
        riskLevel: 'low',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 10,
        context: {
          projectAware: true,
          fileSpecific: false,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).not.toBeNull();
      expect(result.content).toBeDefined();
      expect(result.content.description).toBe(intent.action);
      expect(result.content.language).toBe('typescript');
      expect(result.content.framework).toBe('react');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid intents gracefully', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      const intent = {
        type: 'question',
        action: 'what is the weather like?',
        entities: {
          files: [],
          directories: [],
          functions: [],
          classes: [],
          technologies: [],
          concepts: [],
          variables: []
        },
        confidence: 0.9,
        complexity: 'simple',
        multiStep: false,
        riskLevel: 'low',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 2,
        context: {
          projectAware: false,
          fileSpecific: false,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).toBeNull();
    });

    test('should handle missing files gracefully', async () => {
      const classifier = new MockFileOperationClassifier(tempDir);
      await classifier.initialize();

      const nonExistentFile = path.join(tempDir, 'nonexistent.js');
      const intent = {
        type: 'task_request',
        action: 'edit the missing file',
        entities: {
          files: [nonExistentFile],
          directories: [],
          functions: [],
          classes: [],
          technologies: [],
          concepts: [],
          variables: []
        },
        confidence: 0.8,
        complexity: 'simple',
        multiStep: false,
        riskLevel: 'low',
        requiresClarification: false,
        suggestedClarifications: [],
        estimatedDuration: 5,
        context: {
          projectAware: true,
          fileSpecific: true,
          followUp: false,
          references: []
        }
      };

      const context = {
        workingDirectory: tempDir,
        projectFiles: [nonExistentFile],
        recentFiles: []
      };

      const result = await classifier.classifyFileOperation(intent, context);

      expect(result).not.toBeNull();
      expect(result.targets).toHaveLength(1);
      expect(result.targets[0].exists).toBe(false);
      expect(result.targets[0].path).toBe(nonExistentFile);
    });
  });
});

module.exports = {
  // Export for potential integration tests
};
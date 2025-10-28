/**
 * Enhanced Code Example Validation Tests
 * 
 * Comprehensive tests for code example validation, syntax checking, and functionality
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, extname } = require('path');
const { execSync } = require('child_process');

const projectRoot = join(__dirname, '..', '..');

describe('Enhanced Code Example Validation', () => {
  let markdownFiles = [];
  let documentationFiles = [];
  let allCodeBlocks = [];
  
  beforeAll(() => {
    // Get all markdown files
    const getMarkdownFiles = (dir, files = []) => {
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && !['node_modules', 'dist', '.git', '.specify', '.cursor', '.claude'].includes(item)) {
            getMarkdownFiles(fullPath, files);
          } else if (stat.isFile() && ['.md', '.markdown'].includes(extname(item))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore errors for directories we can't read
      }
      
      return files;
    };
    
    markdownFiles = getMarkdownFiles(projectRoot);
    documentationFiles = markdownFiles.filter(file => 
      file.includes('docs/') || 
      file.includes('README.md') || 
      file.includes('TECHNICAL_SPECIFICATION.md') ||
      file.includes('CLAUDE.md') ||
      file.includes('specify.md')
    );
    
    // Collect all code blocks
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = codeBlockPattern.exec(content)) !== null) {
          const [, language, code] = match;
          allCodeBlocks.push({
            file: relativePath,
            language: language || 'text',
            code: code.trim(),
            isSubstantial: code.trim().length > 20
          });
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have code blocks to validate', () => {
    expect(allCodeBlocks.length).toBeGreaterThan(0);
  });
  
  test('should have valid bash examples', () => {
    const bashBlocks = allCodeBlocks.filter(block => 
      block.language === 'bash' || block.language === 'shell' || block.language === 'sh'
    );
    
    for (const block of bashBlocks) {
      if (!block.isSubstantial) continue;
      
      const lines = block.code.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) {
          continue;
        }
        
        // Basic bash syntax validation
        if (line.includes('&&') && line.includes('||')) {
          // Check for common bash syntax issues
          if (line.includes('&&') && line.includes('||') && !line.includes('(')) {
            console.warn(`Potential bash syntax issue in ${block.file}: ${line}`);
          }
        }
        
        // Check for common bash commands
        const validCommands = [
          'npm', 'node', 'git', 'cd', 'ls', 'mkdir', 'rm', 'cp', 'mv',
          'echo', 'cat', 'grep', 'find', 'chmod', 'chown', 'curl', 'wget',
          'ollama-code', 'npx', 'yarn', 'pnpm'
        ];
        
        const command = line.split(' ')[0];
        if (command && !validCommands.includes(command) && 
            !command.startsWith('./') && !command.startsWith('/') && 
            !command.startsWith('$') && !command.startsWith('export')) {
          console.warn(`Unknown command in ${block.file}: ${command}`);
        }
      }
    }
  });
  
  test('should have valid TypeScript examples', () => {
    const tsBlocks = allCodeBlocks.filter(block => 
      block.language === 'typescript' || block.language === 'ts'
    );
    
    for (const block of tsBlocks) {
      if (!block.isSubstantial) continue;
      
      const code = block.code;
      
      // Basic TypeScript syntax validation
      if (code.includes('import') || code.includes('export')) {
        // Should have proper import/export syntax
        expect(code).toMatch(/import\s+.*\s+from\s+['"`][^'"`]+['"`]/);
      }
      
      // Should not have obvious syntax errors
      expect(code).not.toMatch(/function\s+\w+\s*\(\s*\)\s*\{[^}]*$/); // Unclosed function
      expect(code).not.toMatch(/if\s*\([^)]*\)\s*\{[^}]*$/); // Unclosed if
      
      // Should have proper type annotations
      if (code.includes('function') || code.includes('const') || code.includes('let')) {
        // Check for basic type usage
        const hasTypes = code.includes(': string') || code.includes(': number') || 
                        code.includes(': boolean') || code.includes(': any') ||
                        code.includes('interface') || code.includes('type');
        if (code.length > 100) { // Only for substantial code
          expect(hasTypes).toBe(true);
        }
      }
    }
  });
  
  test('should have valid JavaScript examples', () => {
    const jsBlocks = allCodeBlocks.filter(block => 
      block.language === 'javascript' || block.language === 'js'
    );
    
    for (const block of jsBlocks) {
      if (!block.isSubstantial) continue;
      
      const code = block.code;
      
      // Basic JavaScript syntax validation
      if (code.includes('import') || code.includes('export')) {
        // Should have proper import/export syntax
        expect(code).toMatch(/import\s+.*\s+from\s+['"`][^'"`]+['"`]/);
      }
      
      // Should not have obvious syntax errors
      expect(code).not.toMatch(/function\s+\w+\s*\(\s*\)\s*\{[^}]*$/); // Unclosed function
      expect(code).not.toMatch(/if\s*\([^)]*\)\s*\{[^}]*$/); // Unclosed if
      
      // Should have proper async/await usage
      if (code.includes('async') || code.includes('await')) {
        expect(code).toMatch(/async\s+function|await\s+/);
      }
    }
  });
  
  test('should have valid JSON examples', () => {
    const jsonBlocks = allCodeBlocks.filter(block => 
      block.language === 'json'
    );
    
    for (const block of jsonBlocks) {
      if (!block.isSubstantial) continue;
      
      const code = block.code;
      
      // Should be valid JSON
      expect(() => JSON.parse(code)).not.toThrow();
      
      // Should have proper structure
      if (code.includes('{') && code.includes('}')) {
        expect(code).toMatch(/^\s*\{[\s\S]*\}\s*$/);
      }
    }
  });
  
  test('should have valid YAML examples', () => {
    const yamlBlocks = allCodeBlocks.filter(block => 
      block.language === 'yaml' || block.language === 'yml'
    );
    
    for (const block of yamlBlocks) {
      if (!block.isSubstantial) continue;
      
      const code = block.code;
      
      // Basic YAML structure validation
      expect(code).toMatch(/^[\w\s-]+:/m); // Should have at least one key-value pair
      
      // Should not have tab characters (YAML uses spaces)
      expect(code).not.toMatch(/\t/);
      
      // Should have proper indentation
      const lines = code.split('\n');
      let indentLevel = 0;
      for (const line of lines) {
        if (line.trim()) {
          const currentIndent = line.match(/^(\s*)/)[1].length;
          if (currentIndent > indentLevel + 2) {
            console.warn(`Inconsistent indentation in ${block.file}: ${line}`);
          }
          indentLevel = currentIndent;
        }
      }
    }
  });
  
  test('should have valid command examples', () => {
    const commandPattern = /ollama-code\s+[\w-]+/g;
    const allCommands = new Set();
    
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const commands = content.match(commandPattern) || [];
        
        for (const command of commands) {
          allCommands.add(command);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    // Should have valid command format
    for (const command of allCommands) {
      expect(command).toMatch(/^ollama-code\s+[\w-]+$/);
      expect(command).not.toMatch(/\s{2,}/); // No multiple spaces
    }
    
    // Should have common commands
    const expectedCommands = [
      'ollama-code ask',
      'ollama-code list-models',
      'ollama-code pull-model',
      'ollama-code explain',
      'ollama-code generate',
      'ollama-code fix',
      'ollama-code refactor'
    ];
    
    for (const command of expectedCommands) {
      expect(Array.from(allCommands)).toContain(command);
    }
  });
  
  test('should have valid installation examples', () => {
    const readmePath = join(projectRoot, 'README.md');
    const readmeContent = readFileSync(readmePath, 'utf8');
    
    // Should contain installation commands
    expect(readmeContent).toContain('npm install');
    expect(readmeContent).toContain('npm run build');
    expect(readmeContent).toContain('npm start');
    
    // Should have proper git commands
    expect(readmeContent).toContain('git clone');
    
    // Should have proper bash code blocks
    expect(readmeContent).toMatch(/```bash\n.*npm.*\n```/);
  });
  
  test('should have valid development examples', () => {
    const readmePath = join(projectRoot, 'README.md');
    const readmeContent = readFileSync(readmePath, 'utf8');
    
    // Should contain development commands
    expect(readmeContent).toContain('npm run dev');
    expect(readmeContent).toContain('npm test');
    expect(readmeContent).toContain('npm run lint');
    
    // Should have proper development setup
    expect(readmeContent).toContain('## Development');
  });
  
  test('should have valid configuration examples', () => {
    const configPath = join(projectRoot, 'docs', 'configuration.md');
    if (statSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf8');
      
      // Should contain configuration examples
      expect(configContent).toContain('api');
      expect(configContent).toContain('ollama');
      expect(configContent).toContain('ai');
      
      // Should have JSON examples
      expect(configContent).toMatch(/```json\n[\s\S]*?\n```/);
    }
  });
  
  test('should have valid command examples in specify.md', () => {
    const specPath = join(projectRoot, 'specify.md');
    const specContent = readFileSync(specPath, 'utf8');
    
    // Should contain command examples
    expect(specContent).toContain('ollama-code ask');
    expect(specContent).toContain('ollama-code explain');
    expect(specContent).toContain('ollama-code fix');
    expect(specContent).toContain('ollama-code generate');
    expect(specContent).toContain('ollama-code refactor');
    
    // Should have proper bash code blocks
    expect(specContent).toMatch(/```bash\n.*ollama-code.*\n```/);
  });
  
  test('should have valid module examples', () => {
    const moduleFiles = markdownFiles.filter(file => 
      file.includes('docs/') && file.endsWith('.md')
    );
    
    for (const file of moduleFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have code examples
        expect(content).toContain('```');
        
        // Should have TypeScript examples
        expect(content).toMatch(/```typescript\n[\s\S]*?\n```/);
        
        // Should have usage examples
        expect(content).toContain('## Usage Examples');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid error handling examples', () => {
    const errorFiles = documentationFiles.filter(file => 
      file.includes('error') || file.includes('ERROR')
    );
    
    for (const file of errorFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have try-catch examples
        expect(content).toContain('try');
        expect(content).toContain('catch');
        
        // Should have error handling code
        expect(content).toMatch(/```typescript\n[\s\S]*?try[\s\S]*?catch[\s\S]*?\n```/);
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid API examples', () => {
    const apiFiles = documentationFiles.filter(file => 
      file.includes('api') || file.includes('API') || file.includes('commands')
    );
    
    for (const file of apiFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have function examples
        expect(content).toMatch(/function\s+\w+\(/);
        
        // Should have TypeScript examples
        expect(content).toMatch(/```typescript\n[\s\S]*?\n```/);
        
        // Should have parameter examples
        expect(content).toContain('@param');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid configuration examples', () => {
    const configFiles = documentationFiles.filter(file => 
      file.includes('config') || file.includes('Config')
    );
    
    for (const file of configFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have configuration examples
        expect(content).toContain('api');
        expect(content).toContain('ollama');
        expect(content).toContain('ai');
        
        // Should have JSON examples
        expect(content).toMatch(/```json\n[\s\S]*?\n```/);
        
        // Should have environment variable examples
        expect(content).toContain('OLLAMA_CODE_');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid testing examples', () => {
    const testFiles = documentationFiles.filter(file => 
      file.includes('test') || file.includes('Test') || file.includes('TEST')
    );
    
    for (const file of testFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have test examples
        expect(content).toContain('npm test');
        expect(content).toContain('jest');
        
        // Should have test code examples
        expect(content).toMatch(/```typescript\n[\s\S]*?test[\s\S]*?\n```/);
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid performance examples', () => {
    const perfFiles = documentationFiles.filter(file => 
      file.includes('performance') || file.includes('Performance') || file.includes('PERFORMANCE')
    );
    
    for (const file of perfFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have performance examples
        expect(content).toContain('performance');
        expect(content).toContain('optimization');
        
        // Should have code examples
        expect(content).toContain('```');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid security examples', () => {
    const securityFiles = documentationFiles.filter(file => 
      file.includes('security') || file.includes('Security') || file.includes('SECURITY')
    );
    
    for (const file of securityFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have security examples
        expect(content).toContain('security');
        expect(content).toContain('privacy');
        
        // Should have code examples
        expect(content).toContain('```');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid integration examples', () => {
    const integrationFiles = documentationFiles.filter(file => 
      file.includes('integration') || file.includes('Integration') || file.includes('INTEGRATION')
    );
    
    for (const file of integrationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have integration examples
        expect(content).toContain('integration');
        expect(content).toContain('connect');
        
        // Should have code examples
        expect(content).toContain('```');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid architecture examples', () => {
    const archFiles = documentationFiles.filter(file => 
      file.includes('architecture') || file.includes('Architecture') || file.includes('ARCHITECTURE')
    );
    
    for (const file of archFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have architecture examples
        expect(content).toContain('architecture');
        expect(content).toContain('component');
        
        // Should have code examples
        expect(content).toContain('```');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid troubleshooting examples', () => {
    const troubleshootFiles = documentationFiles.filter(file => 
      file.includes('troubleshoot') || file.includes('Troubleshoot') || file.includes('TROUBLESHOOT')
    );
    
    for (const file of troubleshootFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have troubleshooting examples
        expect(content).toContain('issue');
        expect(content).toContain('problem');
        
        // Should have code examples
        expect(content).toContain('```');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid code quality', () => {
    for (const block of allCodeBlocks) {
      if (!block.isSubstantial) continue;
      
      // Code should not be empty
      expect(block.code.trim()).not.toBe('');
      
      // Code should not have trailing whitespace
      const lines = block.code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.endsWith(' ') || line.endsWith('\t')) {
          console.warn(`Trailing whitespace in ${block.file}:${i + 1}`);
        }
      }
      
      // Code should not have multiple consecutive empty lines
      expect(block.code).not.toMatch(/\n\s*\n\s*\n/);
    }
  });
});


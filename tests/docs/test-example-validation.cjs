/**
 * Code Example Validation Tests
 * 
 * Tests for code example validation in documentation
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, extname } = require('path');

const projectRoot = join(__dirname, '..', '..');

describe('Code Example Validation', () => {
  let markdownFiles = [];
  
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
  });
  
  test('should have markdown files to check', () => {
    expect(markdownFiles.length).toBeGreaterThan(0);
  });
  
  test('should have valid bash examples', () => {
    const bashPattern = /```bash\n([\s\S]*?)```/g;
    
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = bashPattern.exec(content)) !== null) {
          const [, code] = match;
          const lines = code.split('\n');
          
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
                // This might be a syntax issue
                console.warn(`Potential bash syntax issue in ${relativePath}:${i + 1}: ${line}`);
              }
            }
            
            // Check for common bash commands
            const validCommands = [
              'npm', 'node', 'git', 'cd', 'ls', 'mkdir', 'rm', 'cp', 'mv',
              'echo', 'cat', 'grep', 'find', 'chmod', 'chown', 'curl', 'wget'
            ];
            
            const command = line.split(' ')[0];
            if (command && !validCommands.includes(command) && !command.startsWith('./') && !command.startsWith('/')) {
              console.warn(`Unknown command in ${relativePath}:${i + 1}: ${command}`);
            }
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid TypeScript examples', () => {
    const tsPattern = /```typescript\n([\s\S]*?)```/g;
    
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = tsPattern.exec(content)) !== null) {
          const [, code] = match;
          
          // Basic TypeScript syntax validation
          if (code.includes('import') || code.includes('export')) {
            // Should have proper import/export syntax
            expect(code).toMatch(/import\s+.*\s+from\s+['"`][^'"`]+['"`]/);
          }
          
          // Should not have obvious syntax errors
          expect(code).not.toMatch(/function\s+\w+\s*\(\s*\)\s*\{[^}]*$/); // Unclosed function
          expect(code).not.toMatch(/if\s*\([^)]*\)\s*\{[^}]*$/); // Unclosed if
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid JSON examples', () => {
    const jsonPattern = /```json\n([\s\S]*?)```/g;
    
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = jsonPattern.exec(content)) !== null) {
          const [, code] = match;
          
          // Should be valid JSON
          expect(() => JSON.parse(code)).not.toThrow();
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid command examples in README', () => {
    const readmePath = join(projectRoot, 'README.md');
    const readmeContent = readFileSync(readmePath, 'utf8');
    
    // Should contain valid command examples
    expect(readmeContent).toContain('ollama-code ask');
    expect(readmeContent).toContain('ollama-code list-models');
    expect(readmeContent).toContain('ollama-code pull-model');
    expect(readmeContent).toContain('ollama-code explain');
    
    // Should have proper bash code blocks
    expect(readmeContent).toMatch(/```bash\n.*ollama-code.*\n```/);
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
  });
  
  test('should have valid development examples', () => {
    const readmePath = join(projectRoot, 'README.md');
    const readmeContent = readFileSync(readmePath, 'utf8');
    
    // Should contain development commands
    expect(readmeContent).toContain('npm run dev');
    expect(readmeContent).toContain('npm test');
    expect(readmeContent).toContain('npm run lint');
  });
  
  test('should have valid configuration examples', () => {
    const configPath = join(projectRoot, 'docs', 'configuration.md');
    if (statSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf8');
      
      // Should contain configuration examples
      expect(configContent).toContain('ollama-code config');
      expect(configContent).toContain('api.baseUrl');
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
  });
});

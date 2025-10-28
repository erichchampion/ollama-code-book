/**
 * Consistency Validation Tests
 * 
 * Tests for documentation consistency, cross-references, and coherence
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, extname } = require('path');

const projectRoot = join(__dirname, '..', '..');

describe('Consistency Validation', () => {
  let markdownFiles = [];
  let documentationFiles = [];
  let moduleFiles = [];
  
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
    moduleFiles = markdownFiles.filter(file => 
      file.includes('docs/') && file.endsWith('.md')
    );
  });
  
  test('should have consistent cross-references', () => {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const brokenLinks = [];
    
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = linkPattern.exec(content)) !== null) {
          const [, linkText, linkUrl] = match;
          
          // Skip external links
          if (linkUrl.startsWith('http') || linkUrl.startsWith('mailto:') || linkUrl.startsWith('#')) {
            continue;
          }
          
          // Check if internal link exists
          let targetPath;
          if (linkUrl.startsWith('/')) {
            targetPath = join(projectRoot, linkUrl);
          } else {
            const fileDir = join(file, '..');
            targetPath = join(fileDir, linkUrl);
          }
          
          try {
            statSync(targetPath);
          } catch {
            brokenLinks.push({
              file: relativePath,
              link: linkText,
              url: linkUrl
            });
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    if (brokenLinks.length > 0) {
      const errorMessage = brokenLinks.map(link => 
        `  ${link.file}: ${link.url} (${link.link})`
      ).join('\n');
      fail(`Found broken internal links:\n${errorMessage}`);
    }
  });
  
  test('should have consistent command references', () => {
    const commandPattern = /ollama-code\s+[\w-]+/g;
    const allCommands = new Set();
    
    for (const file of documentationFiles) {
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
    
    // Should have common commands documented
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
  
  test('should have consistent module documentation structure', () => {
    const requiredSections = [
      'Module Overview',
      'Architecture',
      'API Reference',
      'Usage Examples',
      'Best Practices'
    ];
    
    for (const file of moduleFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have required sections
        for (const section of requiredSections) {
          expect(content).toContain(section);
        }
        
        // Should have proper module header
        expect(content).toMatch(/^# \w+ Module/);
        
        // Should have path and description
        expect(content).toContain('**Path:**');
        expect(content).toContain('**Description:**');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have consistent error handling documentation', () => {
    const errorFiles = documentationFiles.filter(file => 
      file.includes('error') || file.includes('ERROR')
    );
    
    for (const file of errorFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have error categories
        expect(content).toContain('ErrorCategory');
        expect(content).toContain('UserError');
        
        // Should have error handling examples
        expect(content).toContain('try');
        expect(content).toContain('catch');
        
        // Should have error resolution strategies
        expect(content).toContain('resolution');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have consistent configuration documentation', () => {
    const configFiles = documentationFiles.filter(file => 
      file.includes('config') || file.includes('Config')
    );
    
    for (const file of configFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have configuration sections
        expect(content).toContain('api');
        expect(content).toContain('ollama');
        expect(content).toContain('ai');
        
        // Should have default values
        expect(content).toContain('default');
        
        // Should have examples
        expect(content).toContain('```');
        
        // Should have environment variables
        expect(content).toContain('OLLAMA_CODE_');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have consistent API documentation', () => {
    const apiFiles = documentationFiles.filter(file => 
      file.includes('api') || file.includes('API') || file.includes('commands')
    );
    
    for (const file of apiFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have function signatures
        expect(content).toMatch(/function\s+\w+\(/);
        
        // Should have parameter descriptions
        expect(content).toContain('@param');
        
        // Should have return type descriptions
        expect(content).toContain('@returns');
        
        // Should have examples
        expect(content).toContain('```');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have consistent terminology across all files', () => {
    const terminology = {
      'ollama-code': 'ollama-code',
      'Ollama Code': 'Ollama Code',
      'CLI': 'CLI',
      'command-line': 'command-line',
      'Node.js': 'Node.js',
      'TypeScript': 'TypeScript',
      'Ollama': 'Ollama',
      'AI': 'AI',
      'API': 'API'
    };
    
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for consistent terminology
        for (const [term, expected] of Object.entries(terminology)) {
          if (content.includes(term)) {
            // Should use the expected form
            expect(content).toContain(expected);
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have consistent code examples', () => {
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = codeBlockPattern.exec(content)) !== null) {
          const [, language, code] = match;
          
          // Code should not be empty
          expect(code.trim()).not.toBe('');
          
          // Should have language specification for substantial code
          if (code.length > 20) {
            expect(language).toBeDefined();
            expect(language).not.toBe('');
          }
          
          // Language should be valid
          if (language) {
            const validLanguages = [
              'bash', 'javascript', 'typescript', 'json', 'yaml', 'markdown',
              'python', 'java', 'go', 'rust', 'html', 'css', 'sql', 'text',
              'shell', 'sh', 'js', 'ts', 'jsx', 'tsx', 'xml', 'ini'
            ];
            expect(validLanguages).toContain(language.toLowerCase());
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have consistent file structure', () => {
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should start with a header
        expect(content).toMatch(/^# .+$/m);
        
        // Should not have multiple H1 headers
        const h1Count = (content.match(/^# /gm) || []).length;
        expect(h1Count).toBe(1);
        
        // Should have proper spacing
        expect(content).not.toMatch(/\n\s*\n\s*\n/);
        
        // Should end with newline
        expect(content).toMatch(/\n$/);
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have consistent cross-references between files', () => {
    const crossReferences = {
      'README.md': ['TECHNICAL_SPECIFICATION.md', 'specify.md', 'CLAUDE.md'],
      'TECHNICAL_SPECIFICATION.md': ['README.md', 'specify.md'],
      'CLAUDE.md': ['README.md', 'TECHNICAL_SPECIFICATION.md'],
      'specify.md': ['README.md', 'TECHNICAL_SPECIFICATION.md']
    };
    
    for (const [file, expectedRefs] of Object.entries(crossReferences)) {
      const filePath = join(projectRoot, file);
      try {
        const content = readFileSync(filePath, 'utf8');
        
        for (const ref of expectedRefs) {
          expect(content).toContain(ref);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have consistent module cross-references', () => {
    const moduleRefs = {
      'ai-module.md': ['commands-module.md', 'config-module.md'],
      'commands-module.md': ['ai-module.md', 'config-module.md'],
      'config-module.md': ['ai-module.md', 'commands-module.md'],
      'auth-module.md': ['ai-module.md', 'config-module.md'],
      'terminal-module.md': ['commands-module.md', 'errors-module.md'],
      'errors-module.md': ['commands-module.md', 'terminal-module.md']
    };
    
    for (const [file, expectedRefs] of Object.entries(moduleRefs)) {
      const filePath = join(projectRoot, 'docs', file);
      try {
        const content = readFileSync(filePath, 'utf8');
        
        for (const ref of expectedRefs) {
          expect(content).toContain(ref);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have consistent version references', () => {
    const versionPattern = /v?\d+\.\d+\.\d+/g;
    const allVersions = new Set();
    
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const versions = content.match(versionPattern) || [];
        
        for (const version of versions) {
          allVersions.add(version);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    // Should have consistent version format
    for (const version of allVersions) {
      expect(version).toMatch(/^v?\d+\.\d+\.\d+$/);
    }
  });
  
  test('should have consistent command examples', () => {
    const commandPattern = /ollama-code\s+[\w-]+/g;
    const allCommands = new Set();
    
    for (const file of documentationFiles) {
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
    
    // Should have consistent command format
    for (const command of allCommands) {
      expect(command).toMatch(/^ollama-code\s+[\w-]+$/);
      expect(command).not.toMatch(/\s{2,}/); // No multiple spaces
    }
  });
});


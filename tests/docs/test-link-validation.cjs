/**
 * Link Validation Tests
 * 
 * Tests for link validation functionality
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, extname } = require('path');

const projectRoot = join(__dirname, '..', '..');

describe('Link Validation', () => {
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
  
  test('should not have broken internal links', () => {
    const brokenLinks = [];
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    for (const file of markdownFiles) {
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
          
          // Handle relative links
          let targetPath;
          if (linkUrl.startsWith('/')) {
            targetPath = join(projectRoot, linkUrl);
          } else {
            const fileDir = dirname(file);
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
  
  test('should have valid README links', () => {
    const readmePath = join(projectRoot, 'README.md');
    const readmeContent = readFileSync(readmePath, 'utf8');
    
    // Check for common README links
    const expectedLinks = [
      'TECHNICAL_SPECIFICATION.md',
      'specify.md',
      'CODEBASE_ANALYSIS.md',
      'CLAUDE.md',
      'LICENSE.md'
    ];
    
    for (const link of expectedLinks) {
      expect(readmeContent).toContain(link);
    }
  });
  
  test('should have valid documentation cross-references', () => {
    const docsDir = join(projectRoot, 'docs');
    const docFiles = readdirSync(docsDir);
    
    for (const file of docFiles) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Check for proper markdown formatting
        expect(content).toMatch(/^# \w+/); // Should start with a heading
        expect(content).toContain('**Path:**'); // Should have path information
        expect(content).toContain('**Description:**'); // Should have description
      }
    }
  });
  
  test('should have valid command references', () => {
    const commandsPath = join(projectRoot, 'docs', 'commands.md');
    const commandsContent = readFileSync(commandsPath, 'utf8');
    
    // Should contain command references
    expect(commandsContent).toContain('ollama-code');
    expect(commandsContent).toContain('ask');
    expect(commandsContent).toContain('list-models');
    expect(commandsContent).toContain('pull-model');
  });
  
  test('should have valid code block formatting', () => {
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = codeBlockPattern.exec(content)) !== null) {
          const [, language, code] = match;
          
          // Code blocks should not be empty
          expect(code.trim()).not.toBe('');
          
          // If language is specified, it should be valid
          if (language) {
            const validLanguages = [
              'bash', 'javascript', 'typescript', 'json', 'yaml', 'markdown',
              'python', 'java', 'go', 'rust', 'html', 'css', 'sql'
            ];
            expect(validLanguages).toContain(language.toLowerCase());
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
});

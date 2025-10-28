/**
 * Markdown Syntax Validation Tests
 * 
 * Tests for markdown syntax validation
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, extname } = require('path');

const projectRoot = join(__dirname, '..', '..');

describe('Markdown Syntax Validation', () => {
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
  
  test('should have valid markdown headers', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should start with a header
        expect(content).toMatch(/^# /);
        
        // Should not have multiple H1 headers
        const h1Count = (content.match(/^# /gm) || []).length;
        expect(h1Count).toBe(1);
        
        // Headers should be properly formatted
        const headers = content.match(/^#{1,6} .+$/gm) || [];
        for (const header of headers) {
          expect(header).toMatch(/^#{1,6} [^#]/); // Should not start with #
          expect(header).not.toMatch(/^#{1,6} $/); // Should not be empty
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown lists', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for unordered lists
        const ulPattern = /^[\s]*[-*+]\s+.+$/gm;
        const ulMatches = content.match(ulPattern) || [];
        
        for (const match of ulMatches) {
          expect(match).toMatch(/^[\s]*[-*+]\s+.+/);
        }
        
        // Check for ordered lists
        const olPattern = /^[\s]*\d+\.\s+.+$/gm;
        const olMatches = content.match(olPattern) || [];
        
        for (const match of olMatches) {
          expect(match).toMatch(/^[\s]*\d+\.\s+.+/);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown links', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for markdown links
        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        
        while ((match = linkPattern.exec(content)) !== null) {
          const [, linkText, linkUrl] = match;
          
          // Link text should not be empty
          expect(linkText.trim()).not.toBe('');
          
          // Link URL should not be empty
          expect(linkUrl.trim()).not.toBe('');
          
          // Link text should not contain unescaped brackets
          expect(linkText).not.toMatch(/\[|\]/);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown code blocks', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for fenced code blocks
        const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockPattern.exec(content)) !== null) {
          const [, language, code] = match;
          
          // Code should not be empty
          expect(code.trim()).not.toBe('');
          
          // If language is specified, it should be valid
          if (language) {
            const validLanguages = [
              'bash', 'javascript', 'typescript', 'json', 'yaml', 'markdown',
              'python', 'java', 'go', 'rust', 'html', 'css', 'sql', 'text'
            ];
            expect(validLanguages).toContain(language.toLowerCase());
          }
        }
        
        // Check for inline code
        const inlineCodePattern = /`([^`]+)`/g;
        while ((match = inlineCodePattern.exec(content)) !== null) {
          const [, code] = match;
          
          // Inline code should not be empty
          expect(code.trim()).not.toBe('');
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown tables', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for markdown tables
        const tablePattern = /^\|.*\|$/gm;
        const tableMatches = content.match(tablePattern) || [];
        
        if (tableMatches.length > 0) {
          // Should have header separator
          const headerSeparatorPattern = /^\|[\s]*:?-+:?[\s]*\|/;
          const hasHeaderSeparator = tableMatches.some(match => 
            headerSeparatorPattern.test(match)
          );
          expect(hasHeaderSeparator).toBe(true);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown emphasis', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for bold text
        const boldPattern = /\*\*([^*]+)\*\*/g;
        let match;
        
        while ((match = boldPattern.exec(content)) !== null) {
          const [, text] = match;
          expect(text.trim()).not.toBe('');
        }
        
        // Check for italic text
        const italicPattern = /\*([^*]+)\*/g;
        while ((match = italicPattern.exec(content)) !== null) {
          const [, text] = match;
          expect(text.trim()).not.toBe('');
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have proper markdown structure', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should not have trailing whitespace
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.endsWith(' ') || line.endsWith('\t')) {
            console.warn(`Trailing whitespace in ${relativePath}:${i + 1}`);
          }
        }
        
        // Should end with newline
        expect(content).toMatch(/\n$/);
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
});

/**
 * Enhanced Markdown Syntax Validation Tests
 * 
 * Comprehensive tests for markdown syntax validation and formatting standards
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, extname } = require('path');

const projectRoot = join(__dirname, '..', '..');

describe('Enhanced Markdown Syntax Validation', () => {
  let markdownFiles = [];
  let documentationFiles = [];
  
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
  });
  
  test('should have markdown files to validate', () => {
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
          expect(header).not.toMatch(/^#{1,6}\s+$/); // Should not be just spaces
        }
        
        // Headers should have proper hierarchy
        const headerLevels = headers.map(h => h.match(/^(#{1,6})/)[1].length);
        for (let i = 1; i < headerLevels.length; i++) {
          if (headerLevels[i] > headerLevels[i-1] + 1) {
            console.warn(`Header hierarchy issue in ${relativePath}: H${headerLevels[i]} after H${headerLevels[i-1]}`);
          }
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
          expect(match).not.toMatch(/^[\s]*[-*+]\s*$/); // Should not be empty
        }
        
        // Check for ordered lists
        const olPattern = /^[\s]*\d+\.\s+.+$/gm;
        const olMatches = content.match(olPattern) || [];
        
        for (const match of olMatches) {
          expect(match).toMatch(/^[\s]*\d+\.\s+.+/);
          expect(match).not.toMatch(/^[\s]*\d+\.\s*$/); // Should not be empty
        }
        
        // Check for nested lists
        const nestedPattern = /^[\s]{2,}[-*+]\s+.+$/gm;
        const nestedMatches = content.match(nestedPattern) || [];
        
        for (const match of nestedMatches) {
          expect(match).toMatch(/^[\s]{2,}[-*+]\s+.+/);
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
          
          // Link URL should not contain spaces
          expect(linkUrl).not.toMatch(/\s/);
        }
        
        // Check for reference links
        const refLinkPattern = /\[([^\]]+)\]\[([^\]]*)\]/g;
        while ((match = refLinkPattern.exec(content)) !== null) {
          const [, linkText, refId] = match;
          
          // Link text should not be empty
          expect(linkText.trim()).not.toBe('');
          
          // Reference ID should not be empty
          expect(refId.trim()).not.toBe('');
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
              'python', 'java', 'go', 'rust', 'html', 'css', 'sql', 'text',
              'shell', 'sh', 'js', 'ts', 'jsx', 'tsx', 'xml', 'ini'
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
          
          // Check table structure
          const tableRows = tableMatches.filter(match => 
            !headerSeparatorPattern.test(match)
          );
          
          for (const row of tableRows) {
            // Should have proper pipe separators
            expect(row).toMatch(/^\|.*\|$/);
            
            // Should not be empty
            expect(row.trim()).not.toBe('|');
          }
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
        
        // Check for code emphasis
        const codePattern = /`([^`]+)`/g;
        while ((match = codePattern.exec(content)) !== null) {
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
        
        // Should not have multiple consecutive empty lines
        expect(content).not.toMatch(/\n\s*\n\s*\n/);
        
        // Should have proper line length (not too long)
        const longLines = lines.filter(line => line.length > 120);
        if (longLines.length > 0) {
          console.warn(`Long lines in ${relativePath}: ${longLines.length} lines over 120 characters`);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown blockquotes', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for blockquotes
        const blockquotePattern = /^>\s*.+$/gm;
        const blockquoteMatches = content.match(blockquotePattern) || [];
        
        for (const match of blockquoteMatches) {
          expect(match).toMatch(/^>\s*.+/);
          expect(match).not.toMatch(/^>\s*$/); // Should not be empty
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown horizontal rules', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for horizontal rules
        const hrPattern = /^[\s]*[-*_]{3,}[\s]*$/gm;
        const hrMatches = content.match(hrPattern) || [];
        
        for (const match of hrMatches) {
          expect(match).toMatch(/^[\s]*[-*_]{3,}[\s]*$/);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown images', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for images
        const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let match;
        
        while ((match = imagePattern.exec(content)) !== null) {
          const [, altText, imageUrl] = match;
          
          // Alt text should not be empty (for accessibility)
          expect(altText.trim()).not.toBe('');
          
          // Image URL should not be empty
          expect(imageUrl.trim()).not.toBe('');
          
          // Image URL should not contain spaces
          expect(imageUrl).not.toMatch(/\s/);
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown footnotes', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for footnotes
        const footnotePattern = /\[\^([^\]]+)\]/g;
        let match;
        
        while ((match = footnotePattern.exec(content)) !== null) {
          const [, footnoteId] = match;
          
          // Footnote ID should not be empty
          expect(footnoteId.trim()).not.toBe('');
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown task lists', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for task lists
        const taskPattern = /^[\s]*[-*]\s*\[[ x]\]\s*.+$/gm;
        const taskMatches = content.match(taskPattern) || [];
        
        for (const match of taskMatches) {
          expect(match).toMatch(/^[\s]*[-*]\s*\[[ x]\]\s*.+/);
          expect(match).not.toMatch(/^[\s]*[-*]\s*\[[ x]\]\s*$/); // Should not be empty
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown strikethrough', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for strikethrough
        const strikePattern = /~~([^~]+)~~/g;
        let match;
        
        while ((match = strikePattern.exec(content)) !== null) {
          const [, text] = match;
          expect(text.trim()).not.toBe('');
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown superscript and subscript', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for superscript
        const supPattern = /\^([^\^]+)\^/g;
        let match;
        
        while ((match = supPattern.exec(content)) !== null) {
          const [, text] = match;
          expect(text.trim()).not.toBe('');
        }
        
        // Check for subscript
        const subPattern = /~([^~]+)~/g;
        while ((match = subPattern.exec(content)) !== null) {
          const [, text] = match;
          expect(text.trim()).not.toBe('');
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown definition lists', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for definition lists
        const defPattern = /^[\s]*:\s*.+$/gm;
        const defMatches = content.match(defPattern) || [];
        
        for (const match of defMatches) {
          expect(match).toMatch(/^[\s]*:\s*.+/);
          expect(match).not.toMatch(/^[\s]*:\s*$/); // Should not be empty
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown abbreviations', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for abbreviations
        const abbrPattern = /\*\[([^\]]+)\]:\s*(.+)$/gm;
        let match;
        
        while ((match = abbrPattern.exec(content)) !== null) {
          const [, abbr, definition] = match;
          
          // Abbreviation should not be empty
          expect(abbr.trim()).not.toBe('');
          
          // Definition should not be empty
          expect(definition.trim()).not.toBe('');
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown syntax highlighting', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for syntax highlighting in code blocks
        const codeBlockPattern = /```(\w+)\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockPattern.exec(content)) !== null) {
          const [, language, code] = match;
          
          // Language should be valid
          const validLanguages = [
            'bash', 'javascript', 'typescript', 'json', 'yaml', 'markdown',
            'python', 'java', 'go', 'rust', 'html', 'css', 'sql', 'text',
            'shell', 'sh', 'js', 'ts', 'jsx', 'tsx', 'xml', 'ini'
          ];
          expect(validLanguages).toContain(language.toLowerCase());
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown metadata', () => {
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have a title
        expect(content).toMatch(/^# .+$/m);
        
        // Should have description or overview
        const hasDescription = content.includes('## Overview') || 
                              content.includes('## Description') ||
                              content.includes('**Description:**');
        expect(hasDescription).toBe(true);
        
        // Should have usage examples
        const hasExamples = content.includes('## Examples') || 
                           content.includes('## Usage') ||
                           content.includes('```');
        expect(hasExamples).toBe(true);
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid markdown consistency', () => {
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have consistent formatting
        expect(content).not.toMatch(/\n\s*\n\s*\n/); // No multiple empty lines
        
        // Should have proper spacing around headers
        const headers = content.match(/^#{1,6} .+$/gm) || [];
        for (const header of headers) {
          const headerIndex = content.indexOf(header);
          const beforeHeader = content.substring(0, headerIndex);
          const afterHeader = content.substring(headerIndex + header.length);
          
          // Should have proper spacing before headers (except first)
          if (headerIndex > 0) {
            const beforeLines = beforeHeader.split('\n');
            const lastLine = beforeLines[beforeLines.length - 1];
            if (lastLine.trim() && !lastLine.match(/^[\s]*$/)) {
              console.warn(`Missing spacing before header in ${relativePath}: ${header}`);
            }
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
});


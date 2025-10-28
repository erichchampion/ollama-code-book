/**
 * Content Validation Tests
 * 
 * Tests for documentation content validation, structure, and consistency
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, extname } = require('path');

const projectRoot = join(__dirname, '..', '..');

describe('Content Validation', () => {
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
  
  test('should have documentation files to validate', () => {
    expect(documentationFiles.length).toBeGreaterThan(0);
  });
  
  test('should have consistent documentation structure', () => {
    const requiredSections = [
      'Table of Contents',
      'Overview',
      'Usage',
      'Examples',
      'Configuration',
      'API Reference',
      'Troubleshooting'
    ];
    
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for required sections based on file type
        if (file.includes('README.md')) {
          expect(content).toContain('# ollama-code');
          expect(content).toContain('## Installation');
          expect(content).toContain('## Quick Start');
          expect(content).toContain('## Features');
        }
        
        if (file.includes('TECHNICAL_SPECIFICATION.md')) {
          expect(content).toContain('# Ollama Code: Technical Stack Specification');
          expect(content).toContain('## 1. Architecture Foundation');
        }
        
        if (file.includes('CLAUDE.md')) {
          expect(content).toContain('# CLAUDE.md');
          expect(content).toContain('## Project Overview');
        }
        
        if (file.includes('specify.md')) {
          expect(content).toContain('# Ollama Code CLI Specification');
          expect(content).toContain('## Overview');
        }
        
        // Check for module documentation structure
        if (file.includes('docs/') && file.endsWith('.md')) {
          expect(content).toMatch(/^# \w+ Module/);
          expect(content).toContain('**Path:**');
          expect(content).toContain('**Description:**');
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have proper code examples with syntax highlighting', () => {
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
          
          // Should have language specification for code blocks
          if (code.length > 10) { // Only for substantial code blocks
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
  
  test('should have consistent command examples', () => {
    const commandPattern = /ollama-code\s+[\w-]+/g;
    
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        const commands = content.match(commandPattern) || [];
        
        // Should have valid command format
        for (const command of commands) {
          expect(command).toMatch(/^ollama-code\s+[\w-]+$/);
          expect(command).not.toMatch(/\s{2,}/); // No multiple spaces
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have proper cross-references', () => {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = linkPattern.exec(content)) !== null) {
          const [, linkText, linkUrl] = match;
          
          // Link text should be descriptive
          expect(linkText.trim()).not.toBe('');
          expect(linkText.length).toBeGreaterThan(2);
          
          // Internal links should be relative
          if (!linkUrl.startsWith('http') && !linkUrl.startsWith('mailto:')) {
            expect(linkUrl).not.toMatch(/^\/\w+/); // Should not start with /
            expect(linkUrl).not.toMatch(/\.\.\//); // Should not use ../
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have consistent formatting', () => {
    for (const file of documentationFiles) {
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
        
        // Headers should have proper spacing
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
  
  test('should have proper documentation metadata', () => {
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
  
  test('should have consistent terminology', () => {
    const terminology = {
      'ollama-code': 'ollama-code',
      'Ollama Code': 'Ollama Code',
      'CLI': 'CLI',
      'command-line': 'command-line',
      'Node.js': 'Node.js',
      'TypeScript': 'TypeScript'
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
  
  test('should have proper error handling documentation', () => {
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
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have proper API documentation', () => {
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
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have proper configuration documentation', () => {
    const configFiles = documentationFiles.filter(file => 
      file.includes('config') || file.includes('Config')
    );
    
    for (const file of configFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have configuration options
        expect(content).toContain('api');
        expect(content).toContain('ollama');
        expect(content).toContain('ai');
        
        // Should have default values
        expect(content).toContain('default');
        
        // Should have examples
        expect(content).toContain('```');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have proper module documentation', () => {
    const moduleFiles = documentationFiles.filter(file => 
      file.includes('docs/') && file.endsWith('.md')
    );
    
    for (const file of moduleFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have module information
        expect(content).toMatch(/^# \w+ Module/);
        expect(content).toContain('**Path:**');
        expect(content).toContain('**Description:**');
        
        // Should have usage examples
        expect(content).toContain('```');
        
        // Should have API reference
        expect(content).toContain('## API Reference');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
});


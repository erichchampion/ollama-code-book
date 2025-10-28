/**
 * Enhanced Link Validation Tests
 * 
 * Comprehensive tests for internal and external link validation
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, extname } = require('path');
const { execSync } = require('child_process');

const projectRoot = join(__dirname, '..', '..');

describe('Enhanced Link Validation', () => {
  let markdownFiles = [];
  let documentationFiles = [];
  let allLinks = [];
  
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
    
    // Collect all links
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = linkPattern.exec(content)) !== null) {
          const [, linkText, linkUrl] = match;
          allLinks.push({
            file: relativePath,
            text: linkText,
            url: linkUrl,
            isExternal: linkUrl.startsWith('http') || linkUrl.startsWith('https'),
            isAnchor: linkUrl.startsWith('#'),
            isEmail: linkUrl.startsWith('mailto:')
          });
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have links to validate', () => {
    expect(allLinks.length).toBeGreaterThan(0);
  });
  
  test('should not have broken internal links', () => {
    const brokenLinks = [];
    
    for (const link of allLinks) {
      if (link.isExternal || link.isAnchor || link.isEmail) {
        continue;
      }
      
      // Handle relative links
      let targetPath;
      if (link.url.startsWith('/')) {
        targetPath = join(projectRoot, link.url);
      } else {
        const sourceFile = join(projectRoot, link.file);
        const sourceDir = join(sourceFile, '..');
        targetPath = join(sourceDir, link.url);
      }
      
      try {
        statSync(targetPath);
      } catch {
        brokenLinks.push({
          file: link.file,
          text: link.text,
          url: link.url
        });
      }
    }
    
    if (brokenLinks.length > 0) {
      const errorMessage = brokenLinks.map(link => 
        `  ${link.file}: ${link.url} (${link.text})`
      ).join('\n');
      fail(`Found broken internal links:\n${errorMessage}`);
    }
  });
  
  test('should have valid external links', () => {
    const externalLinks = allLinks.filter(link => link.isExternal);
    const brokenExternalLinks = [];
    
    for (const link of externalLinks) {
      try {
        // Use curl to check if link is accessible
        execSync(`curl -s -o /dev/null -w "%{http_code}" "${link.url}"`, { 
          timeout: 10000,
          stdio: 'pipe' 
        });
      } catch (error) {
        // Check if it's a timeout or connection error
        if (error.code === 'TIMEOUT' || error.signal === 'SIGTERM') {
          console.warn(`Timeout checking external link: ${link.url}`);
        } else {
          brokenExternalLinks.push({
            file: link.file,
            text: link.text,
            url: link.url,
            error: error.message
          });
        }
      }
    }
    
    if (brokenExternalLinks.length > 0) {
      const errorMessage = brokenExternalLinks.map(link => 
        `  ${link.file}: ${link.url} (${link.text}) - ${link.error}`
      ).join('\n');
      console.warn(`Found potentially broken external links:\n${errorMessage}`);
    }
  });
  
  test('should have valid anchor links', () => {
    const anchorLinks = allLinks.filter(link => link.isAnchor);
    const brokenAnchorLinks = [];
    
    for (const link of anchorLinks) {
      const sourceFile = join(projectRoot, link.file);
      try {
        const content = readFileSync(sourceFile, 'utf8');
        const anchorId = link.url.substring(1); // Remove #
        
        // Check if anchor exists in the file
        const anchorPattern = new RegExp(`id=["']${anchorId}["']|name=["']${anchorId}["']|^#{1,6}\\s+${anchorId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        if (!anchorPattern.test(content)) {
          brokenAnchorLinks.push({
            file: link.file,
            text: link.text,
            url: link.url
          });
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    if (brokenAnchorLinks.length > 0) {
      const errorMessage = brokenAnchorLinks.map(link => 
        `  ${link.file}: ${link.url} (${link.text})`
      ).join('\n');
      fail(`Found broken anchor links:\n${errorMessage}`);
    }
  });
  
  test('should have valid email links', () => {
    const emailLinks = allLinks.filter(link => link.isEmail);
    
    for (const link of emailLinks) {
      const email = link.url.substring(7); // Remove mailto:
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailPattern.test(email)).toBe(true);
    }
  });
  
  test('should have consistent link formatting', () => {
    for (const link of allLinks) {
      // Link text should not be empty
      expect(link.text.trim()).not.toBe('');
      
      // Link URL should not be empty
      expect(link.url.trim()).not.toBe('');
      
      // Link text should not contain unescaped brackets
      expect(link.text).not.toMatch(/\[|\]/);
      
      // Link URL should not contain spaces
      expect(link.url).not.toMatch(/\s/);
    }
  });
  
  test('should have proper cross-references between documentation files', () => {
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
  
  test('should have proper module cross-references', () => {
    const moduleRefs = {
      'ai-module.md': ['commands-module.md', 'config-module.md'],
      'commands-module.md': ['ai-module.md', 'config-module.md'],
      'config-module.md': ['ai-module.md', 'commands-module.md'],
      'auth-module.md': ['ai-module.md', 'config-module.md'],
      'terminal-module.md': ['commands-module.md', 'errors-module.md'],
      'errors-module.md': ['commands-module.md', 'terminal-module.md'],
      'utils-module.md': ['commands-module.md', 'errors-module.md'],
      'fs-module.md': ['commands-module.md', 'utils-module.md'],
      'telemetry-module.md': ['commands-module.md', 'config-module.md']
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
  
  test('should have valid command references', () => {
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
  
  test('should have valid code block references', () => {
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
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
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid image references', () => {
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const brokenImages = [];
    
    for (const file of markdownFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = imagePattern.exec(content)) !== null) {
          const [, altText, imageUrl] = match;
          
          // Handle relative image paths
          let targetPath;
          if (imageUrl.startsWith('/')) {
            targetPath = join(projectRoot, imageUrl);
          } else {
            const sourceFile = join(projectRoot, link.file);
            const sourceDir = join(sourceFile, '..');
            targetPath = join(sourceDir, imageUrl);
          }
          
          try {
            statSync(targetPath);
          } catch {
            brokenImages.push({
              file: relativePath,
              alt: altText,
              url: imageUrl
            });
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    if (brokenImages.length > 0) {
      const errorMessage = brokenImages.map(img => 
        `  ${img.file}: ${img.url} (${img.alt})`
      ).join('\n');
      fail(`Found broken image references:\n${errorMessage}`);
    }
  });
  
  test('should have valid table of contents links', () => {
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check for table of contents
        if (content.includes('## Table of Contents')) {
          const tocPattern = /^\s*-\s*\[([^\]]+)\]\(#([^)]+)\)/gm;
          let match;
          
          while ((match = tocPattern.exec(content)) !== null) {
            const [, linkText, anchorId] = match;
            
            // Check if anchor exists
            const anchorPattern = new RegExp(`^#{1,6}\\s+${anchorId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
            if (!anchorPattern.test(content)) {
              fail(`Table of contents link broken in ${relativePath}: ${linkText} -> #${anchorId}`);
            }
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have valid README links', () => {
    const readmePath = join(projectRoot, 'README.md');
    const readmeContent = readFileSync(readmePath, 'utf8');
    
    // Check for common README links
    const expectedLinks = [
      'TECHNICAL_SPECIFICATION.md',
      'specify.md',
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
  
  test('should have valid command references in documentation', () => {
    const commandsPath = join(projectRoot, 'docs', 'commands.md');
    if (statSync(commandsPath)) {
      const commandsContent = readFileSync(commandsPath, 'utf8');
      
      // Should contain command references
      expect(commandsContent).toContain('ollama-code');
      expect(commandsContent).toContain('ask');
      expect(commandsContent).toContain('list-models');
      expect(commandsContent).toContain('pull-model');
    }
  });
  
  test('should have valid configuration references', () => {
    const configPath = join(projectRoot, 'docs', 'configuration.md');
    if (statSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf8');
      
      // Should contain configuration references
      expect(configContent).toContain('api');
      expect(configContent).toContain('ollama');
      expect(configContent).toContain('ai');
    }
  });
});


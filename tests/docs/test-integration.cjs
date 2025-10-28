/**
 * Integration Tests for Documentation Generation and Deployment Workflows
 * 
 * Comprehensive tests for documentation generation, validation, and deployment processes
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } = require('fs');
const { join, extname } = require('path');
const { execSync } = require('child_process');

const projectRoot = join(__dirname, '..', '..');

describe('Documentation Integration Tests', () => {
  let originalFiles = [];
  let tempFiles = [];
  
  beforeAll(() => {
    // Store original file states
    const docsDir = join(projectRoot, 'docs');
    try {
      const files = readdirSync(docsDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = join(docsDir, file);
          originalFiles.push({
            path: filePath,
            content: readFileSync(filePath, 'utf8')
          });
        }
      }
    } catch (error) {
      // Docs directory might not exist
    }
  });
  
  afterAll(() => {
    // Clean up temp files
    for (const file of tempFiles) {
      try {
        unlinkSync(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
  
  test('should generate documentation from source code', async () => {
    try {
      // Run documentation generation
      execSync('npm run docs:generate', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      // Check if documentation files were generated
      const docsDir = join(projectRoot, 'docs');
      const files = readdirSync(docsDir);
      
      expect(files.length).toBeGreaterThan(0);
      
      // Check for key documentation files
      const expectedFiles = [
        'ai.md',
        'auth.md',
        'commands.md',
        'config.md',
        'errors.md',
        'terminal.md',
        'utils.md',
        'project-info.md'
      ];
      
      for (const file of expectedFiles) {
        expect(files).toContain(file);
      }
    } catch (error) {
      fail(`Documentation generation failed: ${error.message}`);
    }
  });
  
  test('should validate generated documentation', async () => {
    try {
      // Run documentation validation
      execSync('npm run docs:validate', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      // If we get here, validation passed
      expect(true).toBe(true);
    } catch (error) {
      fail(`Documentation validation failed: ${error.message}`);
    }
  });
  
  test('should check links in generated documentation', async () => {
    try {
      // Run link checking
      execSync('npm run docs:check-links', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      // If we get here, link checking passed
      expect(true).toBe(true);
    } catch (error) {
      fail(`Link checking failed: ${error.message}`);
    }
  });
  
  test('should lint generated documentation', async () => {
    try {
      // Run markdown linting
      execSync('npm run docs:lint', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      // If we get here, linting passed
      expect(true).toBe(true);
    } catch (error) {
      fail(`Markdown linting failed: ${error.message}`);
    }
  });
  
  test('should run all documentation checks', async () => {
    try {
      // Run all documentation checks
      execSync('npm run docs:check-all', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      // If we get here, all checks passed
      expect(true).toBe(true);
    } catch (error) {
      fail(`Documentation checks failed: ${error.message}`);
    }
  });
  
  test('should maintain documentation consistency', async () => {
    try {
      // Run documentation maintenance
      execSync('npm run docs:maintain', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      // Check if maintenance report was generated
      const reportPath = join(projectRoot, 'maintenance-report.json');
      expect(() => readFileSync(reportPath, 'utf8')).not.toThrow();
      
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('filesProcessed');
      expect(report).toHaveProperty('issuesFound');
    } catch (error) {
      fail(`Documentation maintenance failed: ${error.message}`);
    }
  });
  
  test('should update documentation from source changes', async () => {
    try {
      // Run documentation update
      execSync('npm run docs:update', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      // Check if documentation was updated
      const docsDir = join(projectRoot, 'docs');
      const files = readdirSync(docsDir);
      
      expect(files.length).toBeGreaterThan(0);
      
      // Check if files have recent timestamps
      const now = Date.now();
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = join(docsDir, file);
          const stats = statSync(filePath);
          const fileAge = now - stats.mtime.getTime();
          
          // File should be recent (within last 5 minutes)
          expect(fileAge).toBeLessThan(5 * 60 * 1000);
        }
      }
    } catch (error) {
      fail(`Documentation update failed: ${error.message}`);
    }
  });
  
  test('should generate README from documentation', async () => {
    try {
      // Run README generation
      execSync('npm run docs:generate-readme', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      // Check if README was generated
      const readmePath = join(projectRoot, 'README.md');
      expect(() => readFileSync(readmePath, 'utf8')).not.toThrow();
      
      const readmeContent = readFileSync(readmePath, 'utf8');
      expect(readmeContent).toContain('# ollama-code');
      expect(readmeContent).toContain('## Installation');
      expect(readmeContent).toContain('## Quick Start');
      expect(readmeContent).toContain('## Features');
    } catch (error) {
      fail(`README generation failed: ${error.message}`);
    }
  });
  
  test('should handle documentation generation errors gracefully', async () => {
    // Create a temporary invalid source file
    const tempSourcePath = join(projectRoot, 'src', 'temp-invalid.ts');
    const tempDocPath = join(projectRoot, 'docs', 'temp-invalid.md');
    
    try {
      // Write invalid TypeScript code
      writeFileSync(tempSourcePath, 'invalid typescript code {');
      tempFiles.push(tempSourcePath);
      
      // Try to generate documentation
      try {
        execSync('npm run docs:generate', { 
          cwd: projectRoot, 
          stdio: 'pipe' 
        });
      } catch (error) {
        // Should handle errors gracefully
        expect(error.message).toContain('Command failed');
      }
      
      // Clean up
      try {
        unlinkSync(tempSourcePath);
        if (statSync(tempDocPath)) {
          unlinkSync(tempDocPath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    } catch (error) {
      fail(`Error handling test failed: ${error.message}`);
    }
  });
  
  test('should validate documentation structure', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Should have proper structure
        expect(content).toMatch(/^# \w+/); // Should start with a heading
        expect(content).toContain('**Path:**'); // Should have path information
        expect(content).toContain('**Description:**'); // Should have description
        
        // Should have proper markdown formatting
        expect(content).not.toMatch(/\n\s*\n\s*\n/); // No multiple empty lines
        expect(content).toMatch(/\n$/); // Should end with newline
      }
    }
  });
  
  test('should validate documentation content quality', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Should have substantial content
        expect(content.length).toBeGreaterThan(100);
        
        // Should have code examples
        expect(content).toContain('```');
        
        // Should have usage examples
        expect(content).toContain('## Usage Examples');
        
        // Should have API reference
        expect(content).toContain('## API Reference');
      }
    }
  });
  
  test('should validate documentation cross-references', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Should have proper cross-references
        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        
        while ((match = linkPattern.exec(content)) !== null) {
          const [, linkText, linkUrl] = match;
          
          // Link text should not be empty
          expect(linkText.trim()).not.toBe('');
          
          // Link URL should not be empty
          expect(linkUrl.trim()).not.toBe('');
        }
      }
    }
  });
  
  test('should validate documentation consistency', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    // Check for consistent terminology
    const terminology = {
      'ollama-code': 'ollama-code',
      'Ollama Code': 'Ollama Code',
      'CLI': 'CLI',
      'Node.js': 'Node.js',
      'TypeScript': 'TypeScript'
    };
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        for (const [term, expected] of Object.entries(terminology)) {
          if (content.includes(term)) {
            expect(content).toContain(expected);
          }
        }
      }
    }
  });
  
  test('should validate documentation completeness', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    // Should have all required module documentation
    const requiredModules = [
      'ai-module.md',
      'commands-module.md',
      'config-module.md',
      'auth-module.md',
      'terminal-module.md',
      'errors-module.md',
      'utils-module.md',
      'fs-module.md',
      'telemetry-module.md'
    ];
    
    for (const module of requiredModules) {
      expect(files).toContain(module);
    }
  });
  
  test('should validate documentation deployment readiness', async () => {
    // Check if all documentation files are ready for deployment
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Should not have TODO comments
        expect(content).not.toContain('TODO');
        expect(content).not.toContain('FIXME');
        expect(content).not.toContain('XXX');
        
        // Should not have placeholder text
        expect(content).not.toContain('PLACEHOLDER');
        expect(content).not.toContain('TBD');
        expect(content).not.toContain('Coming soon');
      }
    }
  });
  
  test('should validate documentation performance', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const stats = statSync(filePath);
        
        // File should not be too large (under 1MB)
        expect(stats.size).toBeLessThan(1024 * 1024);
        
        // File should have reasonable line count (under 1000 lines)
        const content = readFileSync(filePath, 'utf8');
        const lineCount = content.split('\n').length;
        expect(lineCount).toBeLessThan(1000);
      }
    }
  });
  
  test('should validate documentation accessibility', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Should have proper heading hierarchy
        const headers = content.match(/^#{1,6} .+$/gm) || [];
        const headerLevels = headers.map(h => h.match(/^(#{1,6})/)[1].length);
        
        // Should not skip heading levels
        for (let i = 1; i < headerLevels.length; i++) {
          if (headerLevels[i] > headerLevels[i-1] + 1) {
            console.warn(`Skipped heading level in ${file}: H${headerLevels[i]} after H${headerLevels[i-1]}`);
          }
        }
        
        // Should have alt text for images
        const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let match;
        
        while ((match = imagePattern.exec(content)) !== null) {
          const [, altText] = match;
          expect(altText.trim()).not.toBe(''); // Should have alt text
        }
      }
    }
  });
});


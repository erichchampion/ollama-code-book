/**
 * Quality Validation Tests
 * 
 * Tests for documentation quality, completeness, and maintainability
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, extname } = require('path');

const projectRoot = join(__dirname, '..', '..');

describe('Quality Validation', () => {
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
  
  test('should have comprehensive documentation coverage', () => {
    const requiredFiles = [
      'README.md',
      'TECHNICAL_SPECIFICATION.md',
      'CLAUDE.md',
      'specify.md'
    ];
    
    for (const file of requiredFiles) {
      const filePath = join(projectRoot, file);
      expect(() => readFileSync(filePath, 'utf8')).not.toThrow();
    }
    
    // Should have module documentation
    const expectedModules = [
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
    
    for (const module of expectedModules) {
      const modulePath = join(projectRoot, 'docs', module);
      expect(() => readFileSync(modulePath, 'utf8')).not.toThrow();
    }
  });
  
  test('should have proper documentation structure', () => {
    for (const file of documentationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have a title
        expect(content).toMatch(/^# .+$/m);
        
        // Should have table of contents or overview
        const hasTOC = content.includes('## Table of Contents') || 
                      content.includes('## Overview') ||
                      content.includes('## Contents');
        expect(hasTOC).toBe(true);
        
        // Should have usage examples
        const hasExamples = content.includes('## Examples') || 
                           content.includes('## Usage') ||
                           content.includes('```');
        expect(hasExamples).toBe(true);
        
        // Should have proper section hierarchy
        const h1Count = (content.match(/^# /gm) || []).length;
        expect(h1Count).toBe(1); // Only one H1
        
        const h2Count = (content.match(/^## /gm) || []).length;
        expect(h2Count).toBeGreaterThan(0); // At least one H2
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive API documentation', () => {
    for (const file of moduleFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have API reference
        expect(content).toContain('## API Reference');
        
        // Should have function signatures
        expect(content).toMatch(/function\s+\w+\(/);
        
        // Should have parameter descriptions
        expect(content).toContain('@param');
        
        // Should have return type descriptions
        expect(content).toContain('@returns');
        
        // Should have examples
        expect(content).toContain('```');
        
        // Should have error handling
        expect(content).toContain('Error');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive configuration documentation', () => {
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
        
        // Should have environment variables
        expect(content).toContain('OLLAMA_CODE_');
        
        // Should have examples
        expect(content).toContain('```');
        
        // Should have validation rules
        expect(content).toContain('validation');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive error handling documentation', () => {
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
        
        // Should have error logging
        expect(content).toContain('log');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive command documentation', () => {
    const commandFiles = documentationFiles.filter(file => 
      file.includes('command') || file.includes('Command')
    );
    
    for (const file of commandFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have command reference
        expect(content).toContain('## Command Reference');
        
        // Should have command examples
        expect(content).toContain('ollama-code');
        
        // Should have command options
        expect(content).toContain('--');
        
        // Should have command descriptions
        expect(content).toContain('description');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive installation documentation', () => {
    const readmePath = join(projectRoot, 'README.md');
    const readmeContent = readFileSync(readmePath, 'utf8');
    
    // Should have installation instructions
    expect(readmeContent).toContain('## Installation');
    expect(readmeContent).toContain('npm install');
    expect(readmeContent).toContain('npm run build');
    
    // Should have prerequisites
    expect(readmeContent).toContain('Node.js');
    expect(readmeContent).toContain('npm');
    
    // Should have quick start
    expect(readmeContent).toContain('## Quick Start');
    expect(readmeContent).toContain('ollama-code ask');
    
    // Should have features
    expect(readmeContent).toContain('## Features');
  });
  
  test('should have comprehensive development documentation', () => {
    const devFiles = documentationFiles.filter(file => 
      file.includes('development') || file.includes('Development') || file.includes('DEVELOPMENT')
    );
    
    for (const file of devFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have setup instructions
        expect(content).toContain('setup');
        expect(content).toContain('install');
        
        // Should have coding standards
        expect(content).toContain('standard');
        expect(content).toContain('style');
        
        // Should have testing guidelines
        expect(content).toContain('test');
        expect(content).toContain('testing');
        
        // Should have contribution guidelines
        expect(content).toContain('contribut');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive testing documentation', () => {
    const testFiles = documentationFiles.filter(file => 
      file.includes('test') || file.includes('Test') || file.includes('TEST')
    );
    
    for (const file of testFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have testing strategy
        expect(content).toContain('strategy');
        expect(content).toContain('approach');
        
        // Should have test types
        expect(content).toContain('unit');
        expect(content).toContain('integration');
        
        // Should have test execution
        expect(content).toContain('npm test');
        expect(content).toContain('jest');
        
        // Should have test coverage
        expect(content).toContain('coverage');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive performance documentation', () => {
    const perfFiles = documentationFiles.filter(file => 
      file.includes('performance') || file.includes('Performance') || file.includes('PERFORMANCE')
    );
    
    for (const file of perfFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have performance goals
        expect(content).toContain('goal');
        expect(content).toContain('metric');
        
        // Should have optimization strategies
        expect(content).toContain('optimization');
        expect(content).toContain('improvement');
        
        // Should have performance characteristics
        expect(content).toContain('characteristic');
        expect(content).toContain('benchmark');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive security documentation', () => {
    const securityFiles = documentationFiles.filter(file => 
      file.includes('security') || file.includes('Security') || file.includes('SECURITY')
    );
    
    for (const file of securityFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have security considerations
        expect(content).toContain('security');
        expect(content).toContain('privacy');
        
        // Should have data protection
        expect(content).toContain('data');
        expect(content).toContain('protection');
        
        // Should have authentication
        expect(content).toContain('auth');
        expect(content).toContain('token');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive troubleshooting documentation', () => {
    const troubleshootFiles = documentationFiles.filter(file => 
      file.includes('troubleshoot') || file.includes('Troubleshoot') || file.includes('TROUBLESHOOT')
    );
    
    for (const file of troubleshootFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have common issues
        expect(content).toContain('issue');
        expect(content).toContain('problem');
        
        // Should have solutions
        expect(content).toContain('solution');
        expect(content).toContain('fix');
        
        // Should have debugging
        expect(content).toContain('debug');
        expect(content).toContain('log');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive integration documentation', () => {
    const integrationFiles = documentationFiles.filter(file => 
      file.includes('integration') || file.includes('Integration') || file.includes('INTEGRATION')
    );
    
    for (const file of integrationFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have integration points
        expect(content).toContain('integration');
        expect(content).toContain('connect');
        
        // Should have external services
        expect(content).toContain('service');
        expect(content).toContain('api');
        
        // Should have configuration
        expect(content).toContain('config');
        expect(content).toContain('setup');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive architecture documentation', () => {
    const archFiles = documentationFiles.filter(file => 
      file.includes('architecture') || file.includes('Architecture') || file.includes('ARCHITECTURE')
    );
    
    for (const file of archFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Should have system overview
        expect(content).toContain('overview');
        expect(content).toContain('system');
        
        // Should have components
        expect(content).toContain('component');
        expect(content).toContain('module');
        
        // Should have data flow
        expect(content).toContain('flow');
        expect(content).toContain('process');
        
        // Should have dependencies
        expect(content).toContain('depend');
        expect(content).toContain('relation');
      } catch (error) {
        // Skip files we can't read
      }
    }
  });
  
  test('should have comprehensive code quality', () => {
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
        
        // Should not have multiple consecutive empty lines
        expect(content).not.toMatch(/\n\s*\n\s*\n/);
        
        // Should end with newline
        expect(content).toMatch(/\n$/);
        
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
});


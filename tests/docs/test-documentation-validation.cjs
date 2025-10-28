/**
 * Documentation Validation Tests
 * 
 * Tests for documentation validation functionality
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const { execSync } = require('child_process');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, extname } = require('path');

const projectRoot = join(__dirname, '..', '..');

describe('Documentation Validation', () => {
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
  
  test('should have markdown files to validate', () => {
    expect(markdownFiles.length).toBeGreaterThan(0);
  });
  
  test('should pass markdown linting', () => {
    try {
      execSync('npm run docs:lint', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
    } catch (error) {
      fail(`Markdown linting failed: ${error.stdout || error.stderr}`);
    }
  });
  
  test('should pass documentation validation', () => {
    try {
      execSync('npm run docs:validate', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
    } catch (error) {
      fail(`Documentation validation failed: ${error.stdout || error.stderr}`);
    }
  });
  
  test('should have valid README.md', () => {
    const readmePath = join(projectRoot, 'README.md');
    expect(() => readFileSync(readmePath, 'utf8')).not.toThrow();
    
    const readmeContent = readFileSync(readmePath, 'utf8');
    expect(readmeContent).toContain('# ollama-code');
    expect(readmeContent).toContain('## Installation');
    expect(readmeContent).toContain('## Quick Start');
    expect(readmeContent).toContain('## Features');
  });
  
  test('should have valid TECHNICAL_SPECIFICATION.md', () => {
    const specPath = join(projectRoot, 'TECHNICAL_SPECIFICATION.md');
    expect(() => readFileSync(specPath, 'utf8')).not.toThrow();
    
    const specContent = readFileSync(specPath, 'utf8');
    expect(specContent).toContain('# Ollama Code: Technical Stack Specification');
    expect(specContent).toContain('## 1. Architecture Foundation');
  });
  
  test('should have valid CLAUDE.md', () => {
    const claudePath = join(projectRoot, 'CLAUDE.md');
    expect(() => readFileSync(claudePath, 'utf8')).not.toThrow();
    
    const claudeContent = readFileSync(claudePath, 'utf8');
    expect(claudeContent).toContain('# CLAUDE.md');
    expect(claudeContent).toContain('## Project Overview');
  });
  
  test('should have valid specify.md', () => {
    const specPath = join(projectRoot, 'specify.md');
    expect(() => readFileSync(specPath, 'utf8')).not.toThrow();
    
    const specContent = readFileSync(specPath, 'utf8');
    expect(specContent).toContain('# Ollama Code CLI Specification');
    expect(specContent).toContain('## Overview');
  });
  
  test('should have generated documentation files', () => {
    const docsDir = join(projectRoot, 'docs');
    expect(() => readdirSync(docsDir)).not.toThrow();
    
    const docFiles = readdirSync(docsDir);
    expect(docFiles.length).toBeGreaterThan(0);
    
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
      expect(docFiles).toContain(file);
    }
  });
  
  test('should have valid module documentation', () => {
    const docsDir = join(projectRoot, 'docs');
    const docFiles = readdirSync(docsDir);
    
    for (const file of docFiles) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Each module doc should have a title and description
        expect(content).toMatch(/^# \w+ Module/);
        expect(content).toContain('**Path:**');
        expect(content).toContain('**Description:**');
      }
    }
  });
  
  test('should have valid command documentation', () => {
    const commandsPath = join(projectRoot, 'docs', 'commands.md');
    expect(() => readFileSync(commandsPath, 'utf8')).not.toThrow();
    
    const commandsContent = readFileSync(commandsPath, 'utf8');
    expect(commandsContent).toContain('# commands Module');
    expect(commandsContent).toContain('## Command Reference');
  });
  
  test('should have valid configuration documentation', () => {
    const configPath = join(projectRoot, 'docs', 'configuration.md');
    expect(() => readFileSync(configPath, 'utf8')).not.toThrow();
    
    const configContent = readFileSync(configPath, 'utf8');
    expect(configContent).toContain('# configuration Module');
    expect(configContent).toContain('## Configuration Reference');
  });
});

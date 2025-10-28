#!/usr/bin/env node
/**
 * Documentation Validation Script
 * 
 * Validates all markdown documentation files for:
 * - Markdown syntax errors
 * - Broken internal links
 * - Broken external links
 * - Code example syntax
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];
const EXCLUDE_DIRS = ['node_modules', 'dist', '.git', '.specify', '.cursor', '.claude'];
const EXCLUDE_FILES = ['package-lock.json', 'yarn.lock'];

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Get all markdown files in the project
 */
function getMarkdownFiles(dir, files = []) {
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(item)) {
          getMarkdownFiles(fullPath, files);
        }
      } else if (stat.isFile()) {
        const ext = extname(item);
        if (MARKDOWN_EXTENSIONS.includes(ext) && !EXCLUDE_FILES.includes(item)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    logWarning(`Could not read directory ${dir}: ${error.message}`);
  }
  
  return files;
}

/**
 * Validate markdown syntax using markdownlint
 */
function validateMarkdownSyntax(files) {
  logInfo('Validating markdown syntax...');
  
  try {
    const result = execSync(`npx markdownlint ${files.join(' ')} --config .markdownlint.json`, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    logSuccess('Markdown syntax validation passed');
    return { success: true, errors: [] };
  } catch (error) {
    const errors = error.stdout || error.stderr || '';
    logError('Markdown syntax validation failed');
    console.log(errors);
    return { success: false, errors: errors.split('\n').filter(line => line.trim()) };
  }
}

/**
 * Check for broken internal links
 */
function validateInternalLinks(files) {
  logInfo('Validating internal links...');
  
  const errors = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  for (const file of files) {
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
          errors.push({
            file: relativePath,
            link: linkText,
            url: linkUrl,
            message: `Broken internal link: ${linkUrl}`
          });
        }
      }
    } catch (error) {
      logWarning(`Could not read file ${file}: ${error.message}`);
    }
  }
  
  if (errors.length === 0) {
    logSuccess('Internal link validation passed');
  } else {
    logError(`Found ${errors.length} broken internal links`);
    errors.forEach(error => {
      console.log(`  ${error.file}: ${error.message}`);
    });
  }
  
  return { success: errors.length === 0, errors };
}

/**
 * Check for broken external links
 */
function validateExternalLinks(files) {
  logInfo('Validating external links...');
  
  const errors = [];
  const httpPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      const relativePath = file.replace(projectRoot, '');
      
      let match;
      while ((match = httpPattern.exec(content)) !== null) {
        const [, linkText, linkUrl] = match;
        
        try {
          // Use curl to check if link is accessible
          execSync(`curl -s -o /dev/null -w "%{http_code}" "${linkUrl}"`, {
            timeout: 10000,
            stdio: 'pipe'
          });
        } catch (error) {
          errors.push({
            file: relativePath,
            link: linkText,
            url: linkUrl,
            message: `Broken external link: ${linkUrl}`
          });
        }
      }
    } catch (error) {
      logWarning(`Could not read file ${file}: ${error.message}`);
    }
  }
  
  if (errors.length === 0) {
    logSuccess('External link validation passed');
  } else {
    logError(`Found ${errors.length} broken external links`);
    errors.forEach(error => {
      console.log(`  ${error.file}: ${error.message}`);
    });
  }
  
  return { success: errors.length === 0, errors };
}

/**
 * Validate code examples in markdown files
 */
function validateCodeExamples(files) {
  logInfo('Validating code examples...');
  
  const errors = [];
  const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      const relativePath = file.replace(projectRoot, '');
      
      let match;
      while ((match = codeBlockPattern.exec(content)) !== null) {
        const [, language, code] = match;
        
        if (language && language.toLowerCase() === 'bash') {
          // Basic bash syntax validation
          if (code.includes('&&') && code.includes('||')) {
            // Check for common bash syntax issues
            const lines = code.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line && !line.startsWith('#') && !line.startsWith('echo')) {
                // Basic validation - could be enhanced
                if (line.includes('&&') && line.includes('||')) {
                  errors.push({
                    file: relativePath,
                    line: i + 1,
                    message: `Potential bash syntax issue: ${line}`
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      logWarning(`Could not read file ${file}: ${error.message}`);
    }
  }
  
  if (errors.length === 0) {
    logSuccess('Code example validation passed');
  } else {
    logError(`Found ${errors.length} potential code issues`);
    errors.forEach(error => {
      console.log(`  ${error.file}:${error.line}: ${error.message}`);
    });
  }
  
  return { success: errors.length === 0, errors };
}

/**
 * Main validation function
 */
async function main() {
  log(`${colors.bold}Documentation Validation${colors.reset}`);
  log('='.repeat(50));
  
  // Get all markdown files
  const markdownFiles = getMarkdownFiles(projectRoot);
  logInfo(`Found ${markdownFiles.length} markdown files to validate`);
  
  if (markdownFiles.length === 0) {
    logWarning('No markdown files found');
    process.exit(0);
  }
  
  // Run all validations
  const results = {
    markdown: validateMarkdownSyntax(markdownFiles),
    internalLinks: validateInternalLinks(markdownFiles),
    externalLinks: validateExternalLinks(markdownFiles),
    codeExamples: validateCodeExamples(markdownFiles)
  };
  
  // Summary
  log('\n' + '='.repeat(50));
  log(`${colors.bold}Validation Summary${colors.reset}`);
  
  const allPassed = Object.values(results).every(result => result.success);
  
  if (allPassed) {
    logSuccess('All documentation validation checks passed!');
    process.exit(0);
  } else {
    logError('Some documentation validation checks failed');
    process.exit(1);
  }
}

// Run the validation
main().catch(error => {
  logError(`Validation failed: ${error.message}`);
  process.exit(1);
});

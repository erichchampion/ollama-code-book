#!/usr/bin/env node
/**
 * Documentation Maintenance Script
 * 
 * Performs routine maintenance tasks on documentation:
 * - Updates generated documentation
 * - Validates all documentation
 * - Checks for outdated content
 * - Updates cross-references
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

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
 * Update generated documentation
 */
async function updateGeneratedDocs() {
  logInfo('Updating generated documentation...');
  
  try {
    execSync('npm run docs:generate-all', { 
      cwd: projectRoot, 
      stdio: 'pipe' 
    });
    logSuccess('Generated documentation updated');
    return true;
  } catch (error) {
    logError(`Failed to update generated documentation: ${error.message}`);
    return false;
  }
}

/**
 * Validate all documentation
 */
async function validateDocs() {
  logInfo('Validating all documentation...');
  
  try {
    execSync('npm run docs:check-all', { 
      cwd: projectRoot, 
      stdio: 'pipe' 
    });
    logSuccess('Documentation validation passed');
    return true;
  } catch (error) {
    logError(`Documentation validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Check for outdated content
 */
async function checkOutdatedContent() {
  logInfo('Checking for outdated content...');
  
  const outdatedFiles = [];
  const docsDir = join(projectRoot, 'docs');
  
  try {
    const docFiles = readdirSync(docsDir);
    
    for (const file of docFiles) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const stats = statSync(filePath);
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (ageInDays > 30) {
          outdatedFiles.push({
            file: file,
            age: Math.round(ageInDays),
            lastModified: stats.mtime.toISOString().split('T')[0]
          });
        }
      }
    }
    
    if (outdatedFiles.length > 0) {
      logWarning(`Found ${outdatedFiles.length} potentially outdated files:`);
      outdatedFiles.forEach(item => {
        console.log(`  ${item.file} (${item.age} days old, last modified: ${item.lastModified})`);
      });
    } else {
      logSuccess('No outdated content found');
    }
    
    return outdatedFiles.length === 0;
  } catch (error) {
    logWarning(`Could not check for outdated content: ${error.message}`);
    return true;
  }
}

/**
 * Update cross-references
 */
async function updateCrossReferences() {
  logInfo('Updating cross-references...');
  
  try {
    // Read README.md
    const readmePath = join(projectRoot, 'README.md');
    let readmeContent = readFileSync(readmePath, 'utf8');
    
    // Update documentation links
    const docLinks = [
      'TECHNICAL_SPECIFICATION.md',
      'specify.md',
      'CODEBASE_ANALYSIS.md',
      'CLAUDE.md',
      'LICENSE.md'
    ];
    
    let updated = false;
    for (const link of docLinks) {
      const linkPath = join(projectRoot, link);
      if (statSync(linkPath)) {
        const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${link}\\)`, 'g');
        if (linkPattern.test(readmeContent)) {
          // Link exists, check if it's up to date
          const stats = statSync(linkPath);
          const lastModified = stats.mtime.toISOString().split('T')[0];
          
          // Add last modified date to link if not present
          const updatedLink = `[\\1](${link}) (last updated: ${lastModified})`;
          const newContent = readmeContent.replace(linkPattern, updatedLink);
          if (newContent !== readmeContent) {
            readmeContent = newContent;
            updated = true;
          }
        }
      }
    }
    
    if (updated) {
      writeFileSync(readmePath, readmeContent);
      logSuccess('Cross-references updated');
    } else {
      logSuccess('Cross-references are up to date');
    }
    
    return true;
  } catch (error) {
    logWarning(`Could not update cross-references: ${error.message}`);
    return true;
  }
}

/**
 * Check documentation consistency
 */
async function checkConsistency() {
  logInfo('Checking documentation consistency...');
  
  const issues = [];
  
  try {
    // Check if all modules have documentation
    const srcDir = join(projectRoot, 'src');
    const docsDir = join(projectRoot, 'docs');
    
    const moduleDirs = readdirSync(srcDir).filter(item => {
      const fullPath = join(srcDir, item);
      return statSync(fullPath).isDirectory();
    });
    
    const docFiles = readdirSync(docsDir).filter(item => item.endsWith('.md'));
    
    for (const module of moduleDirs) {
      const expectedDoc = `${module}.md`;
      if (!docFiles.includes(expectedDoc)) {
        issues.push(`Missing documentation for module: ${module}`);
      }
    }
    
    // Check if all documentation files have proper structure
    for (const docFile of docFiles) {
      const filePath = join(docsDir, docFile);
      const content = readFileSync(filePath, 'utf8');
      
      if (!content.includes('# ')) {
        issues.push(`Documentation file ${docFile} missing title`);
      }
      
      if (!content.includes('**Path:**')) {
        issues.push(`Documentation file ${docFile} missing path information`);
      }
      
      if (!content.includes('**Description:**')) {
        issues.push(`Documentation file ${docFile} missing description`);
      }
    }
    
    if (issues.length > 0) {
      logWarning(`Found ${issues.length} consistency issues:`);
      issues.forEach(issue => {
        console.log(`  ${issue}`);
      });
    } else {
      logSuccess('Documentation consistency check passed');
    }
    
    return issues.length === 0;
  } catch (error) {
    logWarning(`Could not check consistency: ${error.message}`);
    return true;
  }
}

/**
 * Generate maintenance report
 */
async function generateReport(results) {
  logInfo('Generating maintenance report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    results: results,
    summary: {
      total: Object.keys(results).length,
      passed: Object.values(results).filter(r => r === true).length,
      failed: Object.values(results).filter(r => r === false).length
    }
  };
  
  const reportPath = join(projectRoot, 'docs', 'maintenance-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logSuccess(`Maintenance report generated: ${reportPath}`);
  
  // Display summary
  log('\n' + '='.repeat(50));
  log(`${colors.bold}Maintenance Summary${colors.reset}`);
  log(`Total tasks: ${report.summary.total}`);
  log(`Passed: ${report.summary.passed}`);
  log(`Failed: ${report.summary.failed}`);
  
  if (report.summary.failed > 0) {
    logError('Some maintenance tasks failed');
    process.exit(1);
  } else {
    logSuccess('All maintenance tasks completed successfully');
  }
}

/**
 * Main maintenance function
 */
async function main() {
  log(`${colors.bold}Documentation Maintenance${colors.reset}`);
  log('='.repeat(50));
  
  const results = {};
  
  // Run all maintenance tasks
  results.updateGeneratedDocs = await updateGeneratedDocs();
  results.validateDocs = await validateDocs();
  results.checkOutdatedContent = await checkOutdatedContent();
  results.updateCrossReferences = await updateCrossReferences();
  results.checkConsistency = await checkConsistency();
  
  // Generate report
  await generateReport(results);
}

// Run the maintenance
main().catch(error => {
  logError(`Maintenance failed: ${error.message}`);
  process.exit(1);
});

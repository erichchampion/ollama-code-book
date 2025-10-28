#!/usr/bin/env node

/**
 * Documentation Testing for CI/CD
 * 
 * Comprehensive documentation testing script for continuous integration
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Test configuration
const TEST_CONFIG = {
  timeout: 300000, // 5 minutes
  retries: 3,
  parallel: true,
  verbose: true,
  output: {
    format: 'json',
    file: 'docs/ci-test-results.json'
  }
};

// Test results tracking
const testResults = {
  timestamp: new Date().toISOString(),
  environment: process.env.CI ? 'ci' : 'local',
  nodeVersion: process.version,
  platform: process.platform,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  }
};

// Test runner class
class DocumentationTestRunner {
  constructor(config = TEST_CONFIG) {
    this.config = config;
    this.startTime = Date.now();
  }

  // Run all documentation tests
  async runAllTests() {
    console.log('🚀 Starting comprehensive documentation testing...');
    
    const tests = [
      { name: 'Markdown Validation', fn: () => this.runMarkdownValidation() },
      { name: 'Link Validation', fn: () => this.runLinkValidation() },
      { name: 'Code Example Verification', fn: () => this.runCodeExampleVerification() },
      { name: 'Documentation Structure', fn: () => this.runStructureValidation() },
      { name: 'Content Quality', fn: () => this.runContentQualityTests() },
      { name: 'Consistency Checks', fn: () => this.runConsistencyChecks() },
      { name: 'Performance Tests', fn: () => this.runPerformanceTests() },
      { name: 'Integration Tests', fn: () => this.runIntegrationTests() }
    ];

    // Run tests in parallel if configured
    if (this.config.parallel) {
      await Promise.all(tests.map(test => this.runTest(test)));
    } else {
      for (const test of tests) {
        await this.runTest(test);
      }
    }

    // Generate final report
    this.generateReport();
    
    console.log('✅ Documentation testing completed');
    return testResults.summary.failed === 0;
  }

  // Run individual test
  async runTest(test) {
    const startTime = Date.now();
    let result = { name: test.name, status: 'pending', duration: 0, error: null };
    
    try {
      console.log(`  🔍 Running ${test.name}...`);
      await test.fn();
      result.status = 'passed';
      testResults.summary.passed++;
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      testResults.summary.failed++;
      console.log(`    ❌ ${test.name} failed: ${error.message}`);
    }
    
    result.duration = Date.now() - startTime;
    testResults.tests.push(result);
    testResults.summary.total++;
  }

  // Markdown validation
  async runMarkdownValidation() {
    try {
      execSync('npm run docs:lint', { 
        cwd: projectRoot,
        timeout: this.config.timeout,
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Markdown linting failed: ${error.message}`);
    }
  }

  // Link validation
  async runLinkValidation() {
    try {
      execSync('npm run docs:check-links', { 
        cwd: projectRoot,
        timeout: this.config.timeout,
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Link checking failed: ${error.message}`);
    }
  }

  // Code example verification
  async runCodeExampleVerification() {
    try {
      execSync('npm run docs:verify-examples', { 
        cwd: projectRoot,
        timeout: this.config.timeout,
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Code example verification failed: ${error.message}`);
    }
  }

  // Documentation structure validation
  async runStructureValidation() {
    const requiredFiles = [
      'README.md',
      'TECHNICAL_SPECIFICATION.md',
      'ARCHITECTURE.md',
      'DEVELOPMENT.md',
      'docs/API_REFERENCE.md',
      'docs/CONFIGURATION.md'
    ];

    const missingFiles = requiredFiles.filter(file => !existsSync(join(projectRoot, file)));
    
    if (missingFiles.length > 0) {
      throw new Error(`Missing required documentation files: ${missingFiles.join(', ')}`);
    }

    // Check for proper structure in each file
    for (const file of requiredFiles) {
      const content = readFileSync(join(projectRoot, file), 'utf8');
      
      // Check for title
      if (!content.match(/^#\s+.+$/m)) {
        throw new Error(`${file} missing proper title`);
      }
      
      // Check for table of contents or sections
      if (!content.match(/^##\s+.+$/m)) {
        throw new Error(`${file} missing proper sections`);
      }
    }
  }

  // Content quality tests
  async runContentQualityTests() {
    const qualityChecks = [
      this.checkReadability,
      this.checkCompleteness,
      this.checkAccuracy,
      this.checkClarity
    ];

    for (const check of qualityChecks) {
      await check();
    }
  }

  // Check readability
  async checkReadability() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for very long lines
      const lines = content.split('\n');
      const longLines = lines.filter(line => line.length > 120);
      
      if (longLines.length > 5) {
        throw new Error(`${file} has too many long lines (${longLines.length})`);
      }
      
      // Check for proper paragraph breaks
      const paragraphs = content.split('\n\n');
      const longParagraphs = paragraphs.filter(p => p.length > 1000);
      
      if (longParagraphs.length > 3) {
        throw new Error(`${file} has too many long paragraphs`);
      }
    }
  }

  // Check completeness
  async checkCompleteness() {
    const requiredSections = [
      { file: 'README.md', sections: ['Installation', 'Usage', 'Configuration'] },
      { file: 'TECHNICAL_SPECIFICATION.md', sections: ['Overview', 'Architecture', 'API'] },
      { file: 'ARCHITECTURE.md', sections: ['System Overview', 'Components', 'Data Flow'] }
    ];

    for (const req of requiredSections) {
      if (existsSync(join(projectRoot, req.file))) {
        const content = readFileSync(join(projectRoot, req.file), 'utf8');
        
        for (const section of req.sections) {
          if (!content.includes(section)) {
            throw new Error(`${req.file} missing required section: ${section}`);
          }
        }
      }
    }
  }

  // Check accuracy
  async checkAccuracy() {
    // Check for outdated information
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for TODO comments
      const todos = content.match(/TODO|FIXME|XXX/g);
      if (todos && todos.length > 3) {
        throw new Error(`${file} has too many TODO comments (${todos.length})`);
      }
      
      // Check for placeholder text
      const placeholders = content.match(/\[PLACEHOLDER\]|\[TODO\]|\[FIXME\]/g);
      if (placeholders && placeholders.length > 0) {
        throw new Error(`${file} contains placeholder text`);
      }
    }
  }

  // Check clarity
  async checkClarity() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for unclear language
      const unclearPatterns = [
        /it is important to note that/i,
        /it should be noted that/i,
        /it is worth noting that/i,
        /as mentioned above/i,
        /as stated previously/i
      ];
      
      const unclearMatches = unclearPatterns.filter(pattern => pattern.test(content));
      if (unclearMatches.length > 2) {
        throw new Error(`${file} contains unclear language patterns`);
      }
    }
  }

  // Consistency checks
  async runConsistencyChecks() {
    const consistencyChecks = [
      this.checkTerminology,
      this.checkFormatting,
      this.checkCrossReferences
    ];

    for (const check of consistencyChecks) {
      await check();
    }
  }

  // Check terminology consistency
  async checkTerminology() {
    const files = this.getDocumentationFiles();
    const terms = new Map();
    
    // Extract terms from all files
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const words = content.match(/\b[A-Z][a-z]+\b/g) || [];
      
      for (const word of words) {
        if (word.length > 3) {
          terms.set(word, (terms.get(word) || 0) + 1);
        }
      }
    }
    
    // Check for inconsistent capitalization
    const inconsistentTerms = Array.from(terms.entries())
      .filter(([term, count]) => count > 1)
      .map(([term, count]) => ({ term, count }));
    
    if (inconsistentTerms.length > 10) {
      throw new Error(`Too many inconsistent terms: ${inconsistentTerms.length}`);
    }
  }

  // Check formatting consistency
  async checkFormatting() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for consistent heading levels
      const headings = content.match(/^#+\s+.+$/gm) || [];
      const headingLevels = headings.map(h => h.match(/^#+/)[0].length);
      
      // Check for skipped heading levels
      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] > headingLevels[i-1] + 1) {
          throw new Error(`${file} has skipped heading levels`);
        }
      }
    }
  }

  // Check cross-references
  async checkCrossReferences() {
    const files = this.getDocumentationFiles();
    const links = new Map();
    
    // Extract all links
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      
      for (const match of linkMatches) {
        const [, text, url] = match.match(/\[([^\]]+)\]\(([^)]+)\)/);
        links.set(url, (links.get(url) || 0) + 1);
      }
    }
    
    // Check for broken internal links
    for (const [url, count] of links) {
      if (url.startsWith('./') || url.startsWith('../')) {
        const targetFile = join(projectRoot, url);
        if (!existsSync(targetFile)) {
          throw new Error(`Broken internal link: ${url}`);
        }
      }
    }
  }

  // Performance tests
  async runPerformanceTests() {
    const startTime = Date.now();
    
    // Test documentation generation performance
    try {
      execSync('npm run docs:generate-all', { 
        cwd: projectRoot,
        timeout: this.config.timeout,
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Documentation generation performance test failed: ${error.message}`);
    }
    
    const duration = Date.now() - startTime;
    
    if (duration > 60000) { // 1 minute
      throw new Error(`Documentation generation too slow: ${duration}ms`);
    }
  }

  // Integration tests
  async runIntegrationTests() {
    // Test full documentation pipeline
    try {
      execSync('npm run docs:full-maintenance', { 
        cwd: projectRoot,
        timeout: this.config.timeout,
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Documentation integration test failed: ${error.message}`);
    }
  }

  // Get documentation files
  getDocumentationFiles() {
    const files = [];
    const getMarkdownFiles = (dir) => {
      try {
        const items = require('fs').readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = require('fs').statSync(fullPath);
          
          if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(item)) {
            getMarkdownFiles(fullPath);
          } else if (stat.isFile() && item.endsWith('.md')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    getMarkdownFiles(projectRoot);
    return files;
  }

  // Generate test report
  generateReport() {
    testResults.summary.duration = Date.now() - this.startTime;
    
    const reportPath = join(projectRoot, this.config.output.file);
    writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    
    console.log('');
    console.log('📊 Documentation Test Results:');
    console.log(`   Total tests: ${testResults.summary.total}`);
    console.log(`   Passed: ${testResults.summary.passed}`);
    console.log(`   Failed: ${testResults.summary.failed}`);
    console.log(`   Duration: ${testResults.summary.duration}ms`);
    console.log(`   Report saved: ${reportPath}`);
    
    if (testResults.summary.failed > 0) {
      console.log('');
      console.log('❌ Failed tests:');
      for (const test of testResults.tests) {
        if (test.status === 'failed') {
          console.log(`   - ${test.name}: ${test.error}`);
        }
      }
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new DocumentationTestRunner();
  runner.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export default DocumentationTestRunner;


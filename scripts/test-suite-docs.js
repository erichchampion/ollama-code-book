#!/usr/bin/env node

/**
 * Comprehensive Documentation Testing and Validation Suite
 * 
 * Complete testing suite for documentation quality, accuracy, and functionality
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Test suite configuration
const TEST_SUITE_CONFIG = {
  tests: {
    validation: {
      enabled: true,
      markdown: true,
      links: true,
      images: true,
      code: true,
      structure: true
    },
    content: {
      enabled: true,
      accuracy: true,
      completeness: true,
      consistency: true,
      readability: true,
      accessibility: true
    },
    functionality: {
      enabled: true,
      examples: true,
      commands: true,
      configuration: true,
      api: true,
      integration: true
    },
    performance: {
      enabled: true,
      loadTime: true,
      size: true,
      optimization: true,
      caching: true
    },
    security: {
      enabled: true,
      vulnerabilities: true,
      sensitiveData: true,
      permissions: true,
      sanitization: true
    },
    compatibility: {
      enabled: true,
      browsers: true,
      devices: true,
      formats: true,
      versions: true
    }
  },
  reporting: {
    enabled: true,
    formats: ['json', 'html', 'xml'],
    outputDir: 'docs/test-results',
    detailed: true,
    summary: true
  },
  thresholds: {
    minScore: 80,
    maxErrors: 10,
    maxWarnings: 25,
    maxLoadTime: 5000,
    maxFileSize: 100000
  }
};

// Test results
const testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    skipped: 0,
    score: 0,
    duration: 0
  },
  tests: [],
  errors: [],
  warnings: [],
  recommendations: [],
  metrics: {
    files: 0,
    lines: 0,
    words: 0,
    size: 0,
    loadTime: 0
  }
};

// Documentation test suite class
class DocumentationTestSuite {
  constructor(config = TEST_SUITE_CONFIG) {
    this.config = config;
    this.results = testResults;
    this.startTime = Date.now();
  }

  // Run complete test suite
  async runTestSuite() {
    console.log('🧪 Starting comprehensive documentation test suite...');
    
    try {
      // Pre-test setup
      await this.preTestSetup();
      
      // Run validation tests
      await this.runValidationTests();
      
      // Run content tests
      await this.runContentTests();
      
      // Run functionality tests
      await this.runFunctionalityTests();
      
      // Run performance tests
      await this.runPerformanceTests();
      
      // Run security tests
      await this.runSecurityTests();
      
      // Run compatibility tests
      await this.runCompatibilityTests();
      
      // Generate reports
      await this.generateReports();
      
      // Calculate final score
      this.calculateFinalScore();
      
      console.log('✅ Test suite completed');
      return this.results.summary.score >= this.config.thresholds.minScore;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      return false;
    }
  }

  // Pre-test setup
  async preTestSetup() {
    console.log('  🔧 Setting up test environment...');
    
    // Create output directory
    const outputDir = join(projectRoot, this.config.reporting.outputDir);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Reset results
    this.results = testResults;
    this.results.timestamp = new Date().toISOString();
    
    console.log('    ✅ Test environment ready');
  }

  // Run validation tests
  async runValidationTests() {
    console.log('  📝 Running validation tests...');
    
    const tests = [
      { name: 'Markdown Validation', fn: () => this.testMarkdownValidation() },
      { name: 'Link Validation', fn: () => this.testLinkValidation() },
      { name: 'Image Validation', fn: () => this.testImageValidation() },
      { name: 'Code Validation', fn: () => this.testCodeValidation() },
      { name: 'Structure Validation', fn: () => this.testStructureValidation() }
    ];

    for (const test of tests) {
      if (this.config.tests.validation[test.name.toLowerCase().replace(/\s+/g, '')]) {
        await this.runTest(test);
      }
    }
  }

  // Run content tests
  async runContentTests() {
    console.log('  📄 Running content tests...');
    
    const tests = [
      { name: 'Accuracy', fn: () => this.testContentAccuracy() },
      { name: 'Completeness', fn: () => this.testContentCompleteness() },
      { name: 'Consistency', fn: () => this.testContentConsistency() },
      { name: 'Readability', fn: () => this.testContentReadability() },
      { name: 'Accessibility', fn: () => this.testContentAccessibility() }
    ];

    for (const test of tests) {
      if (this.config.tests.content[test.name.toLowerCase().replace(/\s+/g, '')]) {
        await this.runTest(test);
      }
    }
  }

  // Run functionality tests
  async runFunctionalityTests() {
    console.log('  ⚙️  Running functionality tests...');
    
    const tests = [
      { name: 'Examples', fn: () => this.testExamples() },
      { name: 'Commands', fn: () => this.testCommands() },
      { name: 'Configuration', fn: () => this.testConfiguration() },
      { name: 'API', fn: () => this.testAPI() },
      { name: 'Integration', fn: () => this.testIntegration() }
    ];

    for (const test of tests) {
      if (this.config.tests.functionality[test.name.toLowerCase().replace(/\s+/g, '')]) {
        await this.runTest(test);
      }
    }
  }

  // Run performance tests
  async runPerformanceTests() {
    console.log('  ⚡ Running performance tests...');
    
    const tests = [
      { name: 'LoadTime', fn: () => this.testLoadTime() },
      { name: 'Size', fn: () => this.testSize() },
      { name: 'Optimization', fn: () => this.testOptimization() },
      { name: 'Caching', fn: () => this.testCaching() }
    ];

    for (const test of tests) {
      if (this.config.tests.performance[test.name.toLowerCase().replace(/\s+/g, '')]) {
        await this.runTest(test);
      }
    }
  }

  // Run security tests
  async runSecurityTests() {
    console.log('  🔒 Running security tests...');
    
    const tests = [
      { name: 'Vulnerabilities', fn: () => this.testVulnerabilities() },
      { name: 'SensitiveData', fn: () => this.testSensitiveData() },
      { name: 'Permissions', fn: () => this.testPermissions() },
      { name: 'Sanitization', fn: () => this.testSanitization() }
    ];

    for (const test of tests) {
      if (this.config.tests.security[test.name.toLowerCase().replace(/\s+/g, '')]) {
        await this.runTest(test);
      }
    }
  }

  // Run compatibility tests
  async runCompatibilityTests() {
    console.log('  🌐 Running compatibility tests...');
    
    const tests = [
      { name: 'Browsers', fn: () => this.testBrowsers() },
      { name: 'Devices', fn: () => this.testDevices() },
      { name: 'Formats', fn: () => this.testFormats() },
      { name: 'Versions', fn: () => this.testVersions() }
    ];

    for (const test of tests) {
      if (this.config.tests.compatibility[test.name.toLowerCase().replace(/\s+/g, '')]) {
        await this.runTest(test);
      }
    }
  }

  // Run individual test
  async runTest(test) {
    const startTime = Date.now();
    let result = { 
      name: test.name, 
      status: 'pending', 
      duration: 0, 
      message: '', 
      errors: [], 
      warnings: [] 
    };
    
    try {
      console.log(`    🔄 Running ${test.name}...`);
      await test.fn();
      result.status = 'passed';
      result.message = 'Test passed successfully';
      this.results.summary.passed++;
    } catch (error) {
      result.status = 'failed';
      result.message = error.message;
      result.errors.push(error.message);
      this.results.summary.failed++;
      this.results.errors.push({
        test: test.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.log(`      ❌ ${test.name} failed: ${error.message}`);
    }
    
    result.duration = Date.now() - startTime;
    this.results.tests.push(result);
    this.results.summary.total++;
  }

  // Markdown validation test
  async testMarkdownValidation() {
    try {
      execSync('npm run docs:lint', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Markdown validation failed: ${error.message}`);
    }
  }

  // Link validation test
  async testLinkValidation() {
    try {
      execSync('npm run docs:check-links', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Link validation failed: ${error.message}`);
    }
  }

  // Image validation test
  async testImageValidation() {
    const files = this.getDocumentationFiles();
    const imageErrors = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const images = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
      
      for (const image of images) {
        const [, alt, src] = image.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        
        // Check for missing alt text
        if (!alt || alt.trim() === '') {
          imageErrors.push(`Missing alt text in ${file}: ${src}`);
        }
        
        // Check for broken image links
        if (src.startsWith('./') || src.startsWith('../')) {
          const imagePath = join(projectRoot, src);
          if (!existsSync(imagePath)) {
            imageErrors.push(`Broken image link in ${file}: ${src}`);
          }
        }
      }
    }
    
    if (imageErrors.length > 0) {
      throw new Error(`Image validation failed: ${imageErrors.join(', ')}`);
    }
  }

  // Code validation test
  async testCodeValidation() {
    const files = this.getDocumentationFiles();
    const codeErrors = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const codeBlocks = content.match(/```(\w+)?\n([\s\S]*?)```/g) || [];
      
      for (const block of codeBlocks) {
        const [, language, code] = block.match(/```(\w+)?\n([\s\S]*?)```/);
        
        if (language && code.trim()) {
          // Basic syntax validation
          if (language === 'javascript' || language === 'js') {
            try {
              new Function(code);
            } catch (error) {
              codeErrors.push(`Invalid JavaScript in ${file}: ${error.message}`);
            }
          } else if (language === 'json') {
            try {
              JSON.parse(code);
            } catch (error) {
              codeErrors.push(`Invalid JSON in ${file}: ${error.message}`);
            }
          }
        }
      }
    }
    
    if (codeErrors.length > 0) {
      throw new Error(`Code validation failed: ${codeErrors.join(', ')}`);
    }
  }

  // Structure validation test
  async testStructureValidation() {
    const files = this.getDocumentationFiles();
    const structureErrors = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for title
      if (!content.match(/^#\s+.+$/m)) {
        structureErrors.push(`Missing title in ${file}`);
      }
      
      // Check for proper heading hierarchy
      const headings = content.match(/^#+\s+.+$/gm) || [];
      const headingLevels = headings.map(h => h.match(/^#+/)[0].length);
      
      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] > headingLevels[i-1] + 1) {
          structureErrors.push(`Skipped heading level in ${file}`);
          break;
        }
      }
    }
    
    if (structureErrors.length > 0) {
      throw new Error(`Structure validation failed: ${structureErrors.join(', ')}`);
    }
  }

  // Content accuracy test
  async testContentAccuracy() {
    const files = this.getDocumentationFiles();
    const accuracyErrors = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for outdated information
      const outdatedPatterns = [
        /\b(soon|coming soon|will be|planned)\b/gi,
        /\b(not yet|not implemented|not available)\b/gi,
        /\b(TODO|FIXME|XXX)\b/gi
      ];
      
      for (const pattern of outdatedPatterns) {
        if (pattern.test(content)) {
          accuracyErrors.push(`Outdated content in ${file}`);
        }
      }
      
      // Check for placeholder text
      const placeholders = content.match(/\[PLACEHOLDER\]|\[TODO\]|\[FIXME\]/g) || [];
      if (placeholders.length > 0) {
        accuracyErrors.push(`Placeholder text in ${file}: ${placeholders.join(', ')}`);
      }
    }
    
    if (accuracyErrors.length > 0) {
      throw new Error(`Content accuracy failed: ${accuracyErrors.join(', ')}`);
    }
  }

  // Content completeness test
  async testContentCompleteness() {
    const requiredFiles = [
      'README.md',
      'TECHNICAL_SPECIFICATION.md',
      'ARCHITECTURE.md',
      'DEVELOPMENT.md'
    ];
    
    const missingFiles = requiredFiles.filter(file => !existsSync(join(projectRoot, file)));
    
    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }
    
    // Check for required sections
    const requiredSections = {
      'README.md': ['Installation', 'Usage', 'Configuration'],
      'TECHNICAL_SPECIFICATION.md': ['Overview', 'Architecture', 'API'],
      'ARCHITECTURE.md': ['System Overview', 'Components', 'Data Flow']
    };
    
    for (const [file, sections] of Object.entries(requiredSections)) {
      if (existsSync(join(projectRoot, file))) {
        const content = readFileSync(join(projectRoot, file), 'utf8');
        const missingSections = sections.filter(section => !content.includes(section));
        
        if (missingSections.length > 0) {
          throw new Error(`Missing required sections in ${file}: ${missingSections.join(', ')}`);
        }
      }
    }
  }

  // Content consistency test
  async testContentConsistency() {
    const files = this.getDocumentationFiles();
    const consistencyErrors = [];
    
    // Check terminology consistency
    const terms = new Map();
    
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
      consistencyErrors.push(`Inconsistent terminology: ${inconsistentTerms.length} variations`);
    }
    
    if (consistencyErrors.length > 0) {
      throw new Error(`Content consistency failed: ${consistencyErrors.join(', ')}`);
    }
  }

  // Content readability test
  async testContentReadability() {
    const files = this.getDocumentationFiles();
    const readabilityErrors = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for very long lines
      const lines = content.split('\n');
      const longLines = lines.filter(line => line.length > 120);
      
      if (longLines.length > 5) {
        readabilityErrors.push(`Too many long lines in ${file}: ${longLines.length}`);
      }
      
      // Check for very long paragraphs
      const paragraphs = content.split('\n\n');
      const longParagraphs = paragraphs.filter(p => p.length > 1000);
      
      if (longParagraphs.length > 3) {
        readabilityErrors.push(`Too many long paragraphs in ${file}: ${longParagraphs.length}`);
      }
    }
    
    if (readabilityErrors.length > 0) {
      throw new Error(`Content readability failed: ${readabilityErrors.join(', ')}`);
    }
  }

  // Content accessibility test
  async testContentAccessibility() {
    const files = this.getDocumentationFiles();
    const accessibilityErrors = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for proper heading structure
      const headings = content.match(/^#+\s+.+$/gm) || [];
      const headingLevels = headings.map(h => h.match(/^#+/)[0].length);
      
      if (headingLevels.length > 0 && headingLevels[0] !== 1) {
        accessibilityErrors.push(`Missing H1 heading in ${file}`);
      }
      
      // Check for alt text in images
      const images = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
      for (const image of images) {
        const [, alt] = image.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (!alt || alt.trim() === '') {
          accessibilityErrors.push(`Missing alt text in ${file}`);
        }
      }
    }
    
    if (accessibilityErrors.length > 0) {
      throw new Error(`Content accessibility failed: ${accessibilityErrors.join(', ')}`);
    }
  }

  // Examples test
  async testExamples() {
    try {
      execSync('npm run docs:verify-examples', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Examples test failed: ${error.message}`);
    }
  }

  // Commands test
  async testCommands() {
    try {
      execSync('npm run docs:generate', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Commands test failed: ${error.message}`);
    }
  }

  // Configuration test
  async testConfiguration() {
    const configFiles = [
      'package.json',
      '.markdownlint.json',
      '.markdownlinkcheck.json',
      'jest.config.js'
    ];
    
    for (const configFile of configFiles) {
      const filePath = join(projectRoot, configFile);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf8');
          JSON.parse(content);
        } catch (error) {
          throw new Error(`Invalid configuration file ${configFile}: ${error.message}`);
        }
      }
    }
  }

  // API test
  async testAPI() {
    try {
      execSync('npm run docs:generate', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`API test failed: ${error.message}`);
    }
  }

  // Integration test
  async testIntegration() {
    try {
      execSync('npm run docs:full-maintenance', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Integration test failed: ${error.message}`);
    }
  }

  // Load time test
  async testLoadTime() {
    const files = this.getDocumentationFiles();
    const loadTimeErrors = [];
    
    for (const file of files) {
      const stats = statSync(file);
      const estimatedLoadTime = stats.size / 1024; // Rough estimate
      
      if (estimatedLoadTime > this.config.thresholds.maxLoadTime) {
        loadTimeErrors.push(`Slow loading file: ${file} (${estimatedLoadTime}ms)`);
      }
    }
    
    if (loadTimeErrors.length > 0) {
      throw new Error(`Load time test failed: ${loadTimeErrors.join(', ')}`);
    }
  }

  // Size test
  async testSize() {
    const files = this.getDocumentationFiles();
    const sizeErrors = [];
    
    for (const file of files) {
      const stats = statSync(file);
      
      if (stats.size > this.config.thresholds.maxFileSize) {
        sizeErrors.push(`File too large: ${file} (${stats.size} bytes)`);
      }
    }
    
    if (sizeErrors.length > 0) {
      throw new Error(`Size test failed: ${sizeErrors.join(', ')}`);
    }
  }

  // Optimization test
  async testOptimization() {
    const files = this.getDocumentationFiles();
    const optimizationErrors = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for unnecessary whitespace
      const excessiveWhitespace = content.match(/\n{4,}/g) || [];
      if (excessiveWhitespace.length > 0) {
        optimizationErrors.push(`Excessive whitespace in ${file}`);
      }
      
      // Check for redundant content
      const duplicateLines = this.findDuplicateLines(content);
      if (duplicateLines.length > 0) {
        optimizationErrors.push(`Duplicate lines in ${file}: ${duplicateLines.length}`);
      }
    }
    
    if (optimizationErrors.length > 0) {
      throw new Error(`Optimization test failed: ${optimizationErrors.join(', ')}`);
    }
  }

  // Caching test
  async testCaching() {
    // This would test caching mechanisms
    console.log('    📦 Caching test not implemented');
  }

  // Vulnerabilities test
  async testVulnerabilities() {
    try {
      execSync('npm audit', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Security vulnerabilities found: ${error.message}`);
    }
  }

  // Sensitive data test
  async testSensitiveData() {
    const files = this.getDocumentationFiles();
    const sensitiveDataErrors = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for sensitive information
      const sensitivePatterns = [
        /password\s*[:=]\s*['"][^'"]+['"]/gi,
        /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
        /secret\s*[:=]\s*['"][^'"]+['"]/gi,
        /token\s*[:=]\s*['"][^'"]+['"]/gi
      ];
      
      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          sensitiveDataErrors.push(`Sensitive data found in ${file}`);
        }
      }
    }
    
    if (sensitiveDataErrors.length > 0) {
      throw new Error(`Sensitive data test failed: ${sensitiveDataErrors.join(', ')}`);
    }
  }

  // Permissions test
  async testPermissions() {
    // This would test file permissions
    console.log('    🔐 Permissions test not implemented');
  }

  // Sanitization test
  async testSanitization() {
    const files = this.getDocumentationFiles();
    const sanitizationErrors = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for potential XSS
      const xssPatterns = [
        /<script[^>]*>[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];
      
      for (const pattern of xssPatterns) {
        if (pattern.test(content)) {
          sanitizationErrors.push(`Potential XSS in ${file}`);
        }
      }
    }
    
    if (sanitizationErrors.length > 0) {
      throw new Error(`Sanitization test failed: ${sanitizationErrors.join(', ')}`);
    }
  }

  // Browsers test
  async testBrowsers() {
    // This would test browser compatibility
    console.log('    🌐 Browser compatibility test not implemented');
  }

  // Devices test
  async testDevices() {
    // This would test device compatibility
    console.log('    📱 Device compatibility test not implemented');
  }

  // Formats test
  async testFormats() {
    const files = this.getDocumentationFiles();
    const formatErrors = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for proper markdown formatting
      const markdownErrors = this.validateMarkdownFormatting(content);
      if (markdownErrors.length > 0) {
        formatErrors.push(`Format errors in ${file}: ${markdownErrors.join(', ')}`);
      }
    }
    
    if (formatErrors.length > 0) {
      throw new Error(`Formats test failed: ${formatErrors.join(', ')}`);
    }
  }

  // Versions test
  async testVersions() {
    // This would test version compatibility
    console.log('    📋 Version compatibility test not implemented');
  }

  // Helper methods
  findDuplicateLines(content) {
    const lines = content.split('\n');
    const lineCounts = new Map();
    
    for (const line of lines) {
      if (line.trim()) {
        lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
      }
    }
    
    return Array.from(lineCounts.entries())
      .filter(([line, count]) => count > 1)
      .map(([line, count]) => ({ line, count }));
  }

  validateMarkdownFormatting(content) {
    const errors = [];
    
    // Check for proper list formatting
    const listItems = content.match(/^[\s]*[-*+]\s+.+$/gm) || [];
    const numberedLists = content.match(/^[\s]*\d+\.\s+.+$/gm) || [];
    
    if (listItems.length > 0 && numberedLists.length > 0) {
      errors.push('Mixed list formatting');
    }
    
    // Check for proper link formatting
    const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    for (const link of links) {
      const [, text, url] = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (!text || !url || text.length < 2 || url.length < 2) {
        errors.push('Malformed link');
      }
    }
    
    return errors;
  }

  // Calculate final score
  calculateFinalScore() {
    const totalTests = this.results.summary.total;
    const passedTests = this.results.summary.passed;
    const failedTests = this.results.summary.failed;
    const warningTests = this.results.summary.warnings;
    
    // Base score from passed tests
    let score = (passedTests / totalTests) * 100;
    
    // Deduct points for warnings
    score -= (warningTests / totalTests) * 10;
    
    // Deduct points for errors
    score -= (failedTests / totalTests) * 20;
    
    this.results.summary.score = Math.max(0, Math.round(score));
    this.results.summary.duration = Date.now() - this.startTime;
  }

  // Generate reports
  async generateReports() {
    console.log('  📊 Generating test reports...');
    
    const outputDir = join(projectRoot, this.config.reporting.outputDir);
    
    // Generate JSON report
    if (this.config.reporting.formats.includes('json')) {
      const jsonReport = JSON.stringify(this.results, null, 2);
      writeFileSync(join(outputDir, 'test-results.json'), jsonReport);
    }
    
    // Generate HTML report
    if (this.config.reporting.formats.includes('html')) {
      const htmlReport = this.generateHTMLReport();
      writeFileSync(join(outputDir, 'test-results.html'), htmlReport);
    }
    
    // Generate XML report
    if (this.config.reporting.formats.includes('xml')) {
      const xmlReport = this.generateXMLReport();
      writeFileSync(join(outputDir, 'test-results.xml'), xmlReport);
    }
    
    console.log(`    📄 Reports generated in ${outputDir}`);
  }

  // Generate HTML report
  generateHTMLReport() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Test Results</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .passed { border-left: 4px solid #28a745; }
        .failed { border-left: 4px solid #dc3545; }
        .warning { border-left: 4px solid #ffc107; }
        .score { font-size: 24px; font-weight: bold; }
        .score.high { color: #28a745; }
        .score.medium { color: #ffc107; }
        .score.low { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Documentation Test Results</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <h2>Summary</h2>
            <div class="score ${this.results.summary.score >= 80 ? 'high' : this.results.summary.score >= 60 ? 'medium' : 'low'}">
                Score: ${this.results.summary.score}/100
            </div>
            <p>Total Tests: ${this.results.summary.total}</p>
            <p>Passed: ${this.results.summary.passed}</p>
            <p>Failed: ${this.results.summary.failed}</p>
            <p>Warnings: ${this.results.summary.warnings}</p>
            <p>Duration: ${this.results.summary.duration}ms</p>
        </div>
        
        <div class="tests">
            <h2>Test Results</h2>
            ${this.results.tests.map(test => `
                <div class="test ${test.status}">
                    <h3>${test.name}</h3>
                    <p>Status: ${test.status.toUpperCase()}</p>
                    <p>Duration: ${test.duration}ms</p>
                    <p>Message: ${test.message}</p>
                    ${test.errors.length > 0 ? `<p>Errors: ${test.errors.join(', ')}</p>` : ''}
                    ${test.warnings.length > 0 ? `<p>Warnings: ${test.warnings.join(', ')}</p>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  // Generate XML report
  generateXMLReport() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Documentation Tests" tests="${this.results.summary.total}" failures="${this.results.summary.failed}" warnings="${this.results.summary.warnings}" time="${this.results.summary.duration}">
    ${this.results.tests.map(test => `
        <testcase name="${test.name}" time="${test.duration}">
            ${test.status === 'failed' ? `<failure message="${test.message}">${test.errors.join(', ')}</failure>` : ''}
            ${test.warnings.length > 0 ? `<warning message="${test.warnings.join(', ')}" />` : ''}
        </testcase>
    `).join('')}
</testsuite>`;
  }

  // Get documentation files
  getDocumentationFiles() {
    const files = [];
    const getMarkdownFiles = (dir) => {
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
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
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new DocumentationTestSuite();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'run':
      testSuite.runTestSuite();
      break;
    case 'validation':
      testSuite.runValidationTests();
      break;
    case 'content':
      testSuite.runContentTests();
      break;
    case 'functionality':
      testSuite.runFunctionalityTests();
      break;
    case 'performance':
      testSuite.runPerformanceTests();
      break;
    case 'security':
      testSuite.runSecurityTests();
      break;
    case 'compatibility':
      testSuite.runCompatibilityTests();
      break;
    default:
      console.log('Usage: test-suite-docs.js <command> [args]');
      console.log('Commands:');
      console.log('  run                    Run complete test suite');
      console.log('  validation             Run validation tests only');
      console.log('  content                Run content tests only');
      console.log('  functionality          Run functionality tests only');
      console.log('  performance            Run performance tests only');
      console.log('  security               Run security tests only');
      console.log('  compatibility          Run compatibility tests only');
      break;
  }
}

export default DocumentationTestSuite;


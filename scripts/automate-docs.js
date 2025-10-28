#!/usr/bin/env node

/**
 * Comprehensive Documentation Maintenance and Update Automation
 * 
 * Automated system for maintaining, updating, and optimizing documentation
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Automation configuration
const AUTOMATION_CONFIG = {
  maintenance: {
    enabled: true,
    schedule: {
      daily: true,
      weekly: true,
      monthly: true
    },
    tasks: {
      validation: true,
      linkChecking: true,
      contentUpdate: true,
      performanceOptimization: true,
      securityScan: true,
      backup: true
    }
  },
  updates: {
    enabled: true,
    autoUpdate: {
      versionNumbers: true,
      dependencies: true,
      crossReferences: true,
      timestamps: true
    },
    contentUpdate: {
      codeExamples: true,
      configuration: true,
      apiReferences: true,
      changelog: true
    }
  },
  optimization: {
    enabled: true,
    performance: {
      minifyMarkdown: true,
      optimizeImages: true,
      compressContent: true,
      removeRedundancy: true
    },
    seo: {
      generateSitemap: true,
      optimizeHeadings: true,
      addMetaTags: true,
      improveReadability: true
    }
  },
  monitoring: {
    enabled: true,
    alerts: {
      brokenLinks: true,
      outdatedContent: true,
      performanceIssues: true,
      securityVulnerabilities: true
    },
    reporting: {
      generateReports: true,
      sendNotifications: true,
      trackMetrics: true
    }
  }
};

// Automation results
const automationResults = {
  timestamp: new Date().toISOString(),
  tasks: [],
  summary: {
    total: 0,
    completed: 0,
    failed: 0,
    warnings: 0,
    duration: 0
  },
  recommendations: []
};

// Documentation automation class
class DocumentationAutomation {
  constructor(config = AUTOMATION_CONFIG) {
    this.config = config;
    this.results = automationResults;
    this.startTime = Date.now();
  }

  // Run full automation
  async runAutomation() {
    console.log('🤖 Starting comprehensive documentation automation...');
    
    try {
      // Pre-automation checks
      await this.preAutomationChecks();
      
      // Run maintenance tasks
      await this.runMaintenanceTasks();
      
      // Run update tasks
      await this.runUpdateTasks();
      
      // Run optimization tasks
      await this.runOptimizationTasks();
      
      // Run monitoring tasks
      await this.runMonitoringTasks();
      
      // Generate final report
      await this.generateFinalReport();
      
      console.log('✅ Documentation automation completed');
      return true;
      
    } catch (error) {
      console.error('❌ Automation failed:', error.message);
      return false;
    }
  }

  // Pre-automation checks
  async preAutomationChecks() {
    console.log('  🔍 Running pre-automation checks...');
    
    // Check if we're in a git repository
    try {
      execSync('git status', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error('Not in a git repository');
    }
    
    // Check if documentation exists
    const files = this.getDocumentationFiles();
    if (files.length === 0) {
      throw new Error('No documentation files found');
    }
    
    // Check if required tools are available
    try {
      execSync('npm --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('npm not available');
    }
    
    console.log('    ✅ Pre-automation checks passed');
  }

  // Run maintenance tasks
  async runMaintenanceTasks() {
    console.log('  🔧 Running maintenance tasks...');
    
    const tasks = [
      { name: 'Validation', fn: () => this.runValidation() },
      { name: 'Link Checking', fn: () => this.runLinkChecking() },
      { name: 'Content Update', fn: () => this.runContentUpdate() },
      { name: 'Performance Optimization', fn: () => this.runPerformanceOptimization() },
      { name: 'Security Scan', fn: () => this.runSecurityScan() },
      { name: 'Backup', fn: () => this.runBackup() }
    ];

    for (const task of tasks) {
      if (this.config.maintenance.tasks[task.name.toLowerCase().replace(/\s+/g, '')]) {
        await this.runTask(task);
      }
    }
  }

  // Run update tasks
  async runUpdateTasks() {
    console.log('  📝 Running update tasks...');
    
    const tasks = [
      { name: 'Version Numbers', fn: () => this.updateVersionNumbers() },
      { name: 'Dependencies', fn: () => this.updateDependencies() },
      { name: 'Cross References', fn: () => this.updateCrossReferences() },
      { name: 'Timestamps', fn: () => this.updateTimestamps() },
      { name: 'Code Examples', fn: () => this.updateCodeExamples() },
      { name: 'Configuration', fn: () => this.updateConfiguration() },
      { name: 'API References', fn: () => this.updateAPIReferences() },
      { name: 'Changelog', fn: () => this.updateChangelog() }
    ];

    for (const task of tasks) {
      if (this.config.updates.autoUpdate[task.name.toLowerCase().replace(/\s+/g, '')] || 
          this.config.updates.contentUpdate[task.name.toLowerCase().replace(/\s+/g, '')]) {
        await this.runTask(task);
      }
    }
  }

  // Run optimization tasks
  async runOptimizationTasks() {
    console.log('  ⚡ Running optimization tasks...');
    
    const tasks = [
      { name: 'Minify Markdown', fn: () => this.minifyMarkdown() },
      { name: 'Optimize Images', fn: () => this.optimizeImages() },
      { name: 'Compress Content', fn: () => this.compressContent() },
      { name: 'Remove Redundancy', fn: () => this.removeRedundancy() },
      { name: 'Generate Sitemap', fn: () => this.generateSitemap() },
      { name: 'Optimize Headings', fn: () => this.optimizeHeadings() },
      { name: 'Add Meta Tags', fn: () => this.addMetaTags() },
      { name: 'Improve Readability', fn: () => this.improveReadability() }
    ];

    for (const task of tasks) {
      if (this.config.optimization.performance[task.name.toLowerCase().replace(/\s+/g, '')] || 
          this.config.optimization.seo[task.name.toLowerCase().replace(/\s+/g, '')]) {
        await this.runTask(task);
      }
    }
  }

  // Run monitoring tasks
  async runMonitoringTasks() {
    console.log('  📊 Running monitoring tasks...');
    
    const tasks = [
      { name: 'Broken Links Alert', fn: () => this.checkBrokenLinks() },
      { name: 'Outdated Content Alert', fn: () => this.checkOutdatedContent() },
      { name: 'Performance Issues Alert', fn: () => this.checkPerformanceIssues() },
      { name: 'Security Vulnerabilities Alert', fn: () => this.checkSecurityVulnerabilities() },
      { name: 'Generate Reports', fn: () => this.generateReports() },
      { name: 'Send Notifications', fn: () => this.sendNotifications() },
      { name: 'Track Metrics', fn: () => this.trackMetrics() }
    ];

    for (const task of tasks) {
      if (this.config.monitoring.alerts[task.name.toLowerCase().replace(/\s+/g, '')] || 
          this.config.monitoring.reporting[task.name.toLowerCase().replace(/\s+/g, '')]) {
        await this.runTask(task);
      }
    }
  }

  // Run individual task
  async runTask(task) {
    const startTime = Date.now();
    let result = { name: task.name, status: 'pending', duration: 0, message: '' };
    
    try {
      console.log(`    🔄 Running ${task.name}...`);
      await task.fn();
      result.status = 'completed';
      result.message = 'Task completed successfully';
      this.results.summary.completed++;
    } catch (error) {
      result.status = 'failed';
      result.message = error.message;
      this.results.summary.failed++;
      console.log(`      ❌ ${task.name} failed: ${error.message}`);
    }
    
    result.duration = Date.now() - startTime;
    this.results.tasks.push(result);
    this.results.summary.total++;
  }

  // Validation task
  async runValidation() {
    try {
      execSync('npm run docs:validate', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  // Link checking task
  async runLinkChecking() {
    try {
      execSync('npm run docs:check-links', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Link checking failed: ${error.message}`);
    }
  }

  // Content update task
  async runContentUpdate() {
    try {
      execSync('npm run docs:update', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Content update failed: ${error.message}`);
    }
  }

  // Performance optimization task
  async runPerformanceOptimization() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Remove unnecessary whitespace
      content = content.replace(/\n{3,}/g, '\n\n');
      
      // Optimize line lengths
      content = this.optimizeLineLengths(content);
      
      writeFileSync(file, content);
    }
  }

  // Security scan task
  async runSecurityScan() {
    // Check for sensitive information
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for potential security issues
      const securityPatterns = [
        /password\s*[:=]\s*['"][^'"]+['"]/gi,
        /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
        /secret\s*[:=]\s*['"][^'"]+['"]/gi,
        /token\s*[:=]\s*['"][^'"]+['"]/gi
      ];
      
      for (const pattern of securityPatterns) {
        if (pattern.test(content)) {
          throw new Error(`Potential security issue found in ${file}`);
        }
      }
    }
  }

  // Backup task
  async runBackup() {
    const backupDir = join(projectRoot, 'docs/backup', new Date().toISOString().split('T')[0]);
    mkdirSync(backupDir, { recursive: true });
    
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const relativePath = file.replace(projectRoot, '');
      const backupPath = join(backupDir, relativePath);
      const backupDirPath = dirname(backupPath);
      
      mkdirSync(backupDirPath, { recursive: true });
      
      try {
        const content = readFileSync(file, 'utf8');
        writeFileSync(backupPath, content);
      } catch (error) {
        console.warn(`⚠️  Could not backup ${relativePath}: ${error.message}`);
      }
    }
  }

  // Update version numbers
  async updateVersionNumbers() {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    const version = packageJson.version;
    
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Update version references
      content = content.replace(/version\s*[:=]\s*['"][^'"]+['"]/gi, `version: "${version}"`);
      content = content.replace(/v\d+\.\d+\.\d+/g, `v${version}`);
      
      writeFileSync(file, content);
    }
  }

  // Update dependencies
  async updateDependencies() {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Update dependency references
      for (const [name, version] of Object.entries(dependencies)) {
        const pattern = new RegExp(`${name}\\s*[:=]\\s*['"][^'"]+['"]`, 'gi');
        content = content.replace(pattern, `${name}: "${version}"`);
      }
      
      writeFileSync(file, content);
    }
  }

  // Update cross references
  async updateCrossReferences() {
    const files = this.getDocumentationFiles();
    const fileMap = new Map();
    
    // Build file map
    for (const file of files) {
      const relativePath = file.replace(projectRoot, '');
      const fileName = relativePath.split('/').pop().replace('.md', '');
      fileMap.set(fileName, relativePath);
    }
    
    // Update cross references
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Update internal links
      for (const [fileName, filePath] of fileMap) {
        const pattern = new RegExp(`\\[([^\\]]+)\\]\\(${fileName}\\)`, 'gi');
        content = content.replace(pattern, `[$1](${filePath})`);
      }
      
      writeFileSync(file, content);
    }
  }

  // Update timestamps
  async updateTimestamps() {
    const files = this.getDocumentationFiles();
    const now = new Date().toISOString();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Update timestamp patterns
      content = content.replace(/last[_-]?updated?\s*[:=]\s*['"][^'"]+['"]/gi, `lastUpdated: "${now}"`);
      content = content.replace(/updated\s*[:=]\s*['"][^'"]+['"]/gi, `updated: "${now}"`);
      
      writeFileSync(file, content);
    }
  }

  // Update code examples
  async updateCodeExamples() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Update code examples
      content = this.updateCodeBlocks(content);
      
      writeFileSync(file, content);
    }
  }

  // Update configuration
  async updateConfiguration() {
    const configFiles = [
      'package.json',
      '.markdownlint.json',
      '.markdownlinkcheck.json',
      'jest.config.js'
    ];
    
    for (const configFile of configFiles) {
      const filePath = join(projectRoot, configFile);
      if (existsSync(filePath)) {
        let content = readFileSync(filePath, 'utf8');
        
        // Update configuration references
        content = this.updateConfigReferences(content);
        
        writeFileSync(filePath, content);
      }
    }
  }

  // Update API references
  async updateAPIReferences() {
    try {
      execSync('npm run docs:generate', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`API reference update failed: ${error.message}`);
    }
  }

  // Update changelog
  async updateChangelog() {
    try {
      execSync('npm run docs:version:changelog', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Changelog update failed: ${error.message}`);
    }
  }

  // Minify markdown
  async minifyMarkdown() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Remove unnecessary whitespace
      content = content.replace(/\n{3,}/g, '\n\n');
      content = content.replace(/[ \t]+$/gm, '');
      
      writeFileSync(file, content);
    }
  }

  // Optimize images
  async optimizeImages() {
    // This would integrate with image optimization tools
    console.log('    📸 Image optimization not implemented');
  }

  // Compress content
  async compressContent() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Remove redundant content
      content = this.removeRedundantContent(content);
      
      writeFileSync(file, content);
    }
  }

  // Remove redundancy
  async removeRedundancy() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Remove duplicate sections
      content = this.removeDuplicateSections(content);
      
      writeFileSync(file, content);
    }
  }

  // Generate sitemap
  async generateSitemap() {
    try {
      execSync('npm run docs:generate', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Sitemap generation failed: ${error.message}`);
    }
  }

  // Optimize headings
  async optimizeHeadings() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Optimize heading structure
      content = this.optimizeHeadingStructure(content);
      
      writeFileSync(file, content);
    }
  }

  // Add meta tags
  async addMetaTags() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Add meta tags if not present
      if (!content.includes('<!-- meta:')) {
        const metaTags = this.generateMetaTags(file);
        content = metaTags + '\n\n' + content;
        writeFileSync(file, content);
      }
    }
  }

  // Improve readability
  async improveReadability() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Improve readability
      content = this.improveContentReadability(content);
      
      writeFileSync(file, content);
    }
  }

  // Check broken links
  async checkBrokenLinks() {
    try {
      execSync('npm run docs:check-links', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Broken links found: ${error.message}`);
    }
  }

  // Check outdated content
  async checkOutdatedContent() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for outdated patterns
      const outdatedPatterns = [
        /\b(soon|coming soon|will be|planned)\b/gi,
        /\b(not yet|not implemented|not available)\b/gi,
        /\b(TODO|FIXME|XXX)\b/gi
      ];
      
      for (const pattern of outdatedPatterns) {
        if (pattern.test(content)) {
          console.warn(`⚠️  Potentially outdated content in ${file}`);
        }
      }
    }
  }

  // Check performance issues
  async checkPerformanceIssues() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const stats = statSync(file);
      
      // Check file size
      if (stats.size > 100000) { // 100KB
        console.warn(`⚠️  Large file detected: ${file} (${stats.size} bytes)`);
      }
      
      // Check line count
      const content = readFileSync(file, 'utf8');
      const lines = content.split('\n').length;
      
      if (lines > 1000) {
        console.warn(`⚠️  Long file detected: ${file} (${lines} lines)`);
      }
    }
  }

  // Check security vulnerabilities
  async checkSecurityVulnerabilities() {
    try {
      execSync('npm audit', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      console.warn('⚠️  Security vulnerabilities found in dependencies');
    }
  }

  // Generate reports
  async generateReports() {
    try {
      execSync('npm run docs:analytics:report', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  // Send notifications
  async sendNotifications() {
    // This would integrate with notification services
    console.log('    📧 Notifications not implemented');
  }

  // Track metrics
  async trackMetrics() {
    try {
      execSync('npm run docs:analytics:track', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Metrics tracking failed: ${error.message}`);
    }
  }

  // Generate final report
  async generateFinalReport() {
    this.results.summary.duration = Date.now() - this.startTime;
    
    const reportPath = join(projectRoot, 'docs/automation-report.json');
    writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log('');
    console.log('📊 Automation Results:');
    console.log(`   Total tasks: ${this.results.summary.total}`);
    console.log(`   Completed: ${this.results.summary.completed}`);
    console.log(`   Failed: ${this.results.summary.failed}`);
    console.log(`   Duration: ${this.results.summary.duration}ms`);
    console.log(`   Report saved: ${reportPath}`);
  }

  // Helper methods
  optimizeLineLengths(content) {
    const lines = content.split('\n');
    const optimizedLines = lines.map(line => {
      if (line.length > 120) {
        // Simple line breaking
        return line.substring(0, 120) + '\n' + line.substring(120);
      }
      return line;
    });
    return optimizedLines.join('\n');
  }

  updateCodeBlocks(content) {
    // Update code block language tags
    return content.replace(/```(\w+)?\n/g, (match, lang) => {
      if (lang && ['bash', 'javascript', 'typescript', 'json', 'yaml'].includes(lang)) {
        return match;
      }
      return '```\n';
    });
  }

  updateConfigReferences(content) {
    // Update configuration references
    return content.replace(/version\s*[:=]\s*['"][^'"]+['"]/gi, 'version: "latest"');
  }

  removeRedundantContent(content) {
    // Remove redundant whitespace
    return content.replace(/\n{3,}/g, '\n\n');
  }

  removeDuplicateSections(content) {
    // Simple duplicate section removal
    const sections = content.split(/^##\s+/m);
    const uniqueSections = [...new Set(sections)];
    return uniqueSections.join('## ');
  }

  optimizeHeadingStructure(content) {
    // Ensure proper heading hierarchy
    const lines = content.split('\n');
    let currentLevel = 0;
    
    return lines.map(line => {
      if (line.match(/^#+\s+/)) {
        const level = line.match(/^#+/)[0].length;
        if (level > currentLevel + 1) {
          currentLevel = level - 1;
          return line.replace(/^#+/, '#'.repeat(currentLevel + 1));
        }
        currentLevel = level;
      }
      return line;
    }).join('\n');
  }

  generateMetaTags(file) {
    const fileName = file.split('/').pop().replace('.md', '');
    return `<!-- meta:
title: ${fileName}
description: Documentation for ${fileName}
keywords: documentation, ${fileName}
author: Ollama Code Team
lastUpdated: ${new Date().toISOString()}
-->`;
  }

  improveContentReadability(content) {
    // Improve readability
    return content
      .replace(/\bit is important to note that\b/gi, 'note that')
      .replace(/\bit should be noted that\b/gi, 'note that')
      .replace(/\bit is worth noting that\b/gi, 'note that')
      .replace(/\bas mentioned above\b/gi, 'as mentioned')
      .replace(/\bas stated previously\b/gi, 'as stated');
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
  const automation = new DocumentationAutomation();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'run':
      automation.runAutomation();
      break;
    case 'maintenance':
      automation.runMaintenanceTasks();
      break;
    case 'update':
      automation.runUpdateTasks();
      break;
    case 'optimize':
      automation.runOptimizationTasks();
      break;
    case 'monitor':
      automation.runMonitoringTasks();
      break;
    default:
      console.log('Usage: automate-docs.js <command> [args]');
      console.log('Commands:');
      console.log('  run                    Run full automation');
      console.log('  maintenance            Run maintenance tasks only');
      console.log('  update                 Run update tasks only');
      console.log('  optimize               Run optimization tasks only');
      console.log('  monitor                Run monitoring tasks only');
      break;
  }
}

export default DocumentationAutomation;


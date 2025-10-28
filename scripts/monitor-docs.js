#!/usr/bin/env node

/**
 * Documentation Monitoring and Alerting System
 * 
 * Comprehensive monitoring system for documentation health, performance, and issues
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, watchFile, unwatchFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Monitoring configuration
const MONITORING_CONFIG = {
  monitoring: {
    enabled: true,
    interval: 60000, // 1 minute
    realTime: true,
    continuous: true,
    alertThresholds: {
      errors: 5,
      warnings: 10,
      performance: 5000,
      size: 100000,
      brokenLinks: 3
    }
  },
  alerts: {
    enabled: true,
    channels: {
      console: true,
      file: true,
      email: false,
      slack: false,
      webhook: false
    },
    levels: {
      critical: true,
      warning: true,
      info: true,
      debug: false
    },
    escalation: {
      enabled: true,
      maxRetries: 3,
      retryInterval: 300000, // 5 minutes
      escalationDelay: 900000 // 15 minutes
    }
  },
  metrics: {
    enabled: true,
    collect: {
      performance: true,
      errors: true,
      warnings: true,
      usage: true,
      quality: true,
      security: true
    },
    retention: {
      days: 30,
      maxSize: 1000000 // 1MB
    }
  },
  storage: {
    dataDir: 'docs/monitoring',
    logsDir: 'docs/logs',
    alertsDir: 'docs/alerts',
    metricsDir: 'docs/metrics'
  }
};

// Monitoring data
const monitoringData = {
  status: 'unknown',
  lastCheck: null,
  metrics: {
    performance: new Map(),
    errors: new Map(),
    warnings: new Map(),
    usage: new Map(),
    quality: new Map(),
    security: new Map()
  },
  alerts: [],
  history: [],
  thresholds: MONITORING_CONFIG.monitoring.alertThresholds
};

// Alert types
const ALERT_TYPES = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug'
};

// Documentation monitoring class
class DocumentationMonitoring {
  constructor(config = MONITORING_CONFIG) {
    this.config = config;
    this.data = monitoringData;
    this.watchers = new Map();
    this.alertQueue = [];
    this.isRunning = false;
    this.startTime = Date.now();
  }

  // Initialize monitoring system
  async initialize() {
    console.log('📊 Initializing documentation monitoring system...');
    
    try {
      // Create necessary directories
      await this.createDirectories();
      
      // Load existing data
      await this.loadExistingData();
      
      // Start monitoring
      await this.startMonitoring();
      
      console.log('✅ Monitoring system initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return false;
    }
  }

  // Create necessary directories
  async createDirectories() {
    const dirs = [
      this.config.storage.dataDir,
      this.config.storage.logsDir,
      this.config.storage.alertsDir,
      this.config.storage.metricsDir
    ];
    
    for (const dir of dirs) {
      const fullPath = join(projectRoot, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
        console.log(`  📁 Created directory: ${dir}`);
      }
    }
  }

  // Load existing data
  async loadExistingData() {
    const dataPath = join(projectRoot, this.config.storage.dataDir, 'monitoring.json');
    
    if (existsSync(dataPath)) {
      try {
        const existingData = JSON.parse(readFileSync(dataPath, 'utf8'));
        this.data = { ...this.data, ...existingData };
        console.log(`  📊 Loaded existing monitoring data`);
      } catch (error) {
        console.warn('⚠️  Could not load existing monitoring data:', error.message);
      }
    }
  }

  // Start monitoring
  async startMonitoring() {
    if (!this.config.monitoring.enabled) {
      console.log('  ⏸️  Monitoring disabled');
      return;
    }
    
    console.log('  🔍 Starting documentation monitoring...');
    
    this.isRunning = true;
    
    // Start continuous monitoring
    if (this.config.monitoring.continuous) {
      this.startContinuousMonitoring();
    }
    
    // Start real-time monitoring
    if (this.config.monitoring.realTime) {
      this.startRealTimeMonitoring();
    }
    
    // Start alert processing
    this.startAlertProcessing();
    
    console.log('  ✅ Monitoring started');
  }

  // Start continuous monitoring
  startContinuousMonitoring() {
    setInterval(async () => {
      if (this.isRunning) {
        await this.performHealthCheck();
      }
    }, this.config.monitoring.interval);
  }

  // Start real-time monitoring
  startRealTimeMonitoring() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      this.watchFile(file);
    }
  }

  // Watch individual file
  watchFile(filePath) {
    const relativePath = filePath.replace(projectRoot, '');
    
    watchFile(filePath, { interval: 1000 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        this.handleFileChange(relativePath, curr, prev);
      }
    });
    
    this.watchers.set(relativePath, filePath);
  }

  // Handle file change
  async handleFileChange(relativePath, curr, prev) {
    console.log(`  📝 File changed: ${relativePath}`);
    
    // Perform immediate health check
    await this.performHealthCheck();
    
    // Check for specific issues
    await this.checkFileIssues(relativePath);
  }

  // Perform health check
  async performHealthCheck() {
    console.log('  🔍 Performing health check...');
    
    const startTime = Date.now();
    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      issues: [],
      metrics: {}
    };
    
    try {
      // Check documentation validation
      await this.checkValidation(healthStatus);
      
      // Check link validation
      await this.checkLinks(healthStatus);
      
      // Check performance
      await this.checkPerformance(healthStatus);
      
      // Check quality
      await this.checkQuality(healthStatus);
      
      // Check security
      await this.checkSecurity(healthStatus);
      
      // Update status
      this.data.status = healthStatus.status;
      this.data.lastCheck = healthStatus.timestamp;
      
      // Store metrics
      this.storeMetrics(healthStatus);
      
      // Process alerts
      await this.processAlerts(healthStatus);
      
      console.log(`    ✅ Health check completed in ${Date.now() - startTime}ms`);
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      healthStatus.status = 'unhealthy';
      healthStatus.issues.push(`Health check failed: ${error.message}`);
    }
  }

  // Check validation
  async checkValidation(healthStatus) {
    try {
      execSync('npm run docs:validate', { cwd: projectRoot, stdio: 'pipe' });
      healthStatus.metrics.validation = { status: 'passed', errors: 0 };
    } catch (error) {
      healthStatus.status = 'unhealthy';
      healthStatus.issues.push('Documentation validation failed');
      healthStatus.metrics.validation = { status: 'failed', errors: 1 };
    }
  }

  // Check links
  async checkLinks(healthStatus) {
    try {
      execSync('npm run docs:check-links', { cwd: projectRoot, stdio: 'pipe' });
      healthStatus.metrics.links = { status: 'passed', broken: 0 };
    } catch (error) {
      healthStatus.status = 'unhealthy';
      healthStatus.issues.push('Link validation failed');
      healthStatus.metrics.links = { status: 'failed', broken: 1 };
    }
  }

  // Check performance
  async checkPerformance(healthStatus) {
    const files = this.getDocumentationFiles();
    let totalSize = 0;
    let slowFiles = 0;
    
    for (const file of files) {
      const stats = statSync(file);
      totalSize += stats.size;
      
      if (stats.size > this.data.thresholds.size) {
        slowFiles++;
      }
    }
    
    healthStatus.metrics.performance = {
      totalSize,
      slowFiles,
      avgSize: totalSize / files.length
    };
    
    if (slowFiles > 0) {
      healthStatus.issues.push(`${slowFiles} files exceed size threshold`);
    }
  }

  // Check quality
  async checkQuality(healthStatus) {
    const files = this.getDocumentationFiles();
    let qualityIssues = 0;
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for common quality issues
      const issues = this.identifyQualityIssues(content);
      qualityIssues += issues.length;
    }
    
    healthStatus.metrics.quality = {
      totalFiles: files.length,
      qualityIssues,
      qualityScore: Math.max(0, 100 - (qualityIssues / files.length) * 10)
    };
    
    if (qualityIssues > this.data.thresholds.warnings) {
      healthStatus.issues.push(`${qualityIssues} quality issues found`);
    }
  }

  // Check security
  async checkSecurity(healthStatus) {
    const files = this.getDocumentationFiles();
    let securityIssues = 0;
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      // Check for security issues
      const issues = this.identifySecurityIssues(content);
      securityIssues += issues.length;
    }
    
    healthStatus.metrics.security = {
      totalFiles: files.length,
      securityIssues,
      securityScore: Math.max(0, 100 - (securityIssues / files.length) * 20)
    };
    
    if (securityIssues > 0) {
      healthStatus.status = 'unhealthy';
      healthStatus.issues.push(`${securityIssues} security issues found`);
    }
  }

  // Identify quality issues
  identifyQualityIssues(content) {
    const issues = [];
    
    // Check for very long lines
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > 120);
    if (longLines.length > 5) {
      issues.push('Too many long lines');
    }
    
    // Check for very long paragraphs
    const paragraphs = content.split('\n\n');
    const longParagraphs = paragraphs.filter(p => p.length > 1000);
    if (longParagraphs.length > 3) {
      issues.push('Too many long paragraphs');
    }
    
    // Check for missing headings
    if (!content.match(/^#\s+.+$/m)) {
      issues.push('Missing title');
    }
    
    // Check for empty sections
    const sections = content.match(/^##\s+.+$/gm) || [];
    const emptySections = sections.filter(section => {
      const sectionContent = content.split(section)[1]?.split(/^##\s+/m)[0] || '';
      return sectionContent.trim().length < 50;
    });
    
    if (emptySections.length > 0) {
      issues.push('Empty or underdeveloped sections');
    }
    
    return issues;
  }

  // Identify security issues
  identifySecurityIssues(content) {
    const issues = [];
    
    // Check for sensitive information
    const sensitivePatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
      /secret\s*[:=]\s*['"][^'"]+['"]/gi,
      /token\s*[:=]\s*['"][^'"]+['"]/gi
    ];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        issues.push('Potential sensitive data exposure');
      }
    }
    
    // Check for potential XSS
    const xssPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(content)) {
        issues.push('Potential XSS vulnerability');
      }
    }
    
    return issues;
  }

  // Store metrics
  storeMetrics(healthStatus) {
    const timestamp = healthStatus.timestamp;
    
    // Store performance metrics
    if (healthStatus.metrics.performance) {
      this.data.metrics.performance.set(timestamp, healthStatus.metrics.performance);
    }
    
    // Store error metrics
    if (healthStatus.metrics.validation) {
      this.data.metrics.errors.set(timestamp, healthStatus.metrics.validation);
    }
    
    // Store quality metrics
    if (healthStatus.metrics.quality) {
      this.data.metrics.quality.set(timestamp, healthStatus.metrics.quality);
    }
    
    // Store security metrics
    if (healthStatus.metrics.security) {
      this.data.metrics.security.set(timestamp, healthStatus.metrics.security);
    }
    
    // Clean up old metrics
    this.cleanupOldMetrics();
  }

  // Clean up old metrics
  cleanupOldMetrics() {
    const retentionDays = this.config.metrics.retention.days;
    const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    for (const [metricType, metricMap] of this.data.metrics) {
      for (const [timestamp, value] of metricMap) {
        if (new Date(timestamp) < cutoffTime) {
          metricMap.delete(timestamp);
        }
      }
    }
  }

  // Process alerts
  async processAlerts(healthStatus) {
    if (!this.config.alerts.enabled) {
      return;
    }
    
    // Check for critical issues
    if (healthStatus.status === 'unhealthy') {
      await this.createAlert(ALERT_TYPES.CRITICAL, 'Documentation is unhealthy', healthStatus.issues);
    }
    
    // Check for performance issues
    if (healthStatus.metrics.performance?.slowFiles > 0) {
      await this.createAlert(ALERT_TYPES.WARNING, 'Performance issues detected', [`${healthStatus.metrics.performance.slowFiles} slow files`]);
    }
    
    // Check for quality issues
    if (healthStatus.metrics.quality?.qualityIssues > this.data.thresholds.warnings) {
      await this.createAlert(ALERT_TYPES.WARNING, 'Quality issues detected', [`${healthStatus.metrics.quality.qualityIssues} quality issues`]);
    }
    
    // Check for security issues
    if (healthStatus.metrics.security?.securityIssues > 0) {
      await this.createAlert(ALERT_TYPES.CRITICAL, 'Security issues detected', [`${healthStatus.metrics.security.securityIssues} security issues`]);
    }
  }

  // Create alert
  async createAlert(level, message, details = []) {
    const alert = {
      id: this.generateAlertId(),
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
      status: 'active',
      retries: 0
    };
    
    this.data.alerts.push(alert);
    this.alertQueue.push(alert);
    
    console.log(`  🚨 Alert created: [${level.toUpperCase()}] ${message}`);
    
    // Send alert immediately
    await this.sendAlert(alert);
  }

  // Generate alert ID
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Send alert
  async sendAlert(alert) {
    try {
      // Console alert
      if (this.config.alerts.channels.console) {
        console.log(`🚨 ALERT [${alert.level.toUpperCase()}]: ${alert.message}`);
        if (alert.details.length > 0) {
          console.log(`   Details: ${alert.details.join(', ')}`);
        }
      }
      
      // File alert
      if (this.config.alerts.channels.file) {
        await this.writeAlertToFile(alert);
      }
      
      // Email alert (not implemented)
      if (this.config.alerts.channels.email) {
        console.log('  📧 Email alert not implemented');
      }
      
      // Slack alert (not implemented)
      if (this.config.alerts.channels.slack) {
        console.log('  💬 Slack alert not implemented');
      }
      
      // Webhook alert (not implemented)
      if (this.config.alerts.channels.webhook) {
        console.log('  🔗 Webhook alert not implemented');
      }
      
    } catch (error) {
      console.error('❌ Failed to send alert:', error.message);
    }
  }

  // Write alert to file
  async writeAlertToFile(alert) {
    const alertPath = join(projectRoot, this.config.storage.alertsDir, `${alert.id}.json`);
    writeFileSync(alertPath, JSON.stringify(alert, null, 2));
  }

  // Start alert processing
  startAlertProcessing() {
    setInterval(async () => {
      if (this.alertQueue.length > 0) {
        const alert = this.alertQueue.shift();
        await this.processAlert(alert);
      }
    }, 1000);
  }

  // Process individual alert
  async processAlert(alert) {
    if (alert.status === 'resolved') {
      return;
    }
    
    // Check if alert needs escalation
    if (this.shouldEscalateAlert(alert)) {
      await this.escalateAlert(alert);
    }
    
    // Update alert status
    this.updateAlertStatus(alert);
  }

  // Check if alert should be escalated
  shouldEscalateAlert(alert) {
    const escalationDelay = this.config.alerts.escalation.escalationDelay;
    const alertAge = Date.now() - new Date(alert.timestamp).getTime();
    
    return alertAge > escalationDelay && alert.retries < this.config.alerts.escalation.maxRetries;
  }

  // Escalate alert
  async escalateAlert(alert) {
    alert.retries++;
    alert.level = this.getEscalatedLevel(alert.level);
    
    console.log(`  ⚠️  Escalating alert ${alert.id} to ${alert.level}`);
    
    // Send escalated alert
    await this.sendAlert(alert);
  }

  // Get escalated level
  getEscalatedLevel(currentLevel) {
    const levels = [ALERT_TYPES.DEBUG, ALERT_TYPES.INFO, ALERT_TYPES.WARNING, ALERT_TYPES.CRITICAL];
    const currentIndex = levels.indexOf(currentLevel);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  // Update alert status
  updateAlertStatus(alert) {
    // This would update the alert status based on resolution
    // For now, we'll just mark it as processed
    alert.status = 'processed';
  }

  // Check file issues
  async checkFileIssues(relativePath) {
    const filePath = join(projectRoot, relativePath);
    
    try {
      const content = readFileSync(filePath, 'utf8');
      
      // Check for immediate issues
      const issues = this.identifyQualityIssues(content);
      const securityIssues = this.identifySecurityIssues(content);
      
      if (issues.length > 0) {
        await this.createAlert(ALERT_TYPES.WARNING, `Quality issues in ${relativePath}`, issues);
      }
      
      if (securityIssues.length > 0) {
        await this.createAlert(ALERT_TYPES.CRITICAL, `Security issues in ${relativePath}`, securityIssues);
      }
      
    } catch (error) {
      await this.createAlert(ALERT_TYPES.CRITICAL, `Error reading ${relativePath}`, [error.message]);
    }
  }

  // Generate monitoring report
  async generateReport() {
    console.log('📊 Generating monitoring report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      status: this.data.status,
      lastCheck: this.data.lastCheck,
      summary: {
        totalAlerts: this.data.alerts.length,
        activeAlerts: this.data.alerts.filter(a => a.status === 'active').length,
        criticalAlerts: this.data.alerts.filter(a => a.level === ALERT_TYPES.CRITICAL).length,
        warningAlerts: this.data.alerts.filter(a => a.level === ALERT_TYPES.WARNING).length
      },
      metrics: this.getMetricsSummary(),
      alerts: this.data.alerts.slice(-10), // Last 10 alerts
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = join(projectRoot, this.config.storage.dataDir, 'monitoring-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`  📄 Report generated: ${reportPath}`);
    return report;
  }

  // Get metrics summary
  getMetricsSummary() {
    const summary = {};
    
    for (const [metricType, metricMap] of this.data.metrics) {
      const values = Array.from(metricMap.values());
      if (values.length > 0) {
        summary[metricType] = {
          count: values.length,
          latest: values[values.length - 1],
          average: this.calculateAverage(values)
        };
      }
    }
    
    return summary;
  }

  // Calculate average
  calculateAverage(values) {
    if (values.length === 0) return 0;
    
    const sum = values.reduce((acc, val) => {
      if (typeof val === 'number') return acc + val;
      if (typeof val === 'object' && val.value) return acc + val.value;
      return acc;
    }, 0);
    
    return sum / values.length;
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // Performance recommendations
    const performanceMetrics = this.data.metrics.performance;
    if (performanceMetrics.size > 0) {
      const latestPerformance = Array.from(performanceMetrics.values()).pop();
      if (latestPerformance.slowFiles > 0) {
        recommendations.push({
          category: 'performance',
          priority: 'medium',
          suggestion: 'Optimize slow-loading files',
          details: `${latestPerformance.slowFiles} files exceed size threshold`
        });
      }
    }
    
    // Quality recommendations
    const qualityMetrics = this.data.metrics.quality;
    if (qualityMetrics.size > 0) {
      const latestQuality = Array.from(qualityMetrics.values()).pop();
      if (latestQuality.qualityScore < 80) {
        recommendations.push({
          category: 'quality',
          priority: 'high',
          suggestion: 'Improve documentation quality',
          details: `Quality score: ${latestQuality.qualityScore}/100`
        });
      }
    }
    
    // Security recommendations
    const securityMetrics = this.data.metrics.security;
    if (securityMetrics.size > 0) {
      const latestSecurity = Array.from(securityMetrics.values()).pop();
      if (latestSecurity.securityIssues > 0) {
        recommendations.push({
          category: 'security',
          priority: 'critical',
          suggestion: 'Fix security issues immediately',
          details: `${latestSecurity.securityIssues} security issues found`
        });
      }
    }
    
    return recommendations;
  }

  // Stop monitoring
  stopMonitoring() {
    console.log('🛑 Stopping documentation monitoring...');
    
    this.isRunning = false;
    
    // Stop file watchers
    for (const [relativePath, filePath] of this.watchers) {
      unwatchFile(filePath);
    }
    
    this.watchers.clear();
    
    // Save final data
    this.saveData();
    
    console.log('✅ Monitoring stopped');
  }

  // Save data
  saveData() {
    const dataPath = join(projectRoot, this.config.storage.dataDir, 'monitoring.json');
    
    // Convert Maps to Objects for JSON serialization
    const serializableData = {
      ...this.data,
      metrics: Object.fromEntries(
        Array.from(this.data.metrics.entries()).map(([type, map]) => [
          type,
          Object.fromEntries(map)
        ])
      )
    };
    
    writeFileSync(dataPath, JSON.stringify(serializableData, null, 2));
    console.log(`  💾 Monitoring data saved: ${dataPath}`);
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
  const monitoring = new DocumentationMonitoring();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'init':
      monitoring.initialize();
      break;
    case 'start':
      monitoring.startMonitoring();
      break;
    case 'stop':
      monitoring.stopMonitoring();
      break;
    case 'check':
      monitoring.performHealthCheck();
      break;
    case 'report':
      monitoring.generateReport();
      break;
    case 'status':
      console.log(`Status: ${monitoring.data.status}`);
      console.log(`Last Check: ${monitoring.data.lastCheck}`);
      console.log(`Active Alerts: ${monitoring.data.alerts.filter(a => a.status === 'active').length}`);
      break;
    default:
      console.log('Usage: monitor-docs.js <command> [args]');
      console.log('Commands:');
      console.log('  init                    Initialize monitoring system');
      console.log('  start                   Start monitoring');
      console.log('  stop                    Stop monitoring');
      console.log('  check                   Perform health check');
      console.log('  report                  Generate monitoring report');
      console.log('  status                  Show monitoring status');
      break;
  }
}

export default DocumentationMonitoring;


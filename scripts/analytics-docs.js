#!/usr/bin/env node

/**
 * Documentation Analytics and Usage Tracking
 * 
 * Comprehensive analytics system for documentation usage and performance
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Analytics configuration
const ANALYTICS_CONFIG = {
  tracking: {
    enabled: true,
    collectUsage: true,
    collectPerformance: true,
    collectErrors: true,
    collectFeedback: true,
    anonymize: true
  },
  metrics: {
    pageViews: true,
    timeOnPage: true,
    bounceRate: true,
    searchQueries: true,
    linkClicks: true,
    downloads: true,
    errors: true
  },
  storage: {
    dataDir: 'docs/analytics',
    reportsDir: 'docs/reports',
    exportsDir: 'docs/exports',
    retentionDays: 90
  },
  reporting: {
    generateDaily: true,
    generateWeekly: true,
    generateMonthly: true,
    exportFormats: ['json', 'csv', 'html']
  },
  privacy: {
    respectDoNotTrack: true,
    anonymizeIPs: true,
    hashUserAgents: true,
    dataRetention: 90
  }
};

// Analytics data structure
const analyticsData = {
  metadata: {
    version: '1.0.0',
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    totalEvents: 0
  },
  events: [],
  metrics: {
    pageViews: new Map(),
    timeOnPage: new Map(),
    bounceRate: new Map(),
    searchQueries: new Map(),
    linkClicks: new Map(),
    downloads: new Map(),
    errors: new Map()
  },
  users: new Map(),
  sessions: new Map()
};

// Documentation analytics class
class DocumentationAnalytics {
  constructor(config = ANALYTICS_CONFIG) {
    this.config = config;
    this.data = analyticsData;
    this.startTime = Date.now();
  }

  // Initialize analytics system
  async initialize() {
    console.log('📊 Initializing documentation analytics system...');
    
    try {
      // Create necessary directories
      await this.createDirectories();
      
      // Load existing data
      await this.loadExistingData();
      
      // Start tracking
      await this.startTracking();
      
      console.log('✅ Analytics system initialized');
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
      this.config.storage.reportsDir,
      this.config.storage.exportsDir
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
    const dataPath = join(projectRoot, this.config.storage.dataDir, 'analytics.json');
    
    if (existsSync(dataPath)) {
      try {
        const existingData = JSON.parse(readFileSync(dataPath, 'utf8'));
        this.data = { ...this.data, ...existingData };
        console.log(`  📊 Loaded existing analytics data: ${this.data.events.length} events`);
      } catch (error) {
        console.warn('⚠️  Could not load existing analytics data:', error.message);
      }
    }
  }

  // Start tracking
  async startTracking() {
    if (!this.config.tracking.enabled) {
      console.log('  ⏸️  Tracking disabled');
      return;
    }
    
    console.log('  🔍 Starting analytics tracking...');
    
    // Track page views
    if (this.config.metrics.pageViews) {
      await this.trackPageViews();
    }
    
    // Track performance
    if (this.config.metrics.performance) {
      await this.trackPerformance();
    }
    
    // Track errors
    if (this.config.metrics.errors) {
      await this.trackErrors();
    }
    
    console.log('  ✅ Tracking started');
  }

  // Track page views
  async trackPageViews() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const relativePath = file.replace(projectRoot, '');
      const stats = statSync(file);
      
      // Simulate page view (in real implementation, this would come from web analytics)
      const pageView = {
        type: 'page_view',
        page: relativePath,
        timestamp: new Date().toISOString(),
        userAgent: 'analytics-script',
        referrer: null,
        sessionId: this.generateSessionId(),
        userId: this.generateUserId()
      };
      
      this.recordEvent(pageView);
      
      // Update page view metrics
      const currentViews = this.data.metrics.pageViews.get(relativePath) || 0;
      this.data.metrics.pageViews.set(relativePath, currentViews + 1);
    }
  }

  // Track performance
  async trackPerformance() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const relativePath = file.replace(projectRoot, '');
      const stats = statSync(file);
      
      // Calculate performance metrics
      const performance = {
        type: 'performance',
        page: relativePath,
        timestamp: new Date().toISOString(),
        metrics: {
          fileSize: stats.size,
          loadTime: this.estimateLoadTime(stats.size),
          complexity: this.calculateComplexity(file),
          readability: this.calculateReadability(file)
        }
      };
      
      this.recordEvent(performance);
    }
  }

  // Track errors
  async trackErrors() {
    // Track documentation validation errors
    try {
      const validationResult = execSync('npm run docs:validate', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
    } catch (error) {
      const errorEvent = {
        type: 'error',
        category: 'validation',
        message: error.message,
        timestamp: new Date().toISOString(),
        severity: 'medium'
      };
      
      this.recordEvent(errorEvent);
    }
  }

  // Record event
  recordEvent(event) {
    event.id = this.generateEventId();
    event.timestamp = new Date().toISOString();
    
    this.data.events.push(event);
    this.data.metadata.totalEvents++;
    this.data.metadata.lastUpdated = new Date().toISOString();
    
    // Update metrics based on event type
    this.updateMetrics(event);
  }

  // Update metrics
  updateMetrics(event) {
    switch (event.type) {
      case 'page_view':
        this.updatePageViewMetrics(event);
        break;
      case 'performance':
        this.updatePerformanceMetrics(event);
        break;
      case 'error':
        this.updateErrorMetrics(event);
        break;
      case 'search':
        this.updateSearchMetrics(event);
        break;
      case 'link_click':
        this.updateLinkClickMetrics(event);
        break;
      case 'download':
        this.updateDownloadMetrics(event);
        break;
    }
  }

  // Update page view metrics
  updatePageViewMetrics(event) {
    const page = event.page;
    const currentViews = this.data.metrics.pageViews.get(page) || 0;
    this.data.metrics.pageViews.set(page, currentViews + 1);
  }

  // Update performance metrics
  updatePerformanceMetrics(event) {
    const page = event.page;
    const metrics = event.metrics;
    
    // Update time on page
    const currentTime = this.data.metrics.timeOnPage.get(page) || 0;
    this.data.metrics.timeOnPage.set(page, currentTime + metrics.loadTime);
    
    // Update bounce rate (simplified)
    const currentBounces = this.data.metrics.bounceRate.get(page) || 0;
    if (metrics.loadTime < 1000) { // Less than 1 second = bounce
      this.data.metrics.bounceRate.set(page, currentBounces + 1);
    }
  }

  // Update error metrics
  updateErrorMetrics(event) {
    const category = event.category;
    const currentErrors = this.data.metrics.errors.get(category) || 0;
    this.data.metrics.errors.set(category, currentErrors + 1);
  }

  // Update search metrics
  updateSearchMetrics(event) {
    const query = event.query;
    const currentSearches = this.data.metrics.searchQueries.get(query) || 0;
    this.data.metrics.searchQueries.set(query, currentSearches + 1);
  }

  // Update link click metrics
  updateLinkClickMetrics(event) {
    const link = event.link;
    const currentClicks = this.data.metrics.linkClicks.get(link) || 0;
    this.data.metrics.linkClicks.set(link, currentClicks + 1);
  }

  // Update download metrics
  updateDownloadMetrics(event) {
    const file = event.file;
    const currentDownloads = this.data.metrics.downloads.get(file) || 0;
    this.data.metrics.downloads.set(file, currentDownloads + 1);
  }

  // Generate event ID
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate session ID
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate user ID
  generateUserId() {
    return `user_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Estimate load time
  estimateLoadTime(fileSize) {
    // Simple estimation based on file size
    const baseTime = 100; // Base load time in ms
    const sizeFactor = fileSize / 1024; // KB
    return Math.round(baseTime + sizeFactor * 2);
  }

  // Calculate complexity
  calculateComplexity(file) {
    try {
      const content = readFileSync(file, 'utf8');
      
      // Simple complexity calculation
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).length;
      const headings = content.match(/^#+\s+/gm)?.length || 0;
      const codeBlocks = content.match(/```/g)?.length || 0;
      
      // Complexity score (0-100)
      const score = Math.min(100, (lines * 0.1) + (words * 0.01) + (headings * 2) + (codeBlocks * 1));
      
      return Math.round(score);
    } catch (error) {
      return 0;
    }
  }

  // Calculate readability
  calculateReadability(file) {
    try {
      const content = readFileSync(file, 'utf8');
      
      // Simple readability calculation (Flesch Reading Ease approximation)
      const sentences = content.match(/[.!?]+/g)?.length || 1;
      const words = content.split(/\s+/).length;
      const syllables = this.estimateSyllables(content);
      
      // Flesch Reading Ease formula
      const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
      
      return Math.max(0, Math.min(100, Math.round(score)));
    } catch (error) {
      return 0;
    }
  }

  // Estimate syllables
  estimateSyllables(text) {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    let syllables = 0;
    
    for (const word of words) {
      // Simple syllable estimation
      const vowels = word.match(/[aeiouy]+/g) || [];
      syllables += vowels.length;
      
      // Adjust for silent 'e'
      if (word.endsWith('e')) {
        syllables--;
      }
    }
    
    return Math.max(1, syllables);
  }

  // Generate reports
  async generateReports() {
    console.log('📊 Generating analytics reports...');
    
    try {
      // Generate daily report
      if (this.config.reporting.generateDaily) {
        await this.generateDailyReport();
      }
      
      // Generate weekly report
      if (this.config.reporting.generateWeekly) {
        await this.generateWeeklyReport();
      }
      
      // Generate monthly report
      if (this.config.reporting.generateMonthly) {
        await this.generateMonthlyReport();
      }
      
      // Generate summary report
      await this.generateSummaryReport();
      
      console.log('✅ Reports generated successfully');
      
    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
    }
  }

  // Generate daily report
  async generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const report = {
      date: today,
      type: 'daily',
      summary: this.getDailySummary(today),
      topPages: this.getTopPages(10),
      topErrors: this.getTopErrors(5),
      performance: this.getPerformanceMetrics()
    };
    
    const reportPath = join(projectRoot, this.config.storage.reportsDir, `daily-${today}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`  📄 Daily report generated: ${reportPath}`);
  }

  // Generate weekly report
  async generateWeeklyReport() {
    const weekStart = this.getWeekStart();
    const report = {
      week: weekStart,
      type: 'weekly',
      summary: this.getWeeklySummary(weekStart),
      trends: this.getTrends(7),
      insights: this.getInsights()
    };
    
    const reportPath = join(projectRoot, this.config.storage.reportsDir, `weekly-${weekStart}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`  📄 Weekly report generated: ${reportPath}`);
  }

  // Generate monthly report
  async generateMonthlyReport() {
    const monthStart = this.getMonthStart();
    const report = {
      month: monthStart,
      type: 'monthly',
      summary: this.getMonthlySummary(monthStart),
      trends: this.getTrends(30),
      recommendations: this.getRecommendations()
    };
    
    const reportPath = join(projectRoot, this.config.storage.reportsDir, `monthly-${monthStart}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`  📄 Monthly report generated: ${reportPath}`);
  }

  // Generate summary report
  async generateSummaryReport() {
    const report = {
      generated: new Date().toISOString(),
      type: 'summary',
      overview: this.getOverview(),
      metrics: this.getAllMetrics(),
      recommendations: this.getRecommendations()
    };
    
    const reportPath = join(projectRoot, this.config.storage.reportsDir, 'summary.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`  📄 Summary report generated: ${reportPath}`);
  }

  // Get daily summary
  getDailySummary(date) {
    const dayEvents = this.data.events.filter(e => e.timestamp.startsWith(date));
    
    return {
      totalEvents: dayEvents.length,
      pageViews: dayEvents.filter(e => e.type === 'page_view').length,
      errors: dayEvents.filter(e => e.type === 'error').length,
      uniquePages: new Set(dayEvents.filter(e => e.type === 'page_view').map(e => e.page)).size,
      avgLoadTime: this.calculateAverageLoadTime(dayEvents)
    };
  }

  // Get weekly summary
  getWeeklySummary(weekStart) {
    const weekEvents = this.data.events.filter(e => e.timestamp >= weekStart);
    
    return {
      totalEvents: weekEvents.length,
      pageViews: weekEvents.filter(e => e.type === 'page_view').length,
      errors: weekEvents.filter(e => e.type === 'error').length,
      uniquePages: new Set(weekEvents.filter(e => e.type === 'page_view').map(e => e.page)).size,
      avgLoadTime: this.calculateAverageLoadTime(weekEvents)
    };
  }

  // Get monthly summary
  getMonthlySummary(monthStart) {
    const monthEvents = this.data.events.filter(e => e.timestamp >= monthStart);
    
    return {
      totalEvents: monthEvents.length,
      pageViews: monthEvents.filter(e => e.type === 'page_view').length,
      errors: monthEvents.filter(e => e.type === 'error').length,
      uniquePages: new Set(monthEvents.filter(e => e.type === 'page_view').map(e => e.page)).size,
      avgLoadTime: this.calculateAverageLoadTime(monthEvents)
    };
  }

  // Get top pages
  getTopPages(limit = 10) {
    const pageViews = Array.from(this.data.metrics.pageViews.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    return pageViews.map(([page, views]) => ({ page, views }));
  }

  // Get top errors
  getTopErrors(limit = 5) {
    const errors = Array.from(this.data.metrics.errors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    return errors.map(([category, count]) => ({ category, count }));
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const pages = Array.from(this.data.metrics.timeOnPage.keys());
    
    return pages.map(page => ({
      page,
      avgTime: this.data.metrics.timeOnPage.get(page) || 0,
      bounceRate: this.data.metrics.bounceRate.get(page) || 0,
      complexity: this.calculateComplexity(join(projectRoot, page)),
      readability: this.calculateReadability(join(projectRoot, page))
    }));
  }

  // Get trends
  getTrends(days) {
    const trends = [];
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEvents = this.data.events.filter(e => e.timestamp.startsWith(dateStr));
      
      trends.push({
        date: dateStr,
        pageViews: dayEvents.filter(e => e.type === 'page_view').length,
        errors: dayEvents.filter(e => e.type === 'error').length
      });
    }
    
    return trends;
  }

  // Get insights
  getInsights() {
    const insights = [];
    
    // Most popular pages
    const topPages = this.getTopPages(3);
    if (topPages.length > 0) {
      insights.push({
        type: 'popular_pages',
        message: `Most popular pages: ${topPages.map(p => p.page).join(', ')}`,
        priority: 'info'
      });
    }
    
    // Error patterns
    const topErrors = this.getTopErrors(3);
    if (topErrors.length > 0) {
      insights.push({
        type: 'error_patterns',
        message: `Common errors: ${topErrors.map(e => e.category).join(', ')}`,
        priority: 'warning'
      });
    }
    
    // Performance issues
    const performanceIssues = this.getPerformanceMetrics().filter(p => p.avgTime > 5000);
    if (performanceIssues.length > 0) {
      insights.push({
        type: 'performance',
        message: `Slow pages: ${performanceIssues.map(p => p.page).join(', ')}`,
        priority: 'warning'
      });
    }
    
    return insights;
  }

  // Get recommendations
  getRecommendations() {
    const recommendations = [];
    
    // Content recommendations
    const lowReadability = this.getPerformanceMetrics().filter(p => p.readability < 30);
    if (lowReadability.length > 0) {
      recommendations.push({
        category: 'content',
        priority: 'high',
        suggestion: 'Improve readability of pages with low scores',
        pages: lowReadability.map(p => p.page)
      });
    }
    
    // Performance recommendations
    const slowPages = this.getPerformanceMetrics().filter(p => p.avgTime > 3000);
    if (slowPages.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        suggestion: 'Optimize slow-loading pages',
        pages: slowPages.map(p => p.page)
      });
    }
    
    // Error recommendations
    const errorPages = this.getTopErrors(3);
    if (errorPages.length > 0) {
      recommendations.push({
        category: 'errors',
        priority: 'high',
        suggestion: 'Fix common errors and improve error handling',
        errors: errorPages.map(e => e.category)
      });
    }
    
    return recommendations;
  }

  // Get overview
  getOverview() {
    return {
      totalEvents: this.data.metadata.totalEvents,
      totalPages: this.data.metrics.pageViews.size,
      totalErrors: Array.from(this.data.metrics.errors.values()).reduce((a, b) => a + b, 0),
      avgLoadTime: this.calculateAverageLoadTime(this.data.events),
      dataRetention: this.config.privacy.dataRetention
    };
  }

  // Get all metrics
  getAllMetrics() {
    return {
      pageViews: Object.fromEntries(this.data.metrics.pageViews),
      timeOnPage: Object.fromEntries(this.data.metrics.timeOnPage),
      bounceRate: Object.fromEntries(this.data.metrics.bounceRate),
      searchQueries: Object.fromEntries(this.data.metrics.searchQueries),
      linkClicks: Object.fromEntries(this.data.metrics.linkClicks),
      downloads: Object.fromEntries(this.data.metrics.downloads),
      errors: Object.fromEntries(this.data.metrics.errors)
    };
  }

  // Calculate average load time
  calculateAverageLoadTime(events) {
    const performanceEvents = events.filter(e => e.type === 'performance' && e.metrics?.loadTime);
    if (performanceEvents.length === 0) return 0;
    
    const totalTime = performanceEvents.reduce((sum, e) => sum + e.metrics.loadTime, 0);
    return Math.round(totalTime / performanceEvents.length);
  }

  // Get week start
  getWeekStart() {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day;
    const weekStart = new Date(date.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }

  // Get month start
  getMonthStart() {
    const date = new Date();
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    return monthStart.toISOString().split('T')[0];
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

  // Save data
  async saveData() {
    const dataPath = join(projectRoot, this.config.storage.dataDir, 'analytics.json');
    writeFileSync(dataPath, JSON.stringify(this.data, null, 2));
    console.log(`  💾 Analytics data saved: ${dataPath}`);
  }

  // Export data
  async exportData(format = 'json') {
    console.log(`📤 Exporting analytics data in ${format} format...`);
    
    const exportPath = join(projectRoot, this.config.storage.exportsDir, `analytics-${Date.now()}.${format}`);
    
    switch (format) {
      case 'json':
        writeFileSync(exportPath, JSON.stringify(this.data, null, 2));
        break;
      case 'csv':
        await this.exportToCSV(exportPath);
        break;
      case 'html':
        await this.exportToHTML(exportPath);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    console.log(`  📄 Data exported: ${exportPath}`);
  }

  // Export to CSV
  async exportToCSV(exportPath) {
    const csvData = this.data.events.map(event => ({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      page: event.page || '',
      userAgent: event.userAgent || '',
      sessionId: event.sessionId || '',
      userId: event.userId || ''
    }));
    
    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    writeFileSync(exportPath, csv);
  }

  // Export to HTML
  async exportToHTML(exportPath) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Documentation Analytics Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .metric { margin: 10px 0; }
        .chart { width: 100%; height: 300px; background: #f9f9f9; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Documentation Analytics Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="metric">
        <h3>Overview</h3>
        <p>Total Events: ${this.data.metadata.totalEvents}</p>
        <p>Total Pages: ${this.data.metrics.pageViews.size}</p>
        <p>Total Errors: ${Array.from(this.data.metrics.errors.values()).reduce((a, b) => a + b, 0)}</p>
    </div>
    
    <div class="metric">
        <h3>Top Pages</h3>
        <ul>
            ${this.getTopPages(10).map(p => `<li>${p.page}: ${p.views} views</li>`).join('')}
        </ul>
    </div>
    
    <div class="metric">
        <h3>Error Summary</h3>
        <ul>
            ${this.getTopErrors(5).map(e => `<li>${e.category}: ${e.count} errors</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;
    
    writeFileSync(exportPath, html);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const analytics = new DocumentationAnalytics();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'init':
      analytics.initialize();
      break;
    case 'track':
      analytics.startTracking();
      break;
    case 'report':
      analytics.generateReports();
      break;
    case 'export':
      const format = args[0] || 'json';
      analytics.exportData(format);
      break;
    case 'save':
      analytics.saveData();
      break;
    default:
      console.log('Usage: analytics-docs.js <command> [args]');
      console.log('Commands:');
      console.log('  init                    Initialize analytics system');
      console.log('  track                   Start tracking');
      console.log('  report                  Generate reports');
      console.log('  export [format]         Export data (json|csv|html)');
      console.log('  save                    Save current data');
      break;
  }
}

export default DocumentationAnalytics;


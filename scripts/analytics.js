#!/usr/bin/env node

/**
 * Documentation Analytics Tracking
 * 
 * Integrates documentation analytics tracking for usage metrics and insights
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from require('child_process');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Analytics configuration
const ANALYTICS_CONFIG = {
  tracking: {
    enabled: true,
    providers: ['google', 'plausible', 'custom'],
    privacy: 'first-party', // first-party, third-party, none
    anonymize: true,
    retention: 365 // days
  },
  metrics: {
    pageViews: true,
    uniqueVisitors: true,
    timeOnPage: true,
    bounceRate: true,
    searchQueries: true,
    linkClicks: true,
    downloads: true,
    errors: true
  },
  events: {
    pageView: 'page_view',
    search: 'search',
    linkClick: 'link_click',
    download: 'download',
    error: 'error',
    feedback: 'feedback'
  },
  reporting: {
    frequency: 'daily', // daily, weekly, monthly
    format: 'json', // json, csv, html
    destination: 'docs/analytics/',
    email: false,
    webhook: false
  }
};

// Analytics tracking class
class DocumentationAnalytics {
  constructor(config = ANALYTICS_CONFIG) {
    this.config = config;
    this.data = {
      pageViews: {},
      uniqueVisitors: {},
      timeOnPage: {},
      bounceRate: {},
      searchQueries: {},
      linkClicks: {},
      downloads: {},
      errors: {}
    };
    this.events = [];
  }

  // Initialize analytics
  initialize() {
    console.log('📊 Initializing documentation analytics...');
    
    // Create analytics directory
    this.createAnalyticsDirectory();
    
    // Generate tracking code
    this.generateTrackingCode();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start data collection
    this.startDataCollection();
    
    console.log('✅ Analytics initialized');
  }

  // Create analytics directory
  createAnalyticsDirectory() {
    try {
      const analyticsDir = join(projectRoot, this.config.reporting.destination);
      if (!statSync(analyticsDir)) {
        mkdirSync(analyticsDir, { recursive: true });
      }
      console.log(`  📁 Created analytics directory: ${analyticsDir}`);
    } catch (error) {
      console.warn(`  ⚠️  Could not create analytics directory: ${error.message}`);
    }
  }

  // Generate tracking code
  generateTrackingCode() {
    const trackingCode = this.generateGoogleAnalytics();
    const trackingPath = join(projectRoot, 'docs/analytics/tracking.js');
    writeFileSync(trackingPath, trackingCode);
    console.log(`  📝 Generated tracking code: ${trackingPath}`);
  }

  // Generate Google Analytics tracking code
  generateGoogleAnalytics() {
    return `// Documentation Analytics Tracking
(function() {
  'use strict';
  
  // Configuration
  const config = {
    trackingId: 'GA_MEASUREMENT_ID',
    anonymizeIp: true,
    cookieExpires: 365,
    debug: false
  };
  
  // Initialize Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('config', config.trackingId, {
      anonymize_ip: config.anonymizeIp,
      cookie_expires: config.cookieExpires
    });
  }
  
  // Track page views
  function trackPageView(page) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: page
      });
    }
  }
  
  // Track search queries
  function trackSearch(query) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'search', {
        search_term: query
      });
    }
  }
  
  // Track link clicks
  function trackLinkClick(linkText, linkUrl) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'link_click', {
        link_text: linkText,
        link_url: linkUrl
      });
    }
  }
  
  // Track downloads
  function trackDownload(fileName, fileType) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'file_download', {
        file_name: fileName,
        file_type: fileType
      });
    }
  }
  
  // Track errors
  function trackError(errorMessage, errorSource) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'exception', {
        description: errorMessage,
        fatal: false,
        custom_parameter: errorSource
      });
    }
  }
  
  // Set up event listeners
  document.addEventListener('DOMContentLoaded', function() {
    // Track page view
    trackPageView(window.location.pathname);
    
    // Track search queries
    const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search"]');
    searchInputs.forEach(input => {
      input.addEventListener('change', function() {
        if (this.value.trim()) {
          trackSearch(this.value.trim());
        }
      });
    });
    
    // Track link clicks
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      link.addEventListener('click', function() {
        trackLinkClick(this.textContent.trim(), this.href);
      });
    });
    
    // Track downloads
    const downloadLinks = document.querySelectorAll('a[download], a[href$=".pdf"], a[href$=".zip"]');
    downloadLinks.forEach(link => {
      link.addEventListener('click', function() {
        const fileName = this.download || this.href.split('/').pop();
        const fileType = fileName.split('.').pop();
        trackDownload(fileName, fileType);
      });
    });
    
    // Track errors
    window.addEventListener('error', function(event) {
      trackError(event.message, event.filename);
    });
  });
  
  // Export functions for manual tracking
  window.DocAnalytics = {
    trackPageView,
    trackSearch,
    trackLinkClick,
    trackDownload,
    trackError
  };
})();
`;
  }

  // Set up event listeners
  setupEventListeners() {
    // This would be implemented in a real application
    console.log('  🔗 Event listeners set up');
  }

  // Start data collection
  startDataCollection() {
    // This would be implemented in a real application
    console.log('  📊 Data collection started');
  }

  // Track event
  trackEvent(eventType, data = {}) {
    const event = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    };
    
    this.events.push(event);
    
    // Store event
    this.storeEvent(event);
    
    // Update metrics
    this.updateMetrics(event);
  }

  // Get session ID
  getSessionId() {
    // This would be implemented in a real application
    return 'session_' + Date.now();
  }

  // Get user ID
  getUserId() {
    // This would be implemented in a real application
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  // Store event
  storeEvent(event) {
    try {
      const eventsPath = join(projectRoot, 'docs/analytics/events.json');
      let events = [];
      
      if (statSync(eventsPath)) {
        events = JSON.parse(readFileSync(eventsPath, 'utf8'));
      }
      
      events.push(event);
      
      writeFileSync(eventsPath, JSON.stringify(events, null, 2));
    } catch (error) {
      console.warn(`⚠️  Could not store event: ${error.message}`);
    }
  }

  // Update metrics
  updateMetrics(event) {
    switch (event.type) {
      case 'page_view':
        this.updatePageViewMetrics(event);
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
      case 'error':
        this.updateErrorMetrics(event);
        break;
    }
  }

  // Update page view metrics
  updatePageViewMetrics(event) {
    const page = event.data.page || 'unknown';
    
    if (!this.data.pageViews[page]) {
      this.data.pageViews[page] = 0;
    }
    this.data.pageViews[page]++;
    
    if (!this.data.uniqueVisitors[page]) {
      this.data.uniqueVisitors[page] = new Set();
    }
    this.data.uniqueVisitors[page].add(event.userId);
  }

  // Update search metrics
  updateSearchMetrics(event) {
    const query = event.data.search_term || 'unknown';
    
    if (!this.data.searchQueries[query]) {
      this.data.searchQueries[query] = 0;
    }
    this.data.searchQueries[query]++;
  }

  // Update link click metrics
  updateLinkClickMetrics(event) {
    const link = event.data.link_url || 'unknown';
    
    if (!this.data.linkClicks[link]) {
      this.data.linkClicks[link] = 0;
    }
    this.data.linkClicks[link]++;
  }

  // Update download metrics
  updateDownloadMetrics(event) {
    const file = event.data.file_name || 'unknown';
    
    if (!this.data.downloads[file]) {
      this.data.downloads[file] = 0;
    }
    this.data.downloads[file]++;
  }

  // Update error metrics
  updateErrorMetrics(event) {
    const error = event.data.description || 'unknown';
    
    if (!this.data.errors[error]) {
      this.data.errors[error] = 0;
    }
    this.data.errors[error]++;
  }

  // Generate report
  generateReport() {
    console.log('📊 Generating analytics report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      period: 'all-time',
      metrics: {
        totalPageViews: Object.values(this.data.pageViews).reduce((a, b) => a + b, 0),
        totalUniqueVisitors: Object.values(this.data.uniqueVisitors).reduce((a, b) => a + b.size, 0),
        totalSearches: Object.values(this.data.searchQueries).reduce((a, b) => a + b, 0),
        totalLinkClicks: Object.values(this.data.linkClicks).reduce((a, b) => a + b, 0),
        totalDownloads: Object.values(this.data.downloads).reduce((a, b) => a + b, 0),
        totalErrors: Object.values(this.data.errors).reduce((a, b) => a + b, 0)
      },
      topPages: this.getTopPages(),
      topSearches: this.getTopSearches(),
      topDownloads: this.getTopDownloads(),
      topErrors: this.getTopErrors()
    };
    
    const reportPath = join(projectRoot, 'docs/analytics/report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`  📝 Report generated: ${reportPath}`);
    console.log(`  📊 Total page views: ${report.metrics.totalPageViews}`);
    console.log(`  👥 Unique visitors: ${report.metrics.totalUniqueVisitors}`);
    console.log(`  🔍 Total searches: ${report.metrics.totalSearches}`);
    console.log(`  🔗 Total link clicks: ${report.metrics.totalLinkClicks}`);
    console.log(`  📥 Total downloads: ${report.metrics.totalDownloads}`);
    console.log(`  ❌ Total errors: ${report.metrics.totalErrors}`);
  }

  // Get top pages
  getTopPages() {
    return Object.entries(this.data.pageViews)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));
  }

  // Get top searches
  getTopSearches() {
    return Object.entries(this.data.searchQueries)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));
  }

  // Get top downloads
  getTopDownloads() {
    return Object.entries(this.data.downloads)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([file, downloads]) => ({ file, downloads }));
  }

  // Get top errors
  getTopErrors() {
    return Object.entries(this.data.errors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));
  }

  // Export data
  exportData(format = 'json') {
    console.log(`📤 Exporting analytics data in ${format} format...`);
    
    const data = {
      timestamp: new Date().toISOString(),
      events: this.events,
      metrics: this.data
    };
    
    let content;
    let extension;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        extension = 'json';
        break;
      case 'csv':
        content = this.convertToCSV(data);
        extension = 'csv';
        break;
      case 'html':
        content = this.convertToHTML(data);
        extension = 'html';
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    const exportPath = join(projectRoot, `docs/analytics/export.${extension}`);
    writeFileSync(exportPath, content);
    
    console.log(`  📝 Data exported: ${exportPath}`);
  }

  // Convert to CSV
  convertToCSV(data) {
    // Simple CSV conversion - can be enhanced
    const headers = ['timestamp', 'type', 'data', 'sessionId', 'userId'];
    const rows = data.events.map(event => [
      event.timestamp,
      event.type,
      JSON.stringify(event.data),
      event.sessionId,
      event.userId
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Convert to HTML
  convertToHTML(data) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Documentation Analytics Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Documentation Analytics Report</h1>
    <p>Generated: ${data.timestamp}</p>
    
    <h2>Summary</h2>
    <ul>
        <li>Total Events: ${data.events.length}</li>
        <li>Total Page Views: ${Object.values(data.metrics.pageViews).reduce((a, b) => a + b, 0)}</li>
        <li>Total Unique Visitors: ${Object.values(data.metrics.uniqueVisitors).reduce((a, b) => a + b.size, 0)}</li>
    </ul>
    
    <h2>Recent Events</h2>
    <table>
        <tr>
            <th>Timestamp</th>
            <th>Type</th>
            <th>Data</th>
        </tr>
        ${data.events.slice(-10).map(event => `
        <tr>
            <td>${event.timestamp}</td>
            <td>${event.type}</td>
            <td>${JSON.stringify(event.data)}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const analytics = new DocumentationAnalytics();
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'init':
      analytics.initialize();
      break;
    case 'report':
      analytics.generateReport();
      break;
    case 'export':
      const format = arg || 'json';
      analytics.exportData(format);
      break;
    default:
      console.log('Usage: node analytics.js [init|report|export] [format]');
      console.log('Commands:');
      console.log('  init           - Initialize analytics');
      console.log('  report         - Generate analytics report');
      console.log('  export [format] - Export data (json|csv|html)');
  }
}

export default DocumentationAnalytics;


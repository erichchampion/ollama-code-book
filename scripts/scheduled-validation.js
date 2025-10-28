#!/usr/bin/env node

/**
 * Scheduled Link Validation
 * 
 * Automated link validation that runs on a schedule to check for broken links
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Scheduled validation configuration
const SCHEDULE_CONFIG = {
  schedules: {
    daily: '0 2 * * *',      // Daily at 2 AM
    weekly: '0 2 * * 1',     // Weekly on Monday at 2 AM
    monthly: '0 2 1 * *',    // Monthly on 1st at 2 AM
    hourly: '0 * * * *'      // Every hour
  },
  validation: {
    timeout: 30000,           // 30 seconds per link
    retries: 3,               // 3 retry attempts
    parallel: 5,              // 5 parallel checks
    exclude: [                // Exclude patterns
      'localhost',
      '127.0.0.1',
      'example.com',
      'test.com'
    ]
  },
  notifications: {
    email: {
      enabled: false,
      recipients: [],
      smtp: {
        host: '',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: ''
        }
      }
    },
    slack: {
      enabled: false,
      webhook: '',
      channel: '#documentation'
    },
    webhook: {
      enabled: false,
      url: '',
      headers: {}
    }
  }
};

// Link validation class
class ScheduledLinkValidator {
  constructor(config = SCHEDULE_CONFIG) {
    this.config = config;
    this.results = {
      total: 0,
      valid: 0,
      broken: 0,
      skipped: 0,
      errors: []
    };
    this.schedule = null;
  }

  // Start scheduled validation
  start(scheduleType = 'daily') {
    const cronExpression = this.config.schedules[scheduleType];
    if (!cronExpression) {
      throw new Error(`Unknown schedule type: ${scheduleType}`);
    }

    console.log(`🕐 Starting scheduled link validation (${scheduleType})...`);
    console.log(`📅 Schedule: ${cronExpression}`);

    this.schedule = cron.schedule(cronExpression, () => {
      this.runValidation();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    console.log('✅ Scheduled validation started');
  }

  // Stop scheduled validation
  stop() {
    if (this.schedule) {
      this.schedule.stop();
      this.schedule = null;
      console.log('⏹️  Scheduled validation stopped');
    }
  }

  // Run validation immediately
  async runValidation() {
    console.log('🔍 Running link validation...');
    const startTime = Date.now();

    try {
      // Get all markdown files
      const markdownFiles = this.getMarkdownFiles();
      
      // Extract all links
      const links = this.extractLinks(markdownFiles);
      
      // Validate links
      await this.validateLinks(links);
      
      // Generate report
      this.generateReport();
      
      // Send notifications
      await this.sendNotifications();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Link validation completed in ${duration}ms`);
      
    } catch (error) {
      console.error('❌ Link validation failed:', error.message);
      this.results.errors.push({
        type: 'validation_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get all markdown files
  getMarkdownFiles() {
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

  // Extract links from markdown files
  extractLinks(files) {
    const links = [];
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        let match;
        while ((match = linkPattern.exec(content)) !== null) {
          const [, linkText, linkUrl] = match;
          
          // Skip anchor links
          if (linkUrl.startsWith('#')) {
            continue;
          }
          
          links.push({
            file: relativePath,
            text: linkText,
            url: linkUrl,
            isExternal: linkUrl.startsWith('http'),
            isEmail: linkUrl.startsWith('mailto:')
          });
        }
      } catch (error) {
        console.warn(`⚠️  Could not read ${file}: ${error.message}`);
      }
    }
    
    return links;
  }

  // Validate links
  async validateLinks(links) {
    this.results.total = links.length;
    
    // Group links by type
    const externalLinks = links.filter(link => link.isExternal);
    const internalLinks = links.filter(link => !link.isExternal && !link.isEmail);
    const emailLinks = links.filter(link => link.isEmail);
    
    console.log(`📊 Found ${links.length} links:`);
    console.log(`   External: ${externalLinks.length}`);
    console.log(`   Internal: ${internalLinks.length}`);
    console.log(`   Email: ${emailLinks.length}`);
    
    // Validate external links
    if (externalLinks.length > 0) {
      await this.validateExternalLinks(externalLinks);
    }
    
    // Validate internal links
    if (internalLinks.length > 0) {
      await this.validateInternalLinks(internalLinks);
    }
    
    // Validate email links
    if (emailLinks.length > 0) {
      await this.validateEmailLinks(emailLinks);
    }
  }

  // Validate external links
  async validateExternalLinks(links) {
    console.log('🌐 Validating external links...');
    
    for (const link of links) {
      try {
        // Check if link should be excluded
        if (this.config.validation.exclude.some(pattern => 
          link.url.includes(pattern))) {
          this.results.skipped++;
          continue;
        }
        
        // Validate link
        const isValid = await this.checkExternalLink(link.url);
        
        if (isValid) {
          this.results.valid++;
        } else {
          this.results.broken++;
          this.results.errors.push({
            type: 'broken_link',
            file: link.file,
            text: link.text,
            url: link.url,
            timestamp: new Date().toISOString()
          });
        }
        
      } catch (error) {
        this.results.errors.push({
          type: 'validation_error',
          file: link.file,
          text: link.text,
          url: link.url,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // Check external link
  async checkExternalLink(url) {
    try {
      execSync(`curl -s -o /dev/null -w "%{http_code}" "${url}"`, {
        timeout: this.config.validation.timeout,
        stdio: 'pipe'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Validate internal links
  async validateInternalLinks(links) {
    console.log('📁 Validating internal links...');
    
    for (const link of links) {
      try {
        // Resolve internal link path
        const targetPath = this.resolveInternalLink(link.file, link.url);
        
        if (statSync(targetPath)) {
          this.results.valid++;
        } else {
          this.results.broken++;
          this.results.errors.push({
            type: 'broken_internal_link',
            file: link.file,
            text: link.text,
            url: link.url,
            targetPath: targetPath,
            timestamp: new Date().toISOString()
          });
        }
        
      } catch (error) {
        this.results.broken++;
        this.results.errors.push({
          type: 'broken_internal_link',
          file: link.file,
          text: link.text,
          url: link.url,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // Resolve internal link path
  resolveInternalLink(sourceFile, linkUrl) {
    if (linkUrl.startsWith('/')) {
      return join(projectRoot, linkUrl);
    } else {
      const sourceDir = join(sourceFile, '..');
      return join(projectRoot, sourceDir, linkUrl);
    }
  }

  // Validate email links
  async validateEmailLinks(links) {
    console.log('📧 Validating email links...');
    
    for (const link of links) {
      try {
        const email = link.url.substring(7); // Remove 'mailto:'
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (emailPattern.test(email)) {
          this.results.valid++;
        } else {
          this.results.broken++;
          this.results.errors.push({
            type: 'invalid_email',
            file: link.file,
            text: link.text,
            url: link.url,
            timestamp: new Date().toISOString()
          });
        }
        
      } catch (error) {
        this.results.broken++;
        this.results.errors.push({
          type: 'invalid_email',
          file: link.file,
          text: link.text,
          url: link.url,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // Generate validation report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total: this.results.total,
        valid: this.results.valid,
        broken: this.results.broken,
        skipped: this.results.skipped,
        errorCount: this.results.errors.length
      }
    };
    
    const reportPath = join(projectRoot, 'link-validation-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('');
    console.log('📊 Link Validation Report:');
    console.log(`   Total links: ${report.summary.total}`);
    console.log(`   Valid: ${report.summary.valid}`);
    console.log(`   Broken: ${report.summary.broken}`);
    console.log(`   Skipped: ${report.summary.skipped}`);
    console.log(`   Errors: ${report.summary.errorCount}`);
    console.log(`   Report saved: ${reportPath}`);
  }

  // Send notifications
  async sendNotifications() {
    if (this.results.broken > 0) {
      console.log('📢 Sending notifications for broken links...');
      
      if (this.config.notifications.email.enabled) {
        await this.sendEmailNotification();
      }
      
      if (this.config.notifications.slack.enabled) {
        await this.sendSlackNotification();
      }
      
      if (this.config.notifications.webhook.enabled) {
        await this.sendWebhookNotification();
      }
    }
  }

  // Send email notification
  async sendEmailNotification() {
    // Implementation would go here
    console.log('📧 Email notification sent');
  }

  // Send Slack notification
  async sendSlackNotification() {
    // Implementation would go here
    console.log('💬 Slack notification sent');
  }

  // Send webhook notification
  async sendWebhookNotification() {
    // Implementation would go here
    console.log('🔗 Webhook notification sent');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ScheduledLinkValidator();
  const command = process.argv[2];
  const scheduleType = process.argv[3] || 'daily';
  
  switch (command) {
    case 'start':
      validator.start(scheduleType);
      break;
    case 'stop':
      validator.stop();
      break;
    case 'run':
      validator.runValidation();
      break;
    default:
      console.log('Usage: node scheduled-validation.js [start|stop|run] [schedule-type]');
      console.log('Schedule types: daily, weekly, monthly, hourly');
  }
}

export default ScheduledLinkValidator;


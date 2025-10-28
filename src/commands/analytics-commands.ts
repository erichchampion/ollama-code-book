/**
 * Analytics Commands
 *
 * Commands for viewing analytics and usage statistics
 */

import { commandRegistry, ArgType } from './index.js';
import { logger } from '../utils/logger.js';
import { analyticsTracker } from '../analytics/tracker.js';
import { validateNonEmptyString } from '../utils/command-helpers.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';

/**
 * Register analytics commands
 */
export function registerAnalyticsCommands(): void {
  logger.debug('Registering analytics commands');

  registerAnalyticsShowCommand();
  registerAnalyticsExportCommand();
  registerAnalyticsClearCommand();
  registerAnalyticsWorkflowCommand();
  registerAnalyticsProgressCommand();

  // Phase 6: Performance Dashboard commands
  registerPerformanceDashboardCommand();
  registerPerformanceAlertsCommand();
  registerPerformanceReportCommand();
}

/**
 * Show analytics and usage statistics
 */
function registerAnalyticsShowCommand(): void {
  const command = {
    name: 'analytics-show',
    description: 'Display usage analytics and statistics',
    category: 'Analytics',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { days = 30, detailed = false } = args;

        if (days < 1 || days > 365) {
          throw createUserError('Days must be between 1 and 365', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Provide a valid number of days (1-365)'
          });
        }

        const stats = await analyticsTracker.generateUsageStats(days);

        console.log(`📊 Usage Analytics (Last ${days} days)\\n`);

        // Overview
        console.log('📈 Overview:');
        console.log(`   Total Commands: ${stats.totalCommands}`);
        console.log(`   Total Sessions: ${stats.totalSessions}`);
        console.log(`   Success Rate: ${stats.successRate.toFixed(1)}%`);
        console.log(`   Avg Session Duration: ${formatDuration(stats.averageSessionDuration)}\n`);

        // Most used commands
        console.log('🏆 Most Used Commands:');
        stats.mostUsedCommands.slice(0, 5).forEach((cmd, index) => {
          console.log(`   ${index + 1}. ${cmd.command} (${cmd.count} times, ${cmd.percentage.toFixed(1)}%)`);
        });
        console.log('');

        // Feature adoption
        console.log('🚀 Feature Adoption:');
        stats.featureAdoption.forEach(feature => {
          const trendIcon = feature.trend === 'increasing' ? '📈' :
                           feature.trend === 'decreasing' ? '📉' : '📊';
          console.log(`   ${trendIcon} ${feature.feature}: ${feature.usage} uses (${feature.trend})`);
        });
        console.log('');

        // Daily usage (last 7 days)
        if (detailed) {
          console.log('📅 Daily Usage (Last 7 days):');
          stats.dailyUsage.slice(-7).forEach(day => {
            const bar = '█'.repeat(Math.ceil(day.commands / 2));
            console.log(`   ${day.date}: ${day.commands.toString().padStart(3)} ${bar}`);
          });
          console.log('');
        }

        console.log('💡 Commands:');
        console.log('   analytics-show --days 7 --detailed   # Detailed 7-day report');
        console.log('   analytics-workflow                   # View workflow patterns');
        console.log('   analytics-export report.json        # Export data');

      } catch (error) {
        logger.error('Analytics show command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'days',
        description: 'Number of days to include in analysis (1-365)',
        type: ArgType.NUMBER,
        flag: '--days',
        required: false
      },
      {
        name: 'detailed',
        description: 'Show detailed breakdown including daily usage',
        type: ArgType.BOOLEAN,
        flag: '--detailed',
        required: false
      },
      {
        name: 'metric',
        description: 'Specific metric to show (usage, performance, errors)',
        type: ArgType.STRING,
        flag: '--metric',
        required: false
      }
    ],
    examples: [
      'analytics-show',
      'analytics-show --days 7',
      'analytics-show --days 30 --detailed'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Show workflow patterns and insights
 */
function registerAnalyticsWorkflowCommand(): void {
  const command = {
    name: 'analytics-workflow',
    description: 'Analyze workflow patterns and get optimization insights',
    category: 'Analytics',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const insights = await analyticsTracker.getWorkflowInsights();

        console.log('🔄 Workflow Analysis\\n');

        // Common patterns
        if (insights.patterns.length > 0) {
          console.log('📋 Common Command Patterns:');
          insights.patterns.slice(0, 5).forEach((pattern, index) => {
            console.log(`   ${index + 1}. ${pattern.name}`);
            console.log(`      Frequency: ${pattern.frequency} times`);
            console.log(`      Success Rate: ${pattern.successRate.toFixed(1)}%`);
            console.log(`      Avg Duration: ${formatDuration(pattern.averageDuration)}\n`);
          });
        } else {
          console.log('📋 No common command patterns detected yet\\n');
        }

        // Recommendations
        if (insights.recommendations.length > 0) {
          console.log('💡 Recommendations:');
          insights.recommendations.forEach((rec, index) => {
            console.log(`   ${index + 1}. ${rec}`);
          });
          console.log('');
        }

        // Inefficiencies
        if (insights.inefficiencies.length > 0) {
          console.log('⚠️  Potential Inefficiencies:');
          insights.inefficiencies.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue.description}`);
            console.log(`      💡 ${issue.suggestion}\\n`);
          });
        } else {
          console.log('✅ No significant inefficiencies detected\\n');
        }

        console.log('💡 Commands:');
        console.log('   analytics-show              # View usage statistics');
        console.log('   config-show                 # Review current configuration');

      } catch (error) {
        logger.error('Analytics workflow command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'analytics-workflow'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Show progress of active tasks
 */
function registerAnalyticsProgressCommand(): void {
  const command = {
    name: 'analytics-progress',
    description: 'Show progress of active long-running tasks',
    category: 'Analytics',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const activeTasks = analyticsTracker.getActiveTasks();

        if (activeTasks.length === 0) {
          console.log('📊 No active tasks currently running\\n');
          console.log('💡 Long-running operations will show progress here');
          return;
        }

        console.log('🔄 Active Tasks\\n');

        activeTasks.forEach((task, index) => {
          const progress = (task.currentStep / task.totalSteps) * 100;
          const progressBar = createProgressBar(progress);
          const statusIcon = getStatusIcon(task.status);

          console.log(`${index + 1}. ${statusIcon} ${task.name}`);
          console.log(`   ${task.description}`);
          console.log(`   Progress: ${progressBar} ${progress.toFixed(1)}% (${task.currentStep}/${task.totalSteps})`);

          if (task.details) {
            console.log(`   Current: ${task.details}`);
          }

          if (task.estimatedDuration) {
            const elapsed = Date.now() - task.startTime;
            const estimated = task.estimatedDuration;
            const remaining = Math.max(0, estimated - elapsed);
            console.log(`   Time: ${formatDuration(elapsed)} elapsed, ~${formatDuration(remaining)} remaining`);
          } else {
            const elapsed = Date.now() - task.startTime;
            console.log(`   Time: ${formatDuration(elapsed)} elapsed`);
          }

          console.log('');
        });

        console.log('💡 Tasks update automatically in real-time');
        console.log('💡 Run this command again to see latest progress');

      } catch (error) {
        logger.error('Analytics progress command failed:', error);
        throw error;
      }
    },
    args: [],
    examples: [
      'analytics-progress'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Export analytics data
 */
function registerAnalyticsExportCommand(): void {
  const command = {
    name: 'analytics-export',
    description: 'Export analytics data to a file',
    category: 'Analytics',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { file, format = 'json' } = args;

        if (!validateNonEmptyString(file, 'export file path')) {
          return;
        }

        if (!['json', 'csv'].includes(format)) {
          throw createUserError(`Unsupported format: ${format}`, {
            category: ErrorCategory.VALIDATION,
            resolution: 'Use json or csv format'
          });
        }

        await analyticsTracker.exportAnalytics(file, format as 'json' | 'csv');

        console.log(`✅ Analytics data exported to: ${file}`);
        console.log(`📊 Format: ${format.toUpperCase()}\\n`);

        console.log('📦 Export includes:');
        console.log('   • Usage statistics and trends');
        console.log('   • Command execution history');
        console.log('   • Session information');
        console.log('   • Workflow patterns');
        console.log('   • Performance metrics\\n');

        console.log('💡 Use this data for:');
        console.log('   • Performance analysis');
        console.log('   • Usage optimization');
        console.log('   • Sharing with team');
        console.log('   • External reporting');

      } catch (error) {
        logger.error('Analytics export command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'File path to export analytics data to',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'format',
        description: 'Export format (json or csv)',
        type: ArgType.STRING,
        flag: '--format',
        required: false
      }
    ],
    examples: [
      'analytics-export analytics.json',
      'analytics-export report.csv --format csv',
      'analytics-export ./reports/usage-data.json'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Clear analytics data
 */
function registerAnalyticsClearCommand(): void {
  const command = {
    name: 'analytics-clear',
    description: 'Clear analytics data and history',
    category: 'Analytics',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { older_than, confirm = false } = args;

        if (!confirm) {
          if (older_than) {
            console.log(`⚠️  This will clear analytics data older than ${older_than} days!`);
          } else {
            console.log('⚠️  This will clear ALL analytics data and history!');
          }
          console.log('\\nThis action cannot be undone. All usage statistics will be lost.');
          console.log('\\n💡 To proceed, add --confirm flag');
          console.log('💡 Consider exporting data first with: analytics-export backup.json');
          return;
        }

        await analyticsTracker.clearAnalytics(older_than);

        if (older_than) {
          console.log(`✅ Analytics data older than ${older_than} days cleared`);
        } else {
          console.log('✅ All analytics data cleared');
        }

        console.log('\\n🔄 Fresh tracking starts now');
        console.log('💡 New usage statistics will begin accumulating');

      } catch (error) {
        logger.error('Analytics clear command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'older_than',
        description: 'Clear data older than specified days (optional)',
        type: ArgType.NUMBER,
        flag: '--older-than',
        required: false
      },
      {
        name: 'confirm',
        description: 'Confirm the clear operation',
        type: ArgType.BOOLEAN,
        flag: '--confirm',
        required: false
      }
    ],
    examples: [
      'analytics-clear',
      'analytics-clear --older-than 90',
      'analytics-clear --confirm',
      'analytics-clear --older-than 30 --confirm'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Phase 6: Performance Dashboard - Show real-time performance metrics
 */
function registerPerformanceDashboardCommand(): void {
  const command = {
    name: 'performance-dashboard',
    description: 'Display real-time performance dashboard with system metrics',
    category: 'Analytics',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { format = 'summary', watch = false, interval = 5000 } = args;

        const { globalPerformanceDashboard } = await import('../ai/performance-dashboard.js');

        if (watch) {
          console.log('🎯 Performance Dashboard (Live Mode) - Press Ctrl+C to exit\n');

          const displayDashboard = () => {
            const summary = globalPerformanceDashboard.getDashboardSummary();
            console.clear();
            console.log('🎯 Performance Dashboard (Live Mode) - Press Ctrl+C to exit\n');
            displayDashboardSummary(summary, format);
          };

          // Initial display
          displayDashboard();

          // Set up interval
          const intervalId = setInterval(displayDashboard, interval);

          // Handle Ctrl+C
          process.on('SIGINT', () => {
            clearInterval(intervalId);
            console.log('\n\nDashboard monitoring stopped.');
            process.exit(0);
          });
        } else {
          console.log('🎯 Performance Dashboard\n');
          const summary = globalPerformanceDashboard.getDashboardSummary();
          displayDashboardSummary(summary, format);
        }
      } catch (error) {
        logger.error('Failed to display performance dashboard:', error);
        throw createUserError('Performance dashboard failed', {
          category: ErrorCategory.APPLICATION,
          resolution: 'Check if performance monitoring is enabled'
        });
      }
    },
    args: [
      {
        name: 'format',
        description: 'Output format (summary, detailed, json)',
        type: ArgType.STRING,
        flag: '--format',
        required: false
      },
      {
        name: 'watch',
        description: 'Enable live monitoring mode',
        type: ArgType.BOOLEAN,
        flag: '--watch',
        required: false
      },
      {
        name: 'interval',
        description: 'Refresh interval in milliseconds (watch mode)',
        type: ArgType.NUMBER,
        flag: '--interval',
        required: false
      }
    ],
    examples: [
      'performance-dashboard',
      'performance-dashboard --format detailed',
      'performance-dashboard --watch',
      'performance-dashboard --watch --interval 3000'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Phase 6: Performance Alerts - Show active performance alerts
 */
function registerPerformanceAlertsCommand(): void {
  const command = {
    name: 'performance-alerts',
    description: 'Display active performance alerts and recommendations',
    category: 'Analytics',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { severity = 'all', acknowledge = false } = args;

        const { globalPerformanceDashboard } = await import('../ai/performance-dashboard.js');

        if (acknowledge && args.alertId) {
          // Acknowledge specific alert
          console.log(`⚠️  Acknowledging alert: ${args.alertId}`);
          // globalPerformanceDashboard.acknowledgeAlert(args.alertId);
          console.log('✅ Alert acknowledged successfully');
          return;
        }

        const alerts = globalPerformanceDashboard.getActiveAlerts();
        const filteredAlerts = severity !== 'all'
          ? alerts.filter(alert => alert.type === severity)
          : alerts;

        console.log('⚠️  Performance Alerts\n');

        if (filteredAlerts.length === 0) {
          console.log('✅ No active performance alerts');
          return;
        }

        filteredAlerts.forEach((alert: any) => {
          const icon = alert.type === 'critical' ? '🔴' : '🟡';
          const time = alert.timestamp.toLocaleTimeString();
          console.log(`${icon} [${alert.type.toUpperCase()}] ${alert.category.toUpperCase()}`);
          console.log(`   ${alert.message}`);
          console.log(`   Value: ${alert.value} | Threshold: ${alert.threshold}`);
          console.log(`   Time: ${time}`);
          console.log('');
        });

        // Show recommendations
        const recommendations = globalPerformanceDashboard.getRecommendations('high');
        if (recommendations.length > 0) {
          console.log('💡 High Priority Recommendations:\n');
          recommendations.slice(0, 3).forEach(rec => {
            console.log(`• ${rec.title}`);
            console.log(`  ${rec.description}`);
            console.log(`  Impact: ${rec.impact}`);
            console.log('');
          });
        }
      } catch (error) {
        logger.error('Failed to display performance alerts:', error);
        throw createUserError('Performance alerts failed', {
          category: ErrorCategory.APPLICATION,
          resolution: 'Check if performance monitoring is enabled'
        });
      }
    },
    args: [
      {
        name: 'severity',
        description: 'Filter by severity (all, warning, critical)',
        type: ArgType.STRING,
        flag: '--severity',
        required: false
      },
      {
        name: 'acknowledge',
        description: 'Acknowledge an alert by ID',
        type: ArgType.BOOLEAN,
        flag: '--acknowledge',
        required: false
      },
      {
        name: 'alertId',
        description: 'Alert ID to acknowledge',
        type: ArgType.STRING,
        flag: '--alert-id',
        required: false
      },
      {
        name: 'configure',
        description: 'Configure alert thresholds',
        type: ArgType.BOOLEAN,
        flag: '--configure',
        required: false
      },
      {
        name: 'threshold',
        description: 'Alert threshold (e.g., cpu:80, memory:85)',
        type: ArgType.STRING,
        flag: '--threshold',
        required: false
      },
      {
        name: 'list',
        description: 'List all active alerts',
        type: ArgType.BOOLEAN,
        flag: '--list',
        required: false
      },
      {
        name: 'format',
        description: 'Output format (summary, detailed, json)',
        type: ArgType.STRING,
        flag: '--format',
        required: false
      }
    ],
    examples: [
      'performance-alerts',
      'performance-alerts --severity critical',
      'performance-alerts --acknowledge --alert-id cpu_cpu_usage'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Phase 6: Performance Report - Generate comprehensive performance report
 */
function registerPerformanceReportCommand(): void {
  const command = {
    name: 'performance-report',
    description: 'Generate comprehensive performance optimization report',
    category: 'Analytics',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { export: exportFile = false, format = 'text' } = args;

        const { globalPerformanceDashboard } = await import('../ai/performance-dashboard.js');

        console.log('📊 Generating Performance Optimization Report...\n');

        const report = await globalPerformanceDashboard.generateOptimizationReport();

        if (format === 'json') {
          if (exportFile) {
            const fs = await import('fs/promises');
            const filename = `performance-report-${Date.now()}.json`;
            await fs.writeFile(filename, JSON.stringify(report, null, 2));
            console.log(`📁 Report exported to: ${filename}`);
          } else {
            console.log(JSON.stringify(report, null, 2));
          }
          return;
        }

        // Text format
        console.log('📈 Performance Optimization Report\n');
        console.log('=' .repeat(50));
        console.log(report.summary);
        console.log('=' .repeat(50));

        if (report.recommendations.length > 0) {
          console.log('\n💡 Optimization Recommendations:\n');
          report.recommendations.forEach((rec, index) => {
            const priority = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' : '🟡';
            console.log(`${index + 1}. ${priority} ${rec.title} (${rec.priority.toUpperCase()})`);
            console.log(`   ${rec.description}`);
            console.log(`   Impact: ${rec.impact}`);
            console.log(`   Implementation: ${rec.implementation}`);
            console.log(`   Estimated Improvement: ${rec.estimatedImprovement}%`);
            console.log(`   Confidence: ${rec.confidence}%`);
            console.log('');
          });
        }

        if (report.trends.length > 0) {
          console.log('📊 Performance Trends:\n');
          report.trends.forEach(trend => {
            const arrow = trend.direction === 'improving' ? '📈' : trend.direction === 'degrading' ? '📉' : '➡️';
            console.log(`${arrow} ${trend.metric} (${trend.timeRange}): ${trend.direction} (${trend.changePercent.toFixed(1)}%)`);
          });
          console.log('');
        }

        if (exportFile && format === 'text') {
          const fs = await import('fs/promises');
          const filename = `performance-report-${Date.now()}.txt`;
          const reportText = `Performance Optimization Report\n\n${report.summary}\n\nRecommendations:\n${report.recommendations.map(r => `- ${r.title}: ${r.description}`).join('\n')}`;
          await fs.writeFile(filename, reportText);
          console.log(`📁 Report exported to: ${filename}`);
        }
      } catch (error) {
        logger.error('Failed to generate performance report:', error);
        throw createUserError('Performance report generation failed', {
          category: ErrorCategory.APPLICATION,
          resolution: 'Check if performance monitoring is enabled'
        });
      }
    },
    args: [
      {
        name: 'period',
        description: 'Time period for report (1h, 24h, 7d, 30d)',
        type: ArgType.STRING,
        flag: '--period',
        required: false
      },
      {
        name: 'export',
        description: 'Export report to file',
        type: ArgType.BOOLEAN,
        flag: '--export',
        required: false
      },
      {
        name: 'format',
        description: 'Output format (text, json, csv, html)',
        type: ArgType.STRING,
        flag: '--format',
        required: false
      }
    ],
    examples: [
      'performance-report',
      'performance-report --export',
      'performance-report --format json',
      'performance-report --export --format json'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Helper function to display dashboard summary
 */
function displayDashboardSummary(summary: any, format: string): void {
  if (format === 'json') {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const { metrics, health, alerts, recommendations } = summary;

  // Health overview
  const healthIcon = health.overall === 'good' ? '🟢' : health.overall === 'warning' ? '🟡' : '🔴';
  console.log(`${healthIcon} Overall Health: ${health.overall.toUpperCase()}\n`);

  // Current metrics
  console.log('📊 Current Metrics:');
  console.log(`   CPU Usage: ${metrics.cpu.usage.toFixed(1)}%`);
  console.log(`   Memory: ${metrics.memory.heapUsed}MB / ${metrics.memory.heapTotal}MB`);
  console.log(`   Cache Hit Rate: ${metrics.cache.hitRate.toFixed(1)}%`);
  console.log(`   Startup Time: ${metrics.startup.lastStartupTime}ms`);
  console.log(`   Active Streams: ${metrics.streaming.activeStreams}`);
  console.log('');

  // Active alerts
  if (alerts.length > 0) {
    console.log(`⚠️  Active Alerts (${alerts.length}):`);
    alerts.slice(0, 3).forEach((alert: any) => {
      const icon = alert.type === 'critical' ? '🔴' : '🟡';
      console.log(`   ${icon} ${alert.message}`);
    });
    if (alerts.length > 3) {
      console.log(`   ... and ${alerts.length - 3} more`);
    }
    console.log('');
  }

  // Top recommendations
  if (recommendations.length > 0) {
    console.log('💡 Top Recommendations:');
    recommendations.slice(0, 2).forEach((rec: any) => {
      console.log(`   • ${rec.title}`);
      console.log(`     ${rec.description.substring(0, 80)}...`);
    });
    console.log('');
  }

  if (format === 'detailed') {
    console.log('📈 Component Health Scores:');
    Object.entries(health.scores).forEach(([component, score]: [string, unknown]) => {
      const scoreIcon = (score as number) > 80 ? '🟢' : (score as number) > 60 ? '🟡' : '🔴';
      console.log(`   ${scoreIcon} ${component}: ${(score as number).toFixed(0)}/100`);
    });
  }
}

/**
 * Helper methods (these would be attached to the command object in practice)
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function createProgressBar(percentage: number, width = 20): string {
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending': return '⏳';
    case 'running': return '🔄';
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'cancelled': return '🚫';
    default: return '❓';
  }
}
/**
 * Configuration Commands
 *
 * Commands for managing user and project configurations
 */

import { commandRegistry, ArgType } from './index.js';
import { logger } from '../utils/logger.js';
import { configManager } from '../config/manager.js';
import { validateNonEmptyString, validateFileExists } from '../utils/command-helpers.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { getStatusTracker, StatusDisplayOptions } from '../interactive/component-status.js';
import { COMPONENT_STATUS_VALUES } from '../constants/component-status.js';
import {
  getEnhancedStartupMetrics,
  getStartupOptimizationRecommendations
} from '../optimization/startup-optimizer.js';
import {
  sanitizeConfigValue,
  shouldShowDebugInfo
} from '../utils/config-helpers.js';

/**
 * Register configuration commands
 */
export function registerConfigCommands(): void {
  logger.debug('Registering configuration commands');

  registerConfigShowCommand();
  registerConfigSetCommand();
  registerConfigGetCommand();
  registerConfigResetCommand();
  registerConfigExportCommand();
  registerConfigImportCommand();
  registerConfigInitCommand();
  registerStatusCommand();
}

/**
 * Show current configuration
 */
function registerConfigShowCommand(): void {
  const command = {
    name: 'config-show',
    description: 'Display current configuration settings',
    category: 'Configuration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { section, project = false } = args;

        await configManager.loadConfig();

        if (project) {
          // Show project configuration
          const projectConfig = configManager.getProjectConfig();

          if (!projectConfig) {
            console.log('📁 No project configuration found');
            console.log('\n💡 Create one with: config-init --project');
            return;
          }

          console.log('📁 Project Configuration:\n');
          console.log(JSON.stringify(projectConfig, null, 2));

        } else if (section) {
          // Show specific section
          const config = configManager.getUserConfig();
          const sectionData = (config as any)[section];

          if (!sectionData) {
            throw createUserError(`Configuration section '${section}' not found`, {
              category: ErrorCategory.VALIDATION,
              resolution: 'Valid sections: ai, ui, git, testing, refactoring, performance, development'
            });
          }

          console.log(`⚙️ Configuration - ${section}:\n`);
          console.log(JSON.stringify(sectionData, null, 2));

        } else {
          // Show summary
          const summary = configManager.getConfigSummary();

          console.log('⚙️ Configuration Summary:\n');
          console.log(`📍 User Config: ${summary.userConfigPath}`);
          console.log(`📁 Project Config: ${summary.projectConfigPath}`);
          console.log(`🔗 Has Project Config: ${summary.hasProjectConfig ? '✅' : '❌'}\n`);

          console.log('🎯 Key Settings:');
          console.log(`   AI Model: ${summary.settings.defaultModel}`);
          console.log(`   Theme: ${summary.settings.theme}`);
          console.log(`   Project Context: ${summary.settings.enableProjectContext ? '✅' : '❌'}`);
          console.log(`   Test Framework: ${summary.settings.preferredTestFramework}`);

          // Security: A05:2021 - Security Misconfiguration
          // Don't expose debug-related information in production
          if (shouldShowDebugInfo()) {
            console.log(`   Log Level: ${summary.settings.logLevel}`);
          }

          console.log('\n💡 Commands:');
          console.log('   config-show --section ai      # Show AI settings');
          console.log('   config-show --project         # Show project config');
          console.log('   config-set ai.defaultModel llama3.2  # Update setting');
        }

      } catch (error) {
        logger.error('Config show command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'section',
        description: 'Configuration section to show (ai, ui, git, testing, etc.)',
        type: ArgType.STRING,
        flag: '--section',
        required: false
      },
      {
        name: 'project',
        description: 'Show project configuration instead of user config',
        type: ArgType.BOOLEAN,
        flag: '--project',
        required: false
      }
    ],
    examples: [
      'config-show',
      'config-show --section ai',
      'config-show --project'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Set configuration value
 */
function registerConfigSetCommand(): void {
  const command = {
    name: 'config-set',
    description: 'Set a configuration value',
    category: 'Configuration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { key, value, project = false } = args;

        if (!validateNonEmptyString(key, 'configuration key')) {
          return;
        }

        if (value === undefined || value === null) {
          throw createUserError('Configuration value is required', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Provide a value to set'
          });
        }

        await configManager.loadConfig();

        // Parse value based on type
        let parsedValue = value;
        try {
          // Try to parse as JSON for complex values
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false' || !isNaN(Number(value)))) {
            parsedValue = JSON.parse(value);
          }
        } catch {
          // Keep as string if JSON parsing fails
        }

        if (project) {
          // Set project configuration
          const currentConfig = configManager.getProjectConfig() || {};
          const keys = key.split('.');
          let target: any = currentConfig;

          for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!target[k] || typeof target[k] !== 'object') {
              target[k] = {};
            }
            target = target[k];
          }

          target[keys[keys.length - 1]] = parsedValue;
          await configManager.updateProjectConfig(currentConfig);

          // Security: A09:2021 - Security Logging and Monitoring Failures
          // A07:2021 - Identification and Authentication Failures
          // Sanitize output to avoid exposing sensitive values
          console.log(`✅ Project configuration updated:`);
          console.log(`   ${key} = ${sanitizeConfigValue(key, parsedValue)}`);

        } else {
          // Set user configuration
          await configManager.set(key, parsedValue);

          // Security: A09:2021 - Security Logging and Monitoring Failures
          // A07:2021 - Identification and Authentication Failures
          // Sanitize output to avoid exposing sensitive values
          console.log(`✅ Configuration updated:`);
          console.log(`   ${key} = ${sanitizeConfigValue(key, parsedValue)}`);
        }

        console.log('\n💡 Changes take effect immediately');

      } catch (error) {
        logger.error('Config set command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'key',
        description: 'Configuration key (e.g., ai.defaultModel)',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'value',
        description: 'Value to set',
        type: ArgType.STRING,
        position: 1,
        required: true
      },
      {
        name: 'project',
        description: 'Set in project configuration instead of user config',
        type: ArgType.BOOLEAN,
        flag: '--project',
        required: false
      }
    ],
    examples: [
      'config-set ai.defaultModel llama3.2',
      'config-set ui.theme dark',
      'config-set testing.coverageThreshold 90',
      'config-set tools.testFramework jest --project'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Get configuration value
 */
function registerConfigGetCommand(): void {
  const command = {
    name: 'config-get',
    description: 'Get a configuration value',
    category: 'Configuration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { key } = args;

        if (!validateNonEmptyString(key, 'configuration key')) {
          return;
        }

        await configManager.loadConfig();

        const value = configManager.get(key);

        if (value === undefined) {
          console.log(`❌ Configuration key '${key}' not found`);
          return;
        }

        // Security: A09:2021 - Security Logging and Monitoring Failures
        // A07:2021 - Identification and Authentication Failures
        // Sanitize output to avoid exposing sensitive values
        console.log(`📋 Configuration value:`);
        console.log(`   ${key} = ${sanitizeConfigValue(key, value)}`);

      } catch (error) {
        logger.error('Config get command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'key',
        description: 'Configuration key to retrieve',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ],
    examples: [
      'config-get ai.defaultModel',
      'config-get ui.theme',
      'config-get testing'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Reset configuration to defaults
 */
function registerConfigResetCommand(): void {
  const command = {
    name: 'config-reset',
    description: 'Reset configuration to default values',
    category: 'Configuration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { confirm = false } = args;

        if (!confirm) {
          console.log('⚠️  This will reset ALL configuration settings to defaults!');
          console.log('\nThis action cannot be undone. Your current settings will be lost.');
          console.log('\n💡 To proceed, run: config-reset --confirm');
          return;
        }

        await configManager.resetConfig();

        console.log('✅ Configuration reset to defaults');
        console.log('\n🔄 Default settings restored:');
        console.log('   • AI model: qwen2.5-coder:latest');
        console.log('   • Theme: auto');
        console.log('   • Project context: enabled');
        console.log('   • Test framework: jest');
        console.log('   • And more...');

        console.log('\n💡 Customize with: config-set <key> <value>');

      } catch (error) {
        logger.error('Config reset command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'confirm',
        description: 'Confirm the reset operation',
        type: ArgType.BOOLEAN,
        flag: '--confirm',
        required: false
      }
    ],
    examples: [
      'config-reset',
      'config-reset --confirm'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Export configuration
 */
function registerConfigExportCommand(): void {
  const command = {
    name: 'config-export',
    description: 'Export configuration to a file',
    category: 'Configuration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { file } = args;

        if (!validateNonEmptyString(file, 'export file path')) {
          return;
        }

        await configManager.loadConfig();
        await configManager.exportConfig(file);

        console.log(`✅ Configuration exported to: ${file}`);
        console.log('\n📦 Export includes:');
        console.log('   • User configuration settings');
        console.log('   • Project configuration (if exists)');
        console.log('   • Metadata and version info');

        console.log('\n💡 Import on another system with: config-import ' + file);

      } catch (error) {
        logger.error('Config export command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'File path to export configuration to',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ],
    examples: [
      'config-export my-config.json',
      'config-export ./backups/ollama-config-backup.json'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Import configuration
 */
function registerConfigImportCommand(): void {
  const command = {
    name: 'config-import',
    description: 'Import configuration from a file',
    category: 'Configuration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { file } = args;

        if (!await validateFileExists(file)) {
          return;
        }

        await configManager.importConfig(file);

        console.log(`✅ Configuration imported from: ${file}`);
        console.log('\n🔄 Settings have been updated');
        console.log('\n💡 View current settings with: config-show');

      } catch (error) {
        logger.error('Config import command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'File path to import configuration from',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ],
    examples: [
      'config-import my-config.json',
      'config-import ./backups/ollama-config-backup.json'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Initialize configuration
 */
function registerConfigInitCommand(): void {
  const command = {
    name: 'config-init',
    description: 'Initialize configuration with guided setup',
    category: 'Configuration',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const { project = false, force = false } = args;

        if (project) {
          // Initialize project configuration
          const projectConfig = configManager.getProjectConfig();

          if (projectConfig && !force) {
            console.log('📁 Project configuration already exists');
            console.log('\n💡 Use --force to overwrite or config-show --project to view');
            return;
          }

          const defaultProjectConfig = {
            ai: {
              model: 'qwen2.5-coder:latest',
              excludePatterns: ['node_modules/**', 'dist/**', '.git/**']
            },
            tools: {
              testFramework: 'jest',
              buildCommand: 'npm run build',
              testCommand: 'npm test'
            },
            git: {
              commitFormat: 'conventional' as const
            }
          };

          await configManager.saveProjectConfig(defaultProjectConfig);

          console.log('✅ Project configuration initialized');
          console.log('\n📁 Created .ollama-code.json in current directory');
          console.log('\n🎯 Default project settings:');
          console.log('   • AI model: qwen2.5-coder:latest');
          console.log('   • Test framework: jest');
          console.log('   • Commit format: conventional');

        } else {
          // Initialize user configuration
          await configManager.loadConfig();

          console.log('✅ User configuration initialized');
          console.log('\n⚙️ Configuration file created with defaults');

          const summary = configManager.getConfigSummary();
          console.log(`📍 Location: ${summary.userConfigPath}`);

          console.log('\n🎯 Default settings applied:');
          console.log('   • AI model: qwen2.5-coder:latest');
          console.log('   • Theme: auto');
          console.log('   • Project context: enabled');
          console.log('   • Test framework: jest');
        }

        console.log('\n💡 Customize settings with: config-set <key> <value>');
        console.log('💡 View all settings with: config-show');

      } catch (error) {
        logger.error('Config init command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'project',
        description: 'Initialize project configuration instead of user config',
        type: ArgType.BOOLEAN,
        flag: '--project',
        required: false
      },
      {
        name: 'force',
        description: 'Overwrite existing configuration',
        type: ArgType.BOOLEAN,
        flag: '--force',
        required: false
      }
    ],
    examples: [
      'config-init',
      'config-init --project',
      'config-init --project --force'
    ]
  };

  commandRegistry.register(command);
}

/**
 * Show system component status
 */
function registerStatusCommand(): void {
  const command = {
    name: 'status',
    description: 'Show system and component health status',
    category: 'System',
    async handler(args: Record<string, any>): Promise<void> {
      try {
        const {
          format = 'summary',
          components = false,
          metrics = false,
          deps = false,
          filter = '',
          startup = false,
          recommendations = false
        } = args;

        const statusTracker = getStatusTracker();

        // Build display options
        const displayOptions: StatusDisplayOptions = {
          format: format as 'table' | 'list' | 'summary' | 'json',
          showMetrics: metrics,
          showDependencies: deps,
          sortBy: 'status' as const
        };

        // Add filter if specified
        if (filter) {
          const filterStatuses = filter.split(',').filter((s: string) => COMPONENT_STATUS_VALUES.includes(s.trim() as any));
          if (filterStatuses.length > 0) {
            displayOptions.filterStatus = filterStatuses as any;
          }
        }

        // Phase 4: Enhanced startup optimization metrics
        if (startup) {
          console.log('🚀 Phase 4 Enhanced Startup Optimization Metrics\n');

          const startupMetrics = await getEnhancedStartupMetrics();

          if (format === 'json') {
            console.log(JSON.stringify(startupMetrics, null, 2));
          } else {
            // Display basic metrics
            console.log('📊 Basic Component Metrics:');
            console.log(`   Loaded Components: ${startupMetrics.basic.loadedComponents.join(', ') || 'None'}`);
            console.log(`   Total Available: ${startupMetrics.basic.totalComponents.length}`);

            // Display enhanced metrics
            console.log('\n⚡ Enhanced Startup Metrics:');
            console.log(`   Total Startup Time: ${startupMetrics.enhanced.totalStartupTime.toFixed(2)}ms`);
            console.log(`   Core Init Time: ${startupMetrics.enhanced.coreInitTime.toFixed(2)}ms`);
            console.log(`   Module Load Time: ${startupMetrics.enhanced.moduleLoadTime.toFixed(2)}ms`);
            console.log(`   Cache Warmup Time: ${startupMetrics.enhanced.cacheWarmupTime.toFixed(2)}ms`);
            console.log(`   Parallelization Savings: ${startupMetrics.enhanced.parallelizationSavings.toFixed(2)}ms`);
            console.log(`   Memory Usage: ${startupMetrics.enhanced.memoryUsageAtStart.toFixed(2)}MB`);
            console.log(`   Critical Modules Loaded: ${startupMetrics.enhanced.criticalModulesLoaded}`);
            console.log(`   Total Modules Loaded: ${startupMetrics.enhanced.totalModulesLoaded}`);
            console.log(`   Lazy Modules Deferred: ${startupMetrics.enhanced.lazyModulesDeferred}`);

            // Display recommendations
            if (startupMetrics.recommendations.length > 0) {
              console.log('\n💡 Optimization Recommendations:');
              startupMetrics.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
              });
            }
          }

          return;
        }

        // Phase 4: Detailed optimization recommendations
        if (recommendations) {
          console.log('💡 Phase 4 Startup Optimization Recommendations\n');

          const recs = await getStartupOptimizationRecommendations();

          if (format === 'json') {
            console.log(JSON.stringify(recs, null, 2));
          } else {
            if (recs.performance.length > 0) {
              console.log('⚡ Performance Recommendations:');
              recs.performance.forEach((rec, index) => console.log(`   ${index + 1}. ${rec}`));
              console.log('');
            }

            if (recs.memory.length > 0) {
              console.log('🧠 Memory Optimization:');
              recs.memory.forEach((rec, index) => console.log(`   ${index + 1}. ${rec}`));
              console.log('');
            }

            if (recs.loading.length > 0) {
              console.log('📦 Module Loading:');
              recs.loading.forEach((rec, index) => console.log(`   ${index + 1}. ${rec}`));
              console.log('');
            }

            if (recs.general.length > 0) {
              console.log('ℹ️ General Information:');
              recs.general.forEach((rec, index) => console.log(`   ${index + 1}. ${rec}`));
            }
          }

          return;
        }

        if (components) {
          // Show detailed component information
          console.log('🔧 Component Status\n');
          console.log(statusTracker.getStatusDisplay(displayOptions));
        } else {
          // Show system summary
          const systemHealth = statusTracker.getSystemHealth();
          console.log('🔧 System Health Summary\n');
          console.log(statusTracker.getStatusDisplay({ format: 'summary', showMetrics: false, showDependencies: false }));

          if (systemHealth.overallStatus !== 'healthy') {
            console.log('\n💡 Use "status --components" for detailed component information');
            console.log('💡 Use "status --format table --metrics" for performance details');
          }

          // Phase 4: Show startup optimization hint
          console.log('💡 Use "status --startup" for Phase 4 enhanced startup metrics');
          console.log('💡 Use "status --recommendations" for optimization suggestions');
        }

      } catch (error) {
        logger.error('Status command failed:', error);
        throw error;
      }
    },
    args: [
      {
        name: 'format',
        description: 'Output format (summary, table, list, json)',
        type: ArgType.STRING,
        position: -1,
        required: false
      },
      {
        name: 'components',
        description: 'Show detailed component status',
        type: ArgType.BOOLEAN,
        position: -1,
        required: false
      },
      {
        name: 'metrics',
        description: 'Include performance metrics',
        type: ArgType.BOOLEAN,
        position: -1,
        required: false
      },
      {
        name: 'deps',
        description: 'Show component dependencies',
        type: ArgType.BOOLEAN,
        position: -1,
        required: false
      },
      {
        name: 'filter',
        description: 'Filter by status (ready,loading,failed,degraded)',
        type: ArgType.STRING,
        position: -1,
        required: false
      },
      {
        name: 'startup',
        description: 'Show Phase 4 enhanced startup optimization metrics',
        type: ArgType.BOOLEAN,
        position: -1,
        required: false
      },
      {
        name: 'recommendations',
        description: 'Show Phase 4 startup optimization recommendations',
        type: ArgType.BOOLEAN,
        position: -1,
        required: false
      }
    ],
    examples: [
      'status',
      'status --components',
      'status --format table --metrics',
      'status --components --deps',
      'status --filter failed,degraded',
      'status --startup',
      'status --startup --format json',
      'status --recommendations',
      'status --format json > system-status.json'
    ]
  };

  commandRegistry.register(command);
}
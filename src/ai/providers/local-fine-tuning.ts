/**
 * Local Model Fine-Tuning Integration
 *
 * Provides capabilities for fine-tuning local AI models with custom datasets
 * for domain-specific code understanding and generation.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { BaseAIProvider, AIModel, ProviderConfig, AICapability } from './base-provider.js';
import { generateSecureId, generateRequestId } from '../../utils/id-generator.js';
import { FINE_TUNING_CONFIG, getMergedConfig } from './config/advanced-features-config.js';
import { DirectoryManager } from '../../utils/directory-manager.js';
import { normalizeError } from '../../utils/error-utils.js';
import { ConfigurationMerger } from '../../utils/configuration-merger.js';

export interface FineTuningDataset {
  id: string;
  name: string;
  description: string;
  type: 'code_completion' | 'code_analysis' | 'documentation' | 'general';
  format: 'jsonl' | 'csv' | 'parquet';
  filePath: string;
  size: number;
  samples: number;
  createdAt: Date;
  lastModified: Date;
  metadata: {
    language?: string;
    framework?: string;
    domain?: string;
    quality?: 'high' | 'medium' | 'low';
    validated: boolean;
  };
}

export interface FineTuningJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  baseModel: string;
  dataset: FineTuningDataset;
  config: FineTuningConfig;
  progress: {
    currentEpoch: number;
    totalEpochs: number;
    loss: number;
    accuracy?: number;
    validationLoss?: number;
    estimatedTimeRemaining?: number;
  };
  results?: {
    finalLoss: number;
    accuracy: number;
    perplexity?: number;
    bleuScore?: number;
    customMetrics?: Record<string, number>;
  };
  outputModel: {
    path?: string;
    size?: number;
    quantization?: string;
  };
  logs: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface FineTuningConfig {
  epochs: number;
  learningRate: number;
  batchSize: number;
  validationSplit: number;
  maxSequenceLength: number;
  temperature: number;
  dropout?: number;
  gradientClipping?: number;
  weightDecay?: number;
  warmupSteps?: number;
  saveSteps?: number;
  evaluationSteps?: number;
  earlyStopping?: {
    enabled: boolean;
    patience: number;
    minDelta: number;
  };
  quantization?: {
    enabled: boolean;
    type: 'int8' | 'int4' | 'float16';
  };
  lora?: {
    enabled: boolean;
    rank: number;
    alpha: number;
    dropout: number;
  };
}

export interface ModelDeployment {
  id: string;
  name: string;
  modelPath: string;
  status: 'deployed' | 'deploying' | 'stopped' | 'error';
  endpoint?: string;
  port?: number;
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    gpuUsage?: number;
  };
  performance: {
    requestsPerSecond: number;
    averageLatency: number;
    throughput: number;
  };
  createdAt: Date;
  lastAccessed?: Date;
}

export class LocalFineTuningManager extends EventEmitter {
  private datasets: Map<string, FineTuningDataset> = new Map();
  private jobs: Map<string, FineTuningJob> = new Map();
  private deployments: Map<string, ModelDeployment> = new Map();
  private workspaceDir: string;
  private modelsDir: string;
  private datasetsDir: string;
  private runningJobs: Map<string, ChildProcess> = new Map();

  constructor(workspaceDir: string = './ollama-code-workspace') {
    super();
    this.workspaceDir = workspaceDir;
    this.modelsDir = path.join(workspaceDir, 'models');
    this.datasetsDir = path.join(workspaceDir, 'datasets');
  }

  /**
   * Initialize the fine-tuning workspace
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureDirectories();
      await this.loadExistingAssets();
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Create a new dataset from files
   */
  async createDataset(
    name: string,
    description: string,
    type: FineTuningDataset['type'],
    sourceFiles: string[],
    options: {
      language?: string;
      framework?: string;
      domain?: string;
      format?: 'jsonl' | 'csv' | 'parquet';
      validateQuality?: boolean;
    } = {}
  ): Promise<FineTuningDataset> {
    const id = generateSecureId('dataset');
    const format = options.format || 'jsonl';
    const filePath = path.join(this.datasetsDir, `${id}.${format}`);

    try {
      // Process source files into training format
      const samples = await this.processSourceFiles(sourceFiles, type, format);

      // Validate dataset quality if requested
      const quality = options.validateQuality
        ? await this.validateDatasetQuality(samples, type)
        : 'medium';

      // Save processed dataset
      await this.saveDataset(filePath, samples, format);

      const dataset: FineTuningDataset = {
        id,
        name,
        description,
        type,
        format,
        filePath,
        size: await this.getFileSize(filePath),
        samples: samples.length,
        createdAt: new Date(),
        lastModified: new Date(),
        metadata: {
          language: options.language,
          framework: options.framework,
          domain: options.domain,
          quality,
          validated: options.validateQuality || false
        }
      };

      this.datasets.set(id, dataset);
      this.emit('datasetCreated', dataset);

      return dataset;
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to create dataset: ${normalizeError(error).message}`);
    }
  }

  /**
   * Start a fine-tuning job
   */
  async startFineTuning(
    name: string,
    baseModel: string,
    datasetId: string,
    config: Partial<FineTuningConfig> = {}
  ): Promise<FineTuningJob> {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const id = generateSecureId('finetune_job');
    const fullConfig = this.mergeWithDefaults(config);

    const job: FineTuningJob = {
      id,
      name,
      status: 'pending',
      baseModel,
      dataset,
      config: fullConfig,
      progress: {
        currentEpoch: 0,
        totalEpochs: fullConfig.epochs,
        loss: 0
      },
      outputModel: {},
      logs: [],
      createdAt: new Date()
    };

    this.jobs.set(id, job);

    try {
      await this.executeFineTuning(job);
      this.emit('jobStarted', job);
      return job;
    } catch (error) {
      job.status = 'failed';
      job.error = normalizeError(error).message;
      this.emit('jobFailed', job);
      throw error;
    }
  }

  /**
   * Monitor a fine-tuning job
   */
  getJob(jobId: string): FineTuningJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * List all jobs
   */
  listJobs(): FineTuningJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'running') {
      throw new Error(`Job ${jobId} is not running`);
    }

    const process = this.runningJobs.get(jobId);
    if (process) {
      process.kill('SIGTERM');
      this.runningJobs.delete(jobId);
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.emit('jobCancelled', job);
  }

  /**
   * Deploy a fine-tuned model
   */
  async deployModel(
    name: string,
    modelPath: string,
    options: {
      port?: number;
      resources?: {
        maxMemory?: number;
        maxCpu?: number;
        useGpu?: boolean;
      };
    } = {}
  ): Promise<ModelDeployment> {
    const id = generateSecureId('model_deployment');
    const port = options.port || await this.findAvailablePort();

    const deployment: ModelDeployment = {
      id,
      name,
      modelPath,
      status: 'deploying',
      port,
      endpoint: `http://localhost:${port}`,
      resources: {
        memoryUsage: 0,
        cpuUsage: 0
      },
      performance: {
        requestsPerSecond: 0,
        averageLatency: 0,
        throughput: 0
      },
      createdAt: new Date()
    };

    this.deployments.set(id, deployment);

    try {
      await this.startModelServer(deployment, options);
      deployment.status = 'deployed';
      this.emit('modelDeployed', deployment);
      return deployment;
    } catch (error) {
      deployment.status = 'error';
      this.emit('deploymentFailed', deployment, error);
      throw error;
    }
  }

  /**
   * List all datasets
   */
  listDatasets(): FineTuningDataset[] {
    return Array.from(this.datasets.values());
  }

  /**
   * List all deployments
   */
  listDeployments(): ModelDeployment[] {
    return Array.from(this.deployments.values());
  }

  /**
   * Get deployment status
   */
  getDeployment(deploymentId: string): ModelDeployment | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * Stop a model deployment
   */
  async stopDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    // Stop the model server (implementation depends on the server type)
    deployment.status = 'stopped';
    this.emit('deploymentStopped', deployment);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cancel all running jobs
    for (const [jobId, process] of this.runningJobs) {
      process.kill('SIGTERM');
    }
    this.runningJobs.clear();

    // Stop all deployments
    for (const deployment of this.deployments.values()) {
      if (deployment.status === 'deployed') {
        await this.stopDeployment(deployment.id);
      }
    }

    this.removeAllListeners();
  }

  /**
   * Private methods
   */

  private async ensureDirectories(): Promise<void> {
    await DirectoryManager.ensureDirectories(
      this.workspaceDir,
      this.modelsDir,
      this.datasetsDir
    );
  }

  private async loadExistingAssets(): Promise<void> {
    // Load existing datasets and jobs from storage
    // Implementation would scan directories and rebuild state
  }


  private async processSourceFiles(
    sourceFiles: string[],
    type: FineTuningDataset['type'],
    format: string
  ): Promise<any[]> {
    const samples: any[] = [];

    for (const filePath of sourceFiles) {
      const content = await fs.readFile(filePath, 'utf-8');

      switch (type) {
        case 'code_completion':
          samples.push(...this.extractCodeCompletionSamples(content, filePath));
          break;
        case 'code_analysis':
          samples.push(...this.extractCodeAnalysisSamples(content, filePath));
          break;
        case 'documentation':
          samples.push(...this.extractDocumentationSamples(content, filePath));
          break;
        case 'general':
          samples.push(...this.extractGeneralSamples(content, filePath));
          break;
      }
    }

    return samples;
  }

  private extractCodeCompletionSamples(content: string, filePath: string): any[] {
    // Extract code completion training samples
    const samples = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const prompt = lines.slice(Math.max(0, i - FINE_TUNING_CONFIG.processing.contextLines), i).join('\n');
      const completion = lines[i];

      if (prompt.trim() && completion.trim()) {
        samples.push({
          prompt: prompt.trim(),
          completion: completion.trim(),
          metadata: {
            file: path.basename(filePath),
            line: i + 1,
            language: this.detectLanguage(filePath)
          }
        });
      }
    }

    return samples;
  }

  private extractCodeAnalysisSamples(content: string, filePath: string): any[] {
    const samples: any[] = [];
    const ext = path.extname(filePath).toLowerCase();

    // Only process code files
    if (!['.ts', '.js', '.py', '.java', '.cpp', '.c', '.go', '.rs'].includes(ext)) {
      return samples;
    }

    try {
      // Extract function definitions and their documentation
      const functionRegex = /\/\*\*([\s\S]*?)\*\/\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*{([\s\S]*?)^}/gm;
      let match;

      while ((match = functionRegex.exec(content)) !== null) {
        if (match.length < 4) continue; // Skip if regex didn't capture expected groups
        const [, docComment, functionName, functionBody] = match;
        const cleanDoc = docComment?.replace(/\*\s?/g, '').trim() || '';

        if (cleanDoc && functionBody.trim()) {
          samples.push({
            input: `Analyze this ${ext.slice(1)} function and explain what it does:\n\n${match[0]}`,
            output: `This function "${functionName}" ${cleanDoc.split('\n')[0]}. ${this.analyzeCodeComplexity(functionBody)}`,
            metadata: {
              type: 'code_analysis',
              language: ext.slice(1),
              filePath,
              functionName
            }
          });
        }
      }

      // Extract class/interface definitions
      const classRegex = /\/\*\*([\s\S]*?)\*\/\s*(?:export\s+)?(?:class|interface)\s+(\w+)/g;

      while ((match = classRegex.exec(content)) !== null) {
        if (match.length < 3) continue; // Skip if regex didn't capture expected groups
        const [, docComment, className] = match;
        const cleanDoc = docComment?.replace(/\*\s?/g, '').trim() || '';

        if (cleanDoc) {
          samples.push({
            input: `What is the purpose of this ${ext.slice(1)} class/interface?\n\n${match[0]}`,
            output: `The "${className}" class/interface ${cleanDoc.split('\n')[0]}`,
            metadata: {
              type: 'code_analysis',
              language: ext.slice(1),
              filePath,
              className
            }
          });
        }
      }

    } catch (error) {
      console.warn(`Error extracting code analysis samples from ${filePath}:`, error);
    }

    return samples;
  }

  private extractDocumentationSamples(content: string, filePath: string): any[] {
    const samples: any[] = [];
    const ext = path.extname(filePath).toLowerCase();

    // Process markdown files and code comments
    if (ext === '.md') {
      try {
        // Extract README-style Q&A patterns
        const sections = content.split(/^#+\s+/m).filter(s => s.trim());

        sections.forEach((section, index) => {
          const lines = section.split('\n');
          const title = lines[0]?.trim();
          const body = lines.slice(1).join('\n').trim();

          if (title && body && body.length > 100) {
            samples.push({
              input: `Explain the ${title} section from this documentation`,
              output: body,
              metadata: {
                type: 'documentation',
                filePath,
                section: title,
                format: 'markdown'
              }
            });

            // Create reverse samples for documentation generation
            samples.push({
              input: `Write documentation for: ${title}`,
              output: `# ${title}\n\n${body}`,
              metadata: {
                type: 'doc_generation',
                filePath,
                section: title,
                format: 'markdown'
              }
            });
          }
        });

      } catch (error) {
        console.warn(`Error extracting documentation samples from ${filePath}:`, error);
      }
    }

    // Extract JSDoc comments from code files
    if (['.ts', '.js'].includes(ext)) {
      try {
        const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
        let match;

        while ((match = jsdocRegex.exec(content)) !== null) {
          if (match.length < 2) continue; // Skip if regex didn't capture expected groups
          const comment = match[1]?.replace(/\*\s?/g, '').trim() || '';

          if (comment.length > FINE_TUNING_CONFIG.processing.qualityThresholds.minCommentLength) {
            samples.push({
              input: 'Generate JSDoc documentation for a similar function',
              output: `/**\n${comment.split('\n').map(line => ` * ${line}`).join('\n')}\n */`,
              metadata: {
                type: 'jsdoc_generation',
                filePath,
                format: 'jsdoc'
              }
            });
          }
        }

      } catch (error) {
        console.warn(`Error extracting JSDoc samples from ${filePath}:`, error);
      }
    }

    return samples;
  }

  private extractGeneralSamples(content: string, filePath: string): any[] {
    const samples: any[] = [];
    const ext = path.extname(filePath).toLowerCase();

    try {
      // Extract configuration patterns
      if (['.json', '.yaml', '.yml', '.toml'].includes(ext)) {
        const configType = this.detectConfigType(content, filePath);
        if (configType) {
          samples.push({
            input: `Explain this ${configType} configuration file`,
            output: `This is a ${configType} configuration file that ${this.analyzeConfigPurpose(content, filePath)}`,
            metadata: {
              type: 'config_analysis',
              configType,
              filePath,
              format: ext.slice(1)
            }
          });
        }
      }

      // Extract test patterns
      if (filePath.includes('test') || filePath.includes('spec')) {
        const testSamples = this.extractTestPatterns(content, filePath);
        samples.push(...testSamples);
      }

      // Extract import/export patterns for module understanding
      if (['.ts', '.js'].includes(ext)) {
        const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
        const imports: string[] = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
          if (match.length < 2 || !match[1]) continue; // Skip if regex didn't capture expected groups
          imports.push(match[1]);
        }

        if (imports.length > 2) {
          samples.push({
            input: `What modules does this file depend on?`,
            output: `This file imports from ${imports.length} modules: ${imports.slice(0, FINE_TUNING_CONFIG.processing.qualityThresholds.maxTopImports).join(', ')}${imports.length > FINE_TUNING_CONFIG.processing.qualityThresholds.maxTopImports ? ' and others' : ''}. This suggests it handles ${this.inferModulePurpose(imports)}.`,
            metadata: {
              type: 'dependency_analysis',
              filePath,
              importCount: imports.length,
              topImports: imports.slice(0, FINE_TUNING_CONFIG.processing.qualityThresholds.maxTopImports)
            }
          });
        }
      }

    } catch (error) {
      console.warn(`Error extracting general samples from ${filePath}:`, error);
    }

    return samples;
  }

  private analyzeCodeComplexity(code: string): string {
    const lines = code.split('\n').filter(line => line.trim()).length;
    const hasLoops = /\b(for|while|forEach)\b/.test(code);
    const hasConditionals = /\b(if|switch|case)\b/.test(code);
    const hasAsync = /\b(async|await|Promise)\b/.test(code);

    let complexity = 'simple';
    if (lines > FINE_TUNING_CONFIG.processing.complexityThresholds.moderateLines || (hasLoops && hasConditionals)) complexity = 'moderate';
    if (lines > FINE_TUNING_CONFIG.processing.complexityThresholds.complexLines || (hasAsync && hasLoops && hasConditionals)) complexity = 'complex';

    return `It appears to be a ${complexity} function with ${lines} lines of code${hasAsync ? ' that includes asynchronous operations' : ''}.`;
  }

  private detectConfigType(content: string, filePath: string): string | null {
    const fileName = path.basename(filePath).toLowerCase();

    if (fileName.includes('package.json')) return 'npm package';
    if (fileName.includes('tsconfig')) return 'TypeScript';
    if (fileName.includes('jest') || fileName.includes('test')) return 'testing';
    if (fileName.includes('eslint') || fileName.includes('lint')) return 'linting';
    if (fileName.includes('webpack') || fileName.includes('vite')) return 'build tool';
    if (fileName.includes('docker')) return 'Docker';

    return 'application';
  }

  private analyzeConfigPurpose(content: string, filePath: string): string {
    const fileName = path.basename(filePath);

    try {
      const parsed = JSON.parse(content);
      if (parsed.scripts) return 'defines build and development scripts';
      if (parsed.dependencies) return 'manages project dependencies';
      if (parsed.compilerOptions) return 'configures TypeScript compilation settings';
      if (parsed.rules) return 'defines code quality and style rules';
    } catch {
      // Not JSON, could be YAML or other format
    }

    return `configures settings for ${fileName.split('.')[0]}`;
  }

  private extractTestPatterns(content: string, filePath: string): any[] {
    const samples: any[] = [];

    // Extract test descriptions and expectations
    const testRegex = /(?:it|test)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*{([\s\S]*?)^\s*}\s*\)/gm;
    let match;

    while ((match = testRegex.exec(content)) !== null) {
      if (match.length < 3) continue; // Skip if regex didn't capture expected groups
      const [, testDescription, testBody] = match;

      if (testDescription && testBody.trim()) {
        samples.push({
          input: `Write a test that ${testDescription}`,
          output: `Here's a test implementation:\n\n${match[0]}`,
          metadata: {
            type: 'test_pattern',
            filePath,
            testDescription,
            framework: this.detectTestFramework(content)
          }
        });
      }
    }

    return samples;
  }

  private detectTestFramework(content: string): string {
    if (content.includes('jest')) return 'jest';
    if (content.includes('mocha')) return 'mocha';
    if (content.includes('vitest')) return 'vitest';
    if (content.includes('describe') && content.includes('it')) return 'jasmine-style';
    return 'unknown';
  }

  private inferModulePurpose(imports: string[]): string {
    const categories = {
      'web frameworks': ['express', 'fastify', 'koa', 'next', 'react', 'vue', 'angular'],
      'testing': ['jest', 'mocha', 'vitest', 'testing-library'],
      'utilities': ['lodash', 'ramda', 'moment', 'date-fns'],
      'data processing': ['axios', 'fetch', 'fs', 'path'],
      'build tools': ['webpack', 'vite', 'rollup', 'babel']
    };

    for (const [category, patterns] of Object.entries(categories)) {
      if (imports.some(imp => patterns.some(pattern => imp.includes(pattern)))) {
        return category;
      }
    }

    return 'general application logic';
  }

  private async validateDatasetQuality(samples: any[], type: FineTuningDataset['type']): Promise<'high' | 'medium' | 'low'> {
    const config = getMergedConfig(FINE_TUNING_CONFIG);
    if (samples.length < config.qualityThresholds.lowSampleCount) return 'low';
    if (samples.length < config.qualityThresholds.mediumSampleCount) return 'medium';
    return 'high';
  }

  private async saveDataset(filePath: string, samples: any[], format: string): Promise<void> {
    if (format === 'jsonl') {
      const content = samples.map(sample => JSON.stringify(sample)).join('\n');
      await fs.writeFile(filePath, content, 'utf-8');
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  private mergeWithDefaults(config: Partial<FineTuningConfig>): FineTuningConfig {
    const defaults = getMergedConfig(FINE_TUNING_CONFIG).defaultConfig;
    return { ...defaults, ...config };
  }

  private async executeFineTuning(job: FineTuningJob): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();

    // This would execute the actual fine-tuning process
    // For now, simulate with a timeout
    return new Promise((resolve, reject) => {
      const config = getMergedConfig(FINE_TUNING_CONFIG).simulation;
      const duration = config.durationMs;
      const updateInterval = config.updateIntervalMs;

      let currentTime = 0;
      const interval = setInterval(() => {
        currentTime += updateInterval;
        const progress = currentTime / duration;

        job.progress.currentEpoch = Math.floor(progress * job.config.epochs);
        job.progress.loss = Math.max(0.1, 2.0 * (1 - progress) + Math.random() * 0.1);
        job.progress.estimatedTimeRemaining = duration - currentTime;

        this.emit('jobProgress', job);

        if (currentTime >= duration) {
          clearInterval(interval);
          job.status = 'completed';
          job.completedAt = new Date();
          job.results = {
            finalLoss: job.progress.loss,
            accuracy: FINE_TUNING_CONFIG.processing.mockMetrics.baseAccuracy + Math.random() * FINE_TUNING_CONFIG.processing.mockMetrics.accuracyVariance,
            perplexity: FINE_TUNING_CONFIG.processing.mockMetrics.basePerplexity + Math.random() * FINE_TUNING_CONFIG.processing.mockMetrics.perplexityVariance
          };
          job.outputModel.path = path.join(this.modelsDir, `${job.id}_model`);
          job.outputModel.size = 1024 * 1024 * config.outputModelSizeMB;

          this.emit('jobCompleted', job);
          resolve();
        }
      }, updateInterval);
    });
  }

  private async startModelServer(deployment: ModelDeployment, options: any): Promise<void> {
    // Start model server (implementation would depend on the model format)
    // For now, just simulate successful deployment
    const config = getMergedConfig(FINE_TUNING_CONFIG).simulation;
    await new Promise(resolve => setTimeout(resolve, config.serverStartupDelayMs));
  }

  private async findAvailablePort(): Promise<number> {
    // Find an available port for model deployment
    return 8000 + Math.floor(Math.random() * 1000);
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift'
    };
    return languageMap[ext] || 'unknown';
  }
}

/**
 * Custom Local Provider for fine-tuned models
 */
export class CustomLocalProvider extends BaseAIProvider {
  private fineTuningManager: LocalFineTuningManager;
  private currentDeployment?: ModelDeployment;

  constructor(config: ProviderConfig & { workspaceDir?: string }) {
    super(config);
    this.fineTuningManager = new LocalFineTuningManager(config.workspaceDir);
  }

  getName(): string {
    return 'custom-local';
  }

  getDisplayName(): string {
    return 'Custom Local Models';
  }

  getCapabilities() {
    const config = getMergedConfig(FINE_TUNING_CONFIG).providers;
    return {
      maxContextWindow: config.contextWindow,
      supportedCapabilities: [
        AICapability.TEXT_COMPLETION,
        AICapability.CODE_GENERATION,
        AICapability.CODE_ANALYSIS
      ],
      rateLimits: config.rateLimits,
      features: {
        streaming: true,
        functionCalling: false,
        imageInput: false,
        documentInput: false,
        customInstructions: true
      }
    };
  }

  async initialize(): Promise<void> {
    await this.fineTuningManager.initialize();
    this.isInitialized = true;
  }

  async testConnection(): Promise<boolean> {
    return this.currentDeployment?.status === 'deployed' || false;
  }

  async complete(prompt: string | any[], options: any = {}): Promise<any> {
    if (!this.currentDeployment) {
      throw new Error('No model deployed');
    }

    // Implement completion using deployed model
    const startTime = Date.now();
    const config = getMergedConfig(FINE_TUNING_CONFIG).providers.mockResponse;
    const response = {
      content: 'Mock response from custom local model',
      model: this.currentDeployment.name,
      finishReason: 'stop' as const,
      usage: config,
      metadata: {
        requestId: generateRequestId(),
        processingTime: Date.now() - startTime,
        provider: this.getName()
      }
    };

    this.updateMetrics(true, response.metadata.processingTime, response.usage.totalTokens, 0);
    return response;
  }

  async completeStream(prompt: string | any[], options: any, onEvent: any, abortSignal?: AbortSignal): Promise<void> {
    const deployments = this.fineTuningManager.listDeployments();
    const deployment = deployments.find(d => d.status === 'deployed');
    if (!deployment || deployment.status !== 'deployed') {
      throw new Error('No active deployment available for streaming');
    }

    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // Simulate streaming response by chunking a complete response
      const fullResponse = await this.complete(prompt, options);
      const content = fullResponse.content;

      // Split content into chunks for streaming
      const chunkSize = FINE_TUNING_CONFIG.processing.chunkSize; // words per chunk
      const words = content.split(' ');
      const chunks = [];

      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(' '));
      }

      // Stream chunks with simulated delay
      for (let i = 0; i < chunks.length; i++) {
        if (abortSignal?.aborted) {
          onEvent({
            type: 'error',
            error: new Error('Request aborted'),
            requestId
          });
          return;
        }

        const chunk = chunks[i];
        const isLast = i === chunks.length - 1;

        // Add space between chunks except for the last one
        const chunkContent = isLast ? chunk : chunk + ' ';

        onEvent({
          type: 'content',
          content: chunkContent,
          requestId,
          metadata: {
            chunkIndex: i,
            totalChunks: chunks.length,
            isComplete: isLast
          }
        });

        // Simulate network delay between chunks
        if (!isLast) {
          await new Promise(resolve => setTimeout(resolve, FINE_TUNING_CONFIG.processing.streamingDelayMs));
        }
      }

      // Send completion event
      onEvent({
        type: 'done',
        requestId,
        metadata: {
          totalTime: Date.now() - startTime,
          tokensGenerated: words.length,
          model: deployment.name
        }
      });

    } catch (error) {
      onEvent({
        type: 'error',
        error,
        requestId
      });
      throw error;
    }
  }

  async listModels(): Promise<AIModel[]> {
    const deployments = this.fineTuningManager.listDeployments();
    return deployments.map(deployment => ({
      id: deployment.id,
      name: deployment.name,
      provider: this.getName(),
      capabilities: [AICapability.TEXT_COMPLETION, AICapability.CODE_GENERATION],
      contextWindow: FINE_TUNING_CONFIG.providers.contextWindow,
      costPerToken: {
        input: 0,
        output: 0
      },
      averageResponseTime: deployment.performance.averageLatency,
      qualityScore: FINE_TUNING_CONFIG.processing.mockMetrics.defaultQualityScore,
      lastUpdated: deployment.createdAt
    }));
  }

  async getModel(modelId: string): Promise<AIModel | null> {
    const models = await this.listModels();
    return models.find(model => model.id === modelId) || null;
  }

  calculateCost(promptTokens: number, completionTokens: number, model?: string): number {
    return 0; // Local models have no cost
  }

  /**
   * Get fine-tuning manager for advanced operations
   */
  getFineTuningManager(): LocalFineTuningManager {
    return this.fineTuningManager;
  }

  /**
   * Set active deployment
   */
  setActiveDeployment(deploymentId: string): void {
    const deployment = this.fineTuningManager.getDeployment(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }
    this.currentDeployment = deployment;
  }

}
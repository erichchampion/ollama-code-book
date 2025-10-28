/**
 * Custom Model Deployment and Management System
 *
 * Provides comprehensive management for deploying, scaling, and monitoring
 * custom AI models in production environments with health checks and resource management.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as https from 'https';
import { ModelDeployment } from './local-fine-tuning.js';
import { generateSecureId } from '../../utils/id-generator.js';
import { DEPLOYMENT_CONFIG, getMergedConfig } from './config/advanced-features-config.js';
import { DirectoryManager } from '../../utils/directory-manager.js';
import { ConfigurationMerger } from '../../utils/configuration-merger.js';

export interface DeploymentConfig {
  name: string;
  modelPath: string;
  modelType: 'ollama' | 'huggingface' | 'onnx' | 'tensorrt' | 'custom';
  runtime: 'cpu' | 'gpu' | 'auto';
  resources: {
    maxMemoryMB: number;
    maxCpuCores: number;
    gpuDevices?: number[];
    diskSpaceGB: number;
  };
  scaling: {
    minInstances: number;
    maxInstances: number;
    targetConcurrency: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
  };
  networking: {
    port?: number;
    host?: string;
    ssl?: {
      enabled: boolean;
      certPath?: string;
      keyPath?: string;
    };
    cors?: {
      enabled: boolean;
      origins?: string[];
    };
  };
  health: {
    checkInterval: number;
    timeout: number;
    retries: number;
    warmupTime: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
    retentionDays: number;
  };
}

export interface DeploymentInstance {
  id: string;
  deploymentId: string;
  pid?: number;
  port: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  startedAt?: Date;
  lastHealthCheck?: Date;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  resources: {
    memoryUsageMB: number;
    cpuUsagePercent: number;
    gpuUsagePercent?: number;
  };
  performance: {
    requestCount: number;
    averageLatency: number;
    errorRate: number;
    throughput: number;
  };
  logs: string[];
  process?: ChildProcess;
}

export interface LoadBalancer {
  id: string;
  deploymentId: string;
  strategy: 'round_robin' | 'least_connections' | 'weighted' | 'random';
  instances: string[];
  currentIndex: number;
  weights?: Map<string, number>;
  healthyInstances: Set<string>;
}

export interface ModelRegistry {
  models: Map<string, ModelRegistryEntry>;
  deployments: Map<string, ModelDeployment>;
  instances: Map<string, DeploymentInstance>;
  loadBalancers: Map<string, LoadBalancer>;
}

export interface ModelRegistryEntry {
  id: string;
  name: string;
  version: string;
  type: DeploymentConfig['modelType'];
  path: string;
  size: number;
  checksum: string;
  metadata: {
    description?: string;
    author?: string;
    license?: string;
    tags?: string[];
    capabilities?: string[];
  };
  createdAt: Date;
  lastAccessed?: Date;
  downloadCount: number;
  deploymentCount: number;
}

export class ModelDeploymentManager extends EventEmitter {
  private registry: ModelRegistry;
  private workspaceDir: string;
  private modelsDir: string;
  private logsDir: string;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private portAllocator: PortAllocator;

  constructor(workspaceDir: string = './ollama-code-workspace') {
    super();
    this.workspaceDir = workspaceDir;
    this.modelsDir = path.join(workspaceDir, 'models');
    this.logsDir = path.join(workspaceDir, 'logs');

    this.registry = {
      models: new Map(),
      deployments: new Map(),
      instances: new Map(),
      loadBalancers: new Map()
    };

    this.portAllocator = new PortAllocator(DEPLOYMENT_CONFIG.ports.minPort, DEPLOYMENT_CONFIG.ports.maxPort);
  }

  /**
   * Initialize the deployment manager
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureDirectories();
      await this.loadRegistry();
      await this.recoverDeployments();
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Register a new model in the registry
   */
  async registerModel(
    name: string,
    version: string,
    type: DeploymentConfig['modelType'],
    modelPath: string,
    metadata: ModelRegistryEntry['metadata'] = {}
  ): Promise<ModelRegistryEntry> {
    const id = generateSecureId('model_registry');
    const stats = await fs.stat(modelPath);
    const checksum = await this.calculateChecksum(modelPath);

    const entry: ModelRegistryEntry = {
      id,
      name,
      version,
      type,
      path: modelPath,
      size: stats.size,
      checksum,
      metadata,
      createdAt: new Date(),
      downloadCount: 0,
      deploymentCount: 0
    };

    this.registry.models.set(id, entry);
    await this.saveRegistry();
    this.emit('modelRegistered', entry);

    return entry;
  }

  /**
   * Deploy a registered model
   */
  async deployModel(
    modelId: string,
    config: Partial<DeploymentConfig>
  ): Promise<ModelDeployment> {
    const model = this.registry.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const deploymentId = generateSecureId('deployment');
    const fullConfig = this.mergeWithDefaults(config, model);

    const deployment: ModelDeployment = {
      id: deploymentId,
      name: fullConfig.name,
      modelPath: model.path,
      status: 'deploying',
      port: fullConfig.networking.port || await this.portAllocator.allocate(),
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

    this.registry.deployments.set(deploymentId, deployment);

    try {
      // Create load balancer
      const loadBalancer = await this.createLoadBalancer(deploymentId, fullConfig.scaling);
      this.registry.loadBalancers.set(deploymentId, loadBalancer);

      // Start initial instances
      await this.scaleDeployment(deploymentId, fullConfig.scaling.minInstances);

      deployment.status = 'deployed';
      model.deploymentCount++;

      await this.saveRegistry();
      this.emit('modelDeployed', deployment);

      return deployment;
    } catch (error) {
      deployment.status = 'error';
      this.emit('deploymentFailed', deployment, error);
      throw error;
    }
  }

  /**
   * Scale a deployment up or down
   */
  async scaleDeployment(deploymentId: string, targetInstances: number): Promise<void> {
    const deployment = this.registry.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    const currentInstances = Array.from(this.registry.instances.values())
      .filter(instance => instance.deploymentId === deploymentId);

    const currentCount = currentInstances.length;
    const difference = targetInstances - currentCount;

    if (difference > 0) {
      // Scale up
      for (let i = 0; i < difference; i++) {
        await this.startInstance(deploymentId);
      }
    } else if (difference < 0) {
      // Scale down
      const instancesToStop = currentInstances.slice(0, Math.abs(difference));
      for (const instance of instancesToStop) {
        await this.stopInstance(instance.id);
      }
    }

    this.emit('deploymentScaled', deployment, targetInstances);
  }

  /**
   * Start a new instance of a deployment
   */
  async startInstance(deploymentId: string): Promise<DeploymentInstance> {
    const deployment = this.registry.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    const instanceId = generateSecureId('instance');
    const port = await this.portAllocator.allocate();

    const instance: DeploymentInstance = {
      id: instanceId,
      deploymentId,
      port,
      status: 'starting',
      healthStatus: 'unknown',
      resources: {
        memoryUsageMB: 0,
        cpuUsagePercent: 0
      },
      performance: {
        requestCount: 0,
        averageLatency: 0,
        errorRate: 0,
        throughput: 0
      },
      logs: []
    };

    this.registry.instances.set(instanceId, instance);

    try {
      // Start the model server process
      await this.startModelProcess(instance, deployment);

      // Start health monitoring
      this.startHealthMonitoring(instance);

      instance.status = 'running';
      instance.startedAt = new Date();

      // Add to load balancer
      const loadBalancer = this.registry.loadBalancers.get(deploymentId);
      if (loadBalancer) {
        loadBalancer.instances.push(instanceId);
      }

      this.emit('instanceStarted', instance);
      return instance;
    } catch (error) {
      instance.status = 'error';
      this.emit('instanceFailed', instance, error);
      throw error;
    }
  }

  /**
   * Stop an instance
   */
  async stopInstance(instanceId: string): Promise<void> {
    const instance = this.registry.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    instance.status = 'stopping';

    // Stop health monitoring
    const healthInterval = this.healthCheckIntervals.get(instanceId);
    if (healthInterval) {
      clearInterval(healthInterval);
      this.healthCheckIntervals.delete(instanceId);
    }

    // Terminate process
    if (instance.process && !instance.process.killed) {
      instance.process.kill('SIGTERM');
    }

    // Remove from load balancer
    const loadBalancer = this.registry.loadBalancers.get(instance.deploymentId);
    if (loadBalancer) {
      const index = loadBalancer.instances.indexOf(instanceId);
      if (index > -1) {
        loadBalancer.instances.splice(index, 1);
      }
      loadBalancer.healthyInstances.delete(instanceId);
    }

    // Release port
    this.portAllocator.release(instance.port);

    instance.status = 'stopped';
    this.registry.instances.delete(instanceId);

    this.emit('instanceStopped', instance);
  }

  /**
   * Get deployment status
   */
  getDeployment(deploymentId: string): ModelDeployment | undefined {
    return this.registry.deployments.get(deploymentId);
  }

  /**
   * List all deployments
   */
  listDeployments(): ModelDeployment[] {
    return Array.from(this.registry.deployments.values());
  }

  /**
   * Get instances for a deployment
   */
  getInstances(deploymentId: string): DeploymentInstance[] {
    return Array.from(this.registry.instances.values())
      .filter(instance => instance.deploymentId === deploymentId);
  }

  /**
   * Get load balancer for a deployment
   */
  getLoadBalancer(deploymentId: string): LoadBalancer | undefined {
    return this.registry.loadBalancers.get(deploymentId);
  }

  /**
   * Route request to healthy instance
   */
  routeRequest(deploymentId: string): DeploymentInstance | null {
    const loadBalancer = this.registry.loadBalancers.get(deploymentId);
    if (!loadBalancer || loadBalancer.healthyInstances.size === 0) {
      return null;
    }

    const healthyInstances = Array.from(loadBalancer.healthyInstances);
    let selectedInstanceId: string;

    switch (loadBalancer.strategy) {
      case 'round_robin':
        selectedInstanceId = healthyInstances[loadBalancer.currentIndex % healthyInstances.length];
        loadBalancer.currentIndex++;
        break;
      case 'least_connections':
        selectedInstanceId = this.selectLeastConnectedInstance(healthyInstances);
        break;
      case 'weighted':
        selectedInstanceId = this.selectWeightedInstance(healthyInstances, loadBalancer);
        break;
      case 'random':
        selectedInstanceId = healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
        break;
      default:
        selectedInstanceId = healthyInstances[0];
    }

    return this.registry.instances.get(selectedInstanceId) || null;
  }

  /**
   * Update instance metrics
   */
  updateInstanceMetrics(instanceId: string, metrics: Partial<DeploymentInstance['performance']>): void {
    const instance = this.registry.instances.get(instanceId);
    if (instance) {
      Object.assign(instance.performance, metrics);
      this.emit('instanceMetricsUpdated', instance);
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    // Stop all health monitoring
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();

    // Stop all instances
    for (const instance of this.registry.instances.values()) {
      if (instance.status === 'running') {
        await this.stopInstance(instance.id);
      }
    }

    // Save registry
    await this.saveRegistry();

    this.removeAllListeners();
  }

  /**
   * Private methods
   */

  private async ensureDirectories(): Promise<void> {
    await DirectoryManager.ensureDirectories(
      this.workspaceDir,
      this.modelsDir,
      this.logsDir
    );
  }

  private async loadRegistry(): Promise<void> {
    const registryPath = path.join(this.workspaceDir, 'registry.json');
    try {
      const content = await fs.readFile(registryPath, 'utf-8');
      const data = JSON.parse(content);

      // Convert Maps from serialized format
      this.registry.models = new Map(data.models || []);
      this.registry.deployments = new Map(data.deployments || []);
      this.registry.instances = new Map(data.instances || []);
      this.registry.loadBalancers = new Map(data.loadBalancers || []);
    } catch (error) {
      // Registry doesn't exist yet, start fresh
    }
  }

  private async saveRegistry(): Promise<void> {
    const registryPath = path.join(this.workspaceDir, 'registry.json');
    const data = {
      models: Array.from(this.registry.models.entries()),
      deployments: Array.from(this.registry.deployments.entries()),
      instances: Array.from(this.registry.instances.entries()),
      loadBalancers: Array.from(this.registry.loadBalancers.entries())
    };
    await fs.writeFile(registryPath, JSON.stringify(data, null, 2));
  }

  private async recoverDeployments(): Promise<void> {
    // Recover running instances after restart
    for (const instance of this.registry.instances.values()) {
      if (instance.status === 'running' && instance.pid) {
        try {
          process.kill(instance.pid, 0); // Check if process exists
          this.startHealthMonitoring(instance);
        } catch {
          // Process no longer exists
          instance.status = 'stopped';
        }
      }
    }
  }


  private async calculateChecksum(filePath: string): Promise<string> {
    // Simple checksum calculation (in real implementation, use crypto.createHash)
    const stats = await fs.stat(filePath);
    return `${stats.size}_${stats.mtime.getTime()}`;
  }

  private mergeWithDefaults(config: Partial<DeploymentConfig>, model: ModelRegistryEntry): DeploymentConfig {
    const baseDefaults: DeploymentConfig = {
      name: `${model.name}-deployment`,
      modelPath: model.path,
      modelType: model.type,
      runtime: 'auto',
      resources: {
        maxMemoryMB: DEPLOYMENT_CONFIG.resources.maxMemoryMB,
        maxCpuCores: DEPLOYMENT_CONFIG.resources.maxCpuCores,
        diskSpaceGB: DEPLOYMENT_CONFIG.resources.diskSpaceGB
      },
      scaling: {
        minInstances: DEPLOYMENT_CONFIG.scaling.minInstances,
        maxInstances: DEPLOYMENT_CONFIG.scaling.maxInstances,
        targetConcurrency: DEPLOYMENT_CONFIG.scaling.targetConcurrency,
        scaleUpThreshold: DEPLOYMENT_CONFIG.scaling.scaleUpThreshold,
        scaleDownThreshold: DEPLOYMENT_CONFIG.scaling.scaleDownThreshold
      },
      networking: {
        host: DEPLOYMENT_CONFIG.networking.host,
        ssl: { enabled: DEPLOYMENT_CONFIG.networking.ssl.enabled },
        cors: { enabled: DEPLOYMENT_CONFIG.networking.cors.enabled }
      },
      health: {
        checkInterval: DEPLOYMENT_CONFIG.health.checkIntervalMs,
        timeout: DEPLOYMENT_CONFIG.health.timeoutMs,
        retries: DEPLOYMENT_CONFIG.health.retries,
        warmupTime: DEPLOYMENT_CONFIG.health.warmupTimeMs
      },
      monitoring: {
        metricsEnabled: DEPLOYMENT_CONFIG.monitoring.metricsEnabled,
        loggingLevel: DEPLOYMENT_CONFIG.monitoring.loggingLevel,
        retentionDays: DEPLOYMENT_CONFIG.monitoring.retentionDays
      }
    };

    return ConfigurationMerger.mergeWithDefaults(config, baseDefaults, { deepMerge: true });
  }

  private async createLoadBalancer(deploymentId: string, scaling: DeploymentConfig['scaling']): Promise<LoadBalancer> {
    return {
      id: generateSecureId('load_balancer'),
      deploymentId,
      strategy: 'round_robin',
      instances: [],
      currentIndex: 0,
      healthyInstances: new Set()
    };
  }

  private async startModelProcess(instance: DeploymentInstance, deployment: ModelDeployment): Promise<void> {
    return new Promise((resolve, reject) => {
      // Simulate starting a model server
      // In real implementation, this would spawn the actual model server process
      const mockProcess = spawn('node', ['-e', `
        const http = require('http');
        const server = http.createServer((req, res) => {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({message: 'Model server running', instance: '${instance.id}'}));
        });
        server.listen(${instance.port}, () => {
          console.log('Model server started on port ${instance.port}');
        });
      `]);

      instance.process = mockProcess;
      instance.pid = mockProcess.pid;

      mockProcess.on('error', reject);
      mockProcess.on('spawn', () => {
        setTimeout(resolve, DEPLOYMENT_CONFIG.simulation.serverStartupDelayMs); // Wait for server to start
      });

      // Log output
      mockProcess.stdout?.on('data', (data) => {
        instance.logs.push(`[${new Date().toISOString()}] ${data.toString()}`);
      });

      mockProcess.stderr?.on('data', (data) => {
        instance.logs.push(`[${new Date().toISOString()}] ERROR: ${data.toString()}`);
      });
    });
  }

  private startHealthMonitoring(instance: DeploymentInstance): void {
    const interval = setInterval(async () => {
      try {
        const isHealthy = await this.checkInstanceHealth(instance);
        const loadBalancer = this.registry.loadBalancers.get(instance.deploymentId);

        if (isHealthy) {
          instance.healthStatus = 'healthy';
          instance.lastHealthCheck = new Date();
          loadBalancer?.healthyInstances.add(instance.id);
        } else {
          instance.healthStatus = 'unhealthy';
          loadBalancer?.healthyInstances.delete(instance.id);
        }

        this.emit('instanceHealthUpdated', instance);
      } catch (error) {
        instance.healthStatus = 'unhealthy';
        this.emit('instanceHealthCheckFailed', instance, error);
      }
    }, DEPLOYMENT_CONFIG.health.checkIntervalMs); // Check every 30 seconds

    this.healthCheckIntervals.set(instance.id, interval);
  }

  private async checkInstanceHealth(instance: DeploymentInstance): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: instance.port,
        path: '/health',
        method: 'GET',
        timeout: DEPLOYMENT_CONFIG.health.timeoutMs
      }, (res) => {
        resolve(res.statusCode === DEPLOYMENT_CONFIG.simulation.healthCheckStatusCode);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => resolve(false));
      req.end();
    });
  }

  private selectLeastConnectedInstance(instanceIds: string[]): string {
    // Find instance with lowest request count as a proxy for active connections
    let selectedInstanceId = instanceIds[0];
    let lowestRequestCount = Infinity;

    for (const instanceId of instanceIds) {
      const instance = this.registry.instances.get(instanceId);
      if (instance) {
        const requestCount = instance.performance.requestCount;
        if (requestCount < lowestRequestCount) {
          lowestRequestCount = requestCount;
          selectedInstanceId = instanceId;
        }
      }
    }

    return selectedInstanceId;
  }

  private selectWeightedInstance(instanceIds: string[], loadBalancer: LoadBalancer): string {
    if (!loadBalancer.weights || loadBalancer.weights.size === 0) {
      // If no weights configured, fall back to round robin
      return instanceIds[loadBalancer.currentIndex % instanceIds.length];
    }

    // Calculate total weight for available instances
    let totalWeight = 0;
    const availableWeights: Array<{ instanceId: string; weight: number }> = [];

    for (const instanceId of instanceIds) {
      const weight = loadBalancer.weights.get(instanceId) || 1.0;
      availableWeights.push({ instanceId, weight });
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return instanceIds[0];
    }

    // Generate random number and select instance based on weighted probability
    const random = Math.random() * totalWeight;
    let currentWeight = 0;

    for (const { instanceId, weight } of availableWeights) {
      currentWeight += weight;
      if (random <= currentWeight) {
        return instanceId;
      }
    }

    return instanceIds[0]; // Fallback
  }
}

/**
 * Port allocation utility
 */
class PortAllocator {
  private allocatedPorts: Set<number> = new Set();
  private minPort: number;
  private maxPort: number;

  constructor(minPort: number = DEPLOYMENT_CONFIG.ports.minPort, maxPort: number = DEPLOYMENT_CONFIG.ports.maxPort) {
    this.minPort = minPort;
    this.maxPort = maxPort;
  }

  async allocate(): Promise<number> {
    for (let port = this.minPort; port <= this.maxPort; port++) {
      if (!this.allocatedPorts.has(port) && await this.isPortAvailable(port)) {
        this.allocatedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports in range');
  }

  release(port: number): void {
    this.allocatedPorts.delete(port);
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = http.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  }
}
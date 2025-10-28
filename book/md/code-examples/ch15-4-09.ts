// src/tools/k8s-generator.ts
import { Tool, ToolMetadata } from 'ollama-code';
import * as yaml from 'yaml';

export class GenerateK8sDeploymentTool implements Tool {
  readonly metadata: ToolMetadata = {
    name: 'generate-k8s-deployment',
    description: 'Generate a Kubernetes Deployment YAML configuration',
    parameters: {
      type: 'object',
      properties: {
        appName: {
          type: 'string',
          description: 'Application name'
        },
        image: {
          type: 'string',
          description: 'Docker image (e.g., nginx:1.21)'
        },
        replicas: {
          type: 'number',
          description: 'Number of replicas',
          default: 3
        },
        port: {
          type: 'number',
          description: 'Container port',
          default: 8080
        },
        resources: {
          type: 'object',
          description: 'Resource requests and limits',
          properties: {
            requests: {
              type: 'object',
              properties: {
                cpu: { type: 'string', default: '100m' },
                memory: { type: 'string', default: '128Mi' }
              }
            },
            limits: {
              type: 'object',
              properties: {
                cpu: { type: 'string', default: '500m' },
                memory: { type: 'string', default: '512Mi' }
              }
            }
          }
        },
        env: {
          type: 'object',
          description: 'Environment variables'
        }
      },
      required: ['appName', 'image']
    }
  };

  async execute(params: K8sDeploymentParams): Promise<K8sDeploymentResult> {
    // Generate Kubernetes Deployment object
    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: params.appName,
        labels: {
          app: params.appName
        }
      },
      spec: {
        replicas: params.replicas || 3,
        selector: {
          matchLabels: {
            app: params.appName
          }
        },
        template: {
          metadata: {
            labels: {
              app: params.appName
            }
          },
          spec: {
            containers: [
              {
                name: params.appName,
                image: params.image,
                ports: [
                  {
                    containerPort: params.port || 8080,
                    protocol: 'TCP'
                  }
                ],
                resources: params.resources || {
                  requests: {
                    cpu: '100m',
                    memory: '128Mi'
                  },
                  limits: {
                    cpu: '500m',
                    memory: '512Mi'
                  }
                },
                env: this.convertEnvVars(params.env),
                livenessProbe: {
                  httpGet: {
                    path: '/health',
                    port: params.port || 8080
                  },
                  initialDelaySeconds: 30,
                  periodSeconds: 10
                },
                readinessProbe: {
                  httpGet: {
                    path: '/ready',
                    port: params.port || 8080
                  },
                  initialDelaySeconds: 5,
                  periodSeconds: 5
                }
              }
            ]
          }
        }
      }
    };

    // Convert to YAML
    const yamlContent = yaml.stringify(deployment);

    return {
      yaml: yamlContent,
      deployment,
      summary: `Generated Deployment for ${params.appName} with ${params.replicas || 3} replicas`
    };
  }

  private convertEnvVars(env?: Record<string, string>): any[] {
    if (!env) return [];

    return Object.entries(env).map(([name, value]) => ({
      name,
      value
    }));
  }
}

interface K8sDeploymentParams {
  appName: string;
  image: string;
  replicas?: number;
  port?: number;
  resources?: {
    requests?: { cpu: string; memory: string };
    limits?: { cpu: string; memory: string };
  };
  env?: Record<string, string>;
}

interface K8sDeploymentResult {
  yaml: string;
  deployment: any;
  summary: string;
}
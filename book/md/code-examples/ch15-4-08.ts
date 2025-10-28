// src/plugins/kubernetes.ts
import { Plugin, PluginContext, PluginMetadata } from 'ollama-code';
import { GenerateK8sDeploymentTool } from '../tools/k8s-generator';
import { ValidateK8sConfigTool } from '../tools/k8s-validator';
import { ExplainK8sResourceTool } from '../tools/k8s-explainer';
import { DebugK8sDeploymentTool } from '../tools/k8s-debugger';

export class KubernetesPlugin implements Plugin {
  readonly metadata: PluginMetadata = {
    id: 'kubernetes',
    name: 'Kubernetes Plugin',
    version: '1.0.0',
    description: 'Generate, validate, and debug Kubernetes configurations',
    author: 'DevOps AI Team',
    dependencies: {
      platform: '^1.0.0'
    }
  };

  constructor(private options: KubernetesPluginOptions) {}

  async activate(context: PluginContext): Promise<void> {
    // Register tools
    const toolExtensions = context.extensions.get('tools');

    toolExtensions.register(new GenerateK8sDeploymentTool());
    toolExtensions.register(new GenerateK8sServiceTool());
    toolExtensions.register(new GenerateK8sIngressTool());
    toolExtensions.register(new ValidateK8sConfigTool());
    toolExtensions.register(new ExplainK8sResourceTool());

    if (this.options.kubectl) {
      toolExtensions.register(new DebugK8sDeploymentTool());
      toolExtensions.register(new ApplyK8sConfigTool());
    }

    if (this.options.helm) {
      toolExtensions.register(new GenerateHelmChartTool());
    }

    // Register commands
    const commandExtensions = context.extensions.get('commands');
    commandExtensions.register(new GenerateK8sCommand());
    commandExtensions.register(new ValidateK8sCommand());
  }

  async deactivate(): Promise<void> {
    // Cleanup if needed
  }
}

interface KubernetesPluginOptions {
  kubectl?: boolean;
  helm?: boolean;
  kustomize?: boolean;
}
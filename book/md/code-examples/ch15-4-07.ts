// src/assistant.ts
import {
  AIProvider,
  OllamaProvider,
  OpenAIProvider,
  ToolOrchestrator,
  ConversationManager,
  PluginManager
} from 'ollama-code';

import { KubernetesPlugin } from './plugins/kubernetes';
import { TerraformPlugin } from './plugins/terraform';
import { AWSPlugin } from './plugins/aws';

export class DevOpsAssistant {
  private aiProvider: AIProvider;
  private toolOrchestrator: ToolOrchestrator;
  private conversationManager: ConversationManager;
  private pluginManager: PluginManager;

  constructor(config: DevOpsAssistantConfig) {
    this.initializeAI(config);
    this.initializeOrchestration();
    this.loadPlugins(config);
  }

  private initializeAI(config: DevOpsAssistantConfig): void {
    // Primary: Local Ollama for privacy
    const ollamaProvider = new OllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: config.models.primary || 'codellama:34b'
    });

    // Fallback: OpenAI for quality
    const openaiProvider = config.openaiKey
      ? new OpenAIProvider({
          apiKey: config.openaiKey,
          model: 'gpt-4-turbo'
        })
      : null;

    // Use intelligent router for fallback
    this.aiProvider = new IntelligentRouter({
      providers: [ollamaProvider, openaiProvider].filter(Boolean),
      strategy: 'quality' // Prefer quality for infrastructure code
    });
  }

  private initializeOrchestration(): void {
    this.toolOrchestrator = new ToolOrchestrator();
    this.conversationManager = new ConversationManager({
      maxTokens: 8000,
      strategy: 'recent' // Recent messages most relevant
    });
  }

  private async loadPlugins(config: DevOpsAssistantConfig): Promise<void> {
    this.pluginManager = new PluginManager();

    // Load core plugins
    await this.pluginManager.load(new KubernetesPlugin({
      kubectl: config.integrations?.kubectl !== false,
      helm: config.integrations?.helm !== false
    }));

    await this.pluginManager.load(new TerraformPlugin({
      terraform: config.integrations?.terraform !== false
    }));

    if (config.integrations?.aws) {
      await this.pluginManager.load(new AWSPlugin({
        region: config.aws?.region || 'us-east-1'
      }));
    }
  }

  async processRequest(userInput: string): Promise<string> {
    // Add to conversation
    this.conversationManager.addMessage({
      role: 'user',
      content: userInput
    });

    // Get context
    const context = this.conversationManager.getContext();

    // Generate response with AI
    const response = await this.aiProvider.complete({
      messages: context,
      tools: this.toolOrchestrator.getAvailableTools(),
      temperature: 0.2 // Low temp for accurate infrastructure code
    });

    // Execute tools if needed
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolResults = await this.toolOrchestrator.executeTools(
        response.toolCalls
      );

      // Generate final response with tool results
      const finalResponse = await this.aiProvider.complete({
        messages: [
          ...context,
          { role: 'assistant', content: response.content, toolCalls: response.toolCalls },
          { role: 'tool', content: JSON.stringify(toolResults) }
        ]
      });

      this.conversationManager.addMessage({
        role: 'assistant',
        content: finalResponse.content
      });

      return finalResponse.content;
    }

    // No tools needed
    this.conversationManager.addMessage({
      role: 'assistant',
      content: response.content
    });

    return response.content;
  }

  async generateKubernetesDeployment(
    appName: string,
    image: string,
    options?: K8sDeploymentOptions
  ): Promise<string> {
    const tool = this.toolOrchestrator.getTool('generate-k8s-deployment');
    const result = await tool.execute({
      appName,
      image,
      replicas: options?.replicas || 3,
      port: options?.port || 8080,
      resources: options?.resources,
      env: options?.env
    });

    return result.yaml;
  }

  async validateKubernetesConfig(yamlContent: string): Promise<ValidationResult> {
    const tool = this.toolOrchestrator.getTool('validate-k8s-config');
    return tool.execute({ yaml: yamlContent });
  }

  async generateTerraform(
    resourceType: string,
    options: Record<string, any>
  ): Promise<string> {
    const tool = this.toolOrchestrator.getTool('generate-terraform');
    const result = await tool.execute({
      resourceType,
      options
    });

    return result.hcl;
  }
}

export interface DevOpsAssistantConfig {
  models: {
    primary: string;
    fallback?: string[];
  };
  openaiKey?: string;
  integrations?: {
    kubectl?: boolean;
    helm?: boolean;
    terraform?: boolean;
    aws?: boolean;
  };
  aws?: {
    region: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
}

interface K8sDeploymentOptions {
  replicas?: number;
  port?: number;
  resources?: {
    requests?: { cpu: string; memory: string };
    limits?: { cpu: string; memory: string };
  };
  env?: Record<string, string>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
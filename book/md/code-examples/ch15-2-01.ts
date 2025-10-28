// High-level architecture for DevOps Assistant

/**
 * DevOps AI Assistant Architecture
 *
 * Target: DevOps engineers
 * Primary Use Cases:
 *   - Generate infrastructure configs
 *   - Debug deployment failures
 *   - Security scanning
 */

// Core components
interface DevOpsAssistant {
  // From ollama-code foundation
  aiProvider: AIProvider;           // Multi-provider support
  toolOrchestrator: ToolOrchestrator;
  conversationManager: ConversationManager;

  // Domain-specific plugins
  plugins: {
    kubernetes: KubernetesPlugin;    // K8s YAML generation & validation
    terraform: TerraformPlugin;      // IaC generation
    aws: AWSPlugin;                  // AWS-specific tools
    cicd: CICDPlugin;                // Pipeline generation
    security: SecurityPlugin;        // Security scanning
  };

  // Domain-specific tools
  tools: {
    // Kubernetes
    generateK8sYAML: Tool;
    validateK8sConfig: Tool;
    explainK8sResource: Tool;
    debugK8sDeployment: Tool;

    // Terraform
    generateTerraform: Tool;
    validateTerraform: Tool;
    planTerraform: Tool;

    // AWS
    generateCloudFormation: Tool;
    analyzeAWSCosts: Tool;

    // CI/CD
    generateGitHubActions: Tool;
    generateJenkinsfile: Tool;

    // Security
    scanForSecrets: Tool;
    checkSecurityBestPractices: Tool;
  };

  // Integration points
  integrations: {
    kubectl: KubectlIntegration;     // Execute kubectl commands
    terraform: TerraformCLI;         // Execute terraform commands
    awsCLI: AWSCLIIntegration;      // Execute aws commands
    git: GitIntegration;            // VCS operations
  };
}
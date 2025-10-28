// DevOps Assistant plugin composition
const devopsPlugins = [
  // Core plugins (from your platform)
  new FileSystemPlugin(),          // File operations
  new GitPlugin(),                 // Version control
  new SecurityPlugin(),            // Sandboxing

  // Domain-specific plugins
  new KubernetesPlugin({
    tools: [
      'generate-deployment',
      'generate-service',
      'validate-yaml',
      'explain-resource',
      'debug-deployment'
    ],
    integrations: {
      kubectl: true,               // Execute kubectl commands
      helm: true,                  // Helm chart support
      kustomize: true              // Kustomize support
    }
  }),

  new TerraformPlugin({
    tools: [
      'generate-module',
      'validate-config',
      'plan',
      'explain-resource'
    ],
    integrations: {
      terraform: true,             // Execute terraform commands
      terragrunt: false
    }
  }),

  new AWSPlugin({
    tools: [
      'generate-cloudformation',
      'analyze-costs',
      'check-security',
      'generate-iam-policy'
    ],
    integrations: {
      awsCLI: true,
      cdk: false
    }
  }),

  new CICDPlugin({
    tools: [
      'generate-github-actions',
      'generate-gitlab-ci',
      'generate-jenkinsfile'
    ]
  })
];
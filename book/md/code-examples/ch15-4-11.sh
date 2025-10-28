# Interactive chat
$ devops-ai chat
You: Generate a deployment for my web app using nginx:1.21 with 5 replicas
Assistant: I'll generate a Kubernetes Deployment for you...

# Generate deployment
$ devops-ai k8s:deployment \
  --name web-app \
  --image nginx:1.21 \
  --replicas 5 \
  --port 80

# Validate configuration
$ devops-ai k8s:validate deployment.yaml
✓ Configuration is valid

Suggestions:
  - Consider adding resource limits
  - Add liveness and readiness probes
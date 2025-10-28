# Deploy to Heroku
heroku create devops-ai-api
git push heroku main

# Deploy to Fly.io
fly launch
fly deploy

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
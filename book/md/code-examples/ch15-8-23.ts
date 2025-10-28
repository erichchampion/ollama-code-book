interface ContentStrategy {
  blogPosts: {
    frequency: 'weekly';
    topics: string[];
  };
  tutorials: {
    format: 'video' | 'written';
    topics: string[];
  };
  caseStudies: {
    customers: string[];
    results: string[];
  };
}

const CONTENT_STRATEGY: ContentStrategy = {
  blogPosts: {
    frequency: 'weekly',
    topics: [
      'How AI is transforming DevOps',
      'Generate Kubernetes configs with AI',
      'Debugging production with AI assistance',
      'Cost optimization with AI suggestions',
      'Security best practices for AI tools'
    ]
  },
  tutorials: {
    format: 'video',
    topics: [
      'Getting started in 5 minutes',
      'Deploying your first app with AI',
      'Building custom plugins',
      'Integrating with your CI/CD pipeline'
    ]
  },
  caseStudies: {
    customers: [
      'Startup that cut deployment time by 70%',
      'Enterprise that saved $50K/year on cloud costs',
      'Team that reduced incidents by 80%'
    ],
    results: [
      '70% faster deployments',
      '$50K annual savings',
      '80% fewer incidents'
    ]
  }
};
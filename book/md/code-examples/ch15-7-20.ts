interface CommunityStrategy {
  channels: {
    github: {
      repo: string;
      discussions: boolean;
      issues: boolean;
      contributingGuide: boolean;
    };
    discord: {
      server: string;
      channels: string[];
    };
    twitter: {
      handle: string;
    };
    blog: {
      url: string;
      frequency: 'weekly' | 'monthly';
    };
  };

  engagement: {
    responseTime: string;          // Target response time
    weeklyUpdates: boolean;
    monthlyReleases: boolean;
    contributorRecognition: boolean;
  };

  documentation: {
    gettingStarted: boolean;
    apiReference: boolean;
    tutorials: boolean;
    examples: boolean;
    videoWalkthrough: boolean;
  };
}

const COMMUNITY_STRATEGY: CommunityStrategy = {
  channels: {
    github: {
      repo: 'devops-ai/assistant',
      discussions: true,
      issues: true,
      contributingGuide: true
    },
    discord: {
      server: 'https://discord.gg/devops-ai',
      channels: [
        'general',
        'help',
        'showcase',
        'plugin-development',
        'feature-requests'
      ]
    },
    twitter: {
      handle: '@devops_ai'
    },
    blog: {
      url: 'https://blog.devops-ai.dev',
      frequency: 'weekly'
    }
  },

  engagement: {
    responseTime: '24 hours',
    weeklyUpdates: true,
    monthlyReleases: true,
    contributorRecognition: true
  },

  documentation: {
    gettingStarted: true,
    apiReference: true,
    tutorials: true,
    examples: true,
    videoWalkthrough: true
  }
};
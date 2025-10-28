interface ContributorProgram {
  levels: {
    name: string;
    requirements: {
      pullRequests?: number;
      plugins?: number;
      helpfulAnswers?: number;
    };
    benefits: string[];
  }[];
}

const CONTRIBUTOR_PROGRAM: ContributorProgram = {
  levels: [
    {
      name: 'Contributor',
      requirements: {
        pullRequests: 1
      },
      benefits: [
        'Contributor badge',
        'Name in CONTRIBUTORS.md',
        'Access to contributor Discord channel'
      ]
    },
    {
      name: 'Core Contributor',
      requirements: {
        pullRequests: 10
      },
      benefits: [
        'All Contributor benefits',
        'Early access to new features',
        'Vote on roadmap priorities',
        'Free Pro license'
      ]
    },
    {
      name: 'Maintainer',
      requirements: {
        pullRequests: 50
      },
      benefits: [
        'All Core Contributor benefits',
        'Merge permissions',
        'Revenue sharing (if applicable)',
        'Free Enterprise license'
      ]
    }
  ]
};
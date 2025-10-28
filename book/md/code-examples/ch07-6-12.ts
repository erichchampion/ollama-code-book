/**
 * Generate PR descriptions from commit history
 */
export class PRDescriptionGenerator {
  private aiProvider: BaseAIProvider;
  private logger: Logger;

  constructor(aiProvider: BaseAIProvider, logger: Logger) {
    this.aiProvider = aiProvider;
    this.logger = logger;
  }

  /**
   * Generate PR description
   */
  async generate(
    commits: Commit[],
    diff: GitDiff,
    targetBranch: string = 'main'
  ): Promise<PRDescription> {
    this.logger.info(`Generating PR description (${commits.length} commits)...`);

    // Analyze commits and diff
    const analysis = await this.analyzeChanges(commits, diff);

    // Generate with AI
    const description = await this.generateWithAI(analysis, targetBranch);

    return description;
  }

  /**
   * Analyze changes across commits
   */
  private async analyzeChanges(
    commits: Commit[],
    diff: GitDiff
  ): Promise<PRAnalysis> {
    const analysis: PRAnalysis = {
      theme: '',
      commits: commits.length,
      filesChanged: diff.files.length,
      additions: diff.files.reduce((sum, f) => sum + f.additions, 0),
      deletions: diff.files.reduce((sum, f) => sum + f.deletions, 0),
      components: this.detectComponents(diff),
      breakingChanges: this.detectBreakingChanges(commits, diff),
      tests: this.analyzeTests(diff),
      documentation: this.analyzeDocumentation(diff)
    };

    // Detect overall theme
    analysis.theme = this.detectTheme(commits, diff);

    return analysis;
  }

  /**
   * Detect PR theme from commits
   */
  private detectTheme(commits: Commit[], diff: GitDiff): string {
    // Analyze commit messages
    const messages = commits.map(c => c.message).join(' ');

    // Common themes
    const themes = [
      { pattern: /refactor|restructure/i, label: 'Refactoring' },
      { pattern: /feat|feature|add/i, label: 'New Feature' },
      { pattern: /fix|bug|issue/i, label: 'Bug Fix' },
      { pattern: /perf|performance|optim/i, label: 'Performance' },
      { pattern: /test|spec/i, label: 'Testing' },
      { pattern: /docs|documentation/i, label: 'Documentation' },
      { pattern: /security|vulnerability/i, label: 'Security' }
    ];

    for (const theme of themes) {
      if (theme.pattern.test(messages)) {
        return theme.label;
      }
    }

    return 'General Improvements';
  }

  /**
   * Detect affected components
   */
  private detectComponents(diff: GitDiff): string[] {
    const components = new Set<string>();

    for (const file of diff.files) {
      const parts = file.path.split('/');

      // Extract component from path
      if (parts.length > 1) {
        components.add(parts[1]); // e.g., src/auth → auth
      }
    }

    return Array.from(components);
  }

  /**
   * Detect breaking changes
   */
  private detectBreakingChanges(commits: Commit[], diff: GitDiff): boolean {
    // Check commit messages for BREAKING CHANGE
    for (const commit of commits) {
      if (commit.message.includes('BREAKING CHANGE')) {
        return true;
      }
    }

    // Check for API changes in diff
    for (const file of diff.files) {
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'remove' &&
              line.content.match(/^export (function|class|interface|type)/)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Analyze test coverage
   */
  private analyzeTests(diff: GitDiff): TestAnalysis {
    const testFiles = diff.files.filter(f =>
      f.path.includes('.test.') ||
      f.path.includes('.spec.') ||
      f.path.includes('__tests__/')
    );

    return {
      hasTests: testFiles.length > 0,
      testFiles: testFiles.length,
      testAdditions: testFiles.reduce((sum, f) => sum + f.additions, 0)
    };
  }

  /**
   * Analyze documentation
   */
  private analyzeDocumentation(diff: GitDiff): DocumentationAnalysis {
    const docFiles = diff.files.filter(f =>
      f.path.endsWith('.md') ||
      f.path.includes('docs/')
    );

    return {
      hasDocs: docFiles.length > 0,
      docFiles: docFiles.length
    };
  }

  /**
   * Generate PR description with AI
   */
  private async generateWithAI(
    analysis: PRAnalysis,
    targetBranch: string
  ): Promise<PRDescription> {
    const prompt = `Generate a pull request description for merging into ${targetBranch}.

Theme: ${analysis.theme}
Commits: ${analysis.commits}
Files changed: ${analysis.filesChanged} (+${analysis.additions}, -${analysis.deletions})
Components: ${analysis.components.join(', ')}
Breaking changes: ${analysis.breakingChanges ? 'Yes' : 'No'}
Tests: ${analysis.tests.hasTests ? `${analysis.tests.testFiles} test files` : 'None'}
Documentation: ${analysis.documentation.hasDocs ? `${analysis.documentation.docFiles} doc files` : 'None'}

Create a description with:
1. Summary paragraph
2. Changes section (bullet points)
3. Testing section
4. Breaking changes (if any)
5. Migration guide (if breaking)`;

    const response = await this.aiProvider.chat({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at writing clear, comprehensive PR descriptions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      options: {
        temperature: 0.4,
        maxTokens: 1000
      }
    });

    return this.parsePRDescription(response.content, analysis);
  }

  /**
   * Parse AI response into structured PR description
   */
  private parsePRDescription(
    content: string,
    analysis: PRAnalysis
  ): PRDescription {
    return {
      title: this.generateTitle(analysis),
      body: content.trim(),
      labels: this.generateLabels(analysis),
      reviewers: [] // Could be auto-assigned based on CODEOWNERS
    };
  }

  /**
   * Generate PR title
   */
  private generateTitle(analysis: PRAnalysis): string {
    const components = analysis.components.slice(0, 2).join(', ');
    return `${analysis.theme}: ${components}`;
  }

  /**
   * Generate PR labels
   */
  private generateLabels(analysis: PRAnalysis): string[] {
    const labels: string[] = [];

    // Add theme label
    labels.push(analysis.theme.toLowerCase().replace(/\s+/g, '-'));

    // Add breaking change label
    if (analysis.breakingChanges) {
      labels.push('breaking-change');
    }

    // Add needs-tests label if no tests
    if (!analysis.tests.hasTests) {
      labels.push('needs-tests');
    }

    // Add needs-docs label if no documentation
    if (!analysis.documentation.hasDocs && analysis.filesChanged > 5) {
      labels.push('needs-docs');
    }

    return labels;
  }
}

interface Commit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
}

interface PRAnalysis {
  theme: string;
  commits: number;
  filesChanged: number;
  additions: number;
  deletions: number;
  components: string[];
  breakingChanges: boolean;
  tests: TestAnalysis;
  documentation: DocumentationAnalysis;
}

interface TestAnalysis {
  hasTests: boolean;
  testFiles: number;
  testAdditions: number;
}

interface DocumentationAnalysis {
  hasDocs: boolean;
  docFiles: number;
}

interface PRDescription {
  title: string;
  body: string;
  labels: string[];
  reviewers: string[];
}
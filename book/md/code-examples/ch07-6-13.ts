/**
 * AI-powered code reviewer for PRs
 */
export class PRCodeReviewer {
  private aiProvider: BaseAIProvider;
  private logger: Logger;

  constructor(aiProvider: BaseAIProvider, logger: Logger) {
    this.aiProvider = aiProvider;
    this.logger = logger;
  }

  /**
   * Review PR
   */
  async review(pr: PullRequest): Promise<ReviewResult> {
    this.logger.info(`Reviewing PR #${pr.number}...`);

    const comments: ReviewComment[] = [];

    // Review each file
    for (const file of pr.files) {
      const fileComments = await this.reviewFile(file);
      comments.push(...fileComments);
    }

    // Overall assessment
    const assessment = await this.assessPR(pr, comments);

    return {
      comments,
      assessment,
      recommendation: this.getRecommendation(comments, assessment)
    };
  }

  /**
   * Review a single file
   */
  private async reviewFile(file: PRFile): Promise<ReviewComment[]> {
    const comments: ReviewComment[] = [];

    // Skip certain files
    if (this.shouldSkipFile(file.path)) {
      return comments;
    }

    // Analyze each hunk
    for (const hunk of file.hunks) {
      const hunkComments = await this.reviewHunk(file.path, hunk);
      comments.push(...hunkComments);
    }

    return comments;
  }

  /**
   * Review a code hunk
   */
  private async reviewHunk(
    filePath: string,
    hunk: Hunk
  ): Promise<ReviewComment[]> {
    // Build context
    const code = hunk.lines.map(l => l.content).join('\n');

    const prompt = `Review this code change in ${filePath}:

\`\`\`
${code}
\`\`\`

Check for:
1. Security vulnerabilities
2. Performance issues
3. Code quality problems
4. Best practice violations
5. Potential bugs

Provide specific, actionable feedback. If code is good, say "LGTM".`;

    const response = await this.aiProvider.chat({
      messages: [
        {
          role: 'system',
          content: 'You are an expert code reviewer. Be constructive and specific.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      options: {
        temperature: 0.3,
        maxTokens: 500
      }
    });

    // Parse response
    if (response.content.includes('LGTM')) {
      return [];
    }

    return [{
      path: filePath,
      line: hunk.lines[0].lineNumber,
      body: response.content,
      severity: this.detectSeverity(response.content)
    }];
  }

  /**
   * Assess overall PR quality
   */
  private async assessPR(
    pr: PullRequest,
    comments: ReviewComment[]
  ): Promise<PRAssessment> {
    const criticalIssues = comments.filter(c => c.severity === 'critical').length;
    const majorIssues = comments.filter(c => c.severity === 'major').length;
    const minorIssues = comments.filter(c => c.severity === 'minor').length;

    return {
      criticalIssues,
      majorIssues,
      minorIssues,
      totalIssues: comments.length,
      filesReviewed: pr.files.length,
      score: this.calculateScore(criticalIssues, majorIssues, minorIssues)
    };
  }

  /**
   * Calculate PR quality score (0-100)
   */
  private calculateScore(
    critical: number,
    major: number,
    minor: number
  ): number {
    let score = 100;
    score -= critical * 20;
    score -= major * 10;
    score -= minor * 5;
    return Math.max(0, score);
  }

  /**
   * Get recommendation
   */
  private getRecommendation(
    comments: ReviewComment[],
    assessment: PRAssessment
  ): ReviewRecommendation {
    if (assessment.criticalIssues > 0) {
      return {
        action: 'request-changes',
        reason: `${assessment.criticalIssues} critical issues must be fixed`
      };
    }

    if (assessment.score >= 80) {
      return {
        action: 'approve',
        reason: 'Code quality is good'
      };
    }

    return {
      action: 'comment',
      reason: `${assessment.totalIssues} suggestions for improvement`
    };
  }

  /**
   * Detect comment severity
   */
  private detectSeverity(comment: string): 'critical' | 'major' | 'minor' {
    if (comment.match(/security|vulnerability|critical|dangerous/i)) {
      return 'critical';
    }
    if (comment.match(/bug|error|issue|problem/i)) {
      return 'major';
    }
    return 'minor';
  }

  /**
   * Check if file should be skipped
   */
  private shouldSkipFile(path: string): boolean {
    const skipPatterns = [
      /\.lock$/,
      /\.json$/,
      /\.md$/,
      /dist\//,
      /node_modules\//
    ];

    return skipPatterns.some(pattern => pattern.test(path));
  }
}

interface PullRequest {
  number: number;
  title: string;
  files: PRFile[];
}

interface PRFile {
  path: string;
  hunks: Hunk[];
}

interface ReviewComment {
  path: string;
  line: number;
  body: string;
  severity: 'critical' | 'major' | 'minor';
}

interface PRAssessment {
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
  totalIssues: number;
  filesReviewed: number;
  score: number;
}

interface ReviewResult {
  comments: ReviewComment[];
  assessment: PRAssessment;
  recommendation: ReviewRecommendation;
}

interface ReviewRecommendation {
  action: 'approve' | 'request-changes' | 'comment';
  reason: string;
}
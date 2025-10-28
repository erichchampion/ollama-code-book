/**
 * Generates semantic commit messages from git diffs
 */
export class CommitMessageGenerator {
  private aiProvider: BaseAIProvider;
  private logger: Logger;

  constructor(aiProvider: BaseAIProvider, logger: Logger) {
    this.aiProvider = aiProvider;
    this.logger = logger;
  }

  /**
   * Generate commit message from diff
   */
  async generate(diff: GitDiff, context?: CommitContext): Promise<CommitMessage> {
    this.logger.info('Generating commit message...');

    // Analyze the diff
    const analysis = await this.analyzeDiff(diff);

    // Generate message with AI
    const message = await this.generateWithAI(analysis, context);

    // Validate follows conventions
    this.validateConventionalCommit(message);

    return message;
  }

  /**
   * Analyze git diff
   */
  private async analyzeDiff(diff: GitDiff): Promise<DiffAnalysis> {
    const analysis: DiffAnalysis = {
      filesChanged: diff.files.length,
      additions: 0,
      deletions: 0,
      modifiedFunctions: [],
      changeType: 'feat',
      scope: this.detectScope(diff),
      breakingChanges: false
    };

    // Analyze each file
    for (const file of diff.files) {
      analysis.additions += file.additions;
      analysis.deletions += file.deletions;

      // Detect breaking changes
      if (this.hasBreakingChanges(file)) {
        analysis.breakingChanges = true;
      }

      // Extract modified functions
      const functions = this.extractModifiedFunctions(file);
      analysis.modifiedFunctions.push(...functions);
    }

    // Determine change type
    analysis.changeType = this.determineChangeType(diff, analysis);

    return analysis;
  }

  /**
   * Generate commit message using AI
   */
  private async generateWithAI(
    analysis: DiffAnalysis,
    context?: CommitContext
  ): Promise<CommitMessage> {
    const prompt = this.buildPrompt(analysis, context);

    const response = await this.aiProvider.chat({
      messages: [
        {
          role: 'system',
          content: `You are an expert at writing semantic, conventional commit messages.

Follow the Conventional Commits specification:
- Type: feat, fix, docs, style, refactor, test, chore
- Scope: module or component affected
- Subject: imperative, lowercase, no period
- Body: explain what and why (not how)
- Footer: breaking changes and issue references

Keep subject under 72 characters.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      options: {
        temperature: 0.3, // Lower temperature for more consistent output
        maxTokens: 500
      }
    });

    return this.parseCommitMessage(response.content);
  }

  /**
   * Build prompt for AI
   */
  private buildPrompt(analysis: DiffAnalysis, context?: CommitContext): string {
    let prompt = `Generate a commit message for these changes:

Files changed: ${analysis.filesChanged}
Additions: ${analysis.additions}
Deletions: ${analysis.deletions}
Change type: ${analysis.changeType}
Scope: ${analysis.scope}
Breaking changes: ${analysis.breakingChanges ? 'Yes' : 'No'}
`;

    if (analysis.modifiedFunctions.length > 0) {
      prompt += `\nModified functions:\n${analysis.modifiedFunctions.join('\n')}`;
    }

    if (context?.issueNumber) {
      prompt += `\nRelated issue: #${context.issueNumber}`;
    }

    if (context?.description) {
      prompt += `\nContext: ${context.description}`;
    }

    return prompt;
  }

  /**
   * Parse AI response into structured commit message
   */
  private parseCommitMessage(content: string): CommitMessage {
    const lines = content.trim().split('\n');

    // First line is subject
    const subject = lines[0].trim();

    // Rest is body and footer
    const bodyLines: string[] = [];
    const footerLines: string[] = [];
    let inFooter = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      // Detect footer (lines starting with keywords)
      if (line.match(/^(Fixes|Closes|Refs|BREAKING CHANGE):/i)) {
        inFooter = true;
      }

      if (inFooter) {
        footerLines.push(line);
      } else {
        bodyLines.push(line);
      }
    }

    return {
      subject,
      body: bodyLines.join('\n').trim(),
      footer: footerLines.join('\n').trim(),
      full: content.trim()
    };
  }

  /**
   * Detect scope from modified files
   */
  private detectScope(diff: GitDiff): string {
    // Group files by directory
    const directories = new Map<string, number>();

    for (const file of diff.files) {
      const dir = path.dirname(file.path);
      const count = directories.get(dir) || 0;
      directories.set(dir, count + 1);
    }

    // Find most common directory
    let maxDir = '';
    let maxCount = 0;

    for (const [dir, count] of directories) {
      if (count > maxCount) {
        maxDir = dir;
        maxCount = count;
      }
    }

    // Extract scope from directory
    const parts = maxDir.split('/');
    return parts[parts.length - 1] || 'core';
  }

  /**
   * Determine change type from diff
   */
  private determineChangeType(diff: GitDiff, analysis: DiffAnalysis): string {
    // Check for new files (feat)
    const newFiles = diff.files.filter(f => f.status === 'added');
    if (newFiles.length > 0 && !analysis.breakingChanges) {
      return 'feat';
    }

    // Check for deletions (refactor or chore)
    const deletedFiles = diff.files.filter(f => f.status === 'deleted');
    if (deletedFiles.length > 0) {
      return 'refactor';
    }

    // Check for test files
    const testFiles = diff.files.filter(f =>
      f.path.includes('.test.') || f.path.includes('.spec.')
    );
    if (testFiles.length === diff.files.length) {
      return 'test';
    }

    // Check for documentation
    const docFiles = diff.files.filter(f =>
      f.path.endsWith('.md') || f.path.includes('docs/')
    );
    if (docFiles.length === diff.files.length) {
      return 'docs';
    }

    // Default to fix
    return 'fix';
  }

  /**
   * Detect breaking changes in file
   */
  private hasBreakingChanges(file: FileDiff): boolean {
    // Simple heuristic: check for removed public APIs
    const removedLines = file.hunks
      .flatMap(h => h.lines)
      .filter(l => l.type === 'remove');

    for (const line of removedLines) {
      // Check for exported function/class removal
      if (line.content.match(/^export (function|class|const|interface)/)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract modified functions from file
   */
  private extractModifiedFunctions(file: FileDiff): string[] {
    const functions: string[] = [];

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        // Match function declarations
        const match = line.content.match(
          /function\s+(\w+)|(\w+)\s*=\s*(async\s+)?function|class\s+(\w+)/
        );

        if (match) {
          const name = match[1] || match[2] || match[4];
          if (name && !functions.includes(name)) {
            functions.push(name);
          }
        }
      }
    }

    return functions;
  }

  /**
   * Validate commit follows conventional commits
   */
  private validateConventionalCommit(message: CommitMessage): void {
    // Check subject format
    const subjectRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+?\))?: .+$/;

    if (!subjectRegex.test(message.subject)) {
      throw new Error(
        `Commit subject does not follow conventional commits format: ${message.subject}`
      );
    }

    // Check subject length
    if (message.subject.length > 72) {
      throw new Error(
        `Commit subject too long (${message.subject.length} > 72): ${message.subject}`
      );
    }
  }
}

interface GitDiff {
  files: FileDiff[];
}

interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  hunks: Hunk[];
}

interface Hunk {
  lines: Line[];
}

interface Line {
  type: 'add' | 'remove' | 'context';
  content: string;
}

interface DiffAnalysis {
  filesChanged: number;
  additions: number;
  deletions: number;
  modifiedFunctions: string[];
  changeType: string;
  scope: string;
  breakingChanges: boolean;
}

interface CommitContext {
  issueNumber?: number;
  description?: string;
}

interface CommitMessage {
  subject: string;
  body: string;
  footer: string;
  full: string;
}
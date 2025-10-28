/**
 * Commit Message Generator Wrapper
 * Mock implementation for testing commit message generation
 */

import { COMMIT_MESSAGE_TEST_CONSTANTS, COMMIT_EMOJI_MAP, COMMIT_SUBJECT_TEMPLATES } from './test-constants';

export type CommitType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'build' | 'ci' | 'chore' | 'revert' | 'wip';

export interface CommitMessageConfig {
  repositoryPath: string;
  style: 'conventional' | 'descriptive' | 'minimal' | 'emoji' | 'custom';
  maxLength: number;
  includeScope: boolean;
  includeBody: boolean;
  includeFooter: boolean;
  customTemplate?: string;
  aiProvider?: string;
}

export interface GeneratedCommitMessage {
  message: string;
  type: CommitType;
  scope: string | null;
  subject: string;
  body: string | null;
  footer: string | null;
  confidence: number;
  alternatives: string[];
  analysis: any;
}

/**
 * Mock CommitMessageGenerator for testing
 */
export class CommitMessageGenerator {
  private config: CommitMessageConfig;

  constructor(config: CommitMessageConfig) {
    this.config = config;
  }

  async generateCommitMessage(): Promise<GeneratedCommitMessage> {
    // Mock implementation - analyze staged files
    return this.generateMockMessage('feat', 'Add new feature');
  }

  async generateFromDiff(diffText: string): Promise<GeneratedCommitMessage> {
    // Analyze diff content to determine commit type
    const type = this.analyzeCommitType(diffText);
    const subject = this.analyzeSubject(diffText);

    return this.generateMockMessage(type, subject);
  }

  async generateWithContext(branchName?: string, history?: string[]): Promise<GeneratedCommitMessage> {
    // Generate message considering context
    const type = branchName?.startsWith('feat/') ? 'feat' :
                 branchName?.startsWith('fix/') ? 'fix' : 'chore';

    return this.generateMockMessage(type, 'Update based on context');
  }

  private generateMockMessage(type: CommitType, subject: string): GeneratedCommitMessage {
    const scope = this.config.includeScope ? COMMIT_MESSAGE_TEST_CONSTANTS.DEFAULT_SCOPE : null;
    const body = this.config.includeBody ? COMMIT_MESSAGE_TEST_CONSTANTS.DEFAULT_BODY : null;
    const footer = this.config.includeFooter ? COMMIT_MESSAGE_TEST_CONSTANTS.DEFAULT_FOOTER : null;

    let message = '';
    if (this.config.style === 'conventional') {
      message = scope ? `${type}(${scope}): ${subject}` : `${type}: ${subject}`;
    } else if (this.config.style === 'emoji') {
      const emoji = this.getCommitEmoji(type);
      message = `${emoji} ${subject}`;
    } else {
      message = subject;
    }

    if (body && this.config.includeBody) {
      message += `\n\n${body}`;
    }
    if (footer && this.config.includeFooter) {
      message += `\n\n${footer}`;
    }

    return {
      message,
      type,
      scope,
      subject,
      body,
      footer,
      confidence: COMMIT_MESSAGE_TEST_CONSTANTS.DEFAULT_CONFIDENCE,
      alternatives: [
        `${type}: Alternative message 1`,
        `${type}: Alternative message 2`
      ],
      analysis: {
        changedFiles: [],
        overallChangeType: type,
        scope,
        impactLevel: COMMIT_MESSAGE_TEST_CONSTANTS.DEFAULT_IMPACT_LEVEL,
        summary: subject,
        suggestions: []
      }
    };
  }

  private analyzeCommitType(diffText: string): CommitType {
    if (diffText.includes('function') || diffText.includes('class')) {
      return 'feat';
    } else if (diffText.includes('fix') || diffText.includes('bug')) {
      return 'fix';
    } else if (diffText.includes('.md')) {
      return 'docs';
    } else if (diffText.includes('test')) {
      return 'test';
    }
    return 'chore';
  }

  private analyzeSubject(diffText: string): string {
    // Extract subject from diff
    if (diffText.includes('function')) {
      return COMMIT_SUBJECT_TEMPLATES.FEAT;
    } else if (diffText.includes('fix')) {
      return COMMIT_SUBJECT_TEMPLATES.FIX;
    } else if (diffText.includes('test')) {
      return COMMIT_SUBJECT_TEMPLATES.TEST;
    }
    return COMMIT_SUBJECT_TEMPLATES.DEFAULT;
  }

  private getCommitEmoji(type: CommitType): string {
    return COMMIT_EMOJI_MAP[type] || '📦';
  }
}

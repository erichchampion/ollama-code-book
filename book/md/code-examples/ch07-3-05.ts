/**
 * VCS Intelligence Architecture
 */

// 1. Git Analysis Layer
interface GitAnalyzer {
  analyzeDiff(diff: GitDiff): DiffAnalysis;
  analyzeCommitHistory(commits: Commit[]): HistoryAnalysis;
  detectChangeType(diff: GitDiff): ChangeType;
}

// 2. AI Integration Layer
interface CommitMessageGenerator {
  generate(analysis: DiffAnalysis): CommitMessage;
  followConventions(message: string): boolean;
}

interface PRDescriptionGenerator {
  generate(commits: Commit[], diff: GitDiff): PRDescription;
  includeTestingInfo(analysis: DiffAnalysis): string;
}

// 3. Quality Analysis Layer
interface CodeQualityAnalyzer {
  analyzeMetrics(diff: GitDiff): QualityMetrics;
  trackTrends(metrics: QualityMetrics[]): Trends;
  suggestImprovements(metrics: QualityMetrics): Suggestion[];
}

// 4. Automation Layer
interface GitHooksManager {
  registerHook(hook: GitHook, handler: HookHandler): void;
  executeHook(hook: GitHook, context: HookContext): Promise<void>;
}
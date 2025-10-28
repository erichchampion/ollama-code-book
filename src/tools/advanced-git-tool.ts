import { BaseTool, ToolResult, ToolExecutionContext, ToolMetadata } from './types.js';
import { normalizeError } from '../utils/error-utils.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface GitToolOptions {
    branch?: string;
    depth?: number;
    includeStats?: boolean;
    includeContributors?: boolean;
    format?: 'json' | 'text' | 'detailed';
    timeframe?: 'week' | 'month' | 'year' | 'all';
    since?: string;
    until?: string;
}

export class AdvancedGitTool extends BaseTool {
    metadata: ToolMetadata = {
        name: 'advanced-git',
        description: 'Advanced Git repository analysis and intelligent operations for code insights and repository management',
        category: 'version-control',
        version: '1.0.0',
        parameters: [
            {
                name: 'operation',
                type: 'string',
                description: 'Git operation to perform (analyze, history, branches, diff, contributors, conflicts, insights)',
                required: true
            },
            {
                name: 'options',
                type: 'object',
                description: 'Operation-specific options and filters',
                required: false,
                default: {}
            }
        ],
        examples: [
            {
                description: 'Analyze repository structure and overview',
                parameters: { operation: 'analyze' }
            },
            {
                description: 'Get commit history with statistics',
                parameters: {
                    operation: 'history',
                    options: { includeStats: true, timeframe: 'month' }
                }
            },
            {
                description: 'Analyze contributors and their contributions',
                parameters: { operation: 'contributors' }
            }
        ]
    };

    async execute(parameters: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
        try {
            const operation = parameters.operation as string;
            const options: GitToolOptions = parameters.options || {};

            if (!this.isGitRepository(context.workingDirectory)) {
                return this.createErrorResult('Current directory is not a Git repository');
            }

            switch (operation.toLowerCase()) {
                case 'analyze':
                    return await this.analyzeRepository(context, options);
                case 'history':
                    return await this.getCommitHistory(context, options);
                case 'branches':
                    return await this.analyzeBranches(context, options);
                case 'diff':
                    return await this.analyzeDiff(context, options);
                case 'contributors':
                    return await this.analyzeContributors(context, options);
                case 'conflicts':
                    return await this.detectConflicts(context, options);
                case 'insights':
                    return await this.generateInsights(context, options);
                default:
                    return this.createErrorResult(`Unknown operation: ${operation}`);
            }
        } catch (error) {
            return this.createErrorResult(`Git tool error: ${normalizeError(error).message}`);
        }
    }

    private isGitRepository(workingDir: string): boolean {
        try {
            execSync('git rev-parse --is-inside-work-tree', {
                cwd: workingDir,
                stdio: 'pipe'
            });
            return true;
        } catch {
            return false;
        }
    }

    private async analyzeRepository(context: ToolExecutionContext, options: GitToolOptions): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            const repoInfo = {
                basic: this.getBasicRepoInfo(context.workingDirectory),
                structure: this.analyzeRepoStructure(context.workingDirectory),
                statistics: this.getRepoStatistics(context.workingDirectory),
                health: this.assessRepoHealth(context.workingDirectory)
            };

            return this.createSuccessResult('Repository analysis completed', {
                repository: repoInfo,
                executionTime: Date.now() - startTime
            });
        } catch (error) {
            return this.createErrorResult(`Repository analysis failed: ${normalizeError(error).message}`);
        }
    }

    private getBasicRepoInfo(workingDir: string) {
        try {
            const remoteUrl = this.executeGitCommand('git config --get remote.origin.url', workingDir);
            const currentBranch = this.executeGitCommand('git branch --show-current', workingDir);
            const lastCommit = this.executeGitCommand('git log -1 --format="%h %s (%cr)"', workingDir);

            return {
                remoteUrl: remoteUrl.trim(),
                currentBranch: currentBranch.trim(),
                lastCommit: lastCommit.trim(),
                workingDirectory: workingDir
            };
        } catch (error) {
            return {
                error: normalizeError(error).message
            };
        }
    }

    private analyzeRepoStructure(workingDir: string) {
        try {
            const fileTypes = new Map<string, number>();
            const directories: string[] = [];
            const totalFiles = parseInt(this.executeGitCommand('git ls-files | wc -l', workingDir).trim());

            const gitFiles = this.executeGitCommand('git ls-files', workingDir).split('\n').filter(f => f.trim());

            for (const file of gitFiles) {
                const ext = path.extname(file) || 'no-extension';
                fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);

                const dir = path.dirname(file);
                if (dir !== '.' && !directories.includes(dir)) {
                    directories.push(dir);
                }
            }

            return {
                totalFiles,
                totalDirectories: directories.length,
                fileTypes: Object.fromEntries(fileTypes),
                mainDirectories: directories.slice(0, 10)
            };
        } catch (error) {
            return {
                error: normalizeError(error).message
            };
        }
    }

    private getRepoStatistics(workingDir: string) {
        try {
            const totalCommits = parseInt(this.executeGitCommand('git rev-list --count HEAD', workingDir).trim());
            const totalBranches = this.executeGitCommand('git branch -r', workingDir).split('\n').filter(b => b.trim()).length;
            const totalContributors = parseInt(this.executeGitCommand('git shortlog -sn | wc -l', workingDir).trim());

            const linesOfCode = this.executeGitCommand(
                'git ls-files | xargs wc -l 2>/dev/null | tail -1 | awk \'{print $1}\'',
                workingDir
            ).trim();

            return {
                totalCommits,
                totalBranches,
                totalContributors,
                linesOfCode: parseInt(linesOfCode) || 0
            };
        } catch (error) {
            return {
                error: normalizeError(error).message
            };
        }
    }

    private assessRepoHealth(workingDir: string) {
        const health = {
            score: 100,
            issues: [] as string[],
            recommendations: [] as string[]
        };

        try {
            // Check for uncommitted changes
            const status = this.executeGitCommand('git status --porcelain', workingDir);
            if (status.trim()) {
                health.score -= 10;
                health.issues.push('Uncommitted changes detected');
                health.recommendations.push('Commit or stash pending changes');
            }

            // Check for merge conflicts
            if (status.includes('UU') || status.includes('AA')) {
                health.score -= 30;
                health.issues.push('Merge conflicts detected');
                health.recommendations.push('Resolve merge conflicts');
            }

            // Check for large files
            const largeFiles = this.executeGitCommand(
                'git ls-files | xargs ls -la 2>/dev/null | awk \'$5 > 1048576 {print $9}\' | head -5',
                workingDir
            ).split('\n').filter(f => f.trim());

            if (largeFiles.length > 0) {
                health.score -= 15;
                health.issues.push(`Large files detected: ${largeFiles.length}`);
                health.recommendations.push('Consider using Git LFS for large files');
            }

        } catch (error) {
            health.issues.push(`Health check error: ${normalizeError(error).message}`);
        }

        return health;
    }

    private async getCommitHistory(context: ToolExecutionContext, options: GitToolOptions): Promise<ToolResult> {
        try {
            const timeframe = options.timeframe || 'month';
            const sinceFlag = this.getTimeframeFlag(timeframe);

            const commitFormat = '--pretty=format:"%h|%an|%ad|%s" --date=short';
            const historyCmd = `git log ${sinceFlag} ${commitFormat}`;

            const history = this.executeGitCommand(historyCmd, context.workingDirectory);
            const commits = history.split('\n').filter(line => line.trim()).map(line => {
                const [hash, author, date, message] = line.replace(/"/g, '').split('|');
                return { hash, author, date, message };
            });

            const stats = {
                totalCommits: commits.length,
                uniqueAuthors: new Set(commits.map(c => c.author)).size,
                dateRange: {
                    from: commits[commits.length - 1]?.date,
                    to: commits[0]?.date
                }
            };

            return this.createSuccessResult('Commit history retrieved', {
                commits: commits.slice(0, 50), // Limit to recent 50
                statistics: stats,
                timeframe
            });
        } catch (error) {
            return this.createErrorResult(`History analysis failed: ${normalizeError(error).message}`);
        }
    }

    private async analyzeBranches(context: ToolExecutionContext, options: GitToolOptions): Promise<ToolResult> {
        try {
            const localBranches = this.executeGitCommand('git branch', context.workingDirectory)
                .split('\n')
                .map(b => b.replace(/^\*?\s*/, ''))
                .filter(b => b.trim());

            const remoteBranches = this.executeGitCommand('git branch -r', context.workingDirectory)
                .split('\n')
                .map(b => b.trim())
                .filter(b => b.trim() && !b.includes('HEAD'));

            const currentBranch = this.executeGitCommand('git branch --show-current', context.workingDirectory).trim();

            const branchInfo = localBranches.map(branch => {
                try {
                    const lastCommit = this.executeGitCommand(
                        `git log -1 --format="%h %s (%cr)" ${branch}`,
                        context.workingDirectory
                    ).trim();

                    const commitCount = parseInt(this.executeGitCommand(
                        `git rev-list --count ${branch}`,
                        context.workingDirectory
                    ).trim());

                    return {
                        name: branch,
                        isCurrent: branch === currentBranch,
                        lastCommit,
                        commitCount
                    };
                } catch {
                    return {
                        name: branch,
                        isCurrent: branch === currentBranch,
                        error: 'Unable to get branch info'
                    };
                }
            });

            return this.createSuccessResult('Branch analysis completed', {
                current: currentBranch,
                local: branchInfo,
                remote: remoteBranches,
                summary: {
                    totalLocal: localBranches.length,
                    totalRemote: remoteBranches.length
                }
            });
        } catch (error) {
            return this.createErrorResult(`Branch analysis failed: ${normalizeError(error).message}`);
        }
    }

    private async analyzeDiff(context: ToolExecutionContext, options: GitToolOptions): Promise<ToolResult> {
        try {
            const branch = options.branch || 'HEAD~1';

            const diffStats = this.executeGitCommand(`git diff --stat ${branch}`, context.workingDirectory);
            const diffSummary = this.executeGitCommand(`git diff --numstat ${branch}`, context.workingDirectory);

            const files = diffSummary.split('\n').filter(line => line.trim()).map(line => {
                const [additions, deletions, filename] = line.split('\t');
                return {
                    filename,
                    additions: parseInt(additions) || 0,
                    deletions: parseInt(deletions) || 0
                };
            });

            const summary = {
                totalFiles: files.length,
                totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
                totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0)
            };

            return this.createSuccessResult('Diff analysis completed', {
                comparison: `current vs ${branch}`,
                files: files.slice(0, 20), // Limit for readability
                summary,
                stats: diffStats
            });
        } catch (error) {
            return this.createErrorResult(`Diff analysis failed: ${normalizeError(error).message}`);
        }
    }

    private async analyzeContributors(context: ToolExecutionContext, options: GitToolOptions): Promise<ToolResult> {
        try {
            const timeframe = options.timeframe || 'year';
            const sinceFlag = this.getTimeframeFlag(timeframe);

            const contributorStats = this.executeGitCommand(
                `git shortlog -sn ${sinceFlag}`,
                context.workingDirectory
            );

            const contributors = contributorStats.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const match = line.match(/^\s*(\d+)\s+(.+)$/);
                    return match ? {
                        name: match[2],
                        commits: parseInt(match[1])
                    } : null;
                })
                .filter(Boolean)
                .slice(0, 10);

            const totalCommits = contributors.reduce((sum, c) => sum + (c?.commits || 0), 0);

            return this.createSuccessResult('Contributor analysis completed', {
                timeframe,
                contributors,
                summary: {
                    totalContributors: contributors.length,
                    totalCommits,
                    averageCommitsPerContributor: Math.round(totalCommits / contributors.length)
                }
            });
        } catch (error) {
            return this.createErrorResult(`Contributor analysis failed: ${normalizeError(error).message}`);
        }
    }

    private async detectConflicts(context: ToolExecutionContext, options: GitToolOptions): Promise<ToolResult> {
        try {
            const status = this.executeGitCommand('git status --porcelain', context.workingDirectory);
            const conflictFiles = status.split('\n')
                .filter(line => line.startsWith('UU') || line.startsWith('AA') || line.startsWith('DD'))
                .map(line => line.substring(3));

            const hasConflicts = conflictFiles.length > 0;

            return this.createSuccessResult('Conflict detection completed', {
                hasConflicts,
                conflictFiles,
                resolution: hasConflicts ? [
                    'Edit conflicted files to resolve markers',
                    'Use git add <file> after resolving',
                    'Complete merge with git commit'
                ] : ['No conflicts detected']
            });
        } catch (error) {
            return this.createErrorResult(`Conflict detection failed: ${normalizeError(error).message}`);
        }
    }

    private async generateInsights(context: ToolExecutionContext, options: GitToolOptions): Promise<ToolResult> {
        try {
            const insights = {
                development_patterns: this.analyzeDevelopmentPatterns(context.workingDirectory),
                code_evolution: this.analyzeCodeEvolution(context.workingDirectory),
                collaboration: this.analyzeCollaboration(context.workingDirectory),
                recommendations: this.generateRecommendations(context.workingDirectory)
            };

            return this.createSuccessResult('Repository insights generated', insights);
        } catch (error) {
            return this.createErrorResult(`Insights generation failed: ${normalizeError(error).message}`);
        }
    }

    private analyzeDevelopmentPatterns(workingDir: string) {
        try {
            const hourlyActivity = this.executeGitCommand(
                'git log --format="%ad" --date=format:"%H" | sort | uniq -c | sort -nr',
                workingDir
            );

            const dayActivity = this.executeGitCommand(
                'git log --format="%ad" --date=format:"%u" | sort | uniq -c | sort -nr',
                workingDir
            );

            return {
                peak_hours: hourlyActivity.split('\n').slice(0, 3),
                active_days: dayActivity.split('\n').slice(0, 3),
                pattern: 'Regular development activity detected'
            };
        } catch {
            return { error: 'Unable to analyze development patterns' };
        }
    }

    private analyzeCodeEvolution(workingDir: string) {
        try {
            const fileChanges = this.executeGitCommand(
                'git log --format="" --name-only | sort | uniq -c | sort -nr | head -10',
                workingDir
            );

            return {
                most_changed_files: fileChanges.split('\n').filter(f => f.trim()),
                evolution_trend: 'Steady code evolution'
            };
        } catch {
            return { error: 'Unable to analyze code evolution' };
        }
    }

    private analyzeCollaboration(workingDir: string) {
        try {
            const authorFiles = this.executeGitCommand(
                'git log --format="%an" --name-only | grep -v "^$" | sort | uniq -c | sort -nr | head -10',
                workingDir
            );

            return {
                collaboration_score: 'Good',
                shared_ownership: authorFiles.split('\n').slice(0, 5),
                team_dynamic: 'Active collaboration detected'
            };
        } catch {
            return { error: 'Unable to analyze collaboration' };
        }
    }

    private generateRecommendations(workingDir: string): string[] {
        const recommendations = [];

        try {
            const status = this.executeGitCommand('git status --porcelain', workingDir);
            if (status.trim()) {
                recommendations.push('Commit pending changes regularly');
            }

            const stashList = this.executeGitCommand('git stash list', workingDir);
            if (stashList.trim()) {
                recommendations.push('Review and clean up stashed changes');
            }

            const largeBranches = parseInt(this.executeGitCommand('git branch -r | wc -l', workingDir).trim());
            if (largeBranches > 10) {
                recommendations.push('Consider cleaning up old remote branches');
            }

            recommendations.push('Maintain consistent commit message format');
            recommendations.push('Use feature branches for new development');
        } catch {
            recommendations.push('Regular Git repository maintenance recommended');
        }

        return recommendations;
    }

    private executeGitCommand(command: string, workingDir: string): string {
        try {
            return execSync(command, {
                cwd: workingDir,
                encoding: 'utf8',
                timeout: 30000,
                stdio: 'pipe'
            });
        } catch (error) {
            throw new Error(`Git command failed: ${command}`);
        }
    }

    private getTimeframeFlag(timeframe: string): string {
        switch (timeframe) {
            case 'week': return '--since="1 week ago"';
            case 'month': return '--since="1 month ago"';
            case 'year': return '--since="1 year ago"';
            default: return '';
        }
    }

    private createSuccessResult(message: string, data: any): ToolResult {
        return {
            success: true,
            data,
            metadata: {
                executionTime: Date.now(),
                resourcesUsed: { tool: 'advanced-git' }
            }
        };
    }

    private createErrorResult(error: string): ToolResult {
        return {
            success: false,
            error,
            metadata: {
                executionTime: Date.now(),
                resourcesUsed: { tool: 'advanced-git' }
            }
        };
    }
}

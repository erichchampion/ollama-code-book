/**
 * Analysis Result Saving Tests
 * Tests saving analysis results, code reviews, security scans, and performance reports
 * in multiple formats (JSON, Markdown, HTML)
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import {
	createTestWorkspace,
	cleanupTestWorkspace,
	AnalysisResult,
	Finding,
	CodeReviewReport,
	SecurityScanReport,
	PerformanceAnalysisReport,
	ReportFormat,
	createTestAnalysisResult,
	createTestCodeReview,
	createTestSecurityScan,
	createTestPerformanceReport,
	saveAndVerifyReport,
} from '../helpers/extensionTestHelper';
import {
	PROVIDER_TEST_TIMEOUTS,
	REPORT_GENERATION_CONSTANTS,
	REPORT_TEST_DATA,
} from '../helpers/test-constants';

suite('Analysis Result Saving Tests', () => {
	let testWorkspacePath: string;

	setup(async function () {
		this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
		testWorkspacePath = await createTestWorkspace('analysis-result-saving-tests');
	});

	teardown(async function () {
		this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
		await cleanupTestWorkspace(testWorkspacePath);
	});

	// ====================================================================
	// Report Generator Class
	// ====================================================================

	class ReportGenerator {
		/**
		 * Save analysis results to file
		 */
		async saveAnalysisResults(
			result: AnalysisResult,
			outputPath: string,
			format: ReportFormat = 'json'
		): Promise<void> {
			let content: string;

			switch (format) {
				case 'json':
					content = this.generateJSON(result);
					break;
				case 'markdown':
					content = this.generateMarkdown(result);
					break;
				case 'html':
					content = this.generateHTML(result);
					break;
				default:
					throw new Error(`Unsupported format: ${format}`);
			}

			// Ensure directory exists
			const dir = path.dirname(outputPath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			// Write file
			fs.writeFileSync(outputPath, content, 'utf-8');
		}

		/**
		 * Generate JSON format
		 */
		private generateJSON(result: AnalysisResult): string {
			return JSON.stringify(result, null, REPORT_GENERATION_CONSTANTS.JSON.INDENT_SPACES);
		}

		/**
		 * Generate Markdown format
		 */
		private generateMarkdown(result: AnalysisResult): string {
			const lines: string[] = [];

			// Header
			lines.push(`# ${this.getReportTitle(result.type)}`);
			lines.push('');
			lines.push(`**Date:** ${new Date(result.timestamp).toISOString()}`);
			lines.push(`**Duration:** ${result.metadata.duration}ms`);
			lines.push(`**Tool Version:** ${result.metadata.toolVersion}`);
			lines.push('');

			// Summary
			lines.push('## Summary');
			lines.push('');
			lines.push(result.summary);
			lines.push('');

			// Type-specific sections
			if (result.type === 'code_review') {
				const review = result as CodeReviewReport;
				lines.push('## Quality Score');
				lines.push('');
				lines.push(`**Overall Score:** ${review.qualityScore}/100`);
				lines.push('');
				lines.push('### Categories');
				lines.push(`- **Maintainability:** ${review.categories.maintainability}/100`);
				lines.push(`- **Reliability:** ${review.categories.reliability}/100`);
				lines.push(`- **Security:** ${review.categories.security}/100`);
				lines.push(`- **Performance:** ${review.categories.performance}/100`);
				lines.push('');
			} else if (result.type === 'security_scan') {
				const security = result as SecurityScanReport;
				const check = REPORT_GENERATION_CONSTANTS.MARKDOWN.CHECKMARK;
				const cross = REPORT_GENERATION_CONSTANTS.MARKDOWN.CROSS;
				lines.push('## Vulnerabilities');
				lines.push('');
				lines.push(`- **Critical:** ${security.vulnerabilities.critical}`);
				lines.push(`- **High:** ${security.vulnerabilities.high}`);
				lines.push(`- **Medium:** ${security.vulnerabilities.medium}`);
				lines.push(`- **Low:** ${security.vulnerabilities.low}`);
				lines.push('');
				lines.push('## Compliance Status');
				lines.push(`- **OWASP:** ${security.complianceStatus.owasp ? check : cross}`);
				lines.push(`- **CWE:** ${security.complianceStatus.cwe ? check : cross}`);
				lines.push('');
			} else if (result.type === 'performance_analysis') {
				const perf = result as PerformanceAnalysisReport;
				lines.push('## Performance Metrics');
				lines.push('');
				lines.push(`- **Average Response Time:** ${perf.metrics.avgResponseTime}ms`);
				lines.push(`- **Memory Usage:** ${perf.metrics.memoryUsage}MB`);
				lines.push(`- **CPU Usage:** ${perf.metrics.cpuUsage}%`);
				lines.push('');
			}

			// Findings
			if (result.findings.length > 0) {
				lines.push('## Findings');
				lines.push('');

				// Group by severity
				const bySeverity = this.groupBySeverity(result.findings);
				const severities = REPORT_GENERATION_CONSTANTS.SEVERITY_ORDER;

				for (const severity of severities) {
					const findings = bySeverity.get(severity) || [];
					if (findings.length === 0) continue;

					lines.push(`### ${this.capitalizeFirst(severity)} (${findings.length})`);
					lines.push('');

					for (const finding of findings) {
						lines.push(`#### ${finding.title}`);
						lines.push('');
						lines.push(finding.description);
						lines.push('');

						if (finding.file) {
							lines.push(`**File:** \`${finding.file}\``);
							if (finding.line) {
								lines.push(`**Line:** ${finding.line}`);
							}
							lines.push('');
						}

						if (finding.codeSnippet) {
							lines.push(REPORT_GENERATION_CONSTANTS.MARKDOWN.CODE_FENCE);
							lines.push(finding.codeSnippet);
							lines.push(REPORT_GENERATION_CONSTANTS.MARKDOWN.CODE_FENCE);
							lines.push('');
						}

						if (finding.recommendation) {
							lines.push('**Recommendation:**');
							lines.push(finding.recommendation);
							lines.push('');
						}

						lines.push(REPORT_GENERATION_CONSTANTS.MARKDOWN.HORIZONTAL_RULE);
						lines.push('');
					}
				}
			}

			// Analyzed files
			lines.push('## Analyzed Files');
			lines.push('');
			for (const file of result.metadata.analyzedFiles) {
				lines.push(`- ${file}`);
			}
			lines.push('');

			return lines.join('\n');
		}

		/**
		 * Generate HTML format
		 */
		private generateHTML(result: AnalysisResult): string {
			const lines: string[] = [];
			const styles = REPORT_GENERATION_CONSTANTS.HTML_STYLES;
			const colors = styles.COLORS;
			const dims = styles.DIMENSIONS;

			// HTML header
			lines.push('<!DOCTYPE html>');
			lines.push('<html lang="en">');
			lines.push('<head>');
			lines.push('  <meta charset="UTF-8">');
			lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
			lines.push(`  <title>${this.getReportTitle(result.type)}</title>`);
			lines.push('  <style>');
			lines.push(`    body { font-family: ${styles.FONT_FAMILY}; max-width: ${dims.MAX_WIDTH}; margin: 0 auto; padding: ${dims.PADDING_LARGE}; }`);
			lines.push(`    h1 { color: ${colors.TEXT_DARK}; border-bottom: ${dims.BORDER_WIDTH} solid ${colors.PRIMARY}; padding-bottom: ${dims.PADDING_BOTTOM}; }`);
			lines.push(`    h2 { color: ${colors.TEXT_MEDIUM}; margin-top: ${dims.MARGIN_TOP}; }`);
			lines.push(`    .metadata { background: ${colors.BACKGROUND_LIGHT}; padding: ${dims.PADDING_MEDIUM}; border-radius: ${dims.BORDER_RADIUS}; }`);
			lines.push(`    .finding { border-left: ${dims.BORDER_LEFT_WIDTH} solid ${colors.BORDER_DEFAULT}; padding: ${dims.PADDING_SMALL}; margin: ${dims.MARGIN_VERTICAL}; }`);
			lines.push(`    .finding.critical { border-color: ${colors.SEVERITY_CRITICAL}; }`);
			lines.push(`    .finding.high { border-color: ${colors.SEVERITY_HIGH}; }`);
			lines.push(`    .finding.medium { border-color: ${colors.SEVERITY_MEDIUM}; }`);
			lines.push(`    .finding.low { border-color: ${colors.SEVERITY_LOW}; }`);
			lines.push(`    .finding.info { border-color: ${colors.SEVERITY_INFO}; }`);
			lines.push(`    .code-snippet { background: ${colors.BACKGROUND_LIGHT}; padding: ${dims.PADDING_SMALL}; border-radius: ${dims.BORDER_RADIUS_SMALL}; overflow-x: auto; }`);
			lines.push(`    .recommendation { background: ${colors.BACKGROUND_INFO}; padding: ${dims.PADDING_SMALL}; border-radius: ${dims.BORDER_RADIUS_SMALL}; }`);
			lines.push('  </style>');
			lines.push('</head>');
			lines.push('<body>');

			// Title
			lines.push(`  <h1>${this.getReportTitle(result.type)}</h1>`);

			// Metadata
			lines.push('  <div class="metadata">');
			lines.push(`    <p><strong>Date:</strong> ${new Date(result.timestamp).toLocaleString()}</p>`);
			lines.push(`    <p><strong>Duration:</strong> ${result.metadata.duration}ms</p>`);
			lines.push(`    <p><strong>Tool Version:</strong> ${result.metadata.toolVersion}</p>`);
			lines.push('  </div>');

			// Summary
			lines.push('  <h2>Summary</h2>');
			lines.push(`  <p>${this.escapeHtml(result.summary)}</p>`);

			// Type-specific sections
			if (result.type === 'code_review') {
				const review = result as CodeReviewReport;
				lines.push('  <h2>Quality Score</h2>');
				lines.push(`  <p><strong>Overall Score:</strong> ${review.qualityScore}/100</p>`);
				lines.push('  <h3>Categories</h3>');
				lines.push('  <ul>');
				lines.push(`    <li><strong>Maintainability:</strong> ${review.categories.maintainability}/100</li>`);
				lines.push(`    <li><strong>Reliability:</strong> ${review.categories.reliability}/100</li>`);
				lines.push(`    <li><strong>Security:</strong> ${review.categories.security}/100</li>`);
				lines.push(`    <li><strong>Performance:</strong> ${review.categories.performance}/100</li>`);
				lines.push('  </ul>');
			} else if (result.type === 'security_scan') {
				const security = result as SecurityScanReport;
				lines.push('  <h2>Vulnerabilities</h2>');
				lines.push('  <ul>');
				lines.push(`    <li><strong>Critical:</strong> ${security.vulnerabilities.critical}</li>`);
				lines.push(`    <li><strong>High:</strong> ${security.vulnerabilities.high}</li>`);
				lines.push(`    <li><strong>Medium:</strong> ${security.vulnerabilities.medium}</li>`);
				lines.push(`    <li><strong>Low:</strong> ${security.vulnerabilities.low}</li>`);
				lines.push('  </ul>');
			} else if (result.type === 'performance_analysis') {
				const perf = result as PerformanceAnalysisReport;
				lines.push('  <h2>Performance Metrics</h2>');
				lines.push('  <ul>');
				lines.push(`    <li><strong>Average Response Time:</strong> ${perf.metrics.avgResponseTime}ms</li>`);
				lines.push(`    <li><strong>Memory Usage:</strong> ${perf.metrics.memoryUsage}MB</li>`);
				lines.push(`    <li><strong>CPU Usage:</strong> ${perf.metrics.cpuUsage}%</li>`);
				lines.push('  </ul>');
			}

			// Findings
			if (result.findings.length > 0) {
				lines.push('  <h2>Findings</h2>');

				for (const finding of result.findings) {
					lines.push(`  <div class="finding ${finding.severity}">`);
					lines.push(`    <h3>${this.escapeHtml(finding.title)}</h3>`);
					lines.push(`    <p>${this.escapeHtml(finding.description)}</p>`);

					if (finding.file) {
						lines.push(`    <p><strong>File:</strong> <code>${this.escapeHtml(finding.file)}</code></p>`);
						if (finding.line) {
							lines.push(`    <p><strong>Line:</strong> ${finding.line}</p>`);
						}
					}

					if (finding.codeSnippet) {
						lines.push(`    <div class="code-snippet"><pre>${this.escapeHtml(finding.codeSnippet)}</pre></div>`);
					}

					if (finding.recommendation) {
						lines.push(`    <div class="recommendation"><strong>Recommendation:</strong> ${this.escapeHtml(finding.recommendation)}</div>`);
					}

					lines.push('  </div>');
				}
			}

			// Analyzed files
			lines.push('  <h2>Analyzed Files</h2>');
			lines.push('  <ul>');
			for (const file of result.metadata.analyzedFiles) {
				lines.push(`    <li>${this.escapeHtml(file)}</li>`);
			}
			lines.push('  </ul>');

			lines.push('</body>');
			lines.push('</html>');

			return lines.join('\n');
		}

		/**
		 * Get report title based on type
		 */
		private getReportTitle(type: string): string {
			const titles: Record<string, string> = {
				general: REPORT_GENERATION_CONSTANTS.REPORT_TITLES.GENERAL,
				code_review: REPORT_GENERATION_CONSTANTS.REPORT_TITLES.CODE_REVIEW,
				security_scan: REPORT_GENERATION_CONSTANTS.REPORT_TITLES.SECURITY_SCAN,
				performance_analysis: REPORT_GENERATION_CONSTANTS.REPORT_TITLES.PERFORMANCE_ANALYSIS,
			};
			return titles[type] || REPORT_GENERATION_CONSTANTS.REPORT_TITLES.DEFAULT;
		}

		/**
		 * Group findings by severity
		 */
		private groupBySeverity(findings: Finding[]): Map<string, Finding[]> {
			const groups = new Map<string, Finding[]>();

			for (const finding of findings) {
				const severity = finding.severity;
				if (!groups.has(severity)) {
					groups.set(severity, []);
				}
				groups.get(severity)!.push(finding);
			}

			return groups;
		}

		/**
		 * Capitalize first letter
		 */
		private capitalizeFirst(str: string): string {
			return str.charAt(0).toUpperCase() + str.slice(1);
		}

		/**
		 * Escape HTML special characters
		 */
		private escapeHtml(text: string): string {
			const entities = REPORT_GENERATION_CONSTANTS.HTML_ENTITIES;
			const map: Record<string, string> = {
				'&': entities.AMPERSAND,
				'<': entities.LESS_THAN,
				'>': entities.GREATER_THAN,
				'"': entities.DOUBLE_QUOTE,
				"'": entities.SINGLE_QUOTE,
			};
			return text.replace(/[&<>"']/g, m => map[m]);
		}

		/**
		 * Load saved analysis results
		 */
		async loadAnalysisResults(filePath: string): Promise<AnalysisResult> {
			if (!fs.existsSync(filePath)) {
				throw new Error(`File not found: ${filePath}`);
			}

			const content = fs.readFileSync(filePath, 'utf-8');

			// Only JSON can be loaded back
			if (!filePath.endsWith('.json')) {
				throw new Error('Only JSON format can be loaded');
			}

			return JSON.parse(content);
		}
	}

	// ====================================================================
	// Test Suite 1: General Analysis Results
	// ====================================================================

	suite('General Analysis Results', () => {
		test('Should save analysis results to JSON file', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const result = createTestAnalysisResult('general', {
				summary: REPORT_TEST_DATA.SUMMARIES.SUCCESS,
				findings: [REPORT_TEST_DATA.SAMPLE_FINDINGS.PERFORMANCE_ISSUE],
				metadata: {
					analyzedFiles: [...REPORT_TEST_DATA.METADATA.SAMPLE_FILES.PAIR],
					duration: REPORT_TEST_DATA.DURATIONS.LONG,
					toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
				},
			});

			await saveAndVerifyReport(generator, result, testWorkspacePath, 'analysis.json', 'json', (content) => {
				const parsed = JSON.parse(content);
				assert.strictEqual(parsed.type, 'general');
				assert.strictEqual(parsed.findings.length, 1);
			});
		});

		test('Should save analysis results to Markdown file', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const result = createTestAnalysisResult('general', {
				summary: REPORT_TEST_DATA.SUMMARIES.WITH_WARNINGS,
				findings: [REPORT_TEST_DATA.SAMPLE_FINDINGS.CODE_SMELL],
				metadata: {
					analyzedFiles: REPORT_TEST_DATA.METADATA.SAMPLE_FILES.TRIPLE.slice(0, 1),
					duration: REPORT_TEST_DATA.DURATIONS.MEDIUM,
					toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
				},
			});

			await saveAndVerifyReport(generator, result, testWorkspacePath, 'analysis.md', 'markdown', (content) => {
				assert.ok(content.includes(`# ${REPORT_GENERATION_CONSTANTS.REPORT_TITLES.GENERAL}`));
				assert.ok(content.includes('## Summary'));
				assert.ok(content.includes('## Findings'));
				assert.ok(content.includes('Code smell detected'));
			});
		});

		test('Should save analysis results to HTML file', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const result = createTestAnalysisResult('general', {
				summary: REPORT_TEST_DATA.SUMMARIES.COMPLETED,
				findings: [],
				metadata: {
					analyzedFiles: [...REPORT_TEST_DATA.METADATA.SAMPLE_FILES.SINGLE],
					duration: REPORT_TEST_DATA.DURATIONS.SHORT,
					toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
				},
			});

			await saveAndVerifyReport(generator, result, testWorkspacePath, 'analysis.html', 'html', (content) => {
				assert.ok(content.includes('<!DOCTYPE html>'));
				assert.ok(content.includes(`<title>${REPORT_GENERATION_CONSTANTS.REPORT_TITLES.GENERAL}</title>`));
				assert.ok(content.includes(REPORT_TEST_DATA.SUMMARIES.COMPLETED));
			});
		});
	});

	// ====================================================================
	// Test Suite 2: Code Review Reports
	// ====================================================================

	suite('Code Review Reports', () => {
		test('Should save code review report with quality scores', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const report = createTestCodeReview(REPORT_TEST_DATA.QUALITY_SCORES.AVERAGE, {
				findings: [REPORT_TEST_DATA.SAMPLE_FINDINGS.COMPLEX_FUNCTION],
				metadata: {
					analyzedFiles: [...REPORT_TEST_DATA.METADATA.SAMPLE_FILES.COMPLEX],
					duration: REPORT_TEST_DATA.DURATIONS.LONG,
					toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
				},
			});

			const outputPath = path.join(testWorkspacePath, 'reports', 'code-review.json');
			await generator.saveAnalysisResults(report, outputPath, 'json');

			assert.ok(fs.existsSync(outputPath));

			const loaded = await generator.loadAnalysisResults(outputPath);
			const review = loaded as CodeReviewReport;
			assert.strictEqual(review.qualityScore, REPORT_TEST_DATA.QUALITY_SCORES.AVERAGE);
			assert.strictEqual(review.categories.maintainability, REPORT_TEST_DATA.CATEGORY_SCORES.GOOD.maintainability);
		});

		test('Should generate Markdown code review with categories', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const report = createTestCodeReview(REPORT_TEST_DATA.QUALITY_SCORES.VERY_GOOD, {
				summary: REPORT_TEST_DATA.SUMMARIES.GOOD_QUALITY,
				categories: REPORT_TEST_DATA.CATEGORY_SCORES.EXCELLENT,
				findings: [],
				metadata: {
					analyzedFiles: [...REPORT_TEST_DATA.METADATA.SAMPLE_FILES.SINGLE],
					duration: REPORT_TEST_DATA.DURATIONS.MEDIUM,
					toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
				},
			});

			await saveAndVerifyReport(generator, report, testWorkspacePath, 'review.md', 'markdown', (content) => {
				assert.ok(content.includes('## Quality Score'));
				assert.ok(content.includes(`**Overall Score:** ${REPORT_TEST_DATA.QUALITY_SCORES.VERY_GOOD}/100`));
				assert.ok(content.includes(`**Maintainability:** ${REPORT_TEST_DATA.CATEGORY_SCORES.EXCELLENT.maintainability}/100`));
			});
		});
	});

	// ====================================================================
	// Test Suite 3: Security Scan Reports
	// ====================================================================

	suite('Security Scan Reports', () => {
		test('Should save security scan with vulnerability counts', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const report = createTestSecurityScan(REPORT_TEST_DATA.VULNERABILITY_COUNTS.CRITICAL, {
				findings: [REPORT_TEST_DATA.SAMPLE_FINDINGS.SQL_INJECTION],
			});

			const outputPath = path.join(testWorkspacePath, 'reports', 'security.json');
			await generator.saveAnalysisResults(report, outputPath, 'json');

			const loaded = await generator.loadAnalysisResults(outputPath);
			const security = loaded as SecurityScanReport;
			assert.strictEqual(security.vulnerabilities.critical, REPORT_TEST_DATA.VULNERABILITY_COUNTS.CRITICAL.critical);
			assert.strictEqual(security.vulnerabilities.high, REPORT_TEST_DATA.VULNERABILITY_COUNTS.CRITICAL.high);
		});

		test('Should generate HTML security report with compliance status', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const report = createTestSecurityScan(REPORT_TEST_DATA.VULNERABILITY_COUNTS.CLEAN, {
				summary: REPORT_TEST_DATA.SUMMARIES.SECURITY_COMPLETED,
				complianceStatus: REPORT_TEST_DATA.COMPLIANCE_STATUS.COMPLIANT,
				findings: [],
				metadata: {
					analyzedFiles: [...REPORT_TEST_DATA.METADATA.SAMPLE_FILES.SINGLE],
					duration: REPORT_TEST_DATA.DURATIONS.VERY_LONG - 500,
					toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
				},
			});

			await saveAndVerifyReport(generator, report, testWorkspacePath, 'security.html', 'html', (content) => {
				assert.ok(content.includes('<h2>Vulnerabilities</h2>'));
				assert.ok(content.includes('<strong>Critical:</strong> 0'));
			});
		});
	});

	// ====================================================================
	// Test Suite 4: Performance Analysis Reports
	// ====================================================================

	suite('Performance Analysis Reports', () => {
		test('Should save performance report with metrics', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const report = createTestPerformanceReport(REPORT_TEST_DATA.PERFORMANCE_METRICS.MODERATE);

			const outputPath = path.join(testWorkspacePath, 'reports', 'performance.json');
			await generator.saveAnalysisResults(report, outputPath, 'json');

			const loaded = await generator.loadAnalysisResults(outputPath);
			const perf = loaded as PerformanceAnalysisReport;
			assert.strictEqual(perf.metrics.avgResponseTime, REPORT_TEST_DATA.PERFORMANCE_METRICS.MODERATE.avgResponseTime);
			assert.strictEqual(perf.metrics.memoryUsage, REPORT_TEST_DATA.PERFORMANCE_METRICS.MODERATE.memoryUsage);
		});

		test('Should generate Markdown performance report', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const report = createTestPerformanceReport(REPORT_TEST_DATA.PERFORMANCE_METRICS.FAST, {
				summary: REPORT_TEST_DATA.SUMMARIES.ACCEPTABLE,
				bottlenecks: [],
				findings: [],
				metadata: {
					analyzedFiles: ['src/api.ts'],
					duration: REPORT_TEST_DATA.DURATIONS.EXTENDED,
					toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
				},
			});

			await saveAndVerifyReport(generator, report, testWorkspacePath, 'perf.md', 'markdown', (content) => {
				assert.ok(content.includes('## Performance Metrics'));
				assert.ok(content.includes(`**Average Response Time:** ${REPORT_TEST_DATA.PERFORMANCE_METRICS.FAST.avgResponseTime}ms`));
				assert.ok(content.includes(`**Memory Usage:** ${REPORT_TEST_DATA.PERFORMANCE_METRICS.FAST.memoryUsage}MB`));
			});
		});
	});

	// ====================================================================
	// Test Suite 5: Report Loading
	// ====================================================================

	suite('Report Loading', () => {
		test('Should load saved JSON report', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const original = createTestAnalysisResult('general', {
				timestamp: REPORT_TEST_DATA.TIMESTAMPS.FIXED_TEST,
				summary: REPORT_TEST_DATA.SUMMARIES.TEST,
				findings: [],
				metadata: {
					analyzedFiles: ['test.ts'],
					duration: REPORT_TEST_DATA.DURATIONS.VERY_SHORT,
					toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
				},
			});

			const outputPath = path.join(testWorkspacePath, 'reports', 'load-test.json');
			await generator.saveAnalysisResults(original, outputPath);

			const loaded = await generator.loadAnalysisResults(outputPath);

			assert.strictEqual(loaded.type, original.type);
			assert.strictEqual(loaded.timestamp, original.timestamp);
			assert.strictEqual(loaded.summary, original.summary);
		});

		test('Should throw error for non-existent file', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const nonExistentPath = path.join(testWorkspacePath, 'nonexistent.json');

			await assert.rejects(
				async () => await generator.loadAnalysisResults(nonExistentPath),
				/File not found/
			);
		});

		test('Should throw error for non-JSON file', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const markdownPath = path.join(testWorkspacePath, 'test.md');
			fs.writeFileSync(markdownPath, '# Test');

			await assert.rejects(
				async () => await generator.loadAnalysisResults(markdownPath),
				/Only JSON format can be loaded/
			);
		});
	});

	// ====================================================================
	// Test Suite 6: Format Options
	// ====================================================================

	suite('Format Options', () => {
		test('Should support all three format options', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const generator = new ReportGenerator();
			const result = createTestAnalysisResult('general', {
				summary: REPORT_TEST_DATA.SUMMARIES.MULTI_FORMAT,
				findings: [],
				metadata: {
					analyzedFiles: ['test.ts'],
					duration: REPORT_TEST_DATA.DURATIONS.VERY_SHORT,
					toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
				},
			});

			const basePath = path.join(testWorkspacePath, 'reports', 'multi');

			// Save in all formats
			await generator.saveAnalysisResults(result, `${basePath}.json`, 'json');
			await generator.saveAnalysisResults(result, `${basePath}.md`, 'markdown');
			await generator.saveAnalysisResults(result, `${basePath}.html`, 'html');

			// Verify all files exist
			assert.ok(fs.existsSync(`${basePath}.json`));
			assert.ok(fs.existsSync(`${basePath}.md`));
			assert.ok(fs.existsSync(`${basePath}.html`));
		});
	});
});

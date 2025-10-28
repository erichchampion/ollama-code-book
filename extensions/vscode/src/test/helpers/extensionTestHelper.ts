/**
 * Extension Test Helpers
 * Utilities for testing VS Code extension functionality
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { EXTENSION_TEST_CONSTANTS } from './test-constants.js';
import { sleep, waitFor as waitForCondition, ensureDir, remove, writeFile as writeFileAsync } from './test-utils.js';

/**
 * Wait for extension to activate
 */
export async function waitForExtensionActivation(
  extensionId: string = EXTENSION_TEST_CONSTANTS.EXTENSION_ID,
  timeout: number = EXTENSION_TEST_CONSTANTS.ACTIVATION_TIMEOUT
): Promise<vscode.Extension<any> | undefined> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const extension = vscode.extensions.getExtension(extensionId);
    if (extension?.isActive) {
      return extension;
    }
    await sleep(EXTENSION_TEST_CONSTANTS.POLLING_INTERVAL);
  }

  throw new Error(`Extension ${extensionId} did not activate within ${timeout}ms`);
}

/**
 * Get activated extension
 */
export function getExtension(extensionId: string = EXTENSION_TEST_CONSTANTS.EXTENSION_ID): vscode.Extension<any> | undefined {
  return vscode.extensions.getExtension(extensionId);
}

/**
 * Check if extension is active
 */
export function isExtensionActive(extensionId: string = EXTENSION_TEST_CONSTANTS.EXTENSION_ID): boolean {
  const extension = vscode.extensions.getExtension(extensionId);
  return extension?.isActive ?? false;
}

/**
 * Get all registered commands
 */
export async function getRegisteredCommands(): Promise<string[]> {
  return await vscode.commands.getCommands(true);
}

/**
 * Check if command is registered
 */
export async function isCommandRegistered(commandId: string): Promise<boolean> {
  const commands = await getRegisteredCommands();
  return commands.includes(commandId);
}

/**
 * Execute command and capture result
 */
export async function executeCommand<T = any>(commandId: string, ...args: any[]): Promise<T> {
  return await vscode.commands.executeCommand<T>(commandId, ...args);
}

/**
 * Create temporary test workspace
 */
export async function createTestWorkspace(name: string = 'test-workspace'): Promise<string> {
  const tmpDir = path.join(__dirname, '../../../.test-workspaces', name);
  await ensureDir(tmpDir);
  return tmpDir;
}

/**
 * Clean up test workspace
 */
export async function cleanupTestWorkspace(workspacePath: string): Promise<void> {
  await remove(workspacePath, true);
}

/**
 * Create test file in workspace
 */
export async function createTestFile(
  workspacePath: string,
  filename: string,
  content: string
): Promise<string> {
  const filePath = path.join(workspacePath, filename);
  const dir = path.dirname(filePath);

  await ensureDir(dir);
  await writeFileAsync(filePath, content);
  return filePath;
}

/**
 * Open document in editor
 */
export async function openDocument(filePath: string): Promise<vscode.TextDocument> {
  const uri = vscode.Uri.file(filePath);
  return await vscode.workspace.openTextDocument(uri);
}

/**
 * Open document and show in editor
 */
export async function openAndShowDocument(filePath: string): Promise<vscode.TextEditor> {
  const document = await openDocument(filePath);
  return await vscode.window.showTextDocument(document);
}

/**
 * Get configuration value
 */
export function getConfig<T>(key: string, defaultValue?: T): T | undefined {
  const config = vscode.workspace.getConfiguration('ollama-code');
  if (defaultValue !== undefined) {
    return config.get<T>(key, defaultValue);
  }
  return config.get<T>(key);
}

/**
 * Update configuration value
 */
export async function updateConfig(
  key: string,
  value: any,
  configurationTarget: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
): Promise<void> {
  await vscode.workspace.getConfiguration('ollama-code').update(key, value, configurationTarget);
}

/**
 * Reset configuration to defaults
 */
export async function resetConfig(): Promise<void> {
  const config = vscode.workspace.getConfiguration('ollama-code');
  const keys = [
    'serverPort',
    'autoStart',
    'showChatView',
    'inlineCompletions',
    'codeActions',
    'diagnostics',
    'contextLines',
    'connectionTimeout',
    'logLevel'
  ];

  for (const key of keys) {
    await config.update(key, undefined, vscode.ConfigurationTarget.Global);
  }
}

// Re-export sleep from shared utilities
export { sleep } from './test-utils.js';

/**
 * Wait for condition to be true (wrapper for shared utility with default values)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = EXTENSION_TEST_CONSTANTS.COMMAND_TIMEOUT,
  interval: number = EXTENSION_TEST_CONSTANTS.POLLING_INTERVAL
): Promise<void> {
  await waitForCondition(condition, timeout, interval);
}

/**
 * Get active text editor
 */
export function getActiveEditor(): vscode.TextEditor | undefined {
  return vscode.window.activeTextEditor;
}

/**
 * Get all visible text editors
 */
export function getVisibleEditors(): readonly vscode.TextEditor[] {
  return vscode.window.visibleTextEditors;
}

/**
 * Close all editors
 */
export async function closeAllEditors(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

/**
 * Show information message and wait for user action
 */
export async function showMessage(message: string): Promise<void> {
  await vscode.window.showInformationMessage(message);
}

/**
 * Get workspace folders
 */
export function getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined {
  return vscode.workspace.workspaceFolders;
}

/**
 * Capture diagnostic messages
 */
export function getDiagnostics(uri?: vscode.Uri): vscode.Diagnostic[] {
  if (uri) {
    return vscode.languages.getDiagnostics(uri);
  }

  const allDiagnostics: vscode.Diagnostic[] = [];
  vscode.languages.getDiagnostics().forEach(([_, diagnostics]) => {
    allDiagnostics.push(...diagnostics);
  });

  return allDiagnostics;
}

/**
 * Mock VS Code workspace with test files
 */
export interface MockWorkspaceOptions {
  name: string;
  files: {
    path: string;
    content: string;
  }[];
}

export async function createMockWorkspace(options: MockWorkspaceOptions): Promise<string> {
  const workspacePath = await createTestWorkspace(options.name);

  for (const file of options.files) {
    await createTestFile(workspacePath, file.path, file.content);
  }

  return workspacePath;
}

// ====================================================================
// Report Generation Test Helpers
// ====================================================================

import { REPORT_TEST_DATA } from './test-constants';

/**
 * Analysis Result Types
 */
export interface AnalysisResult {
  type: 'general' | 'code_review' | 'security_scan' | 'performance_analysis';
  timestamp: number;
  summary: string;
  findings: Finding[];
  metadata: {
    analyzedFiles: string[];
    duration: number;
    toolVersion: string;
  };
}

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  file?: string;
  line?: number;
  recommendation?: string;
  codeSnippet?: string;
}

export interface CodeReviewReport extends AnalysisResult {
  type: 'code_review';
  qualityScore: number; // 0-100
  categories: {
    maintainability: number;
    reliability: number;
    security: number;
    performance: number;
  };
}

export interface SecurityScanReport extends AnalysisResult {
  type: 'security_scan';
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  complianceStatus: {
    owasp: boolean;
    cwe: boolean;
  };
}

export interface PerformanceAnalysisReport extends AnalysisResult {
  type: 'performance_analysis';
  metrics: {
    avgResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  bottlenecks: Finding[];
}

export type ReportFormat = 'json' | 'markdown' | 'html';

/**
 * Create test analysis result with defaults
 */
export function createTestAnalysisResult(
  type: 'general' | 'code_review' | 'security_scan' | 'performance_analysis',
  overrides?: Partial<AnalysisResult>
): AnalysisResult {
  const defaults: AnalysisResult = {
    type,
    timestamp: Date.now(),
    summary: REPORT_TEST_DATA.SUMMARIES.COMPLETED,
    findings: [],
    metadata: {
      analyzedFiles: [...REPORT_TEST_DATA.METADATA.SAMPLE_FILES.PAIR],
      duration: REPORT_TEST_DATA.DURATIONS.MEDIUM,
      toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
    },
  };

  return { ...defaults, ...overrides };
}

/**
 * Create test code review report
 */
export function createTestCodeReview(
  qualityScore?: number,
  overrides?: Partial<CodeReviewReport>
): CodeReviewReport {
  const base = createTestAnalysisResult('code_review', {
    summary: REPORT_TEST_DATA.SUMMARIES.CODE_REVIEW,
    ...overrides,
  });

  return {
    ...base,
    type: 'code_review',
    qualityScore: qualityScore ?? REPORT_TEST_DATA.QUALITY_SCORES.AVERAGE,
    categories: REPORT_TEST_DATA.CATEGORY_SCORES.GOOD,
    ...overrides,
  } as CodeReviewReport;
}

/**
 * Create test security scan report
 */
export function createTestSecurityScan(
  vulnerabilities?: SecurityScanReport['vulnerabilities'],
  overrides?: Partial<SecurityScanReport>
): SecurityScanReport {
  const base = createTestAnalysisResult('security_scan', {
    summary: REPORT_TEST_DATA.SUMMARIES.SECURITY,
    metadata: {
      analyzedFiles: [...REPORT_TEST_DATA.METADATA.SAMPLE_FILES.SECURITY],
      duration: REPORT_TEST_DATA.DURATIONS.VERY_LONG,
      toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
    },
    ...overrides,
  });

  return {
    ...base,
    type: 'security_scan',
    vulnerabilities: vulnerabilities ?? REPORT_TEST_DATA.VULNERABILITY_COUNTS.CRITICAL,
    complianceStatus: REPORT_TEST_DATA.COMPLIANCE_STATUS.NON_COMPLIANT,
    ...overrides,
  } as SecurityScanReport;
}

/**
 * Create test performance analysis report
 */
export function createTestPerformanceReport(
  metrics?: PerformanceAnalysisReport['metrics'],
  overrides?: Partial<PerformanceAnalysisReport>
): PerformanceAnalysisReport {
  const base = createTestAnalysisResult('performance_analysis', {
    summary: REPORT_TEST_DATA.SUMMARIES.PERFORMANCE,
    metadata: {
      analyzedFiles: [...REPORT_TEST_DATA.METADATA.SAMPLE_FILES.PERFORMANCE],
      duration: REPORT_TEST_DATA.DURATIONS.MAXIMUM,
      toolVersion: REPORT_TEST_DATA.METADATA.TOOL_VERSION,
    },
    ...overrides,
  });

  return {
    ...base,
    type: 'performance_analysis',
    metrics: metrics ?? REPORT_TEST_DATA.PERFORMANCE_METRICS.MODERATE,
    bottlenecks: [REPORT_TEST_DATA.SAMPLE_FINDINGS.SLOW_QUERY],
    ...overrides,
  } as PerformanceAnalysisReport;
}

/**
 * Save and verify report generation
 * Eliminates duplicate save/verify patterns across tests
 */
export async function saveAndVerifyReport(
  generator: any, // ReportGenerator type from test file
  result: AnalysisResult,
  testWorkspacePath: string,
  filename: string,
  format: ReportFormat,
  assertions?: (content: string) => void
): Promise<string> {
  const outputPath = path.join(testWorkspacePath, 'reports', filename);
  await generator.saveAnalysisResults(result, outputPath, format);

  assert.ok(fs.existsSync(outputPath), `${format.toUpperCase()} file should be created`);

  const content = fs.readFileSync(outputPath, 'utf-8');

  if (assertions) {
    assertions(content);
  }

  return content;
}

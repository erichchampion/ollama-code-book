/**
 * Command Handler
 *
 * Handles all VS Code commands for the Ollama Code extension
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { OllamaCodeClient } from '../client/ollamaCodeClient';
import { Logger } from '../utils/logger';

export class CommandHandler {
  constructor(
    private client: OllamaCodeClient,
    private logger: Logger
  ) {}

  /**
   * Handle ask command - general AI assistance
   */
  async handleAsk(): Promise<void> {
    try {
      const prompt = await vscode.window.showInputBox({
        prompt: 'Ask the AI assistant',
        placeHolder: 'What would you like to know or do?'
      });

      if (!prompt) return;

      this.logger.info(`Handling ask command: ${prompt}`);

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Processing AI request...',
        cancellable: true
      }, async (progress, token) => {
        // Set up progress updates
        this.client.on('progress', (id: string, payload: any) => {
          progress.report({ message: payload.message, increment: payload.progress });
        });

        return await this.client.sendAIRequest({
          prompt,
          type: 'completion',
          language: this.getCurrentLanguage()
        });
      });

      await this.showResult('AI Response', result.result);

    } catch (error) {
      this.handleError('Ask command failed', error);
    }
  }

  /**
   * Handle explain command - explain selected code
   */
  async handleExplain(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const code = editor.document.getText(selection);

      if (!code.trim()) {
        vscode.window.showWarningMessage('Please select code to explain');
        return;
      }

      this.logger.info('Handling explain command');

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Explaining code...',
        cancellable: true
      }, async () => {
        return await this.client.sendAIRequest({
          prompt: code,
          type: 'explanation',
          language: editor.document.languageId
        });
      });

      await this.showResult('Code Explanation', result.result);

    } catch (error) {
      this.handleError('Explain command failed', error);
    }
  }

  /**
   * Handle refactor command - refactor selected code
   */
  async handleRefactor(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const code = editor.document.getText(selection);

      if (!code.trim()) {
        vscode.window.showWarningMessage('Please select code to refactor');
        return;
      }

      this.logger.info('Handling refactor command');

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Refactoring code...',
        cancellable: true
      }, async () => {
        return await this.client.sendAIRequest({
          prompt: code,
          type: 'refactor',
          language: editor.document.languageId
        });
      });

      // Ask user if they want to apply the refactoring
      const apply = await vscode.window.showInformationMessage(
        'Refactoring complete. Apply changes?',
        'Apply', 'Show Result', 'Cancel'
      );

      if (apply === 'Apply') {
        await this.applyCodeChange(editor, selection, result.result);
      } else if (apply === 'Show Result') {
        await this.showResult('Refactored Code', result.result);
      }

    } catch (error) {
      this.handleError('Refactor command failed', error);
    }
  }

  /**
   * Handle fix command - fix code issues
   */
  async handleFix(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const code = editor.document.getText(selection);

      if (!code.trim()) {
        vscode.window.showWarningMessage('Please select code to fix');
        return;
      }

      this.logger.info('Handling fix command');

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Fixing code issues...',
        cancellable: true
      }, async () => {
        return await this.client.sendAIRequest({
          prompt: code,
          type: 'fix',
          language: editor.document.languageId
        });
      });

      // Ask user if they want to apply the fix
      const apply = await vscode.window.showInformationMessage(
        'Fix complete. Apply changes?',
        'Apply', 'Show Result', 'Cancel'
      );

      if (apply === 'Apply') {
        await this.applyCodeChange(editor, selection, result.result);
      } else if (apply === 'Show Result') {
        await this.showResult('Fixed Code', result.result);
      }

    } catch (error) {
      this.handleError('Fix command failed', error);
    }
  }

  /**
   * Handle generate command - generate code from description
   */
  async handleGenerate(): Promise<void> {
    try {
      const prompt = await vscode.window.showInputBox({
        prompt: 'Describe what code you want to generate',
        placeHolder: 'e.g., "Create a function that validates email addresses"'
      });

      if (!prompt) return;

      this.logger.info(`Handling generate command: ${prompt}`);

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating code...',
        cancellable: true
      }, async () => {
        return await this.client.sendAIRequest({
          prompt,
          type: 'generate',
          language: this.getCurrentLanguage()
        });
      });

      // Ask user where to insert the generated code
      const action = await vscode.window.showInformationMessage(
        'Code generated. Where would you like to insert it?',
        'At Cursor', 'New File', 'Show Result'
      );

      if (action === 'At Cursor') {
        await this.insertAtCursor(result.result);
      } else if (action === 'New File') {
        await this.createNewFileWithContent(result.result);
      } else if (action === 'Show Result') {
        await this.showResult('Generated Code', result.result);
      }

    } catch (error) {
      this.handleError('Generate command failed', error);
    }
  }

  /**
   * Handle analyze command - analyze workspace
   */
  async handleAnalyze(): Promise<void> {
    try {
      const analysisType = await vscode.window.showQuickPick([
        { label: 'Security Analysis', value: 'security' },
        { label: 'Performance Analysis', value: 'performance' },
        { label: 'Code Quality', value: 'quality' },
        { label: 'Dependencies', value: 'dependencies' }
      ], {
        placeHolder: 'Select analysis type'
      });

      if (!analysisType) return;

      this.logger.info(`Handling analyze command: ${analysisType.value}`);

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Running ${analysisType.label.toLowerCase()}...`,
        cancellable: true
      }, async () => {
        return await this.client.analyzeWorkspace(analysisType.value);
      });

      await this.showResult(`${analysisType.label} Results`, result.result);

    } catch (error) {
      this.handleError('Analyze command failed', error);
    }
  }

  /**
   * Handle start server command
   */
  async handleStartServer(): Promise<void> {
    try {
      this.logger.info('Starting integration server...');

      await this.client.executeCommand('ide-server', ['start']);

      vscode.window.showInformationMessage('Ollama Code integration server started');

    } catch (error) {
      this.handleError('Failed to start server', error);
    }
  }

  /**
   * Handle stop server command
   */
  async handleStopServer(): Promise<void> {
    try {
      this.logger.info('Stopping integration server...');

      await this.client.executeCommand('ide-server', ['stop']);

      vscode.window.showInformationMessage('Ollama Code integration server stopped');

    } catch (error) {
      this.handleError('Failed to stop server', error);
    }
  }

  /**
   * Handle show output command
   */
  async handleShowOutput(): Promise<void> {
    this.logger.show();
  }

  /**
   * Apply code change to editor
   */
  private async applyCodeChange(
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    newCode: string
  ): Promise<void> {
    await editor.edit(editBuilder => {
      editBuilder.replace(selection, newCode);
    });

    vscode.window.showInformationMessage('Changes applied successfully');
  }

  /**
   * Insert code at cursor position
   */
  private async insertAtCursor(code: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    await editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.active, code);
    });

    vscode.window.showInformationMessage('Code inserted successfully');
  }

  /**
   * Create new file with generated content
   */
  private async createNewFileWithContent(content: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: this.getCurrentLanguage()
    });

    await vscode.window.showTextDocument(doc);
  }

  /**
   * Show result in a new document
   */
  private async showResult(title: string, content: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({
      content: `${title}\n${'='.repeat(title.length)}\n\n${content}`,
      language: 'markdown'
    });

    await vscode.window.showTextDocument(doc, { preview: true });
  }

  /**
   * Get current language from active editor
   */
  private getCurrentLanguage(): string {
    const editor = vscode.window.activeTextEditor;
    return editor?.document.languageId || 'plaintext';
  }

  /**
   * Handle analyze function command from code lens
   */
  async handleAnalyzeFunction(uri: vscode.Uri, range: vscode.Range, functionName: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const functionCode = document.getText(range);

      this.logger.info(`Analyzing function: ${functionName}`);

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Analyzing ${functionName}...`,
        cancellable: true
      }, async () => {
        return await this.client.sendAIRequest({
          prompt: `Analyze this function for complexity, performance, and potential improvements:\n\n\`\`\`${document.languageId}\n${functionCode}\n\`\`\``,
          type: 'explanation',
          language: document.languageId
        });
      });

      await this.showResult(`Function Analysis: ${functionName}`, result.result);

    } catch (error) {
      this.handleError('Failed to analyze function', error);
    }
  }

  /**
   * Handle analyze file command from code lens
   */
  async handleAnalyzeFile(uri: vscode.Uri): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);

      this.logger.info(`Analyzing file: ${uri.fsPath}`);

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing file...',
        cancellable: true
      }, async () => {
        return await this.client.sendAIRequest({
          prompt: `Analyze this file for overall code quality, structure, and suggestions for improvement:\n\n\`\`\`${document.languageId}\n${document.getText()}\n\`\`\``,
          type: 'explanation',
          language: document.languageId
        });
      });

      await this.showResult('File Analysis', result.result);

    } catch (error) {
      this.handleError('Failed to analyze file', error);
    }
  }

  /**
   * Handle generate tests command from code lens
   */
  async handleGenerateTests(uri: vscode.Uri): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);

      this.logger.info(`Generating tests for file: ${uri.fsPath}`);

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating tests...',
        cancellable: true
      }, async () => {
        return await this.client.sendAIRequest({
          prompt: `Generate comprehensive unit tests for this code:\n\n\`\`\`${document.languageId}\n${document.getText()}\n\`\`\``,
          type: 'generate',
          language: document.languageId
        });
      });

      // Create new test file
      const fileName = document.fileName;
      const testFileName = fileName.replace(/\.(ts|js|py|java|cpp|c|go|rs)$/, '.test.$1');
      const testDoc = await vscode.workspace.openTextDocument({
        content: result.result,
        language: document.languageId
      });

      await vscode.window.showTextDocument(testDoc);
      vscode.window.showInformationMessage(`Generated tests for ${path.basename(fileName)}`);

    } catch (error) {
      this.handleError('Failed to generate tests', error);
    }
  }

  /**
   * Handle security analysis command from code lens
   */
  async handleSecurityAnalysis(uri: vscode.Uri): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);

      this.logger.info(`Running security analysis for file: ${uri.fsPath}`);

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Running security analysis...',
        cancellable: true
      }, async () => {
        return await this.client.sendAIRequest({
          prompt: `Perform a security analysis of this code, looking for potential vulnerabilities, security issues, and recommendations:\n\n\`\`\`${document.languageId}\n${document.getText()}\n\`\`\``,
          type: 'explanation',
          language: document.languageId
        });
      });

      await this.showResult('Security Analysis', result.result);

    } catch (error) {
      this.handleError('Failed to perform security analysis', error);
    }
  }

  /**
   * Handle command errors
   */
  private handleError(message: string, error: any): void {
    this.logger.error(message, error);
    vscode.window.showErrorMessage(`${message}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
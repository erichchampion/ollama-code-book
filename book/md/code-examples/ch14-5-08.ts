// src/commands/generateTests.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { AIClient } from '../client';

export class GenerateTestsCommand {
  readonly id = 'ollamaCode.generateTests';

  constructor(private aiClient: AIClient) {}

  async execute(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
      vscode.window.showErrorMessage('No code selected');
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating tests...',
        cancellable: true
      },
      async (progress, token) => {
        try {
          const languageId = editor.document.languageId;
          const fileName = path.basename(editor.document.fileName);

          const response = await this.aiClient.complete({
            prompt: `Generate comprehensive unit tests for the following ${languageId} code.
Include edge cases, error cases, and happy path tests.

Code to test:
${selectedText}

Generate tests using a popular testing framework for ${languageId}.`,
            context: `File: ${fileName}`,
            temperature: 0.4,
            maxTokens: 4096
          });

          // Create test file
          await this.createTestFile(
            editor.document.uri,
            response.content,
            languageId
          );
        } catch (error) {
          if (token.isCancellationRequested) {
            return;
          }
          vscode.window.showErrorMessage(
            `Failed to generate tests: ${error.message}`
          );
        }
      }
    );
  }

  private async createTestFile(
    sourceUri: vscode.Uri,
    testCode: string,
    languageId: string
  ): Promise<void> {
    // Determine test file name based on language conventions
    const sourcePath = sourceUri.fsPath;
    const ext = path.extname(sourcePath);
    const baseName = path.basename(sourcePath, ext);
    const dirName = path.dirname(sourcePath);

    let testFileName: string;
    if (languageId === 'typescript' || languageId === 'javascript') {
      testFileName = `${baseName}.test${ext}`;
    } else if (languageId === 'python') {
      testFileName = `test_${baseName}${ext}`;
    } else if (languageId === 'go') {
      testFileName = `${baseName}_test.go`;
    } else {
      testFileName = `${baseName}.test${ext}`;
    }

    const testFilePath = path.join(dirName, testFileName);
    const testFileUri = vscode.Uri.file(testFilePath);

    // Create and open test file
    const edit = new vscode.WorkspaceEdit();
    edit.createFile(testFileUri, { overwrite: false, ignoreIfExists: false });
    edit.insert(testFileUri, new vscode.Position(0, 0), testCode);

    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      const doc = await vscode.workspace.openTextDocument(testFileUri);
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      vscode.window.showInformationMessage(
        `Test file created: ${testFileName}`
      );
    } else {
      vscode.window.showErrorMessage('Failed to create test file');
    }
  }
}
// src/test/suite/integration.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Integration Test Suite', () => {
  test('Explain Code command should work', async () => {
    // Create test document
    const content = `
function add(a: number, b: number): number {
  return a + b;
}
`;

    const doc = await vscode.workspace.openTextDocument({
      language: 'typescript',
      content
    });

    const editor = await vscode.window.showTextDocument(doc);

    // Select the function
    editor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(3, 1)
    );

    // Execute command
    await vscode.commands.executeCommand('ollamaCode.explainCode');

    // Verify webview panel was created
    // (In real tests, you'd mock the webview and verify content)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  test('Fix Error command should work', async () => {
    const content = `
const x: number = "not a number"; // Type error
`;

    const doc = await vscode.workspace.openTextDocument({
      language: 'typescript',
      content
    });

    const editor = await vscode.window.showTextDocument(doc);

    // Position cursor on error
    editor.selection = new vscode.Selection(
      new vscode.Position(1, 6),
      new vscode.Position(1, 6)
    );

    // Execute command
    await vscode.commands.executeCommand('ollamaCode.fixError');

    // Verify fix was applied
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const fixedContent = editor.document.getText();

    // Should have fixed the type error
    assert.ok(!fixedContent.includes('"not a number"'));
  });
});
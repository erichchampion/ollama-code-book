// Always check if feature is enabled
const config = vscode.workspace.getConfiguration('ollamaCode');
if (config.get('enableInlineCompletions')) {
  // Provide inline completions
}
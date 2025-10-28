// Show progress for long operations
await vscode.window.withProgress(
  {
    location: vscode.ProgressLocation.Notification,
    title: 'Generating tests...',
    cancellable: true
  },
  async (progress, token) => {
    // Long operation
  }
);
// extension/src/extension.ts
import * as vscode from 'vscode';
import { DevOpsAssistant } from 'devops-ai-assistant';

export function activate(context: vscode.ExtensionContext) {
  const assistant = new DevOpsAssistant({
    models: { primary: 'codellama:34b' }
  });

  // Command: Generate Deployment
  const generateDeployment = vscode.commands.registerCommand(
    'devopsAI.generateDeployment',
    async () => {
      const appName = await vscode.window.showInputBox({
        prompt: 'Application name'
      });

      const image = await vscode.window.showInputBox({
        prompt: 'Docker image'
      });

      if (!appName || !image) return;

      const yaml = await assistant.generateKubernetesDeployment(appName, image);

      // Create new file with generated YAML
      const doc = await vscode.workspace.openTextDocument({
        language: 'yaml',
        content: yaml
      });

      await vscode.window.showTextDocument(doc);
    }
  );

  context.subscriptions.push(generateDeployment);
}
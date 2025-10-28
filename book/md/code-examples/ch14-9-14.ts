// src/test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { AIClient } from '../../client';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start extension tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('your-publisher.ollama-code-vscode'));
  });

  test('Extension should activate', async () => {
    const ext = vscode.extensions.getExtension('your-publisher.ollama-code-vscode');
    await ext?.activate();
    assert.strictEqual(ext?.isActive, true);
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('ollamaCode.explainCode'));
    assert.ok(commands.includes('ollamaCode.fixError'));
    assert.ok(commands.includes('ollamaCode.generateTests'));
    assert.ok(commands.includes('ollamaCode.refactor'));
  });
});

suite('AIClient Test Suite', () => {
  let aiClient: AIClient;
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
    aiClient = new AIClient({
      apiUrl: 'http://localhost:11434',
      model: 'codellama:7b',
      maxTokens: 2048
    });
  });

  teardown(() => {
    sandbox.restore();
  });

  test('Should complete code', async () => {
    // Mock HTTP response
    sandbox.stub(aiClient as any, 'httpClient').value({
      post: async () => ({
        data: {
          response: 'console.log("Hello, World!");',
          prompt_eval_count: 10,
          eval_count: 15
        }
      })
    });

    const response = await aiClient.complete({
      prompt: 'Write a hello world program in JavaScript'
    });

    assert.ok(response.content);
    assert.ok(response.usage.inputTokens > 0);
    assert.ok(response.usage.outputTokens > 0);
  });

  test('Should handle errors gracefully', async () => {
    sandbox.stub(aiClient as any, 'httpClient').value({
      post: async () => {
        throw new Error('Network error');
      }
    });

    await assert.rejects(
      async () => {
        await aiClient.complete({ prompt: 'test' });
      },
      /AI completion failed/
    );
  });
});
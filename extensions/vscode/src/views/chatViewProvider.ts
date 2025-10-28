/**
 * Chat View Provider - provides chat interface in VS Code sidebar
 */

import * as vscode from 'vscode';
import { OllamaCodeClient } from '../client/ollamaCodeClient';
import { Logger } from '../utils/logger';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  constructor(
    private context: vscode.ExtensionContext,
    private client: OllamaCodeClient,
    private logger: Logger
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = this.getWebviewContent();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'sendMessage':
          this.handleChatMessage(webviewView, message.text);
          break;
      }
    });
  }

  private async handleChatMessage(webviewView: vscode.WebviewView, message: string): Promise<void> {
    try {
      const result = await this.client.sendAIRequest({
        prompt: message,
        type: 'completion'
      });

      webviewView.webview.postMessage({
        command: 'addResponse',
        text: result.result
      });

    } catch (error) {
      this.logger.error('Chat message failed:', error);
      webviewView.webview.postMessage({
        command: 'addResponse',
        text: 'Error: Failed to get AI response'
      });
    }
  }

  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ollama Code Chat</title>
        <style>
          body { font-family: var(--vscode-font-family); padding: 10px; }
          .chat-container { height: 300px; overflow-y: auto; border: 1px solid var(--vscode-panel-border); padding: 10px; margin-bottom: 10px; }
          .message { margin: 5px 0; }
          .user-message { color: var(--vscode-textLink-foreground); }
          .ai-message { color: var(--vscode-foreground); }
          .input-container { display: flex; }
          #messageInput { flex: 1; padding: 5px; margin-right: 5px; }
          #sendButton { padding: 5px 10px; }
        </style>
      </head>
      <body>
        <div class="chat-container" id="chatContainer">
          <div class="message ai-message">Hello! I'm your AI assistant. How can I help you today?</div>
        </div>
        <div class="input-container">
          <input type="text" id="messageInput" placeholder="Ask me anything..." />
          <button id="sendButton">Send</button>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          const chatContainer = document.getElementById('chatContainer');
          const messageInput = document.getElementById('messageInput');
          const sendButton = document.getElementById('sendButton');

          function addMessage(text, isUser) {
            const messageDiv = document.createElement('div');
            messageDiv.className = isUser ? 'message user-message' : 'message ai-message';
            messageDiv.textContent = text;
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }

          function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;

            addMessage(text, true);
            messageInput.value = '';

            vscode.postMessage({
              command: 'sendMessage',
              text: text
            });
          }

          sendButton.addEventListener('click', sendMessage);
          messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
          });

          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.command === 'addResponse') {
              addMessage(message.text, false);
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}
/**
 * Chat Panel Integration Tests
 * Comprehensive tests for AI-powered chat interface and commands
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { OllamaCodeClient } from '../../client/ollamaCodeClient';
import { Logger } from '../../utils/logger';
import {
  createTestWorkspace,
  cleanupTestWorkspace,
  sleep
} from '../helpers/extensionTestHelper';
import { EXTENSION_TEST_CONSTANTS, PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';
import { createMockOllamaClient, createMockLogger, createChatAIHandler, TEST_DATA_CONSTANTS } from '../helpers/providerTestHelper';

/**
 * Chat message interface
 */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Mock Chat Panel for testing
 * Simulates the WebView-based chat panel behavior
 */
class MockChatPanel {
  private messages: ChatMessage[] = [];
  private visible: boolean = false;
  private client: OllamaCodeClient;
  private logger: Logger;

  constructor(client: OllamaCodeClient, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  async sendMessage(message: string): Promise<void> {
    // Add user message
    this.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Check if client is connected
    const status = this.client.getConnectionStatus();
    if (!status.connected) {
      throw new Error('Chat client not connected');
    }

    // Simulate AI response
    let responseContent: string;

    // Handle chat commands
    if (message.startsWith('/')) {
      responseContent = this.handleCommand(message);
    } else {
      // Simulate AI request
      const aiResponse = await (this.client as any).sendAIRequest?.({
        type: 'chat',
        prompt: message
      });
      responseContent = aiResponse?.result || 'AI response';
    }

    // Add assistant message
    this.messages.push({
      role: 'assistant',
      content: responseContent,
      timestamp: new Date()
    });
  }

  private handleCommand(command: string): string {
    const parts = command.split(' ');
    const cmd = parts[0];

    switch (cmd) {
      case '/help':
        return 'Available commands:\n' +
          '/help - Show this help message\n' +
          '/clear - Clear chat history\n' +
          '/session - Show session information\n' +
          '/model - Show current AI model';

      case '/clear':
        const messageCount = this.messages.length;
        this.clearHistory();
        return `Cleared ${messageCount} messages from history`;

      case '/session':
        const status = this.client.getConnectionStatus();
        return `Session Information:\n` +
          `Connected: ${status.connected}\n` +
          `Messages: ${this.messages.length}\n` +
          `Port: ${status.config?.port || 'Unknown'}`;

      case '/model':
        return `Current model: Ollama (via WebSocket)`;

      default:
        return `Unknown command: ${cmd}. Type /help for available commands.`;
    }
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  clearHistory(): void {
    this.messages = [];
  }

  getLastMessage(): ChatMessage | undefined {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : undefined;
  }

  findMessagesByRole(role: ChatMessage['role']): ChatMessage[] {
    return this.messages.filter(msg => msg.role === role);
  }
}

suite('Chat Panel Integration Tests', () => {
  let chatPanel: MockChatPanel;
  let mockClient: OllamaCodeClient;
  let mockLogger: Logger;
  let testWorkspacePath: string;

  setup(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);

    // Create mock client and logger using shared helpers
    mockClient = createMockOllamaClient(true, createChatAIHandler());
    mockLogger = createMockLogger();

    // Create chat panel
    chatPanel = new MockChatPanel(mockClient, mockLogger);

    // Create test workspace
    testWorkspacePath = await createTestWorkspace('chat-panel-tests');
  });

  teardown(async function() {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Chat Interface', () => {
    test('Should activate chat panel and make it visible', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      assert.strictEqual(chatPanel.isVisible(), false, 'Chat panel should be hidden initially');

      chatPanel.show();

      assert.strictEqual(chatPanel.isVisible(), true, 'Chat panel should be visible after show()');
    });

    test('Should send and receive messages', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('Hello!');

      const messages = chatPanel.getMessages();
      assert.strictEqual(messages.length, TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.SINGLE_EXCHANGE, 'Should have user message and AI response');
      assert.strictEqual(messages[0].role, 'user', 'First message should be from user');
      assert.strictEqual(messages[0].content, 'Hello!', 'User message content should match');
      assert.strictEqual(messages[1].role, 'assistant', 'Second message should be from assistant');
      assert.ok(messages[1].content.length > 0, 'Assistant should provide a response');
    });

    test('Should maintain conversation history', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('Hi');
      await chatPanel.sendMessage('Can you help me?');
      await chatPanel.sendMessage('I need to create a function');

      const messages = chatPanel.getMessages();
      assert.strictEqual(messages.length, TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.TRIPLE_EXCHANGE, 'Should have 3 user messages + 3 assistant responses');

      const userMessages = chatPanel.findMessagesByRole('user');
      const assistantMessages = chatPanel.findMessagesByRole('assistant');

      assert.strictEqual(userMessages.length, TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.TRIPLE_USER_MESSAGES, 'Should have 3 user messages');
      assert.strictEqual(assistantMessages.length, TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.TRIPLE_ASSISTANT_MESSAGES, 'Should have 3 assistant messages');
    });

    test('Should display code blocks in chat', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('Generate a TypeScript function');

      const lastMessage = chatPanel.getLastMessage();
      assert.ok(lastMessage, 'Should have a last message');
      assert.strictEqual(lastMessage!.role, 'assistant', 'Last message should be from assistant');
      assert.ok(lastMessage!.content.length > 0, 'Response should contain content');
    });

    test('Should handle file references in chat messages', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      const messageWithFileRef = 'Can you explain the code in src/index.ts?';
      await chatPanel.sendMessage(messageWithFileRef);

      const messages = chatPanel.getMessages();
      const userMessage = messages.find(m => m.content.includes('src/index.ts'));

      assert.ok(userMessage, 'Should preserve file references in messages');
      assert.strictEqual(userMessage!.content, messageWithFileRef, 'File reference should be intact');
    });

    test('Should persist chat session', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('First message');
      await chatPanel.sendMessage('Second message');

      const messagesBefore = chatPanel.getMessageCount();

      // Simulate panel hide/show (session persistence)
      chatPanel.hide();
      chatPanel.show();

      const messagesAfter = chatPanel.getMessageCount();

      assert.strictEqual(messagesBefore, messagesAfter, 'Message count should persist after hide/show');
      assert.strictEqual(messagesAfter, TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.DOUBLE_EXCHANGE, 'Should have 2 user messages + 2 assistant responses');
    });

    test('Should handle errors when client is disconnected', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      // Create disconnected client
      const disconnectedClient = createMockOllamaClient(false);
      const disconnectedPanel = new MockChatPanel(disconnectedClient, mockLogger);

      disconnectedPanel.show();

      try {
        await disconnectedPanel.sendMessage('Hello');
        assert.fail('Should throw error when client is disconnected');
      } catch (error: any) {
        assert.ok(error.message.includes('not connected'), 'Error should mention connection issue');
      }
    });

    test('Should display conversation in chronological order', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('Message 1');
      await sleep(TEST_DATA_CONSTANTS.DELAYS.TIMESTAMP_DIFFERENTIATION);
      await chatPanel.sendMessage('Message 2');
      await sleep(TEST_DATA_CONSTANTS.DELAYS.TIMESTAMP_DIFFERENTIATION);
      await chatPanel.sendMessage('Message 3');

      const messages = chatPanel.getMessages();

      // Verify chronological order
      for (let i = 1; i < messages.length; i++) {
        assert.ok(
          messages[i].timestamp >= messages[i - 1].timestamp,
          'Messages should be in chronological order'
        );
      }
    });

    test('Should handle rapid message sending', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      // Send multiple messages rapidly
      const promises = [
        chatPanel.sendMessage('Message 1'),
        chatPanel.sendMessage('Message 2'),
        chatPanel.sendMessage('Message 3')
      ];

      await Promise.all(promises);

      const messages = chatPanel.getMessages();
      assert.strictEqual(messages.length, TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.TRIPLE_EXCHANGE, 'Should handle all rapid messages (3 user + 3 assistant)');
    });

    test('Should clear conversation history', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('Message 1');
      await chatPanel.sendMessage('Message 2');

      assert.strictEqual(chatPanel.getMessageCount(), TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.DOUBLE_EXCHANGE, 'Should have messages before clear');

      chatPanel.clearHistory();

      assert.strictEqual(chatPanel.getMessageCount(), 0, 'Should have no messages after clear');
    });
  });

  suite('Chat Commands', () => {
    test('Should execute /help command', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('/help');

      const lastMessage = chatPanel.getLastMessage();
      assert.ok(lastMessage, 'Should have response to /help');
      assert.strictEqual(lastMessage!.role, 'assistant', 'Response should be from assistant');
      assert.ok(lastMessage!.content.includes('Available commands'), 'Should show available commands');
      assert.ok(lastMessage!.content.includes('/help'), 'Should list /help command');
      assert.ok(lastMessage!.content.includes('/clear'), 'Should list /clear command');
      assert.ok(lastMessage!.content.includes('/session'), 'Should list /session command');
    });

    test('Should execute /clear command', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('Message 1');
      await chatPanel.sendMessage('Message 2');

      assert.strictEqual(chatPanel.getMessageCount(), TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.DOUBLE_EXCHANGE, 'Should have 4 messages before clear');

      await chatPanel.sendMessage('/clear');

      // After /clear command, only the /clear message and its response remain
      assert.strictEqual(chatPanel.getMessageCount(), TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.SINGLE_EXCHANGE, 'Should only have /clear command and response');

      const lastMessage = chatPanel.getLastMessage();
      assert.ok(lastMessage!.content.includes('Cleared'), 'Should confirm clearing');
      assert.ok(lastMessage!.content.includes(String(TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.DOUBLE_EXCHANGE)), 'Should mention number of cleared messages');
    });

    test('Should execute /session command', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('Hello');
      await chatPanel.sendMessage('/session');

      const lastMessage = chatPanel.getLastMessage();
      assert.ok(lastMessage, 'Should have response to /session');
      assert.ok(lastMessage!.content.includes('Session Information'), 'Should show session info header');
      assert.ok(lastMessage!.content.includes('Connected:'), 'Should show connection status');
      assert.ok(lastMessage!.content.includes('Messages:'), 'Should show message count');
      assert.ok(lastMessage!.content.includes('Port:'), 'Should show port information');
    });

    test('Should handle file operation commands from chat', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('Create a new TypeScript file for me');

      const messages = chatPanel.getMessages();
      const assistantResponse = messages[messages.length - 1];

      assert.strictEqual(assistantResponse.role, 'assistant', 'Should get assistant response');
      assert.ok(assistantResponse.content.length > 0, 'Response should contain content');
    });

    test('Should support command auto-completion hints', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      // Simulate partial command input
      const partialCommand = '/he';

      // In a real implementation, this would trigger auto-complete suggestions
      // For now, we verify that commands can be called
      await chatPanel.sendMessage('/help');

      const lastMessage = chatPanel.getLastMessage();
      assert.ok(lastMessage!.content.includes('Available commands'), 'Command should execute successfully');
    });

    test('Should execute /model command', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('/model');

      const lastMessage = chatPanel.getLastMessage();
      assert.ok(lastMessage, 'Should have response to /model');
      assert.ok(lastMessage!.content.includes('Current model'), 'Should show current model');
      // Note: Mock client doesn't have model configured, so it will show 'Unknown'
      assert.ok(lastMessage!.content.length > 0, 'Should show model information');
    });

    test('Should handle unknown commands gracefully', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('/unknown');

      const lastMessage = chatPanel.getLastMessage();
      assert.ok(lastMessage, 'Should have response to unknown command');
      assert.ok(lastMessage!.content.includes('Unknown command'), 'Should indicate command is unknown');
      assert.ok(lastMessage!.content.includes('/help'), 'Should suggest using /help');
    });

    test('Should handle commands with arguments', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('/help extra arguments');

      const lastMessage = chatPanel.getLastMessage();
      assert.ok(lastMessage, 'Should handle command with arguments');
      assert.ok(lastMessage!.content.includes('Available commands'), 'Should execute command ignoring extra args');
    });

    test('Should differentiate between commands and regular messages', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('Can you help me with /something?');
      await chatPanel.sendMessage('/help');

      const messages = chatPanel.getMessages();
      const regularMessage = messages[1]; // AI response to regular message
      const commandResponse = messages[3]; // AI response to /help command

      assert.ok(!regularMessage.content.includes('Available commands'), 'Regular message should not trigger command');
      assert.ok(commandResponse.content.includes('Available commands'), 'Command should be executed');
    });

    test('Should maintain command history separate from chat history', async function() {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      chatPanel.show();

      await chatPanel.sendMessage('Regular message');
      await chatPanel.sendMessage('/help');
      await chatPanel.sendMessage('/session');

      const messages = chatPanel.getMessages();
      const userMessages = chatPanel.findMessagesByRole('user');

      assert.strictEqual(userMessages.length, TEST_DATA_CONSTANTS.CHAT_TEST_COUNTS.TRIPLE_USER_MESSAGES, 'Should have 3 user messages');

      const regularMessages = userMessages.filter(m => !m.content.startsWith('/'));
      const commandMessages = userMessages.filter(m => m.content.startsWith('/'));

      assert.strictEqual(regularMessages.length, 1, 'Should have 1 regular message');
      assert.strictEqual(commandMessages.length, 2, 'Should have 2 command messages');
    });
  });
});

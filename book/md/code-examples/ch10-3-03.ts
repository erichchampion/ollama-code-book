import { describe, test, expect } from 'vitest';

/**
 * Test pure functions without AI dependencies
 */

// Example: Token counting
describe('TokenCounter', () => {
  test('counts tokens accurately', () => {
    const counter = new TokenCounter();

    expect(counter.count('hello world')).toBe(2);
    expect(counter.count('The quick brown fox')).toBe(4);
    expect(counter.count('')).toBe(0);
  });

  test('handles special characters', () => {
    const counter = new TokenCounter();

    expect(counter.count('hello, world!')).toBe(3);
    expect(counter.count('foo-bar_baz')).toBe(3);
  });
});

// Example: Message formatting
describe('MessageFormatter', () => {
  test('formats user message', () => {
    const formatter = new MessageFormatter();

    const formatted = formatter.format({
      role: MessageRole.USER,
      content: 'Hello, AI!'
    });

    expect(formatted).toHaveProperty('role', 'user');
    expect(formatted).toHaveProperty('content', 'Hello, AI!');
  });

  test('formats system message', () => {
    const formatter = new MessageFormatter();

    const formatted = formatter.format({
      role: MessageRole.SYSTEM,
      content: 'You are a helpful assistant'
    });

    expect(formatted).toHaveProperty('role', 'system');
    expect(formatted.content).toContain('helpful assistant');
  });
});

// Example: Context window management
describe('ContextWindowManager', () => {
  test('selects recent messages within limit', () => {
    const manager = new ContextWindowManager({
      maxTokens: 100,
      strategy: ContextWindowStrategy.RECENT
    });

    const messages = [
      { role: MessageRole.USER, content: 'Message 1', tokens: 30 },
      { role: MessageRole.ASSISTANT, content: 'Response 1', tokens: 40 },
      { role: MessageRole.USER, content: 'Message 2', tokens: 35 },
      { role: MessageRole.ASSISTANT, content: 'Response 2', tokens: 45 }
    ];

    const selected = manager.selectMessages(messages);

    // Should select most recent that fit
    expect(selected.length).toBe(2);
    expect(selected[0].content).toBe('Message 2');
    expect(selected[1].content).toBe('Response 2');
  });

  test('always includes system messages', () => {
    const manager = new ContextWindowManager({
      maxTokens: 50,
      strategy: ContextWindowStrategy.RECENT
    });

    const messages = [
      { role: MessageRole.SYSTEM, content: 'System prompt', tokens: 20 },
      { role: MessageRole.USER, content: 'User message', tokens: 40 }
    ];

    const selected = manager.selectMessages(messages);

    expect(selected.length).toBe(2);
    expect(selected[0].role).toBe(MessageRole.SYSTEM);
  });
});
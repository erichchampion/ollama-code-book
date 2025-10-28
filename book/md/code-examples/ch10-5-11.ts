describe('ConversationManager Integration', () => {
  let mockAI: MockAIProvider;
  let conversationManager: ConversationManager;

  beforeEach(() => {
    mockAI = new MockAIProvider();
    conversationManager = new ConversationManager(mockAI, {
      maxTokens: 1000,
      strategy: ContextWindowStrategy.RECENT
    });
  });

  test('maintains conversation context', async () => {
    // User asks question
    mockAI.setResponse(
      /What.*JavaScript/i,
      'JavaScript is a programming language for the web.'
    );

    const response1 = await conversationManager.sendMessage(
      'What is JavaScript?'
    );

    expect(response1).toContain('programming language');

    // Follow-up question (requires context)
    mockAI.setResponse(
      /invented/i,
      'It was created by Brendan Eich in 1995.'
    );

    const response2 = await conversationManager.sendMessage(
      'Who invented it?'
    );

    expect(response2).toContain('Brendan Eich');

    // Verify conversation history was sent
    const calls = mockAI.getCalls();
    expect(calls[1].messages).toContainEqual(
      expect.objectContaining({ content: 'What is JavaScript?' })
    );
  });

  test('respects token limits', async () => {
    conversationManager = new ConversationManager(mockAI, {
      maxTokens: 100, // Very small limit
      strategy: ContextWindowStrategy.RECENT
    });

    // Add many messages
    for (let i = 0; i < 10; i++) {
      mockAI.setDefaultResponse('Response');
      await conversationManager.sendMessage(`Message ${i}`);
    }

    // Get messages for AI
    const messages = conversationManager.getMessagesForAI();

    // Should only include recent messages that fit
    const totalTokens = messages.reduce((sum, msg) => sum + msg.tokens, 0);
    expect(totalTokens).toBeLessThanOrEqual(100);
  });
});
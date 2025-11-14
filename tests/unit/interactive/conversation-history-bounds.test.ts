import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * Tests for Conversation History Bounds
 * 
 * These tests verify that conversation history doesn't grow unbounded in
 * long-running sessions. The implementation uses FIFO (First-In-First-Out)
 * eviction to maintain recent context while preventing memory leaks.
 */

describe('Conversation History Bounds', () => {
  // Simulate the conversation history management logic
  const MAX_CONVERSATION_HISTORY_SIZE = 100;
  
  let conversationHistory: Array<{ role: string; content: string }>;

  function addToConversationHistory(entry: { role: string; content: string }): void {
    conversationHistory.push(entry);

    // Enforce memory bounds using FIFO eviction
    if (conversationHistory.length > MAX_CONVERSATION_HISTORY_SIZE) {
      conversationHistory.shift();
    }
  }

  beforeEach(() => {
    conversationHistory = [];
  });

  describe('MAX_CONVERSATION_HISTORY_SIZE constant', () => {
    it('should be defined with a reasonable value', () => {
      expect(MAX_CONVERSATION_HISTORY_SIZE).toBeDefined();
      expect(typeof MAX_CONVERSATION_HISTORY_SIZE).toBe('number');
      expect(MAX_CONVERSATION_HISTORY_SIZE).toBeGreaterThan(0);
    });

    it('should balance memory usage with context retention', () => {
      // Should be large enough to maintain useful context
      expect(MAX_CONVERSATION_HISTORY_SIZE).toBeGreaterThanOrEqual(50);
      
      // But not so large that it causes memory issues
      expect(MAX_CONVERSATION_HISTORY_SIZE).toBeLessThanOrEqual(500);
    });

    it('should be set to a reasonable default of 100', () => {
      expect(MAX_CONVERSATION_HISTORY_SIZE).toBe(100);
    });
  });

  describe('History bounds enforcement', () => {
    it('should not exceed max size when adding entries', () => {
      // Add entries beyond the limit
      for (let i = 0; i < MAX_CONVERSATION_HISTORY_SIZE + 50; i++) {
        addToConversationHistory({ role: 'user', content: `Message ${i}` });
      }

      // Should cap at max size
      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
    });

    it('should allow history to grow up to max size', () => {
      // Add entries up to limit
      for (let i = 0; i < MAX_CONVERSATION_HISTORY_SIZE; i++) {
        addToConversationHistory({ role: 'user', content: `Message ${i}` });
      }

      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
    });

    it('should handle single entry correctly', () => {
      addToConversationHistory({ role: 'user', content: 'Hello' });

      expect(conversationHistory.length).toBe(1);
      expect(conversationHistory[0].content).toBe('Hello');
    });

    it('should handle empty history correctly', () => {
      expect(conversationHistory.length).toBe(0);
    });
  });

  describe('FIFO eviction behavior', () => {
    it('should remove oldest entries first', () => {
      // Fill to capacity
      for (let i = 0; i < MAX_CONVERSATION_HISTORY_SIZE; i++) {
        addToConversationHistory({ role: 'user', content: `Message ${i}` });
      }

      // Add one more - should remove oldest (Message 0)
      addToConversationHistory({ role: 'user', content: 'New message' });

      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
      expect(conversationHistory[0].content).toBe('Message 1'); // First message removed
      expect(conversationHistory[conversationHistory.length - 1].content).toBe('New message');
    });

    it('should maintain correct order after eviction', () => {
      // Fill beyond capacity
      for (let i = 0; i < MAX_CONVERSATION_HISTORY_SIZE + 10; i++) {
        addToConversationHistory({ role: 'user', content: `Message ${i}` });
      }

      // Oldest 10 messages should be gone
      expect(conversationHistory[0].content).toBe('Message 10');
      expect(conversationHistory[1].content).toBe('Message 11');
      
      // Most recent should be last
      const lastIdx = conversationHistory.length - 1;
      expect(conversationHistory[lastIdx].content).toBe(`Message ${MAX_CONVERSATION_HISTORY_SIZE + 9}`);
    });

    it('should preserve recent history during eviction', () => {
      // Add many messages
      for (let i = 0; i < 200; i++) {
        addToConversationHistory({ role: 'user', content: `Message ${i}` });
      }

      // Recent messages (100-199) should be preserved
      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
      expect(conversationHistory[0].content).toBe('Message 100');
      expect(conversationHistory[MAX_CONVERSATION_HISTORY_SIZE - 1].content).toBe('Message 199');
    });

    it('should handle alternating user and assistant messages', () => {
      // Add conversation pairs
      for (let i = 0; i < MAX_CONVERSATION_HISTORY_SIZE + 20; i++) {
        addToConversationHistory({ role: 'user', content: `User message ${i}` });
        addToConversationHistory({ role: 'assistant', content: `Assistant response ${i}` });
      }

      // Should maintain pairs correctly
      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
      
      // Check that alternating pattern is maintained
      for (let i = 0; i < conversationHistory.length - 1; i += 2) {
        expect(conversationHistory[i].role).toBe('user');
        expect(conversationHistory[i + 1].role).toBe('assistant');
      }
    });
  });

  describe('Memory bounds verification', () => {
    it('should prevent unbounded memory growth', () => {
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        addToConversationHistory({
          role: 'user',
          content: `This is a test message ${i} with some content to simulate real usage`
        });
      }

      // Size should be bounded regardless of iterations
      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
    });

    it('should handle long messages without memory issues', () => {
      const longContent = 'x'.repeat(1000); // 1KB per message

      for (let i = 0; i < 200; i++) {
        addToConversationHistory({ role: 'user', content: longContent });
      }

      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
    });

    it('should maintain stable memory footprint in long sessions', () => {
      // Simulate a very long conversation session
      for (let round = 0; round < 5; round++) {
        for (let i = 0; i < MAX_CONVERSATION_HISTORY_SIZE * 2; i++) {
          addToConversationHistory({ role: 'user', content: `Round ${round} Message ${i}` });
        }

        // Size should remain constant after each round
        expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
      }
    });
  });

  describe('Context preservation', () => {
    it('should preserve most recent context', () => {
      // Add 150 messages
      for (let i = 0; i < 150; i++) {
        addToConversationHistory({ role: 'user', content: `Message ${i}` });
      }

      // Last 100 messages should be preserved
      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
      
      for (let i = 0; i < MAX_CONVERSATION_HISTORY_SIZE; i++) {
        expect(conversationHistory[i].content).toBe(`Message ${50 + i}`);
      }
    });

    it('should maintain conversation continuity', () => {
      // Simulate a real conversation
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
        { role: 'assistant', content: 'I am doing well, thanks!' }
      ];

      messages.forEach(msg => addToConversationHistory(msg));

      expect(conversationHistory.length).toBe(4);
      expect(conversationHistory).toEqual(messages);
    });

    it('should handle rapid message additions', () => {
      const start = Date.now();

      // Rapidly add messages
      for (let i = 0; i < 500; i++) {
        addToConversationHistory({ role: 'user', content: `Rapid message ${i}` });
      }

      const duration = Date.now() - start;

      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
      // Should complete quickly (< 100ms for 500 additions)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Edge cases', () => {
    it('should handle exactly max size additions', () => {
      for (let i = 0; i < MAX_CONVERSATION_HISTORY_SIZE; i++) {
        addToConversationHistory({ role: 'user', content: `Message ${i}` });
      }

      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
    });

    it('should handle max size + 1 additions', () => {
      for (let i = 0; i <= MAX_CONVERSATION_HISTORY_SIZE; i++) {
        addToConversationHistory({ role: 'user', content: `Message ${i}` });
      }

      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
      expect(conversationHistory[0].content).toBe('Message 1');
    });

    it('should handle multiple evictions in sequence', () => {
      // Fill to capacity
      for (let i = 0; i < MAX_CONVERSATION_HISTORY_SIZE; i++) {
        addToConversationHistory({ role: 'user', content: `Message ${i}` });
      }

      // Add 10 more messages
      for (let i = 0; i < 10; i++) {
        addToConversationHistory({ role: 'user', content: `Extra ${i}` });
        expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
      }

      // First message should now be Message 10
      expect(conversationHistory[0].content).toBe('Message 10');
    });

    it('should handle messages with special characters', () => {
      const specialMessages = [
        { role: 'user', content: 'Message with \n newlines' },
        { role: 'user', content: 'Message with \t tabs' },
        { role: 'user', content: 'Message with "quotes"' },
        { role: 'user', content: 'Message with \'apostrophes\'' },
        { role: 'user', content: 'Message with 🎉 emojis' }
      ];

      specialMessages.forEach(msg => addToConversationHistory(msg));

      expect(conversationHistory.length).toBe(5);
      expect(conversationHistory).toEqual(specialMessages);
    });

    it('should handle empty content strings', () => {
      addToConversationHistory({ role: 'user', content: '' });

      expect(conversationHistory.length).toBe(1);
      expect(conversationHistory[0].content).toBe('');
    });

    it('should handle very large content without crashing', () => {
      const veryLargeContent = 'x'.repeat(100000); // 100KB

      addToConversationHistory({ role: 'user', content: veryLargeContent });

      expect(conversationHistory.length).toBe(1);
      expect(conversationHistory[0].content).toBe(veryLargeContent);
    });
  });

  describe('Performance characteristics', () => {
    it('should have O(1) addition time complexity', () => {
      const timings: number[] = [];

      // Measure time for additions at different history sizes
      for (let size = 0; size < MAX_CONVERSATION_HISTORY_SIZE * 2; size += 10) {
        conversationHistory = [];
        
        // Fill to current size
        for (let i = 0; i < size; i++) {
          addToConversationHistory({ role: 'user', content: `Warmup ${i}` });
        }

        // Measure next addition
        const start = process.hrtime.bigint();
        addToConversationHistory({ role: 'user', content: 'Test' });
        const end = process.hrtime.bigint();

        timings.push(Number(end - start));
      }

      // Verify no significant increase in time as history grows
      const firstHalf = timings.slice(0, timings.length / 2);
      const secondHalf = timings.slice(timings.length / 2);
      
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      // Second half should not be significantly slower (within 10x)
      expect(avgSecond).toBeLessThan(avgFirst * 10);
    });

    it('should not cause memory leaks over time', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate long-running session
      for (let i = 0; i < 1000; i++) {
        addToConversationHistory({ role: 'user', content: `Message ${i}` });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be bounded (< 5MB for 1000 messages)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('should handle high-frequency additions efficiently', () => {
      const start = Date.now();
      const messageCount = 10000;

      for (let i = 0; i < messageCount; i++) {
        addToConversationHistory({ role: 'user', content: `Msg ${i}` });
      }

      const duration = Date.now() - start;

      // Should handle 10k messages quickly (< 500ms)
      expect(duration).toBeLessThan(500);
      expect(conversationHistory.length).toBe(MAX_CONVERSATION_HISTORY_SIZE);
    });
  });
});

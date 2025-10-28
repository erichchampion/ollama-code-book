describe('ConversationManager - Comprehensive Coverage', () => {
  let router: IntelligentRouter;
  let logger: Logger;
  let manager: ConversationManager;

  beforeEach(() => {
    router = MockFactory.createRouter();
    logger = MockFactory.createLogger();
    manager = new ConversationManager(router, logger);
  });

  describe('analyze()', () => {
    it('should analyze simple prompts', async () => {
      const result = await manager.analyze('simple test');

      expect(result).toBeDefined();
      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle complex prompts', async () => {
      const longPrompt = 'a'.repeat(5000);

      const result = await manager.analyze(longPrompt);

      expect(result).toBeDefined();
    });

    it('should handle router errors', async () => {
      (router.route as any).mockRejectedValue(new Error('Router failed'));

      await expect(
        manager.analyze('test')
      ).rejects.toThrow('Router failed');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should log analysis', async () => {
      await manager.analyze('test prompt');

      expect(logger.info).toHaveBeenCalledWith('Analyzing: test prompt');
    });

    it('should return correct confidence', async () => {
      const result = await manager.analyze('test');

      expect(result.confidence).toBe(0.9);
    });
  });

  describe('edge cases', () => {
    it('should handle empty prompts', async () => {
      await expect(
        manager.analyze('')
      ).rejects.toThrow('Prompt cannot be empty');
    });

    it('should handle null prompts', async () => {
      await expect(
        manager.analyze(null as any)
      ).rejects.toThrow('Prompt is required');
    });

    it('should handle very long prompts', async () => {
      const longPrompt = 'a'.repeat(100000);

      await expect(
        manager.analyze(longPrompt)
      ).rejects.toThrow('Prompt exceeds maximum length');
    });
  });
});
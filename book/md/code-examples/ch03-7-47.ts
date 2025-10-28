describe('DI Container Error Handling', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  it('should throw on unregistered service', async () => {
    await expect(
      container.resolve('nonexistent')
    ).rejects.toThrow("Service 'nonexistent' is not registered");
  });

  it('should detect circular dependencies', async () => {
    // Register circular dependency
    container.registerFactory('serviceA', async (c) => {
      const b = await c.resolve('serviceB');
      return { b };
    });

    container.registerFactory('serviceB', async (c) => {
      const a = await c.resolve('serviceA');
      return { a };
    });

    await expect(
      container.resolve('serviceA')
    ).rejects.toThrow(/Circular dependency detected/);
  });

  it('should handle initialization errors', async () => {
    container.registerFactory('failing', () => {
      throw new Error('Initialization failed');
    });

    await expect(
      container.resolve('failing')
    ).rejects.toThrow('Initialization failed');
  });

  it('should continue disposal on error', async () => {
    const successSpy = vi.fn();

    container.registerInstance('failing', {
      dispose: () => { throw new Error('Dispose failed'); }
    });

    container.registerInstance('success', {
      dispose: successSpy
    });

    await container.resolve('failing');
    await container.resolve('success');

    // Should not throw, but collect errors
    await expect(container.dispose()).rejects.toThrow(AggregateError);

    // Success should still be disposed
    expect(successSpy).toHaveBeenCalled();
  });
});
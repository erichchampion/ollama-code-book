describe('Service Lifecycle', () => {
  it('should call onInit hook', async () => {
    const container = new DIContainer();
    const initSpy = vi.fn();

    container.register('test', Logger, {
      lifecycle: {
        onInit: initSpy
      }
    });

    await container.resolve('test');

    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('should call onDispose hook', async () => {
    const container = new DIContainer();
    const disposeSpy = vi.fn();

    container.register('test', Logger, {
      lifecycle: {
        onDispose: disposeSpy
      }
    });

    await container.resolve('test');
    await container.dispose();

    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it('should dispose in reverse order', async () => {
    const container = new DIContainer();
    const order: string[] = [];

    container.register('logger', Logger, {
      lifecycle: {
        onDispose: () => order.push('logger')
      }
    });

    container.register('manager', ProviderManager, {
      dependencies: ['logger'],
      lifecycle: {
        onDispose: () => order.push('manager')
      }
    });

    container.register('router', IntelligentRouter, {
      dependencies: ['manager', 'logger'],
      lifecycle: {
        onDispose: () => order.push('router')
      }
    });

    await container.resolve('router');
    await container.dispose();

    // Should dispose in reverse order
    expect(order).toEqual(['router', 'manager', 'logger']);
  });
});
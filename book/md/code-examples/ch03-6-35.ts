// Before: Circular dependency
class ServiceA {
  constructor(private serviceB: ServiceB) {}
}

class ServiceB {
  constructor(private serviceA: ServiceA) {}
}

// After: Lazy injection with factory
class ServiceA {
  private _serviceB: ServiceB | null = null;

  constructor(private serviceBFactory: () => ServiceB) {}

  private get serviceB(): ServiceB {
    if (!this._serviceB) {
      this._serviceB = this.serviceBFactory();
    }
    return this._serviceB;
  }

  doSomething(): void {
    // serviceB is resolved lazily
    this.serviceB.execute();
  }
}

class ServiceB {
  constructor(private serviceA: ServiceA) {}
}

// Register with container
container.registerFactory('serviceA', (c) => {
  return new ServiceA(() => c.resolve('serviceB'));
});

container.register('serviceB', ServiceB, {
  dependencies: ['serviceA']
});
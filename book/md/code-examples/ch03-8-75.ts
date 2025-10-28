// Register logger as singleton - shared across application
container.register('logger', Logger, { singleton: true });

// Register analyzer as transient - new instance per use
container.register('analyzer', Analyzer, { singleton: false });
// Singleton: shared logger
container.register('logger', Logger, { singleton: true });

// Transient: new instance each time
container.register('tempAnalyzer', Analyzer, { singleton: false });
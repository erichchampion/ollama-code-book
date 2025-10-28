// Bad: Singleton for stateless service
container.register('requestAnalyzer', RequestAnalyzer, { singleton: true });
// Can cause concurrency issues if service has mutable state
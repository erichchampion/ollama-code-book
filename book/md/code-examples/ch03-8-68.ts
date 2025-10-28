// Bad: Hardcoded values
container.registerFactory('logger', () => {
  return new Logger({
    level: 'debug', // Should be configurable
    file: '/var/log/app.log' // Won't work on all systems
  });
});
container.registerFactory('logger', () => {
  return new Logger({
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'app.log'
  });
});
// Transient: new instance each time
container.register('requestAnalyzer', RequestAnalyzer, { singleton: false });
container.register('tempProcessor', TempProcessor, { singleton: false });
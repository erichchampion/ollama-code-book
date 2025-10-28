interface PluginContext {
  // Extension points
  extensions: ExtensionRegistry;

  // Configuration
  config: PluginConfiguration;

  // Storage
  storage: PluginStorage;

  // Logging
  logger: Logger;

  // Events
  events: EventEmitter;
}

interface ExtensionRegistry {
  get<T>(extensionPoint: string): ExtensionPoint<T>;
}

interface ExtensionPoint<T> {
  register(extension: T): void;
  unregister(extension: T): void;
  getExtensions(): T[];
}
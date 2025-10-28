class ConfigurationManager {
  // Loading
  load(path?: string): Promise<Configuration>;
  loadFromEnv(): Configuration;

  // Saving
  save(config: Configuration, path?: string): Promise<void>;

  // Access
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;

  // Validation
  validate(config: Configuration): ValidationResult;

  // Watching
  watch(callback: (config: Configuration) => void): void;
  unwatch(): void;
}
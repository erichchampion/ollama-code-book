/**
 * Plugin interface - all plugins must implement this
 */
export interface Plugin {
  /** Plugin metadata */
  readonly metadata: PluginMetadata;

  /**
   * Called when plugin is activated
   */
  activate(context: PluginContext): Promise<void>;

  /**
   * Called when plugin is deactivated
   */
  deactivate(): Promise<void>;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Unique plugin identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Plugin version (semver) */
  version: string;

  /** Description */
  description: string;

  /** Author information */
  author: {
    name: string;
    email?: string;
    url?: string;
  };

  /** Plugin dependencies */
  dependencies?: {
    /** Platform version requirement */
    platform?: string;

    /** Other plugin dependencies */
    plugins?: Record<string, string>;
  };

  /** Plugin capabilities */
  capabilities?: string[];

  /** Plugin keywords for discovery */
  keywords?: string[];
}

/**
 * Plugin context - provided to plugins on activation
 */
export interface PluginContext {
  /** Extension point registry */
  extensions: ExtensionPointRegistry;

  /** Logger scoped to this plugin */
  logger: Logger;

  /** Configuration for this plugin */
  config: PluginConfig;

  /** Plugin storage directory */
  storageDir: string;

  /** Global storage (shared across plugins) */
  globalStorage: Storage;

  /** Event emitter for subscribing to events */
  events: EventEmitter;
}

export interface PluginConfig {
  get<T>(key: string, defaultValue?: T): T | undefined;
  set<T>(key: string, value: T): Promise<void>;
}
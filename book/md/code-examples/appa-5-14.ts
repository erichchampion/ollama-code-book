interface Plugin {
  readonly metadata: PluginMetadata;

  // Lifecycle
  activate(context: PluginContext): Promise<void>;
  deactivate(): Promise<void>;

  // Optional hooks
  onInstall?(): Promise<void>;
  onUninstall?(): Promise<void>;
  onUpdate?(oldVersion: string, newVersion: string): Promise<void>;
}
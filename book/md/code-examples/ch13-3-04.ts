/**
 * Manages plugin lifecycle
 */
export class PluginManager {
  private plugins = new Map<string, LoadedPlugin>();
  private logger: Logger;
  private extensionRegistry: ExtensionPointRegistry;

  constructor(
    logger: Logger,
    extensionRegistry: ExtensionPointRegistry
  ) {
    this.logger = logger;
    this.extensionRegistry = extensionRegistry;
  }

  /**
   * Load and activate a plugin
   */
  async load(plugin: Plugin): Promise<void> {
    const { id, version } = plugin.metadata;

    this.logger.info('Loading plugin', { id, version });

    // Validate plugin
    this.validatePlugin(plugin);

    // Check if already loaded
    if (this.plugins.has(id)) {
      throw new Error(`Plugin already loaded: ${id}`);
    }

    // Check dependencies
    await this.checkDependencies(plugin);

    // Create plugin context
    const context = await this.createContext(plugin);

    // Activate plugin
    try {
      await plugin.activate(context);

      // Store loaded plugin
      this.plugins.set(id, {
        plugin,
        context,
        state: PluginState.ACTIVE
      });

      this.logger.info('Plugin loaded successfully', { id });

    } catch (error) {
      this.logger.error('Plugin activation failed', error as Error, { id });
      throw new Error(`Failed to activate plugin ${id}: ${(error as Error).message}`);
    }
  }

  /**
   * Unload and deactivate a plugin
   */
  async unload(pluginId: string): Promise<void> {
    const loaded = this.plugins.get(pluginId);

    if (!loaded) {
      throw new Error(`Plugin not loaded: ${pluginId}`);
    }

    this.logger.info('Unloading plugin', { id: pluginId });

    try {
      // Deactivate plugin
      await loaded.plugin.deactivate();

      // Remove from loaded plugins
      this.plugins.delete(pluginId);

      this.logger.info('Plugin unloaded successfully', { id: pluginId });

    } catch (error) {
      this.logger.error('Plugin deactivation failed', error as Error, { id: pluginId });
      throw error;
    }
  }

  /**
   * Reload a plugin
   */
  async reload(pluginId: string): Promise<void> {
    const loaded = this.plugins.get(pluginId);

    if (!loaded) {
      throw new Error(`Plugin not loaded: ${pluginId}`);
    }

    const plugin = loaded.plugin;

    await this.unload(pluginId);
    await this.load(plugin);
  }

  /**
   * Get loaded plugin
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId)?.plugin;
  }

  /**
   * List all loaded plugins
   */
  listPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map(({ plugin, state }) => ({
      metadata: plugin.metadata,
      state
    }));
  }

  /**
   * Validate plugin
   */
  private validatePlugin(plugin: Plugin): void {
    const { id, version, name } = plugin.metadata;

    if (!id || !version || !name) {
      throw new Error('Plugin missing required metadata (id, version, name)');
    }

    // Validate version is semver
    if (!this.isValidSemver(version)) {
      throw new Error(`Invalid plugin version: ${version}`);
    }
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(plugin: Plugin): Promise<void> {
    const deps = plugin.metadata.dependencies;

    if (!deps) return;

    // Check platform version
    if (deps.platform) {
      const platformVersion = this.getPlatformVersion();
      if (!this.satisfiesVersion(platformVersion, deps.platform)) {
        throw new Error(
          `Plugin requires platform ${deps.platform}, but current version is ${platformVersion}`
        );
      }
    }

    // Check plugin dependencies
    if (deps.plugins) {
      for (const [pluginId, versionRange] of Object.entries(deps.plugins)) {
        const depPlugin = this.plugins.get(pluginId);

        if (!depPlugin) {
          throw new Error(`Missing dependency: ${pluginId}`);
        }

        if (!this.satisfiesVersion(depPlugin.plugin.metadata.version, versionRange)) {
          throw new Error(
            `Plugin ${pluginId} version ${depPlugin.plugin.metadata.version} ` +
            `does not satisfy requirement ${versionRange}`
          );
        }
      }
    }
  }

  /**
   * Create plugin context
   */
  private async createContext(plugin: Plugin): Promise<PluginContext> {
    const storageDir = path.join(
      os.homedir(),
      '.ollama-code',
      'plugins',
      plugin.metadata.id
    );

    // Ensure storage directory exists
    await fs.mkdir(storageDir, { recursive: true });

    return {
      extensions: this.extensionRegistry,
      logger: this.logger.child({ plugin: plugin.metadata.id }),
      config: new PluginConfigImpl(plugin.metadata.id),
      storageDir,
      globalStorage: new GlobalStorage(),
      events: new EventEmitter()
    };
  }

  private getPlatformVersion(): string {
    return '1.0.0'; // Would get from package.json
  }

  private isValidSemver(version: string): boolean {
    return /^\d+\.\d+\.\d+/.test(version);
  }

  private satisfiesVersion(version: string, range: string): boolean {
    // Simple version check (would use semver package in production)
    return version >= range;
  }
}

enum PluginState {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  ERROR = 'error'
}

interface LoadedPlugin {
  plugin: Plugin;
  context: PluginContext;
  state: PluginState;
}

interface PluginInfo {
  metadata: PluginMetadata;
  state: PluginState;
}
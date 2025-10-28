/**
 * Loads plugins from different sources
 */
export class PluginLoader {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Load plugin from npm package
   */
  async loadFromNpm(packageName: string): Promise<Plugin> {
    this.logger.info('Loading plugin from npm', { package: packageName });

    try {
      // Import the package
      const module = await import(packageName);

      // Get plugin export
      const PluginClass = module.default || module.Plugin;

      if (!PluginClass) {
        throw new Error(`Package ${packageName} does not export a plugin`);
      }

      // Instantiate plugin
      const plugin = new PluginClass();

      return plugin;

    } catch (error) {
      throw new Error(`Failed to load plugin from npm: ${(error as Error).message}`);
    }
  }

  /**
   * Load plugin from file path
   */
  async loadFromPath(filePath: string): Promise<Plugin> {
    this.logger.info('Loading plugin from path', { path: filePath });

    try {
      // Import the file
      const module = await import(filePath);

      const PluginClass = module.default || module.Plugin;

      if (!PluginClass) {
        throw new Error(`File ${filePath} does not export a plugin`);
      }

      const plugin = new PluginClass();

      return plugin;

    } catch (error) {
      throw new Error(`Failed to load plugin from path: ${(error as Error).message}`);
    }
  }

  /**
   * Discover plugins in directory
   */
  async discoverPlugins(directory: string): Promise<Plugin[]> {
    this.logger.info('Discovering plugins', { directory });

    const plugins: Plugin[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const pluginDir = path.join(directory, entry.name);
        const packageJsonPath = path.join(pluginDir, 'package.json');

        try {
          // Check if it's a valid plugin
          const packageJson = JSON.parse(
            await fs.readFile(packageJsonPath, 'utf-8')
          );

          if (packageJson.ollamaCodePlugin) {
            const plugin = await this.loadFromPath(pluginDir);
            plugins.push(plugin);
          }

        } catch (error) {
          // Not a valid plugin, skip
          continue;
        }
      }

      this.logger.info('Discovered plugins', { count: plugins.length });

      return plugins;

    } catch (error) {
      this.logger.error('Plugin discovery failed', error as Error);
      return [];
    }
  }

  /**
   * Install plugin from registry
   */
  async install(pluginId: string, version?: string): Promise<Plugin> {
    this.logger.info('Installing plugin', { id: pluginId, version });

    // Construct package name
    const packageName = `@ollama-code/plugin-${pluginId}`;
    const versionSpec = version ? `@${version}` : '';

    // Install using npm
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync(`npm install ${packageName}${versionSpec}`);

      // Load the installed plugin
      return await this.loadFromNpm(packageName);

    } catch (error) {
      throw new Error(`Failed to install plugin: ${(error as Error).message}`);
    }
  }
}
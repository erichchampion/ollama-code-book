class PluginManager {
  // Loading
  load(plugin: Plugin): Promise<void>;
  unload(pluginId: string): Promise<void>;
  reload(pluginId: string): Promise<void>;

  // Discovery
  discover(source: PluginSource): Promise<Plugin[]>;

  // State
  getLoaded(): LoadedPlugin[];
  getPlugin(pluginId: string): LoadedPlugin | undefined;

  // Events
  on(event: PluginEvent, handler: EventHandler): void;
}

type PluginSource =
  | 'npm'
  | 'filesystem'
  | 'registry';

type PluginEvent =
  | 'loaded'
  | 'unloaded'
  | 'error';

interface LoadedPlugin {
  plugin: Plugin;
  context: PluginContext;
  state: PluginState;
}

type PluginState =
  | 'active'
  | 'inactive'
  | 'error';
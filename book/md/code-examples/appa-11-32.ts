import { Plugin, PluginMetadata, PluginContext } from 'ollama-code';

class MyPlugin implements Plugin {
  readonly metadata: PluginMetadata = {
    id: 'my-plugin',
    name: 'My Custom Plugin',
    version: '1.0.0',
    description: 'Custom plugin example',
    author: 'Your Name',
    dependencies: {
      platform: '^1.0.0'
    }
  };

  async activate(context: PluginContext): Promise<void> {
    // Register tools
    const toolExtensions = context.extensions.get('tools');
    toolExtensions.register(new CustomSearchTool());

    // Register commands
    const commandExtensions = context.extensions.get('commands');
    // ...

    // Listen to events
    context.events.on('completion:started', () => {
      context.logger.info('Completion started');
    });
  }

  async deactivate(): Promise<void> {
    // Cleanup
  }
}
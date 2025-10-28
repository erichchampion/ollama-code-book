/**
 * Plugin registry for discovering available plugins
 */
export class PluginRegistry {
  private apiUrl: string;

  constructor(apiUrl: string = 'https://registry.ollama-code.dev') {
    this.apiUrl = apiUrl;
  }

  /**
   * Search for plugins
   */
  async search(query: string): Promise<PluginSearchResult[]> {
    const response = await fetch(
      `${this.apiUrl}/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error('Failed to search plugins');
    }

    return response.json();
  }

  /**
   * Get plugin details
   */
  async getPlugin(pluginId: string): Promise<PluginDetails> {
    const response = await fetch(`${this.apiUrl}/plugins/${pluginId}`);

    if (!response.ok) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    return response.json();
  }

  /**
   * List popular plugins
   */
  async getPopular(limit: number = 10): Promise<PluginSearchResult[]> {
    const response = await fetch(`${this.apiUrl}/popular?limit=${limit}`);

    if (!response.ok) {
      throw new Error('Failed to fetch popular plugins');
    }

    return response.json();
  }

  /**
   * Get plugins by category
   */
  async getByCategory(category: string): Promise<PluginSearchResult[]> {
    const response = await fetch(`${this.apiUrl}/category/${category}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch plugins for category: ${category}`);
    }

    return response.json();
  }
}

interface PluginSearchResult {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  downloads: number;
  rating: number;
  keywords: string[];
}

interface PluginDetails extends PluginSearchResult {
  readme: string;
  repository: string;
  homepage: string;
  versions: string[];
  dependencies: Record<string, string>;
}
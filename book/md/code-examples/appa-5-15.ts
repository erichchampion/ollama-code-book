interface PluginMetadata {
  id: string;                  // Unique identifier
  name: string;
  version: string;             // SemVer
  description: string;
  author: string;

  // Dependencies
  dependencies?: {
    platform?: string;         // Platform version (SemVer range)
    plugins?: Record<string, string>; // Plugin dependencies
    node?: string;             // Node.js version
  };

  // Capabilities
  capabilities?: string[];

  // Repository
  repository?: {
    type: 'git' | 'npm';
    url: string;
  };

  // License
  license?: string;

  // Homepage
  homepage?: string;
}